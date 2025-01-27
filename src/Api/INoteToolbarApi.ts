import { Callback } from "./NoteToolbarApi";


export interface NtbPromptOptions {
    prompt_text: string;
    multi_line?: boolean;
    placeholder?: string;
    default_value?: string;
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
     * @param options.prompt_text: Text placed above the input field.
     * @param options.multi_line: If set to true, the input field will be a multiline textarea. Defaults to false.
     * @param options.placeholder Placeholder string of the prompt.
     * @param options.default_value: A default value for the input field.
     * @returns The user's input.
     */
    prompt: (options?: NtbPromptOptions) => Promise<string | null>;

    /**
     * Shows a suggester modal and waits for the user's selection.
     * @param values Array of strings representing the text that will be displayed for each item in the suggester prompt. This can also be a function that maps an item to its text representation.
     * @param keys Optional array containing the values of each item in the correct order.
     * @param options.placeholder Placeholder string of the prompt.
     * @param options.limit Limit the number of items rendered at once (useful to improve performance when displaying large lists).
     * @returns The selected item.
     */
    suggester: (values: string[] | ((value: T) => string), keys?: T[], options?: NtbSuggesterOptions) => Promise<T | null>;

}
