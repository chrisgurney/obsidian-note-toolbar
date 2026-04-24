import cliDefJson from "Cli/cli.json";
import NoteToolbarPlugin from "main";
import { CliFlags } from "obsidian";
import { t } from "Settings/NoteToolbarSettings";
import { tr } from "Utils/Utils";


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
    description: CliLocalizedString;
    flags?: CliActionFlags;
    since?: string;
    docs?: string;
    examples?: string;
}

interface CliDef {
    id: string;
    description: CliLocalizedString;
    heading: CliLocalizedString;
    docs?: string;
    commonFlags: Record<string, CliLocalizedFlag>;
    actions: Record<string, CliAction>;
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

        // default command: displays list of available actions
        this.commands.push({
            id: this.cliDef.id,
            description: tr(this.cliDef.description, this.language) ?? '',
            flags: null
        });

        // action definitions (check for handlers in CliManager)
        this.commands.push(...Object.entries(this.cliDef.actions)
            .map(([id, action]: [string, CliAction]) => ({
                id,
                description: tr(action.description, this.language) ?? '',
                flags: action.flags ? this.toCliFlags(action.flags, this.language) : null,
            }))
        );

    }

    public get(id: string): CliCommandDef | undefined {
        return this.commands.find((cmd) => cmd.id === id);
    }

    public formatCommandList(): string {
        const heading = tr(this.cliDef.heading, this.language) ?? '';
        const actions = Object.values(this.cliDef.actions)
            .map((cmd: any) => `\x1b[90m${cmd.id.padEnd(36)}\x1b[0m\x1b[32m${tr(cmd.description, this.language) ?? ''}\x1b[0m`)
            .join('\n');
        return `${heading}\n\n${actions}`;
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
            ...resolveShared($before as string[]),
            ...resolvedOwn,
            ...resolveShared($after as string[]),
        };

        return Object.fromEntries(
            Object.entries(orderedFlags).map(([key, flag]) => [
                key,
                {
                    ...flag,
                    description: (flag.required ? t('cli.required') + ' ' : '') + (tr(flag.description, language) ?? ''),
                    value: flag.value ? tr(flag.value, language) ?? undefined : undefined,
                }
            ])
        );
    }

}