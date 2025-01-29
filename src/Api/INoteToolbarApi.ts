import { Callback } from "./NoteToolbarApi";

/**
 * @inline
 * @hidden
 */
export interface NtbPromptOptions {
    /**
     * Optional text shown above the text field, rendered as markdown. Default is no label.
     */
    label?: string;
    /**
     * If set to `true`, the input field will be multi line. If not provided, defaults to `false`.
     */
    large?: boolean;
    /**
     * Optional text inside text field. Defaults to a preset message.
     */
    placeholder?: string;
    /**
     * Optional default value for text field. If not provided, no default value is set.
     */
    default?: string;
}

/**
 * @inline
 * @hidden
 */
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

/**
 * Defines the functions that can be accessed from scripts (Dataview, Templater, JavaScript via JS Engine) -- that are executed from Note Toolbar items -- using the `ntb` object.
 */
export interface INoteToolbarApi<T> {

    // testCallback: (buttonId: string, callback: Callback) => Promise<void>;

    /**
     * Gets the clipboard value.
     */
    clipboard: () => Promise<string | null>;

    /**
     * Shows the prompt modal and waits for the user's input.
     * 
     * @param options Optional display options.
     * 
     * @returns The user's input.
     * 
     * @example
     * // default (one-line) prompt with message, overridden placeholder, and default value 
     * const result = await ntb.prompt({
     *   label: "Enter some text",
     *   placeholder: "Placeholder",
     *   default: "Default"
     * });
     * 
     * new Notice(result);
     * 
     * @see `NtbPrompt.js` in the [examples/Scripts folder](https://github.com/chrisgurney/obsidian-note-toolbar/tree/master/examples/Scripts).
     */
    prompt: (options?: NtbPromptOptions) => Promise<string | null>;

    /**
     * Shows a suggester modal and waits for the user's selection.
     * 
     * @param values Array of strings representing the text that will be displayed for each item in the suggester prompt. This can also be a function that maps an item to its text representation. Rendered as markdown.
     * @param keys Optional array containing the keys of each item in the correct order. If not provided, values are returned on selection.
     * @param options Optional display options.
     *  
     * @returns The selected value, or corresponding key if keys are provided.
     * 
     * @example
     * // values are shown in the selector; optionally mix in Obsidian 
     * // and plugin markdown (e.g., Iconize) to have it rendered
     * const values = ["value `1`", "value `2`"];
     * // keys are optional, but can be used to return a key corresponding to the selected value
     * const keys = ["key1", "key2"];
     * 
     * // returns a key corresponding to the selected value, overrides placeholder text
     * const result = await ntb.suggester(values, keys, {
     *   placeholder: "Pick something"
     * });
     * 
     * new Notice(result);
     * 
     * @see `NtbSuggester.js` in the [examples/Scripts folder](https://github.com/chrisgurney/obsidian-note-toolbar/tree/master/examples/Scripts).
     */
    suggester: (values: string[] | ((value: T) => string), keys?: T[], options?: NtbSuggesterOptions) => Promise<T | null>;

}
