import { TAbstractFile, TFile } from "obsidian";
import { Callback } from "./NoteToolbarApi";
import { Toolbar } from "./Toolbar";
import { IToolbar } from "./IToolbar";
import { IItem } from "./IItem";

/**
 * The first Note Toolbar APIs allow you basic toolbar access, and to show UI (suggesters, prompts, and modals). The latter enables Dataview JS, JS Engine, or Templater scripts to ask for information, or to show helpful text.
 * 
 * Using the `ntb` object, below are the functions that can be called in scripts that are [executed from Note Toolbar items](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Executing-scripts).
 * 
 * > [!warning]
 * > This API is considered BETA, until more functions are added in the future (e.g., manipulating toolbars, and other UI components) and I consider naming and organization of the methods available. Functions may change.
 * > I would appreciate your feedback, which you can leave in [the discussions](https://github.com/chrisgurney/obsidian-note-toolbar/discussions).
 * 
 * @privateRemarks
 * This is the documentation for the [Note Toolbar API](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Note-Toolbar-API) page.
 */
export interface INoteToolbarApi<T> {

    // testCallback: (buttonId: string, callback: Callback) => Promise<void>;

    /**
     * Gets the clipboard value.
     * 
     * @returns The clipboard value or `null`.
     * 
     * @example
     * // gets the clipboard value
     * const value = await ntb.clipboard();
     * 
     * new Notice(value);
     */
    clipboard: () => Promise<string | null>;

    /**
     * Shows a file suggester modal and waits for the user's selection.
     * 
     * @param options Optional display options.
     * @returns The selected TAbstractFile.
     * 
     * @example
     * const fileOrFolder = await ntb.fileSuggester();
     * new Notice(fileOrFolder.name);
     * // show only folders
     * const folder = await ntb.fileSuggester({
     *  foldersonly: true
     * });
     * new Notice(folder.name);
     */
    fileSuggester: (options?: NtbFileSuggesterOptions) => Promise<TAbstractFile | null>;

    /**
     * Gets the active (last activated) toolbar item.
     * 
     * @returns The active (last activated) item.
     * @remarks This does not work with Note Toolbar Callouts.
     */
    getActiveItem: () => IItem | undefined;

    /**
     * Gets an item by its ID, if it exists.
     * 
     * @param id The ID of the item.
     * @returns The item, or undefined.
     */   
    getItem: (id: string) => IItem | undefined;

    /**
     * Gets the value of the given property in the active note.
     * 
     * @param property The property to get the frontmatter for.
     * @returns The frontmatter value for the given property, or `undefined` if it does not exist.
     * 
     * @example
     * const createdDate = ntb.getProperty('created');
     */
    getProperty: (property: string) => string | undefined;

    /**
     * Gets all toolbars.
     * 
     * @returns All toolbars.
     */
    getToolbars: () => IToolbar[];

    /**
     * Shows a modal with the provided content.
     * 
     * @param content Content to display in the modal, either as a string or a file within the vault.
     * @param options Optional display options.
     * 
     * @example
     * // shows a modal with the provided string
     * await ntb.modal("_Hello_ world!");
     * 
     * @example
     * // shows a modal with the rendered contents of a file
     * const filename = "Welcome.md";
     * const file = app.vault.getAbstractFileByPath(filename);
     * 
     * if (file) {
     *   await ntb.modal(file, {
     *     title: `**${file.basename}**`
     *   });
     * }
     * else {
     *   new Notice(`File not found: ${filename}`);
     * }
     * 
     * @see `NtbModal.js` in the [examples/Scripts folder](https://github.com/chrisgurney/obsidian-note-toolbar/tree/master/examples/Scripts).
     */
    modal: (content: string | TFile, options?: NtbModalOptions) => Promise<void>;

    /**
     * Shows the prompt modal and waits for the user's input.
     * 
     * @param options Optional display options.
     * @returns The user's input.
     * 
     * @example
     * // default (one-line) prompt with default placeholder message
     * const result = await ntb.prompt();
     * 
     * new Notice(result);
     * 
     * @example
     * // large prompt with message, overridden placeholder, and default value 
     * const result = await ntb.prompt({
     *   label: "Enter some text",
     *   large: true,
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
     * @param values Array of strings representing the text that will be displayed for each item in the suggester prompt. This can also be a function that maps an item to its text representation. Rendered as markdown: optionally mix in Obsidian and plugin markdown (e.g., Iconize) to have it rendered
     * @param keys Optional array containing the keys of each item in the correct order. If not provided, values are returned on selection.
     * @param options Optional display options.
     * @returns The selected value, or corresponding key if keys are provided.
     * 
     * @example
     * // shows a suggester that returns the selected value 
     * const values = ["value `1`", "value `2`"];
     * 
     * const selectedValue = await ntb.suggester(values);
     * 
     * new Notice(selectedValue);
     * 
     * @example
     * // shows a suggester that returns a key corresponding to the selected value, and overrides placeholder text
     * const values = ["value `1`", "value `2`"];
     * const keys = ["key1", "key2"];
     * 
     * const selectedKey = await ntb.suggester(values, keys, {
     *   placeholder: "Pick something"
     * });
     * 
     * new Notice(selectedKey);
     * 
     * @see `NtbSuggester.js` in the [examples/Scripts folder](https://github.com/chrisgurney/obsidian-note-toolbar/tree/master/examples/Scripts).
     */
    suggester: (values: string[] | ((value: T) => string), keys?: T[], options?: NtbSuggesterOptions) => Promise<T | null>;

   /**
     * This is the [i18next translation function](https://www.i18next.com/translation-function/essentials), scoped to Note Toolbar's localized strings.
     * 
     * @returns The string translation corresponding with the provided key, if it exists, with a fallback to English. If the key does not exist, the key is returned.
     * 
     * @example
     * // shows "Copied to clipboard" if the language is English, or in another langauge if the translation exists
     * new Notice(ntb.t('api.msg.clipboard-copied'));
     * 
     * @see For usage, see the [i18next documentation](https://www.i18next.com/translation-function/essentials).
     * @see `en.json` and other translations in the [src/I18n folder](https://github.com/chrisgurney/obsidian-note-toolbar/tree/master/src/I18n).
     */
    t: string;

}

/**
 * @inline
 * @hidden
 */
export interface NtbModalOptions {
    /**
     * Optional title for the modal, rendered as markdown.
     */
    title?: string;
    /**
     * If `true`, and a file was provided, content can be edited; defaults to `false`.
     */
    editable?: boolean;
    /**
     * Optional CSS class(es) to add to the component.
     */
    class?: string;
}

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
    /**
     * Optional CSS class(es) to add to the component.
     */
    class?: string;
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
    /**
     * Optional CSS class(es) to add to the component.
     */
    class?: string;
}

/**
 * @inline
 * @hidden
 */
export interface NtbFileSuggesterOptions extends NtbSuggesterOptions {
    /**
     * If set to true, only files are shown. If not provided, defaults to `false`.
     */
    filesonly?: boolean;
    /**
     * If set to true, only folders are shown. If not provided, defaults to `false`.
     */
    foldersonly?: boolean;
}