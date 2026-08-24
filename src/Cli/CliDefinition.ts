import cliDefJson from "Cli/cli.json";
import NoteToolbarPlugin from "main";
import { CliFlags } from "obsidian";
import { tr } from "Utils/Utils";
import { color } from "./CliUtils";


interface CliLocalizedString {
    [locale: string]: string;
}

interface CliLocalizedFlag {
    description: CliLocalizedString;
    value?: string | CliLocalizedString | null;
    required?: boolean;
}

interface CliActionFlags {
    $before?: string[];
    $after?: string[];
    [key: string]: CliLocalizedFlag | string[] | undefined;
}

interface CliAction {
    description: CliLocalizedString;
    flags?: CliActionFlags;
    since?: string;
    docs?: string;
    examples?: string;
}

interface CliDef {
    commonFlags: Record<string, CliLocalizedFlag>;
    commands: Record<string, CliAction>;
}

interface CliCommandDef {
    id: string; 
    description: string; 
    flags: CliFlags | null; 
}

/**
 * Describes the CLI commands defined in `cli.json`, and provides helpers for formatting command lists and flag descriptions.
 * The actual command handlers are defined in `CliHandlers`.
 */
export default class CliDefinition {

    private cliDef: CliDef = cliDefJson;
    private language: string;

    public commands: CliCommandDef[] = [];

    constructor(
        private ntb: NoteToolbarPlugin
    ) {
        this.language = (typeof i18next.language === 'string' && i18next.language.trim()) || 'en';
    }

    public load(): void {

        // command definitions (check for handlers in CliManager)
        this.commands.push(...Object.entries(this.cliDef.commands)
            .map(([id, command]: [string, CliAction]) => ({
                id,
                description: tr(command.description, this.language) ?? '',
                flags: command.flags ? this.toCliFlags(command.flags, this.language) : null,
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
                const cmdLine = color(id.padEnd(COL_WIDTH) + (tr(cmd.description, this.language) ?? ''), 'green');
                if (!cmd.flags) return `${INDENT}${cmdLine}\n`;
                const flags = cmd.flags;
                const flagsOrdered = [
                    ...((flags['$before']) ?? []),
                    ...Object.keys(flags).filter(k => !k.startsWith('$')),
                    ...((flags['$after']) ?? []),
                ];
                const flagList = flagsOrdered
                    .map(flag => {
                        const flagDef = (flags[flag] ?? commonFlags[flag]) as CliLocalizedFlag | undefined;
                        if (!flagDef || Array.isArray(flagDef)) return null; 
                        const value = flagDef.value ? (typeof flagDef.value === 'string' ? flagDef.value : tr(flagDef.value, this.language)) : '';
                        const flagStr = value ? `${flag}=${value}` : flag;
                        return `${INDENT}${INDENT}${color(flagStr, 'black')}` 
                            + ' '.repeat(Math.max(0, COL_WIDTH - 2 - flagStr.length)) 
                            + color(`- ${tr(flagDef.description, this.language) ?? ''}`, 'green');
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
            ...resolveShared($before),
            ...resolvedOwn,
            ...resolveShared($after),
        };

        return Object.fromEntries(
            Object.entries(orderedFlags).map(([key, flag]) => [
                key,
                {
                    ...flag,
                    description: tr(flag.description, language) ?? '',
                    value: flag.value ? (typeof flag.value === 'string' ? flag.value : tr(flag.value, this.language)) ?? undefined : undefined,
                }
            ])
        );
    }

}