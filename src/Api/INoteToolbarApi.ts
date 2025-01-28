import { Callback } from "./NoteToolbarApi";


export interface NtbPromptOptions {
    label?: string;
    large?: boolean;
    placeholder?: string;
    default?: string;
}

export interface NtbSuggesterOptions {
    placeholder?: string;
    limit?: number;
}

export interface INoteToolbarApi<T> {

    testCallback: (buttonId: string, callback: Callback) => Promise<void>;

    /**
     * Gets the clipboard value.
     */
    clipboard: () => Promise<string | null>;

    /**
     * Shows the prompt modal and waits for the user's input.
     * @param options.label: Optional text shown above the text field, rendered as markdown; default none.
     * @param options.large: If set to true, the input field will be a multiline textarea. If not provided, defaults to false.
     * @param options.placeholder  Optional text inside text field; defaults to preset message.
     * @param options.default: Optional default value for text field; if not provided, no default value is set.
     * @returns The user's input.
     */
    prompt: (options?: NtbPromptOptions) => Promise<string | null>;

    /**
     * Shows a suggester modal and waits for the user's selection.
     * @param values Array of strings representing the text that will be displayed for each item in the suggester prompt. This can also be a function that maps an item to its text representation. Rendered as markdown.
     * @param keys Optional array containing the keys of each item in the correct order. If not provided, values are returned on selection.
     * @param options.placeholder Optional text inside text field; defaults to preset message.
     * @param options.limit Optional limit of the number of items rendered at once (useful to improve performance when displaying large lists).
     * @returns The selected item.
     */
    suggester: (values: string[] | ((value: T) => string), keys?: T[], options?: NtbSuggesterOptions) => Promise<T | null>;

}
