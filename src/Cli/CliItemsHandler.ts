import NoteToolbarPlugin from "main";
import { CliData } from "obsidian";
import { ItemType, ScriptConfig, ToolbarItemSettings, ToolbarSettings, t } from "Settings/NoteToolbarSettings";
import { color, formatToolbarRef, hasValue } from "./CliUtils";

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

/**
 * Handles formatting the output of the `note-toolbar:items` command.
 */
export default class CliItemsHandler {

    constructor(
        private ntb: NoteToolbarPlugin
    ) {}

    /**
     * Outputs the list of items, formatted per the given arguments.
     * @param args CLI arguments
     * @param toolbar if provided, output is scoped to the toolbar
     * @returns the list of items
     */
    formatItemList(args: CliData, toolbar?: ToolbarSettings): string {
        const filter = args.filter ?? '';
        const format = hasValue(args.format) ? args.format : 'tsv';
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
            filter,
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
                    ...this.formatItemRow(row, widths, schema, verbose)
                );
            });
        }

        if (emptyCount > 0) {
            lines.push(`\n${color(t('cli.items-empty-not-shown', { count: emptyCount }), 'green')}`);
        }

        return lines.join('\n');
    }

	/*************************************************************************
	 * OUTPUT BUILDERS
	 *************************************************************************/
    
    /**
     * Builds a list of items from the specified toolbars, formatted for display in the CLI.
     */
    private buildItemRows(
        toolbars: ToolbarSettings[],
        verbose: boolean,
        includeEmpty: boolean,
        filter: string,
        truncateDisplay: boolean,
        truncateValue: boolean
    ): { rows: ItemRow[]; emptyCount: number } {
        const single = toolbars.length === 1;
        const schema = this.getColumnSchema(verbose, single);

        return toolbars.reduce(
            (acc, toolbar) => {
                const result = toolbar.items.reduce(
                    (inner, item, index) => {
                        const cols = this.projectItemToRow(
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
                        
                        if (filter && !(this.formatItemText(item, verbose).includes(filter))) {
                            return inner;
                        };

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

    private projectItemToRow(
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
            type: this.formatItemType(item),

            label: this.formatWithTruncation(item.label, truncateDisplay),
            tooltip: this.formatWithTruncation(item.tooltip, truncateDisplay),
            icon: item.icon ?? '',

            labelTooltipIcon: this.formatWithTruncation(this.formatItemText(item, verbose), truncateDisplay),

            toolbar: formatToolbarRef(this.ntb, toolbar.uuid),

            value: this.formatWithTruncation(this.formatItemValue(item, verbose), truncateValue),

            link: item.link ?? '',

            command: item.linkAttr.commandId ?? '',

            toolbarRef: formatToolbarRef(this.ntb, item.link)
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

	/*************************************************************************
	 * OUTPUT FORMATTERS
	 *************************************************************************/

    private formatItemRow(
        row: ItemRow, 
        widths: number[], 
        schema: ColumnSchema, 
        verbose: boolean
    ): string[] {
        const lines: string[] = [];

        // normal single-line row
        
        if (!verbose) {
            const line = this.formatRow(row.cols, widths, schema);
            lines.push(line);
            return lines;
        }

        // in verbose mode, show a row and value detail under the row

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

        const line = this.formatRow(headCols, headWidths, schema);
        lines.push(line);

        if (valueCol) {
            valueCol.split('\n').forEach(l => {
                lines.push(color('  ' + l, 'black'));
            });
        }

        return lines;
    }

    /**
     * Creates a string representation of the visible parts of an item.
     * @param item item to display
     * @param verbose true if the value should display more detail
     * @returns item's visible string representation
     */
    private formatItemText(item: ToolbarItemSettings, verbose: boolean): string {
        switch (item.linkAttr.type) {
            case ItemType.Break:
            case ItemType.Separator:
            case ItemType.Spreader:
                return '---';
            case ItemType.Group:
                return formatToolbarRef(this.ntb, item.link);
            default:
                return (item.label ? item.label + (verbose && item.tooltip ? ` | ${item.tooltip}` : '') : item.tooltip) 
                    || (item.icon ? `icon:${item.icon}` : '') || '';
        }
    }

    /**
     * Creates a string representation of the type of the item.
     * @param item item to get the type of
     * @returns item's type string representation
     */
    private formatItemType(item: ToolbarItemSettings): string {
        if (!item.linkAttr.type) return '';
        switch (item.linkAttr.type) {
            case ItemType.Dataview:
            case ItemType.JavaScript:
            case ItemType.JsEngine:
            case ItemType.Templater:
                return item.scriptConfig?.pluginFunction ? `${item.linkAttr.type} (${item.scriptConfig?.pluginFunction})` : item.linkAttr.type;
            default:
                return item.linkAttr.type;
        }
    }

    /**
     * Creates a string representation of the value of the item, based on its type.
     * @param item item to get the value of
     * @param verbose true if the value should display more detail
     * @returns item's value string representation
     */
    private formatItemValue(item: ToolbarItemSettings, verbose: boolean): string {
        switch (item.linkAttr.type) {
            case ItemType.Command:
                return item.linkAttr.commandId ?? '';
            case ItemType.Dataview:
            case ItemType.JsEngine:
            case ItemType.JavaScript:
            case ItemType.Templater:
                return this.formatScriptSummary(item.scriptConfig, verbose);
            case ItemType.File:
            case ItemType.Uri:
                return item.link ?? '';
            case ItemType.Menu:
                return formatToolbarRef(this.ntb, item.link);
            default:
                return '';
        }
    }

    /**
     * Takes the columns of a row and returns them as a colored, tab-separated string.
     */
    private formatRow(cols: string[], widths: number[], schema: ColumnSchema): string {
        return cols
            .map((c, i) => {
                const padded = c.padEnd(widths[i]);
                if (['toolbar', 'uuid'].contains(schema[i])) return color(padded, 'green'); 
                return padded;
            })
            .join('\t')
            .trimEnd();
    }

    /**
     * Creates a string representation of the script settings of an item.
     */
    private formatScriptSummary(config: ScriptConfig | undefined, verbose: boolean): string {
        if (!config) return '';
        const parts: string[] = [];
        if (config.sourceFile) parts.push(`${config.sourceFile}`);
        if (config.sourceFunction) parts.push(`${config.sourceFunction}`);
        if (config.expression) parts.push(verbose ? config.expression : config.expression.replace(/\n/g, ' '));
        return parts.join(' | ');
    }

    /**
     * Truncates the provided string, if requested.
     */
    private formatWithTruncation(value: string | undefined, truncate: boolean): string {
        const v = value ?? '';
        return truncate ? this.truncate(v) : v;
    }

	/*************************************************************************
	 * UTILITIES
	 *************************************************************************/

    private static readonly TRUNCATE_LENGTH = 32;

    private isEmpty(item: ToolbarItemSettings): boolean {
        if (this.isSeparator(item)) return false;
        return (item.label || item.tooltip || item.icon) === '';
    }

    private isSeparator(item: ToolbarItemSettings): boolean {
        return [ItemType.Break, ItemType.Separator, ItemType.Spreader].includes(item.linkAttr.type);
    }

    private truncate(value: string): string {
        if (value.length <= CliItemsHandler.TRUNCATE_LENGTH) return value;
        return value.slice(0, CliItemsHandler.TRUNCATE_LENGTH).trimEnd() + '…';
    }

}