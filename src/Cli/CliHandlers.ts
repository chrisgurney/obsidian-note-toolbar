import NoteToolbarPlugin from "main";
import { CliData, CliHandler, getIcon, normalizePath, PaneType, TFile } from "obsidian";
import { ItemType, ScriptConfig, t, ToolbarItemSettings } from "Settings/NoteToolbarSettings";
import { importArgs } from "Utils/Utils";
import CliDefinition from "./CliDefinition";
import CliItemHandlers from "./CliItemHandlers";
import { color, hasValue } from "./CliUtils";

/**
 * Defines the CLI command handlers, registered to Obsidian's CLI in `CliManager`.
 */
export default class CliHandlers {

    private cliItemHandlers: CliItemHandlers;
    private language;

    constructor(
        private ntb: NoteToolbarPlugin,
        private cliDefinition: CliDefinition
    ) {
        this.language = (typeof i18next.language === 'string' && i18next.language.trim()) || 'en';
        this.cliItemHandlers = new CliItemHandlers(ntb);
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
        'note-toolbar:copy': this.handleCopy.bind(this),
        'note-toolbar:gallery': this.handleGallery.bind(this),
        'note-toolbar:help': this.handleHelp.bind(this),
        'note-toolbar:items': this.handleItems.bind(this),
        'note-toolbar:move': this.handleMove.bind(this),
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
            if (hasValue(args.code) || (hasValue(args.file) || hasValue(args.path))) {
                if (hasValue(args.code) && (hasValue(args.file) || hasValue(args.path))) {
                    return t('cli.error-js-code-and-file-exclusive');
                }
                const fileResult = this.resolveFileArgs(args.file, args.path);
                if (typeof fileResult === 'string') return fileResult; // error resolving file or path
                const file: TFile | null = fileResult;
                let scriptConfig: ScriptConfig = {
                    pluginFunction: hasValue(args.code) ? 'evaluate' : 'exec',
                    expression: args.code,
                    sourceFile: file?.path
                } as ScriptConfig;
                if (hasValue(args.args)) {
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

    async handleCopy(args: CliData): Promise<string> {
        const toolbar = this.ntb.settingsManager.getToolbar(args.to);
        if (!toolbar) return t('cli.error-invalid-toolbar', { toolbar: args.to });
        if (args.item.startsWith('gallery:')) {
            const galleryItemId = args.item.replace('gallery:', '');
            const galleryItem = this.ntb.gallery.getItemById(galleryItemId);
            if (!galleryItem) return t('cli.error-invalid-item', { item: args.item });
            const resolvedItem = await this.ntb.gallery.addItemToToolbar(toolbar, galleryItem);
            if (!resolvedItem) return '';
        }
        else {
            let item = this.ntb.settingsManager.getToolbarItemById(args.item);
            if (!item) return t('cli.error-invalid-item', { item: args.item });
            const position = args.pos ? parseInt(args.pos) - 1 : undefined;
            await this.ntb.settingsManager.duplicateToolbarItem(toolbar, item, position);
        }
        return t('cli.success-item-copied', { toolbar: toolbar.name });
    }

    handleDefault(args: CliData): string {
        // const win = activeWindow.open(URL_USER_GUIDE + 'Note-Toolbar-CLI', '_blank');
        // if (win) return t('cli.success-uri-opened', { uri: URL_USER_GUIDE + 'Note-Toolbar-CLI', interpolation: { escapeValue: false } })
        // else return '';
        return this.handleHelp(args);
    }

    handleGallery(args: CliData): string {
        const galleryItems = this.ntb.gallery.getItems();
        const widths = galleryItems.map(item => item.tooltip.length);
        const maxWidth = Math.max(...widths);
        return galleryItems.map(item => item.tooltip.padEnd(maxWidth) + '\t' + color(`gallery:${item.uuid}`, 'black')).join('\n');
    }

    handleHelp(args: CliData): string {
        return t('cli.label-title') + '\n\n' + t('cli.label-heading-commands') + '\n' + this.cliDefinition.formatCommandList();
    }

    handleItems(args: CliData): string {
        const toolbar = hasValue(args.toolbar) ? this.ntb.settingsManager.getToolbar(args.toolbar) : undefined;
        if (hasValue(args.toolbar) && !toolbar) return t('cli.error-invalid-toolbar', { toolbar: args.toolbar });
        return this.cliItemHandlers.getItemList(args, toolbar);
    }

    async handleMove(args: CliData): Promise<string> {
        const toolbar = this.ntb.settingsManager.getToolbar(args.to);
        if (!toolbar) return t('cli.error-invalid-toolbar', { toolbar: args.to });
        const item = this.ntb.settingsManager.getToolbarItemById(args.item);
        if (!item) return t('cli.error-invalid-item', { item: args.item });
        const position = args.pos ? parseInt(args.pos) - 1 : undefined;
        await this.ntb.settingsManager.moveToolbarItem(item, toolbar, position);
        return t('cli.success-item-moved', { toolbar: toolbar.name });
    }

    async handleNew(args: CliData): Promise<string> {
        const toolbar = this.ntb.settingsManager.getToolbar(args.name);
        if (toolbar) return t('cli.error-toolbar-already-exists', { toolbar: args.name });
        const newToolbar = await this.ntb.settingsManager.newToolbar(args.name);
        return t('cli.success-toolbar-created', { toolbar: newToolbar.name });
    }

    handleToolbars(args: CliData): string {
        const format = hasValue(args.format) ? args.format : 'text';
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
        if (hasValue(args.label) || hasValue(args.icon)) {
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
        const position = args.pos ? parseInt(args.pos) - 1 : undefined;
        await this.ntb.settingsManager.addToolbarItem(toolbar, item, position);
        return t('cli.success-item-added', { toolbar: toolbar.name });
    }

    /**
     * Checks if the given file, or path to a file, exists.
     * @returns corresponding TFile, null if there's nothing to check, or an error string
     */
    private resolveFileArgs(fileArg?: string, pathArg?: string): TFile | null | string {
        if (hasValue(fileArg)) {
            const activeFilePath = this.ntb.app.workspace.getActiveFile()?.path ?? '';
            const file = this.ntb.app.metadataCache.getFirstLinkpathDest(fileArg!, activeFilePath);
            if (!file) return t('cli.error-file-not-found', { file: fileArg, interpolation: { escapeValue: false } });
            return file;
        }
        if (hasValue(pathArg)) {
            const file = this.ntb.app.vault.getFileByPath(normalizePath(pathArg!));
            if (!file) return t('cli.error-path-not-found', { path: pathArg, interpolation: { escapeValue: false } });
            return file;
        }
        return null;
    }

}