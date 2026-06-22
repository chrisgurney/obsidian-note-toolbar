import NoteToolbarPlugin from "main";
import { CliData, CliHandler, getIcon, ItemView, normalizePath, PaneType, TFile } from "obsidian";
import { ItemType, ScriptConfig, t, ToolbarItemSettings } from "Settings/NoteToolbarSettings";
import ItemModal from "Settings/UI/Modals/ItemModal";
import { importFromCallout } from "Utils/ImportExport";
import { importArgs } from "Utils/Utils";
import CliDefinition from "./CliDefinition";
import CliItemsHandler from "./CliItemsHandler";
import { color, formatToolbarRef, hasValue } from "./CliUtils";

/**
 * Defines the CLI command handlers, registered to Obsidian's CLI in `CliManager`.
 */
export default class CliHandlers {

    private cliItemsHandler: CliItemsHandler;
    private language;

    constructor(
        private ntb: NoteToolbarPlugin,
        private cliDefinition: CliDefinition
    ) {
        this.language = (typeof i18next.language === 'string' && i18next.language.trim()) || 'en';
        this.cliItemsHandler = new CliItemsHandler(ntb);
    }

    public get(commandId: string): CliHandler {
        const handler = this.cliHandlers[commandId];
        if (!handler) {
            this.ntb.error(`CliManager: No handler registered for command "${commandId}"`);
            return () => t('cli.error-handler-not-found', { command: commandId });
        }
        return handler;
    }

	/*************************************************************************
	 * HANDLERS
	 *************************************************************************/

    /**
     * Defines the CLI command handlers, used in register().
     * Make sure to add new commands to `cli.json`.
     */
    public cliHandlers: Record<string, CliHandler> = {
        'note-toolbar': this.handleDefault.bind(this),
        'note-toolbar:add-break': this.handleAddBreak.bind(this),
        'note-toolbar:add-command': this.handleAddCommand.bind(this),
        'note-toolbar:add-dv': this.handleAddDv.bind(this),
        'note-toolbar:add-file': this.handleAddFile.bind(this),
        'note-toolbar:add-group': this.handleAddGroup.bind(this),
        'note-toolbar:add-js': this.handleAddJs.bind(this),
        'note-toolbar:add-menu': this.handleAddMenu.bind(this),
        'note-toolbar:add-sep': this.handleAddSep.bind(this),
        'note-toolbar:add-spread': this.handleAddSpread.bind(this),
        'note-toolbar:add-tp': this.handleAddTp.bind(this),
        'note-toolbar:add-tp:command': (args: CliData) => this.handleAddTp(args, 'parseTemplate'),
        'note-toolbar:add-tp:create': (args: CliData) => this.handleAddTp(args, 'createFrom'),
        'note-toolbar:add-tp:exec': (args: CliData) => this.handleAddTp(args, 'parseTemplateFile'),
        'note-toolbar:add-tp:insert': (args: CliData) => this.handleAddTp(args, 'appendTemplate'),
        'note-toolbar:add-uri': this.handleAddUri.bind(this),
        'note-toolbar:copy': this.handleCopy.bind(this),
        'note-toolbar:gallery': this.handleGallery.bind(this),
        'note-toolbar:help': this.handleHelp.bind(this),
        'note-toolbar:import': this.handleImport.bind(this),
        'note-toolbar:items': this.handleItems.bind(this),
        'note-toolbar:move': this.handleMove.bind(this),
        'note-toolbar:new': this.handleNew.bind(this),
        'note-toolbar:rules': this.handleRules.bind(this),
        'note-toolbar:settings': this.handleSettings.bind(this),
        'note-toolbar:status': this.handleStatus.bind(this),
        'note-toolbar:toolbars': this.handleToolbars.bind(this),
        'note-toolbar:use': this.handleUse.bind(this)
    };

