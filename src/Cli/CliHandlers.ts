import NoteToolbarPlugin from "main";
import { CliData, CliHandler, getIcon, normalizePath, TFile } from "obsidian";
import { ItemType, ScriptConfig, t, ToolbarItemSettings } from "Settings/NoteToolbarSettings";
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
            return async () => t('cli.error-command-not-found', { commandId });
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
        // TODO: support adding items from Gallery
        'note-toolbar': async (args: CliData) => {
            return this.cliDefinition.formatCommandList();
        },
        'note-toolbar:add-break': async (args: CliData) => {
            return this.addItemHandler(args, ItemType.Break, (item) => {});
        },
        'note-toolbar:add-command': async (args: CliData) => {
            return this.addItemHandler(args, ItemType.Command, (item) => {
                const command = this.ntb.app.commands.commands[args.command];
                if (!command) return t('cli.error-invalid-command', { commandId: args.command });
                item.linkAttr.commandId = args.command;
            });
        },
        'note-toolbar:add-js': async (args: CliData) => {
            return this.addItemHandler(args, ItemType.JavaScript, (item) => {
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
        },
        'note-toolbar:add-sep': async (args: CliData) => {
            return this.addItemHandler(args, ItemType.Separator, (item) => {});
        },
        'note-toolbar:add-spread': async (args: CliData) => {
            return this.addItemHandler(args, ItemType.Spreader, (item) => {});
        }
    };

    /**
     * Sets up a new item for `add-*` commands based on the CLI args, and adds it to the specified toolbar.
     * @param args CLI arguments
     * @param itemType ItemType of item to add
     * @param populateItem callback specific to the type of item being added, responsible for populating the item with the necessary params based on the CLI args; should return an error string if validation fails, or void if successful.
     * @returns success or error message
     */
    private async addItemHandler(
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