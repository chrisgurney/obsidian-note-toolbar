import NoteToolbarPlugin from "main";
import { CliData } from "obsidian";
import { ItemType, ScriptConfig, ToolbarItemSettings, ToolbarSettings, t } from "Settings/NoteToolbarSettings";
import { hasValue } from "./CliUtils";

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
        const includeEmpty = verbose || args.empty !== undefined;
        const isCsv = format === 'csv';
        const isJson = format === 'json';
        const isTotal = args.total !== undefined;

        const toolbars = toolbar ? [toolbar] : this.ntb.settings.toolbars;

        const { rows, emptyCount } = this.buildItemRows(
            toolbars,
            verbose,
            includeEmpty,
            !verbose && !isCsv
        );

        if (isTotal) return String(rows.length);

        if (!rows.length && !emptyCount) return t('cli.no-items');

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
        } else {
            const widths = rows.reduce((acc, r) => {
                r.cols.forEach((c, i) => {
                    acc[i] = Math.max(acc[i] ?? 0, c.length);
                });
                return acc;
            }, [] as number[]);

            lines = rows.map(r =>
                r.cols.map((c, i) => c.padEnd(widths[i])).join('  ').trimEnd()
            );
        }

        if (emptyCount > 0) {
            lines.push(`\n${t('cli.items-empty-not-shown', { count: emptyCount })}`);
        }

        return lines.join('\n');
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
        truncate: boolean
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
                            truncate
                        );

                        // skip separators in non-verbose single-toolbar mode
                        const isSep = [ItemType.Break, ItemType.Separator, ItemType.Spreader].includes(item.linkAttr.type as ItemType);
                        if (isSep && !single && !verbose) {
                            return inner;
                        }

                        const isEmpty = cols.every(c => !c);

                        if (isEmpty && !includeEmpty) {
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

    private formatText(value: string | undefined, truncate: boolean): string {
        const v = value ?? '';
        return truncate ? this.truncate(v) : v;
    }

    private getColumnSchema(verbose: boolean, single: boolean): ColumnSchema {
        if (verbose) {
            return single
                ? ['position', 'uuid', 'type', 'labelTooltipIcon', 'icon', 'value']
                : ['uuid', 'type', 'labelTooltipIcon', 'icon', 'value', 'toolbar'];
        }
        return single
            ? ['position', 'type', 'labelTooltipIcon', 'value']
            : ['type', 'labelTooltipIcon', 'value', 'toolbar'];
    }

    private getItemText(item: ToolbarItemSettings): string {
        switch (item.linkAttr.type) {
            case ItemType.Group:
                return '-->';
            default:
                return item.label || item.tooltip || item.icon || '';
        }
    }

    private getItemValue(item: ToolbarItemSettings): string {
        switch (item.linkAttr.type) {
            case ItemType.Command:
                return item.linkAttr.commandId ?? '';
            case ItemType.Dataview:
            case ItemType.JsEngine:
            case ItemType.JavaScript:
            case ItemType.Templater:
                return this.getScriptSummary(item.scriptConfig);
            case ItemType.File:
            case ItemType.Uri:
                return item.link ?? '';
            case ItemType.Group:
            case ItemType.Menu:
                return this.getToolbarRef(item.link);
            default:
                return '';
        }
    }

    private getScriptSummary(config: ScriptConfig | undefined): string {
        if (!config) return '';
        let parts: string[] = [];
        let pluginFunction = `${config.pluginFunction}:`;
        if (config.sourceFile) parts.push(`${config.sourceFile}`);
        if (config.sourceFunction) parts.push(`${config.sourceFunction}`);
        if (config.expression) parts.push(`${config.expression}`);
        return pluginFunction + parts.join(' | ');
    }

    private getToolbarRef(id?: string): string {
        if (!id) return '';

        const tb = this.ntb.settingsManager.getToolbarById(id);
        const name = tb?.name ?? t('cli.label-unknown-toolbar');

        return `toolbar:${name}`;
    }

    private projectItem(
        item: ToolbarItemSettings,
        toolbar: ToolbarSettings,
        index: number,
        schema: ColumnSchema,
        verbose: boolean,
        truncate: boolean
    ): string[] {
        const map: Record<ColumnSpec, string> = {
            position: String(index + 1),

            uuid: item.uuid,
            type: item.linkAttr.type ?? '',

            label: this.formatText(item.label, truncate),
            tooltip: this.formatText(item.tooltip, truncate),
            icon: item.icon ?? '',

            labelTooltipIcon: this.formatText(this.getItemText(item), truncate),

            toolbar: this.getToolbarRef(toolbar.uuid),

            value: this.formatText(this.getItemValue(item), truncate),

            link: item.link ?? '',

            command: item.linkAttr.commandId ?? '',

            toolbarRef: this.getToolbarRef(item.link)
        };

        return schema.map((col) => map[col] ?? '');
    }

    // private sortItemRows(rows: ItemRow[]): void {
    //     rows.sort((a, b) => {
    //         if (!a.key && b.key) return -1;
    //         if (a.key && !b.key) return 1;
    //         return a.key.localeCompare(b.key, undefined, { sensitivity: 'base' });
    //     });
    // }

    private truncate(value: string): string {
        if (value.length <= CliItemHandlers.TRUNCATE_LENGTH) return value;
        return value.slice(0, CliItemHandlers.TRUNCATE_LENGTH).trimEnd() + '…';
    }

}