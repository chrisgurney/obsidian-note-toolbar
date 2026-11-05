import cliDefJson from "Cli/cli.json";
import NoteToolbarPlugin from "main";
import { CliFlags } from "obsidian";
import { t } from "Settings/NoteToolbarSettings";
import { color } from "./CliUtils";

interface CliFlag {
    value?: string | null;
    required?: boolean;
    available?: string;
}

interface CliActionFlags {
    $before?: string[];
    $after?: string[];
    [key: string]: CliFlag | string[] | undefined;
}

interface CliAction {
    flags?: CliActionFlags;
    since?: string;
    docs?: string;
    examples?: string;
}

interface CliDef {
    commonFlags: Record<string, CliFlag>;
    commands: Record<string, CliAction>;
}

interface CliCommandDef {
    id: string; 
    description: string; 
    flags: CliFlags | null; 
}

// Command ids contain ':', which i18next would read as its namespace
// separator, so language keys use the id with ':' replaced by '-',
// the same sanitizing the cli language files were generated with.
const commandIdKey = (id: string) => id.replace(/:/g, '-');

/**
 * Describes the CLI commands defined in `cli.json`, and provides helpers for formatting command lists and flag descriptions.
 * The actual command handlers are defined in `CliHandlers`.
 */
export default class CliDefinition {

    private cliDef: CliDef = cliDefJson;

    public commands: CliCommandDef[] = [];

    constructor(
        private ntb: NoteToolbarPlugin
    ) {
    }

    public load(): void {

        // command definitions (check for handlers in CliManager)
        this.commands.push(...Object.entries(this.cliDef.commands)
            .map(([id, command]: [string, CliAction]) => ({
                id,
                description: t(`cli.command.${commandIdKey(id)}.description`),
                flags: command.flags ? this.toCliFlags(id, command.flags) : null,
            }))
        );

    }

    public get(id: string): CliCommandDef | undefined {
        return this.commands.find((cmd) => cmd.id === id);
    }

    public formatCommandList(prefix?: string): string {
        const COL_WIDTH = 33;
        const INDENT = '  ';
        const commonFlags = this.cliDef.commonFlags ?? {};
        const commands = Object.entries(this.cliDef.commands)
            // filter out commands that just list commands, and by prefix if provided
            .filter(([id]) => id !== 'note-toolbar:add-tp' && (!prefix || id.startsWith(prefix)))
            .map(([id, cmd]: [string, CliAction]) => {
                const cmdLine = color(id.padEnd(COL_WIDTH) + t(`cli.command.${commandIdKey(id)}.description`), 'green');
                if (!cmd.flags) return `${INDENT}${cmdLine}\n`;
                const flags = cmd.flags;
                const flagsOrdered = [
                    ...((flags['$before']) ?? []),
                    ...Object.keys(flags).filter(k => !k.startsWith('$')),
                    ...((flags['$after']) ?? []),
                ];
                const flagList = flagsOrdered
                    .map(flag => {
                        const flagDef = (flags[flag] ?? commonFlags[flag]) as CliFlag | undefined;
                        if (!flagDef || Array.isArray(flagDef)) return null; 
                        const value = flagDef.value ?? '';
                        const flagStr = value ? `${flag}=${value}` : flag;
                        // Flag descriptions are keyed per command for flags
                        // defined on the command, and shared for common flags.
                        // A flag name is only a key of `flags` when the command
                        // defines it itself; shared names arrive via $before/$after.
                        const description = flag in flags
                            ? t(`cli.command.${commandIdKey(id)}.flag.${flag}.description`)
                            : t(`cli.flag.${flag}.description`);
                        return `${INDENT}${INDENT}${color(flagStr, 'black')}` 
                            + ' '.repeat(Math.max(0, COL_WIDTH - 2 - flagStr.length)) 
                            + color(`- ${description}`, 'green');
                    })
                    .filter(line => line !== null)
                    .join('\n');
                return flagList ? `${INDENT}${cmdLine}\n${flagList}\n` : `${INDENT}${cmdLine}\n`;
            })
            .join('\n');
        return commands;
    }

	/*************************************************************************
	 * HELPERS
	 *************************************************************************/

    /**
     * Gets the localized description for the CLI command flags.
     */
    private toCliFlags(id: string, flags: CliActionFlags): CliFlags {

        const resolveShared = (keys: string[]) =>
            keys.reduce((acc, key) => {
                const flag = this.cliDef.commonFlags[key];
                if (!flag) this.ntb.error(`CliManager: Unknown shared flag: "${key}" when reading cli.json`);
                else acc[key] = flag;
                return acc;
            }, {} as Record<string, CliFlag>);

        const { $before = [], $after = [], ...ownFlags } = flags;
        const resolvedOwn = ownFlags as Record<string, CliFlag>;
        const orderedFlags: Record<string, CliFlag> = {
            ...resolveShared($before),
            ...resolvedOwn,
            ...resolveShared($after),
        };

        const san = commandIdKey(id);
        return Object.fromEntries(
            Object.entries(orderedFlags).map(([key, flag]) => [
                key,
                {
                    ...flag,
                    // The winning entry is the object that survived the spread
                    // above, so identity says which description key applies:
                    // the command's own flag object means the per-command key,
                    // a shared flag object means the common flag key. A name
                    // check alone would be wrong here: note-toolbar:copy
                    // defines its own `item` flag and also lists it in $before.
                    description: orderedFlags[key] === resolvedOwn[key]
                        ? t(`cli.command.${san}.flag.${key}.description`)
                        : t(`cli.flag.${key}.description`),
                    value: flag.value ?? undefined,
                }
            ])
        );
    }

}
