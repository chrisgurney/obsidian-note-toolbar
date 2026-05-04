
/**
 * Checks if a CLI flag value is provided and not just the string "true".
 * @param arg argument to check
 * @returns true if the argument has a meaningful value, false if it's undefined or the string "true"
 */
export function hasValue(arg: string | undefined): arg is string {
    return !!arg && arg !== 'true';
}