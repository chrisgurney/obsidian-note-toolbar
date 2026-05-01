import NoteToolbarPlugin from "main";
import { CliData, CliHandler, getIcon, normalizePath, PaneType, TFile } from "obsidian";
import { ItemType, ScriptConfig, t, ToolbarItemSettings, ToolbarSettings, URL_USER_GUIDE } from "Settings/NoteToolbarSettings";
import { importArgs, tr } from "Utils/Utils";
import CliDefinition from "./CliDefinition";

/**
 * Defines the CLI command handlers, registered to Obsidian's CLI in `CliManager`.
 */
export default class CliHandlers {

    private language;

    constructor(
        private ntb: NoteToolbarPlugin,
        private cliDefinition: CliDefinition
    ) {
        this.language = (typeof i18next.language === 'string' && i18next.language.trim()) || 'en';
    }

    public get(commandId: string): CliHandler {
        const handler = this.cliHandlers[commandId];
        if (!handler) {
            this.ntb.error(`CliManager: No handler registered for command "${commandId}"`);
            return async () => t('cli.error-handler-not-found', { command: commandId });
        }
        return handler;
    }

	/*************************************************************************
	 * HANDLERS
	 *************************************************************************/

    /**
     * Defines the CLI command handlers, used in register().
     */
    public cliHandlers: Record<string, CliHandler> = {
        'note-toolbar': this.handleDefault.bind(this),
        'note-toolbar:add-break': this.handleAddBreak.bind(this),
        'note-toolbar:add-command': this.handleAddCommand.bind(this),
        'note-toolbar:add-file': this.handleAddFile.bind(this),
        'note-toolbar:add-group': this.handleAddGroup.bind(this),
        'note-toolbar:add-js': this.handleAddJs.bind(this),
        'note-toolbar:add-menu': this.handleAddMenu.bind(this),
        'note-toolbar:add-sep': this.handleAddSep.bind(this),
        'note-toolbar:add-spread': this.handleAddSpread.bind(this),
        'note-toolbar:add-uri': this.handleAddUri.bind(this),
        'note-toolbar:help': this.handleHelp.bind(this),
        'note-toolbar:items': this.handleItems.bind(this),
        'note-toolbar:new': this.handleNew.bind(this),
        'note-toolbar:toolbars': this.handleToolbars.bind(this)
    };

    async handleAddBreak(args: CliData): Promise<string> {
        return await this.addItemHelper(args, ItemType.Break, (item) => {});
    }

    async handleAddCommand(args: CliData): Promise<string> {
        return await this.addItemHelper(args, ItemType.Command, (item) => {
            const command = this.ntb.app.commands.commands[args.command];
            if (!command) return t('cli.error-invalid-command', { commandId: args.command });
            item.linkAttr.commandId = args.command;
            if (args.focus === 'true') item.linkAttr.focus = 'editor';
            if (args.target) {
                if (!['split', 'tab'].contains(args.target)) return t('cli.error-invalid-target', { target: args.target });
                item.linkAttr.target = args.target as 'split' | 'tab';
            }
        });
    }

    async handleAddFile(args: CliData): Promise<string> {
        return await this.addItemHelper(args, ItemType.File, (item) => {
            const fileResult = this.resolveFileArgs(args.file, args.path);
            if (typeof fileResult === 'string') return fileResult; // error resolving file or path
            const file: TFile | null = fileResult;
            if (!file) return t('cli.error-file-or-path-required');
            item.link = file.path;
            if (args.target) {
                if (!['modal', 'split', 'tab', 'window'].contains(args.target)) return t('cli.error-invalid-target', { target: args.target });
                item.linkAttr.target = args.target as PaneType | 'modal';
            }
        });
    }

    async handleAddGroup(args: CliData): Promise<string> {
        return await this.addItemHelper(args, ItemType.Group, (item) => {
            const groupToolbar = this.ntb.settingsManager.getToolbar(args.group);
            if (!groupToolbar) return t('cli.error-invalid-toolbar', { toolbar: args.group });
            item.link = groupToolbar.uuid;
        });
    }

