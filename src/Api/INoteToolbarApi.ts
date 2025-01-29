import { Callback } from "./NoteToolbarApi";


export interface NtbPromptOptions {
    /**
     * Optional text shown above the text field, rendered as markdown; default none.
     */
    label?: string;
    /**
     * If set to true, the input field will be a multiline textarea. If not provided, defaults to false.
     */
    large?: boolean;
    /**
     * Optional text inside text field; defaults to preset message.
     */
    placeholder?: string;
    /**
     * Optional default value for text field; if not provided, no default value is set.
     */
    default?: string;
}

export interface NtbSuggesterOptions {
    /**
     * Optional text inside text field; defaults to preset message.
     */
    placeholder?: string;
    /**
     * Optional limit of the number of items rendered at once (useful to improve performance when displaying large lists).
     */
    limit?: number;
}

export interface INoteToolbarApi<T> {

    // testCallback: (buttonId: string, callback: Callback) => Promise<void>;

    /**
     * Gets the clipboard value.
     */
    clipboard: () => Promise<string | null>;

    /**
     * Shows the prompt modal and waits for the user's input.
     * @param options Optional display options.
     * @returns The user's input.
     */
    prompt: (options?: NtbPromptOptions) => Promise<string | null>;

    /**
     * Shows a suggester modal and waits for the user's selection.
     * @param values Array of strings representing the text that will be displayed for each item in the suggester prompt. This can also be a function that maps an item to its text representation. Rendered as markdown.
     * @param keys Optional array containing the keys of each item in the correct order. If not provided, values are returned on selection.
     * @param options Optional display options.  
     * @returns The selected item.
     */
    suggester: (values: string[] | ((value: T) => string), keys?: T[], options?: NtbSuggesterOptions) => Promise<T | null>;

}
