import NoteToolbarPlugin from "main";
import { CliData, CliHandler, getIcon, normalizePath, TFile } from "obsidian";
import { ItemType, ScriptConfig, t, ToolbarItemSettings, URL_USER_GUIDE } from "Settings/NoteToolbarSettings";
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
        'note-toolbar:add-js': this.handleAddJs.bind(this),
        'note-toolbar:add-sep': this.handleAddSep.bind(this),
        'note-toolbar:add-spread': this.handleAddSpread.bind(this),
        'note-toolbar:add-toolbar': this.handleAddToolbar.bind(this),
        'note-toolbar:items': this.handleItems.bind(this),
        'note-toolbar:toolbars': this.handleToolbars.bind(this),
        'note-toolbar:help': this.handleHelp.bind(this)
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
        });
    }

    async handleAddToolbar(args: CliData): Promise<string> {
        const toolbar = this.ntb.settingsManager.getToolbar(args.name);
        if (toolbar) return t('cli.error-toolbar-already-exists', { toolbar: args.name });
        const newToolbar = await this.ntb.settingsManager.newToolbar(args.name);
        return t('cli.success-toolbar-created', { toolbar: newToolbar.name });
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

    async handleAddSep(args: CliData): Promise<string> {
        return await this.addItemHelper(args, ItemType.Separator, (item) => {});
    }

    async handleAddSpread(args: CliData): Promise<string> {
        return await this.addItemHelper(args, ItemType.Spreader, (item) => {});
    }
    
    handleDefault(args: CliData): string {
        return this.cliDefinition.formatCommandList();
    }

    handleHelp(args: CliData): Promise<string> {
        activeWindow.open(URL_USER_GUIDE + 'Note-Toolbar-CLI', '_blank');
        return t('cli.success-uri-opened', { uri: URL_USER_GUIDE + 'Note-Toolbar-CLI', interpolation: { escapeValue: false } });
    }

    handleItems(args: CliData): string {
        const format = this.hasValue(args.format) ? args.format : 'tsv';
        const verbose = args.verbose !== undefined;
        // include empty items if verbose or --empty flag is present
        const includeEmpty = verbose || args.empty !== undefined;

        const separator = format === 'csv' ? ',' : '\t';

        type ItemRow = { key: string; cols: string[] };
        const rows: ItemRow[] = [];
        let emptyCount = 0;

        this.ntb.settings.toolbars.forEach((toolbar) => {
            toolbar.items.forEach((item) => {
                const label = item.label ?? '';
                const tooltip = item.tooltip ?? '';

                if (!label && !tooltip) {
                    if (includeEmpty) {
                        // empty items sort to the top via empty key
                    } else {
                        emptyCount++;
                        return;
                    }
                }

                const cols = verbose
                    ? [item.uuid, item.linkAttr.type ?? '', item.icon ?? '', label, tooltip, toolbar.uuid]
                    : [item.linkAttr.type ?? '', item.icon ?? '', label, tooltip];

                // sort key is label, falling back to tooltip; empty string sorts to top
                rows.push({ key: label || tooltip, cols });
            });
        });

        if (!rows.length && !emptyCount) return t('cli.no-items');

        rows.sort((a, b) => {
            if (!a.key && b.key) return -1;
            if (a.key && !b.key) return 1;
            return a.key.localeCompare(b.key, undefined, { sensitivity: 'base' });
        });

        // tabs in values are replaced with a space to avoid breaking TSV structure
        const escape = (val: string) =>
            format === 'csv' ? `"${val.replace(/"/g, '""')}"` : val.replace(/\t/g, ' ');

        const header = verbose
            ? ['uuid', 'type', 'icon', 'label', 'tooltip', 'toolbar'].join(separator)
            : ['type', 'icon', 'label', 'tooltip'].join(separator);

        const lines = [header, ...rows.map(r => r.cols.map(escape).join(separator))];

        if (emptyCount > 0) lines.push(`\n${t('cli.items-empty-not-shown', { count: emptyCount })}`);

        return lines.join('\n');
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
        const toolbar = this.ntb.settingsManager.getToolbar(args.toolbar);
        if (!toolbar) return t('cli.error-invalid-toolbar', { toolbar: args.toolbar });
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
            if (!file) return t('cli.error-file-not-found', { file: fileArg });
            return file;
        }
        if (this.hasValue(pathArg)) {
            const file = this.ntb.app.vault.getFileByPath(normalizePath(pathArg!));
            if (!file) return t('cli.error-path-not-found', { path: pathArg });
            return file;
        }
        return null;
    }

}