    async handleAddJs(args: CliData): Promise<string> {
        return await this.addItemHelper(args, ItemType.JavaScript, (item) => {
            if (this.hasValue(args.code) || (this.hasValue(args.file) || this.hasValue(args.path))) {
                if (this.hasValue(args.code) && (this.hasValue(args.file) || this.hasValue(args.path))) {
                    return t('cli.error-js-code-and-file-exclusive');
                }
                const fileResult = this.resolveFileArgs(args.file, args.path);
                if (typeof fileResult === 'string') return fileResult; // error resolving file or path
                const file: TFile | null = fileResult;
                let scriptConfig: ScriptConfig = {
                    pluginFunction: this.hasValue(args.code) ? 'evaluate' : 'exec',
                    expression: args.code,
                    sourceFile: file?.path
                } as ScriptConfig;
                if (this.hasValue(args.args)) {
                    const parsedArgs = importArgs(args.args);
                    if (!parsedArgs) return t('cli.error-script-invalid-args', { args: args.args });
                    scriptConfig.sourceArgs = args.args;
                }
                item.scriptConfig = scriptConfig;
            }
            else {
                return t('cli.error-js-code-or-file-required');
            }
        });
    }

    async handleAddMenu(args: CliData): Promise<string> {
        return await this.addItemHelper(args, ItemType.Menu, (item) => {
            const menuToolbar = this.ntb.settingsManager.getToolbar(args.menu);
            if (!menuToolbar) return t('cli.error-invalid-toolbar', { toolbar: args.menu });
            item.link = menuToolbar.uuid;
        });
    }

    async handleAddSep(args: CliData): Promise<string> {
        return await this.addItemHelper(args, ItemType.Separator, (item) => {});
    }

    async handleAddSpread(args: CliData): Promise<string> {
        return await this.addItemHelper(args, ItemType.Spreader, (item) => {});
    }

    async handleAddUri(args: CliData): Promise<string> {
        return await this.addItemHelper(args, ItemType.Uri, (item) => {
            item.link = args.uri;
            if (args.target) {
                if (!['modal', 'split', 'tab', 'window'].contains(args.target)) return t('cli.error-invalid-target', { target: args.target });
                item.linkAttr.target = args.target as PaneType | 'modal';
            }
        });
    }

    handleDefault(args: CliData): string {
        // const win = activeWindow.open(URL_USER_GUIDE + 'Note-Toolbar-CLI', '_blank');
        // if (win) return t('cli.success-uri-opened', { uri: URL_USER_GUIDE + 'Note-Toolbar-CLI', interpolation: { escapeValue: false } })
        // else return '';
        return this.handleHelp(args);
    }

    handleHelp(args: CliData): string {
        return t('cli.label-title') + '\n\n' + t('cli.label-heading-commands') + '\n' + this.cliDefinition.formatCommandList();
    }

    handleItems(args: CliData): string {
        const toolbar = this.hasValue(args.toolbar) ? this.ntb.settingsManager.getToolbar(args.toolbar) : undefined;
        if (this.hasValue(args.toolbar) && !toolbar) return t('cli.error-invalid-toolbar', { toolbar: args.toolbar });
        return this.getItemList(args, toolbar);
    }

    async handleNew(args: CliData): Promise<string> {
        const toolbar = this.ntb.settingsManager.getToolbar(args.name);
        if (toolbar) return t('cli.error-toolbar-already-exists', { toolbar: args.name });
        const newToolbar = await this.ntb.settingsManager.newToolbar(args.name);
        return t('cli.success-toolbar-created', { toolbar: newToolbar.name });
    }

