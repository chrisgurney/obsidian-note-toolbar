import cliDefJson from "Cli/cli.json";
import NoteToolbarPlugin from "main";
import { CliData, CliFlags, CliHandler, getIcon, normalizePath, TFile } from "obsidian";
import { ItemType, ScriptConfig, t, ToolbarItemSettings } from "Settings/NoteToolbarSettings";
import { importArgs, tr } from "Utils/Utils";

interface CliLocalizedString {
    [locale: string]: string;
}

interface CliLocalizedFlag {
    description: CliLocalizedString;
    value?: CliLocalizedString | null;
    required?: boolean;
}

interface CliActionFlags {
    $before?: string[];
    $after?: string[];
    [key: string]: CliLocalizedFlag | string[] | undefined;
}

interface CliAction {
    id: string;
    description: CliLocalizedString;
    flags: CliActionFlags;
    since?: string;
    docs?: string;
    examples?: {
        docs?: string;
        command: string;
    }[];
}

interface CliDef {
    id: string;
    description: CliLocalizedString;
    heading: CliLocalizedString;
    docs?: string;
    commonFlags: Record<string, CliLocalizedFlag>;
    actions: CliAction[];
}

export default class CliManager {

    private cliDef: CliDef = cliDefJson;

    constructor(
        private ntb: NoteToolbarPlugin
    ) {}
    
    /**
     * Register the plugin's CLI commands, as defined in `cli.json`. Called from plugin's `onLayoutReady()`.
     */
    register(): void {

        let commands = [];
        const language = (typeof i18next.language === 'string' && i18next.language.trim()) || 'en';

        // default command: displays list of available actions
        commands.push({
            id: this.cliDef.id,
            description: tr(this.cliDef.description, language) ?? '',
            flags: null,
            handler: async () => {
                const heading = tr(this.cliDef.heading, language) ?? '';
                const actions = this.cliDef.actions
                    .map((cmd: any) => `\x1b[90m${cmd.id.padEnd(36)}\x1b[0m\x1b[32m${tr(cmd.description, language) ?? ''}\x1b[0m`)
                    .join('\n');
                return `${heading}\n\n${actions}`;
            }
        });

        // actions
        commands.push(...this.cliDef.actions
            .map((action: CliAction) => {
                const handler = this.cliHandlers[action.id];
                if (!handler) {
                    this.ntb.error(`CliManager: No handler registered for command "${action.id}"`);
                    return null;
                }
                return {
                    id: action.id,
                    description: tr(action.description, language) ?? '',
                    flags: action.flags ? this.toCliFlags(action.flags, language) : null,
                    handler: this.cliHandlers[action.id]
                }
            })
            .filter((cmd): cmd is NonNullable<typeof cmd> => cmd !== null));

        // register the commands with Obsidian
        for (const cmd of commands) {
            this.ntb.registerCliHandler(cmd.id, cmd.description, cmd.flags, cmd.handler);
        }

    }

	/*************************************************************************
	 * HANDLERS
	 *************************************************************************/

    /**
     * Defines the CLI command handlers, used in register().
     */
    cliHandlers: Record<string, CliHandler> = {
        // TODO: support adding items from Gallery
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

    /**
     * Gets the localized description for the CLI command flags.
     */
    private toCliFlags(flags: CliActionFlags, language: string): CliFlags {

        const resolveShared = (keys: string[]) =>
            keys.reduce((acc, key) => {
                const flag = this.cliDef.commonFlags[key];
                if (!flag) this.ntb.error(`CliManager: Unknown shared flag: "${key}" when reading cli.json`);
                else acc[key] = flag;
                return acc;
            }, {} as Record<string, CliLocalizedFlag>);

        const { $before = [], $after = [], ...ownFlags } = flags;
        const resolvedOwn = ownFlags as Record<string, CliLocalizedFlag>;
        const orderedFlags: Record<string, CliLocalizedFlag> = {
            ...resolveShared($before as string[]),
            ...resolvedOwn,
            ...resolveShared($after as string[]),
        };

        return Object.fromEntries(
            Object.entries(orderedFlags).map(([key, flag]) => [
                key,
                {
                    ...flag,
                    description: tr(flag.description, language) ?? '',
                    value: flag.value ? tr(flag.value, language) ?? undefined : undefined,
                }
            ])
        );
    }

}