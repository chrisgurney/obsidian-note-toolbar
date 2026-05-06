import NoteToolbarPlugin from "main";
import { CliData } from "obsidian";
import { ItemType, ScriptConfig, ToolbarItemSettings, ToolbarSettings, t } from "Settings/NoteToolbarSettings";
import { color, hasValue } from "./CliUtils";

type ItemRow = { key: string; cols: string[] };

type ColumnSpec =
    | 'position'
    | 'uuid'
    | 'type'
    | 'label'
    | 'tooltip'
    | 'labelTooltipIcon'
    | 'icon'
    | 'toolbar'
    | 'value'
    | 'link'
    | 'command'
    | 'toolbarRef';

type ColumnSchema = readonly ColumnSpec[];


export default class CliItemHandlers {

    constructor(
        private ntb: NoteToolbarPlugin
    ) {}

    getItemList(args: CliData, toolbar?: ToolbarSettings): string {
        const format = hasValue(args.format) ? args.format : 'table';
        const verbose = args.verbose !== undefined;
        const includeEmpty = args.empty !== undefined;
        const isCsv = format === 'csv';
        const isJson = format === 'json';
        const isTotal = args.total !== undefined;
        
        const toolbars = toolbar ? [toolbar] : this.ntb.settings.toolbars;

        const truncateDisplay = (toolbars.length > 1) &&!isCsv;
        const truncateValue = !verbose && !isCsv;

        const { rows, emptyCount } = this.buildItemRows(
            toolbars,
            verbose,
            includeEmpty,
            truncateDisplay,
            truncateValue
        );

        if (isTotal) return String(rows.length);

        if (!rows.length && !emptyCount) return t('cli.no-items');

        if (toolbars.length > 1) this.sortItemRows(rows);

        const schema = this.getColumnSchema(verbose, toolbars.length === 1);

        if (isJson) {
            const data = rows.map(r =>
                Object.fromEntries(
                    schema.map((col, i) => [col, r.cols[i]])
                )
            );
            return JSON.stringify(data, null, 2);
        }

        let lines: string[];

        if (isCsv) {
            const header = schema.join(',');
            const escape = (val: string) => `"${val.replace(/"/g, '""')}"`;

            lines = [
                header,
                ...rows.map(r => r.cols.map(escape).join(','))
            ];
        }
        else {
            const widths = rows.reduce((acc, r) => {
                r.cols.forEach((c, i) => {
                    acc[i] = Math.max(acc[i] ?? 0, c.length);
                });
                return acc;
            }, [] as number[]);

            lines = [];

            rows.forEach(row => {
                lines.push(
                    ...this.getItemRow(row, widths, schema, verbose, isCsv)
                );
            });
        }

        if (emptyCount > 0) {
            lines.push(`\n${color(t('cli.items-empty-not-shown', { count: emptyCount }), 'green')}`);
        }

        return lines.join('\n');
    }

    getItemRow(
        row: ItemRow, 
        widths: number[], 
        schema: ColumnSchema, 
        verbose: boolean,
        isCsv: boolean
    ): string[] {
        let lines: string[] = [];

        if (!verbose) {
            // normal single-line row
            const line = this.layoutRowAndColor(row.cols, widths, schema);
            lines.push(line);
            return lines;
        }

        //
        // in verbose mode, show a row and value detail under the row
        //

        const headCols: string[] = [];
        const headWidths: number[] = [];
        let valueCol = '';

        row.cols.forEach((c, i) => {
            if (schema[i] === 'value') {
                valueCol = c;
            } else {
                headCols.push(c);
                headWidths.push(widths[i]);
            }
        });

        const line = this.layoutRowAndColor(headCols, headWidths, schema);
        lines.push(line);

        if (valueCol) {
            valueCol.split('\n').forEach(l => {
                lines.push(color('\t' + l, isCsv ? undefined : 'black'));
            });
        }

        return lines;
    }

	/*************************************************************************
	 * HELPERS
	 *************************************************************************/
    
    private static readonly TRUNCATE_LENGTH = 32;

    /**
     * Builds a list of items from the specified toolbars, formatted for display in the CLI.
     */
    private buildItemRows(
        toolbars: ToolbarSettings[],
        verbose: boolean,
        includeEmpty: boolean,
        truncateDisplay: boolean,
        truncateValue: boolean
    ): { rows: ItemRow[]; emptyCount: number } {
        const single = toolbars.length === 1;
        const schema = this.getColumnSchema(verbose, single);

        return toolbars.reduce(
            (acc, toolbar) => {
                const result = toolbar.items.reduce(
                    (inner, item, index) => {
                        const cols = this.projectItem(
                            item,
                            toolbar,
                            index,
                            schema,
                            verbose,
                            truncateDisplay,
                            truncateValue
                        );

                        // skip separators when showing all items
                        if (this.isSeparator(item) && !single) {
                            return inner;
                        }

                        if (this.isEmpty(item) && !includeEmpty && !single) {
                            inner.emptyCount++;
                            return inner;
                        }

                        inner.rows.push({
                            key: item.label || item.tooltip || '',
                            cols
                        });

                        return inner;
                    },
                    { rows: [] as ItemRow[], emptyCount: 0 }
                );

                acc.rows.push(...result.rows);
                acc.emptyCount += result.emptyCount;

                return acc;
            },
            { rows: [] as ItemRow[], emptyCount: 0 }
        );
    }