    handleToolbars(args: CliData): string {
        const format = this.hasValue(args.format) ? args.format : 'text';
        const verbose = args.verbose !== undefined;

        const toolbars = [...this.ntb.settings.toolbars].sort(
            (a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
        );

        if (!toolbars.length) return t('cli.no-toolbars');

        switch (format) {
            case 'csv': {
                const header = verbose ? 'uuid,name' : 'name';
                const rows = toolbars.map(tb =>
                    verbose
                        ? `"${tb.uuid}","${tb.name.replace(/"/g, '""')}"`
                        : `"${tb.name.replace(/"/g, '""')}"`
                );
                return [header, ...rows].join('\n');
            }
            default: {
                return toolbars.map(tb =>
                    verbose ? `${tb.uuid}\t${tb.name}` : tb.name
                ).join('\n');
            }
        }
    }

	/*************************************************************************
	 * HANDLER HELPERS
	 *************************************************************************/

    private static readonly TRUNCATE_LENGTH = 32;

    private truncate(value: string): string {
        if (value.length <= CliHandlers.TRUNCATE_LENGTH) return value;
        return value.slice(0, CliHandlers.TRUNCATE_LENGTH).trimEnd() + '…';
    }

    /**
     * Builds a list of items from the specified toolbars, formatted for display in the CLI.
     */
    private buildItemRows(
        toolbars: ToolbarSettings[],
        verbose: boolean,
        includeEmpty: boolean,
        truncate: boolean
    ): { rows: { key: string; cols: string[] }[]; emptyCount: number } {
        type ItemRow = { key: string; cols: string[] };
        const rows: ItemRow[] = [];
        const singleToolbar = toolbars.length === 1;
        if (singleToolbar) includeEmpty = true;
        let emptyCount = 0;

        toolbars.forEach((toolbar) => {
            toolbar.items.forEach((item, index) => {
                const label = (truncate && !verbose) ? this.truncate(item.label ?? '') : (item.label ?? '');
                const tooltip = (truncate && !verbose) ? this.truncate(item.tooltip ?? '') : (item.tooltip ?? '');

                if (!label && !tooltip) {
                    if (includeEmpty) {
                        // empty items sort to the top via empty key
                    } else {
                        emptyCount++;
                        return;
                    }
                }

                const itemText = verbose ? [label, tooltip] : [label || tooltip || ''];
                if ([ItemType.Group, ItemType.Menu].contains(item.linkAttr.type) && item.link) {
                    const linkedToolbar = this.ntb.settingsManager.getToolbarById(item.link);
                    const linkedName = linkedToolbar ? linkedToolbar.name : t('cli.label-unknown-toolbar');
                    itemText.push(`toolbar:${linkedName}`);
                }
                
                const itemToolbar = singleToolbar ? '' : toolbar.uuid;
                let cols = verbose
                    ? [item.uuid, item.linkAttr.type ?? '', ...itemText, item.icon ?? '', itemToolbar]
                    : [item.linkAttr.type ?? '', ...itemText];
                if (singleToolbar) cols = [index.toString(), ...cols];

                rows.push({ key: item.label || item.tooltip || '', cols });
            });
        });

        if (!singleToolbar) {
            rows.sort((a, b) => {
                if (!a.key && b.key) return -1;
                if (a.key && !b.key) return 1;
                return a.key.localeCompare(b.key, undefined, { sensitivity: 'base' });
            });
        }

        return { rows, emptyCount };
    }

    private getItemList(
        args: CliData,
        toolbar?: ToolbarSettings
    ): string {
        const format = this.hasValue(args.format) ? args.format : 'table';
        const verbose = args.verbose !== undefined;
        const includeEmpty = verbose || args.empty !== undefined;
        const isCsv = format === 'csv';

        const toolbars = toolbar ? [toolbar] : this.ntb.settings.toolbars;
        const { rows, emptyCount } = this.buildItemRows(toolbars, verbose, includeEmpty, !isCsv);

        if (!rows.length && !emptyCount) return t('cli.no-items');

        let lines: string[];

        if (isCsv) {
            const header = verbose
                ? ['uuid', 'type', 'icon', 'label', 'tooltip', 'toolbar'].join(',')
                : ['type', 'icon', 'label', 'tooltip'].join(',');
            const escape = (val: string) => `"${val.replace(/"/g, '""')}"`;
            lines = [header, ...rows.map(r => r.cols.map(escape).join(','))];
        } else {
            const colWidths = rows.reduce((widths, row) => {
                row.cols.forEach((col, i) => {
                    widths[i] = Math.max(widths[i] ?? 0, col.length);
                });
                return widths;
            }, [] as number[]);

            lines = rows.map(r =>
                r.cols.map((col, i) => col.padEnd(colWidths[i])).join('  ').trimEnd()
            );
        }

        if (emptyCount > 0) lines.push(`\n${t('cli.items-empty-not-shown', { count: emptyCount })}`);

        return lines.join('\n');
    }

	/*************************************************************************
	 * HELPERS
	 *************************************************************************/

    /**
     * Sets the label, icon, and tooltip on an item from CLI args.
     * @returns an error string if validation fails, otherwise undefined
     */
    private addItemArgs(item: ToolbarItemSettings, args: CliData): string | undefined {
        if (this.hasValue(args.label) || this.hasValue(args.icon)) {
            if (args.label) item.label = args.label;
            if (args.icon) {
                const icon = getIcon(args.icon);
                if (!icon) return t('cli.error-invalid-icon', { iconId: args.icon });
                item.icon = args.icon;
            }
        }
        else {
            return t('cli.error-label-or-icon-required');
        }
        if (args.tooltip) item.tooltip = args.tooltip;
    }

    /**
     * Sets up a new item for `add-*` commands based on the CLI args, and adds it to the specified toolbar.
     * @param args CLI arguments
     * @param itemType ItemType of item to add
     * @param populateItem callback specific to the type of item being added, responsible for populating the item with the necessary params based on the CLI args; should return an error string if validation fails, or void if successful.
     * @returns success or error message
     */
    private async addItemHelper(
        args: CliData, 
        itemType: ItemType, 
        populateItem: (item: ToolbarItemSettings) => string | void
    ): Promise<string> {
        // get the toolbar and create a default item
        const toolbar = this.ntb.settingsManager.getToolbar(args.to);
        if (!toolbar) return t('cli.error-invalid-toolbar', { toolbar: args.to });
        const item = this.ntb.settingsManager.getDefaultItem(itemType);
        // execute the type-specific population logic
        const itemError = populateItem(item);
        if (itemError) return itemError;
        // apply the label, icon, and tooltip
        if (![ItemType.Break, ItemType.Group, ItemType.Separator, ItemType.Spreader].contains(itemType)) {
            const labelIconTooltipError = this.addItemArgs(item, args);
            if (labelIconTooltipError) return labelIconTooltipError;
        }
        // add the item to the toolbar
        const position = args.pos ? parseInt(args.pos) : undefined;
        await this.ntb.settingsManager.addToolbarItem(toolbar, item, position);
        return t('cli.success-item-added', { toolbar: toolbar.name });
    }

    /**
     * Checks if a CLI flag value is provided and not just the string "true".
     * @param arg argument to check
     * @returns true if the argument has a meaningful value, false if it's undefined or the string "true"
     */
    private hasValue(arg: string | undefined): arg is string {
        return !!arg && arg !== 'true';
    }

    /**
     * Checks if the given file, or path to a file, exists.
     * @returns corresponding TFile, null if there's nothing to check, or an error string
     */
    private resolveFileArgs(fileArg?: string, pathArg?: string): TFile | null | string {
        if (this.hasValue(fileArg)) {
            const activeFilePath = this.ntb.app.workspace.getActiveFile()?.path ?? '';
            const file = this.ntb.app.metadataCache.getFirstLinkpathDest(fileArg!, activeFilePath);
            if (!file) return t('cli.error-file-not-found', { file: fileArg, interpolation: { escapeValue: false } });
            return file;
        }
        if (this.hasValue(pathArg)) {
            const file = this.ntb.app.vault.getFileByPath(normalizePath(pathArg!));
            if (!file) return t('cli.error-path-not-found', { path: pathArg, interpolation: { escapeValue: false } });
            return file;
        }
        return null;
    }

}