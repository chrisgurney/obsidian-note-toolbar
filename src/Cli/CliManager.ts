import cliDef from "Cli/cli.json";
import NoteToolbarPlugin from "main";
import { CliFlags, CliHandler } from "obsidian";
import { tr } from "Utils/Utils";

export default class CliManager {

    constructor(
        private ntb: NoteToolbarPlugin
    ) {}

    /**
     * Defines the CLI command handlers, used in register().
     */
    cliHandlers: Record<string, CliHandler> = {
        'note-toolbar:add-command': async (args) => {
            const toolbar = this.ntb.settingsManager.getToolbar(args.toolbar);
            if (!toolbar) return `Toolbar not found: ${args.toolbar}`;
            return 'add-command is not yet implemented';
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
                return cliDef.actions
                    .map((cmd: any) => `${cmd.id}: ${tr(cmd.description, language) ?? ''}`)
                    .join('\n');
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