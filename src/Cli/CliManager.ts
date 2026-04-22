import cliDefJson from "Cli/cli.json";
import NoteToolbarPlugin from "main";
import { CliFlags, CliHandler, getIcon } from "obsidian";
import { DEFAULT_ITEM_SETTINGS, ItemType, t, ToolbarItemSettings } from "Settings/NoteToolbarSettings";
import { getUUID, tr } from "Utils/Utils";

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
    notes?: CliLocalizedString;
    examples?: {
        description: CliLocalizedString;
        command: string;
    }[];
}

interface CliDef {
    id: string;
    description: CliLocalizedString;
    heading: CliLocalizedString;
    commonFlags: Record<string, CliLocalizedFlag>;
    actions: CliAction[];
}

export default class CliManager {

    private cliDef: CliDef = cliDefJson;

    constructor(
        private ntb: NoteToolbarPlugin
    ) {}

    /**
     * Defines the CLI command handlers, used in register().
     */
    cliHandlers: Record<string, CliHandler> = {
        // TODO: support adding items from Gallery
        'note-toolbar:add-command': async (args) => {
            const toolbar = this.ntb.settingsManager.getToolbar(args.toolbar);
            if (!toolbar) return `Error: Toolbar not found: ${args.toolbar}`;
            const item: ToolbarItemSettings = JSON.parse(JSON.stringify(DEFAULT_ITEM_SETTINGS));

            const command = this.ntb.app.commands.commands[args.command];
            if (!command) return t('setting.add-item.error-invalid-command', { commandId: args.command });
            item.linkAttr.type = ItemType.Command;
            item.linkAttr.commandId = args.command;
            // TODO: support set focus flag

            if (args.label || args.icon) {
                if (args.label) item.label = args.label;
                if (args.icon) {
                    const icon = getIcon(args.icon);
                    if (!icon) return t('api.item.error-invalid-icon', { iconId: args.icon })
                    item.icon = args.icon;
                }
            }
            else {
                return "Error: label or icon must be provided";
            }
            if (args.tooltip) item.tooltip = args.tooltip;
            item.uuid = getUUID();

            toolbar.items.push(item);
            toolbar.updated = new Date().toISOString();
            await this.ntb.settingsManager.save();

            return 'Command item added successfully';
        },
        'note-toolbar:add-javascript': async (args) => {
            const toolbar = this.ntb.settingsManager.getToolbar(args.toolbar);
            if (!toolbar) return `Toolbar not found: ${args.toolbar}`;
            return 'add-script is not yet implemented';
        }
    };

    /**
     * Register the plugin's CLI commands. Called from plugin's `onLayoutReady()`.
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
                    .map((cmd: any) => `\x1b[90m${cmd.id}\x1b[0m\t\x1b[32m${tr(cmd.description, language) ?? ''}\x1b[0m`)
                    .join('\n');
                return `${heading}\n\n${actions}`;
            }
        });

        // actions
        commands.push(...this.cliDef.actions
            .map((action: CliAction) => {
                const handler = this.cliHandlers[action.id];
                if (!handler) {
                    this.ntb.debug(`⚠️ CliManager: No handler registered for command "${action.id}"`);
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

    /**
     * Gets the localized description for the CLI command flags.
     */
    toCliFlags(flags: CliActionFlags, language: string): CliFlags {

        const resolveShared = (keys: string[]) =>
            keys.reduce((acc, key) => {
                const flag = this.cliDef.commonFlags[key];
                if (!flag) this.ntb.debug(`⚠️ CliManager: Unknown shared flag: "${key}"`);
                else acc[key] = flag;
                return acc;
            }, {} as Record<string, CliLocalizedFlag>);

        const { $before = [], $after = [], ...ownFlags } = flags;

        const resolvedOwn = Object.fromEntries(
            Object.entries(ownFlags)
                .filter((entry): entry is [string, CliLocalizedFlag] =>
                    entry[1] !== null && typeof entry[1] === 'object' && !Array.isArray(entry[1]) && 'description' in entry[1]
                )
        );

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