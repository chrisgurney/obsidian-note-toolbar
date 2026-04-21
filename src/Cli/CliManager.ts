import cliDef from "Cli/cli.json";
import NoteToolbarPlugin from "main";
import { CliFlags, CliHandler, getIcon } from "obsidian";
import { DEFAULT_ITEM_SETTINGS, ItemType, t, ToolbarItemSettings } from "Settings/NoteToolbarSettings";
import { getUUID, tr } from "Utils/Utils";

export default class CliManager {

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
            if (!command) return t('setting.add-item.error-invalid-command', { commandId: item.linkAttr.commandId });
            item.linkAttr.type = ItemType.Command;
            item.linkAttr.commandId = args.command;
            if (args.label || args.icon) {
                if (args.label) item.label = args.label;
                if (args.icon) {
                    const icon = getIcon(args.icon);
                    if (!icon) return t('api.item.error-invalid-icon', { iconId: args.icon })
                    item.icon = args.icon;
                }
            }
            else {
                return "Error: A label or icon must be provided.";
            }
            if (args.tooltip) item.tooltip = args.tooltip;
            // TODO: support set focus flag
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
            id: cliDef.id,
            description: tr(cliDef.description, language) ?? '',
            flags: null,
            handler: async () => {
                const heading = tr(cliDef.heading, language) ?? '';
                const actions = cliDef.actions
                    .map((cmd: any) => `\x1b[90m${cmd.id}\x1b[0m\t\x1b[32m${tr(cmd.description, language) ?? ''}\x1b[0m`)
                    .join('\n');
                return `${heading}\n\n${actions}`;
            }
        });

        // actions
        commands.push(...cliDef.actions
            .map((cmd: any) => {
                const handler = this.cliHandlers[cmd.id];
                if (!handler) {
                    this.ntb.debug(`⚠️ CliManager: no handler registered for command "${cmd.id}"`);
                    return null;
                }
                return {
                    id: cmd.id,
                    description: tr(cmd.description, language) ?? '',
                    flags: cmd.flags ? this.toCliFlags(cmd.flags, language) : null,
                    handler: this.cliHandlers[cmd.id]
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
    toCliFlags(flags: Record<string, any>, language: string): CliFlags {
        return Object.fromEntries(
            Object.entries(flags).map(([key, flag]) => [
                key,
                {
                    ...flag,
                    description: tr(flag.description, language) ?? '',
                    value: tr(flag.value, language) ?? null,
                }
            ])
        );
    }

}