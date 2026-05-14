import NoteToolbarPlugin from "main";
import { t } from "Settings/NoteToolbarSettings";

/**
 * Outputs the ANSI color codes for the given text and color.
 * @param text text to color
 * @param color color to apply
 * @returns colored text
 */
export function color(text: string, color?: 'black' | 'green' | 'red'): string {
    if (!color) return text;
    switch (color) {
        case 'black':
            return `\x1b[90m${text}\x1b[0m`;
        case 'green':
            return `\x1b[32m${text}\x1b[0m`;
        case 'red':
            return `\x1b[31m${text}\x1b[0m`;
        default:
            return text;
    }
}

/**
 * Creates a string representation of a reference to another toolbar.
 */    
export function formatToolbarRef(ntb: NoteToolbarPlugin, id?: string): string {
    if (!id) return '';
    const tb = ntb.settingsManager.getToolbarById(id);
    const name = tb?.name ?? t('cli.label-unknown-toolbar');
    return `toolbar:${name}`;
}

/**
 * Checks if a CLI flag value is provided and not just the string "true".
 * @param arg argument to check
 * @returns true if the argument has a meaningful value, false if it's undefined or the string "true"
 */
export function hasValue(arg: string | undefined): arg is string {
    return !!arg && arg !== 'true';
}