    private layoutRowAndColor(cols: string[], widths: number[], schema: ColumnSchema): string {
        return cols
            .map((c, i) => {
                const padded = c.padEnd(widths[i]);
                if (['toolbar', 'uuid'].contains(schema[i])) return color(padded, 'green'); 
                return padded;
            })
            .join('\t')
            .trimEnd();
    }

    private formatText(value: string | undefined, truncate: boolean): string {
        const v = value ?? '';
        return truncate ? this.truncate(v) : v;
    }

    private getColumnSchema(verbose: boolean, single: boolean): ColumnSchema {
        if (verbose) {
            return single
                ? ['position', 'labelTooltipIcon', 'type', 'icon', 'uuid', 'value']
                : ['labelTooltipIcon', 'type', 'icon', 'toolbar', 'uuid', 'value'];
        }
        return single
            ? ['position', 'labelTooltipIcon', 'type', 'value']
            : ['labelTooltipIcon', 'type', 'value', 'toolbar'];
    }

    private getItemText(item: ToolbarItemSettings): string {
        switch (item.linkAttr.type) {
            case ItemType.Break:
            case ItemType.Separator:
            case ItemType.Spreader:
                return '---';
            case ItemType.Group:
                return this.getToolbarRef(item.link);
            default:
                return item.label || item.tooltip || (item.icon ? `icon:${item.icon}` : '') || '';
        }
    }

    private getItemValue(item: ToolbarItemSettings, verbose: boolean): string {
        switch (item.linkAttr.type) {
            case ItemType.Command:
                return item.linkAttr.commandId ?? '';
            case ItemType.Dataview:
            case ItemType.JsEngine:
            case ItemType.JavaScript:
            case ItemType.Templater:
                return this.getScriptSummary(item.scriptConfig, verbose);
            case ItemType.File:
            case ItemType.Uri:
                return item.link ?? '';
            case ItemType.Menu:
                return this.getToolbarRef(item.link);
            default:
                return '';
        }
    }

    private getScriptSummary(config: ScriptConfig | undefined, verbose: boolean): string {
        if (!config) return '';
        let parts: string[] = [];
        let pluginFunction = verbose ? '' : `${config.pluginFunction}:`;
        if (config.sourceFile) parts.push(`${config.sourceFile}`);
        if (config.sourceFunction) parts.push(`${config.sourceFunction}`);
        if (config.expression) parts.push(verbose ? config.expression : config.expression.replace(/\n/g, ' '));
        return pluginFunction + parts.join(' | ');
    }

    private getToolbarRef(id?: string): string {
        if (!id) return '';

        const tb = this.ntb.settingsManager.getToolbarById(id);
        const name = tb?.name ?? t('cli.label-unknown-toolbar');

        return `toolbar:${name}`;
    }

    private isEmpty(item: ToolbarItemSettings): boolean {
        if (this.isSeparator(item)) return false;
        return (item.label || item.tooltip || item.icon) === '';
    }

    private isSeparator(item: ToolbarItemSettings): boolean {
        return [ItemType.Break, ItemType.Separator, ItemType.Spreader].includes(item.linkAttr.type as ItemType);
    }

    private projectItem(
        item: ToolbarItemSettings,
        toolbar: ToolbarSettings,
        index: number,
        schema: ColumnSchema,
        verbose: boolean,
        truncateDisplay: boolean,
        truncateValue: boolean
    ): string[] {
        const map: Record<ColumnSpec, string> = {
            position: String(index + 1),

            uuid: item.uuid,
            type: item.linkAttr.type ?? '',

            label: this.formatText(item.label, truncateDisplay),
            tooltip: this.formatText(item.tooltip, truncateDisplay),
            icon: item.icon ?? '',

            labelTooltipIcon: this.formatText(this.getItemText(item), truncateDisplay),

            toolbar: this.getToolbarRef(toolbar.uuid),

            value: this.formatText(this.getItemValue(item, verbose), truncateValue),

            link: item.link ?? '',

            command: item.linkAttr.commandId ?? '',

            toolbarRef: this.getToolbarRef(item.link)
        };

        return schema.map((col) => map[col] ?? '');
    }

    private sortItemRows(rows: ItemRow[]): void {
        rows.sort((a, b) => {
            if (!a.key && b.key) return -1;
            if (a.key && !b.key) return 1;
            return a.key.localeCompare(b.key, undefined, { sensitivity: 'base' });
        });
    }

    private truncate(value: string): string {
        if (value.length <= CliItemHandlers.TRUNCATE_LENGTH) return value;
        return value.slice(0, CliItemHandlers.TRUNCATE_LENGTH).trimEnd() + '…';
    }

}