    async handleAddBreak(args: CliData): Promise<string> {
        return await this.addItemHelper(args, ItemType.Break, () => {});
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

    async handleAddDv(args: CliData): Promise<string> {
        return await this.addItemHelper(args, ItemType.Dataview, (item) => {
            if (!(hasValue(args.eval) || hasValue(args.query)) && !(hasValue(args.file) || hasValue(args.path))) {
                return t('cli.error-dv-code-or-file-required');
            }
            // if (hasValue(args.eval) && (hasValue(args.file) || hasValue(args.path))) {
            //     return t('cli.error-dv-code-and-file-exclusive');
            // }
            const fileResult = this.resolveFileArgs(args.file, args.path);
            if (typeof fileResult === 'string') return fileResult; // error resolving file or path
            const file: TFile | null = fileResult;
            const scriptConfig: ScriptConfig = {
                pluginFunction: hasValue(args.eval) 
                    ? 'evaluate' 
                    : (hasValue(args.query) ? 'query' : 'exec'),
                expression: args.eval || args.query || '',
                sourceFile: file?.path
            };
            if (hasValue(args.args)) {
                const parsedArgs = importArgs(args.args);
                if (!parsedArgs) return t('cli.error-script-invalid-args', { args: args.args });
                scriptConfig.sourceArgs = args.args;
            }
            item.scriptConfig = scriptConfig;
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
                const scriptConfig: ScriptConfig = {
                    pluginFunction: hasValue(args.code) ? 'evaluate' : 'exec',
                    expression: args.code,
                    sourceFile: file?.path
                };
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
        return await this.addItemHelper(args, ItemType.Separator, () => {});
    }

    async handleAddSpread(args: CliData): Promise<string> {
        return await this.addItemHelper(args, ItemType.Spreader, () => {});
    }

    async handleAddTp(
        args: CliData, 
        pluginFunction?: 'appendTemplate' | 'createFrom' | 'parseTemplate' | 'parseTemplateFile'
    ): Promise<string> {
        if (!pluginFunction) return this.cliDefinition.formatCommandList('note-toolbar:add-tp:');
        // check for file/path argument when required
        let file: TFile | null;
        if (['appendTemplate', 'createFrom', 'parseTemplateFile'].contains(pluginFunction)) {
            if (!hasValue(args.file) && !hasValue(args.path)) {
                return t('cli.error-file-or-path-required');
            }
            const fileResult = this.resolveFileArgs(args.file, args.path);
            if (typeof fileResult === 'string') return fileResult; // error resolving file or path
            file = fileResult;
        }
        return await this.addItemHelper(args, ItemType.Templater, (item) => {
            const scriptConfig: ScriptConfig = {
                pluginFunction: pluginFunction,
                expression: args.command ?? '',
                outputFile: args.output ?? '',
                sourceFile: file?.path
            };
            item.scriptConfig = scriptConfig;
        });  
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
        const position = args.pos ? parseInt(args.pos) - 1 : undefined;

        const toolbar = this.ntb.settingsManager.getToolbar(args.to);
        if (!toolbar) return t('cli.error-invalid-toolbar', { toolbar: args.to });

        const ids = args.item.split(',').map(s => s.trim());

        let cliResult = '';
        let itemPosition = position;
        let itemsAdded = 0;
        for (const id of ids) {
            let item;
            if (id.startsWith('gallery:')) {
                const galleryItemId = id.replace('gallery:', '');
                item = this.ntb.gallery.getItemById(galleryItemId);
                if (!item) { cliResult += color(t('cli.error-invalid-item', { item: id }), 'red') + '\n'; continue; }
                if (item.linkAttr.type === ItemType.Additional) { cliResult += color(t('cli.error-cannot-add-additional-item', { item: item.tooltip }), 'red') + '\n'; continue; }
                const [newItem] = await this.ntb.gallery.addItemToToolbar(toolbar, item, itemPosition);
                if (newItem && itemPosition !== undefined) itemPosition++;
            }
            else {
                item = this.ntb.settingsManager.getToolbarItemById(id);
                if (!item) { cliResult += color(t('cli.error-invalid-item', { item: id }), 'red') + '\n'; continue; }
                await this.ntb.settingsManager.duplicateToolbarItem(toolbar, item, itemPosition);
                if (itemPosition !== undefined) itemPosition++;
            }
            if (item) {
                itemsAdded++;
                cliResult += t('cli.success-item-copied', { item: (item.label || item.tooltip || item.icon || item.uuid), interpolation: { escapeValue: false } }) + '\n';
            }
        }

        if (itemsAdded) cliResult += t('cli.success-item-copied-toolbar', { count: itemsAdded, toolbar: toolbar.name, interpolation: { escapeValue: false } });
        return cliResult;
    }

    handleDefault(args: CliData): string {
        return this.handleToolbars(args);
    }

    handleGallery(): string {
        const galleryItems = this.ntb.gallery.getItems();
        const widths = galleryItems.map(item => item.tooltip.length);
        const maxWidth = Math.max(...widths);
        return galleryItems.map(item => item.tooltip.padEnd(maxWidth) + '\t' + color(`gallery:${item.uuid}`, 'black')).join('\n');
    }

    handleHelp(): string {
        return t('cli.label-title') + '\n\n' + t('cli.label-heading-commands') + '\n' + this.cliDefinition.formatCommandList();
    }

    async handleImport(args: CliData): Promise<string> {
        // get the callout text from an argument, or file/path if provided
        let callout = hasValue(args.callout) ? args.callout : undefined;
        const fileResult = this.resolveFileArgs(args.file, args.path);
        if (typeof fileResult === 'string') return fileResult; // error resolving file or path
        callout = (!callout && fileResult) ? await this.ntb?.app.vault.cachedRead(fileResult) : callout;
        if (!callout) return t('cli.error-callout-or-file-required');

        const toolbar = hasValue(args.toolbar) ? this.ntb.settingsManager.getToolbar(args.toolbar) : undefined;

        const [ toolbarWithImport, errorLog, warningLog ] = importFromCallout(this.ntb, callout, toolbar);
        if (errorLog) return errorLog;

        // if a toolbar name was provided and it's not an existing toolbar, use the name for the new toolbar
        if (hasValue(args.toolbar) && !toolbar) toolbarWithImport.name = args.toolbar;
        
        if (!toolbar) {
            await this.ntb.settingsManager.addToolbar(toolbarWithImport);
        }
        else {
            await this.ntb.settingsManager.save();
        }
        
        let result = '';
        result = t('import.label-success-heading', { count: toolbarWithImport.items.length, toolbar: toolbarWithImport.name, interpolation: { escapeValue: false } } ) + '\n\n';
        result += this.cliItemsHandler.formatItemList({ includeEmpty: 'true', verbose: 'true' }, toolbarWithImport);
        if (warningLog) result += `\n\n${t('import.errorlog-warning-heading')}\n\n${warningLog}`;
        return result;
    }

    handleItems(args: CliData): string {
        const toolbar = hasValue(args.toolbar) ? this.ntb.settingsManager.getToolbar(args.toolbar) : undefined;
        if (hasValue(args.toolbar) && !toolbar) return t('cli.error-invalid-toolbar', { toolbar: args.toolbar });
        return this.cliItemsHandler.formatItemList(args, toolbar);
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

    handleRules(args: CliData): string {
        const format = hasValue(args.format) ? args.format : 'tsv';

        const mappings = this.ntb.settings.folderMappings;
        if (!mappings.length) return t('cli.no-mappings');
        
        type MappingSchema = 'position' | 'folder' | 'toolbar';
        const schema: MappingSchema[] = ['position', 'folder', 'toolbar'];

        const rows = mappings.map((mapping, i) => {
            const values: Record<MappingSchema, string> = { 
                position: String(i + 1),
                folder: mapping.folder, 
                toolbar: formatToolbarRef(this.ntb, mapping.toolbar) 
            };
            return schema.map(col => values[col]);
        });

        switch (format) {
            case 'csv': {
                const header = schema.join(',');
                const lines = rows.map(r =>
                    r.map(v => `"${v.replace(/"/g, '""')}"`).join(',')
                );
                return [header, ...lines].join('\n');
            }
            default: {
                const widths = rows.reduce((acc, r) => {
                    r.forEach((v, i) => { acc[i] = Math.max(acc[i] ?? 0, v.length); });
                    return acc;
                }, [] as number[]);

                return rows.map(r =>
                    r.map((v, i) => {
                        const padded = v.padEnd(widths[i]);
                        return padded;
                    }).join('\t').trimEnd()
                ).join('\n');
            }
        }

    }

    handleSettings(args: CliData): string {
        const itemId = hasValue(args.item) ? args.item : undefined;
        const toolbarId = hasValue(args.toolbar) ? args.toolbar : undefined;
        if (toolbarId) {
            const toolbar = this.ntb.settingsManager.getToolbar(toolbarId);
            if (!toolbar) return t('cli.error-invalid-toolbar', { toolbar: toolbarId, interpolation: { escapeValue: false } });
            this.ntb.settingsManager.openToolbarSettings(toolbar);
            return t('cli.success-settings-toolbar-opened', { toolbar: toolbar.name, interpolation: { escapeValue: false } });
        }
        if (itemId) {
            const item = this.ntb.settingsManager.getToolbarItemById(itemId);
            if (!item) return t('cli.error-invalid-item', { item: itemId });
            const itemToolbar = this.ntb.settingsManager.getToolbarByItemId(itemId);
            if (!itemToolbar) return t('cli.error-toolbar-not-found-for-item', { item: itemId });
            const itemModal = new ItemModal(this.ntb, itemToolbar, item);
            itemModal.open();
            return t('cli.success-settings-opened');
        }
        this.ntb.commands.openSettings();
        return t('cli.success-settings-opened');
    }

    handleStatus(args: CliData): string {
        const toolbar = this.ntb.settingsManager.getCurrentToolbar();
        const view = this.ntb.app.workspace.getActiveViewOfType(ItemView);
        const format = args.format as 'csv' | 'tsv' | undefined;

        type StatusSchema = 'view' | 'toolbar' | 'visible';
        const schema: StatusSchema[] = ['view', 'toolbar', 'visible'];

        const values: Record<StatusSchema, string> = {
            view:    view?.getDisplayText() ?? 'n/a',
            toolbar: toolbar?.name ?? 'n/a',
            visible: toolbar ? 'true' : 'false',
        };

        const rows = [schema.map(col => values[col])];

        switch (format) {
            case 'csv': {
                const header = schema.join(',');
                const lines = rows.map(r =>
                    r.map(v => `"${v.replace(/"/g, '""')}"`).join(',')
                );
                return [header, ...lines].join('\n');
            }
            default: {
                const widths = rows.reduce((acc, r) => {
                    r.forEach((v, i) => { acc[i] = Math.max(acc[i] ?? 0, v.length); });
                    return acc;
                }, [] as number[]);

                const header = schema.map((col, i) => col.padEnd(widths[i])).join('\t').trimEnd();
                const line = rows[0].map((v, i) => {
                    const padded = v.padEnd(widths[i]);
                    if (schema[i] === 'toolbar') return color(padded, 'green');
                    if (schema[i] === 'visible' && v === 'false') return color(padded, 'red');
                    return padded;
                }).join('\t').trimEnd();
                return [header, line].join('\n');
            }
        }
    }

    handleToolbars(args: CliData): string {
        const format = hasValue(args.format) ? args.format : 'tsv';
        const verbose = args.verbose !== undefined;
        const isTotal = args.total !== undefined;

        if (hasValue(args.toolbar)) {
            const toolbar = this.ntb.settingsManager.getToolbar(args.toolbar);
            if (!toolbar) return t('cli.error-invalid-toolbar', { toolbar: args.toolbar });
            return this.cliItemsHandler.formatItemList(args, toolbar);
        }

        const toolbars = [...this.ntb.settings.toolbars].sort(
            (a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
        );

        if (isTotal) return String(toolbars.length);
        
        if (!toolbars.length) return t('cli.no-toolbars');

        type ToolbarSchema = 'name' | 'uuid';
        const schema: ToolbarSchema[] = verbose ? ['name', 'uuid'] : ['name'];

        const rows = toolbars.map(tb => {
            const values: Record<ToolbarSchema, string> = { name: tb.name, uuid: tb.uuid };
            return schema.map(col => values[col]);
        });

        switch (format) {
            case 'csv': {
                const header = schema.join(',');
                const lines = rows.map(r =>
                    r.map(v => `"${v.replace(/"/g, '""')}"`).join(',')
                );
                return [header, ...lines].join('\n');
            }
            default: {
                const widths = rows.reduce((acc, r) => {
                    r.forEach((v, i) => { acc[i] = Math.max(acc[i] ?? 0, v.length); });
                    return acc;
                }, [] as number[]);

                return rows.map(r =>
                    r.map((v, i) => {
                        const padded = v.padEnd(widths[i]);
                        return schema[i] === 'uuid' ? color(padded, 'green') : padded;
                    }).join('\t').trimEnd()
                ).join('\n');
            }
        }
    }

    async handleUse(args: CliData): Promise<string> {
        const item = this.ntb.settingsManager.getToolbarItemById(args.item);
        if (!item) return t('cli.error-invalid-item', { item: args.item });
        const fileResult = this.resolveFileArgs(args.file, args.path);
        if (typeof fileResult === 'string') return fileResult; // error resolving file or path
        const activeFile = fileResult || this.ntb.app.workspace.getActiveFile();
        await this.ntb.items.handleItemLink(item, undefined, activeFile);
        return 'Used item: ' + (item.label || item.tooltip || item.uuid);
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
            const file = this.ntb.app.metadataCache.getFirstLinkpathDest(fileArg, activeFilePath);
            if (!file) return t('cli.error-file-not-found', { file: fileArg, interpolation: { escapeValue: false } });
            return file;
        }
        if (hasValue(pathArg)) {
            const file = this.ntb.app.vault.getFileByPath(normalizePath(pathArg));
            if (!file) return t('cli.error-path-not-found', { path: pathArg, interpolation: { escapeValue: false } });
            return file;
        }
        return null;
    }

}