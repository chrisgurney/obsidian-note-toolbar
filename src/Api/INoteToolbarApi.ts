import * as Obsidian from "obsidian";
import { App, Modal, TAbstractFile, TFile } from "obsidian";
import { IItem } from "./IItem";
import { IToolbar } from "./IToolbar";

/**
 * The Note Toolbar API provides toolbar access, and the ability to show UI (suggesters, prompts, menus, and modals). The latter enables Dataview JS, JS Engine, or Templater scripts to ask for information, or to show helpful text.
 * 
 * Using the `ntb` object, below are the functions that can be called in scripts that are [executed from Note Toolbar items](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Executing-scripts).
 * 
 * I would appreciate your feedback, which you can leave in [the discussions](https://github.com/chrisgurney/obsidian-note-toolbar/discussions).
 * 
 * > [!warning]
 * > While you could also directly access Note Toolbar's settings or toolbar items via `app.plugins.getPlugin("note-toolbar").settings`, be aware that these are subject to change and may break your scripts. The API will be the official way to access and change information about toolbars.
 * 
 * ## Copy developer ID for items
 * 
 * In each item's _More actions..._ menu, use `Copy developer ID` to copy the unique identifier (UUID) for any toolbar item to the clipboard. 
 * 
 * From code you can then target the item and make changes to it:
 * 
 * ```js
 * const item = ntb.getItem('112c7ed3-d5c2-4750-b95d-75bc84e23513');
 * item.setIcon('alert');
 * 
 * // or fetch the HTML element (for non-floating-button toolbars)
 * const itemEl = activeDocument.getElementById('112c7ed3-d5c2-4750-b95d-75bc84e23513');
 * ```
 * 
 * ## `ntb` API
 * 
 * - [[ntb.app|Note-Toolbar-API#app]]
 * - [[ntb.clipboard|Note-Toolbar-API#clipboard]]
 * - [[ntb.fileSuggester|Note-Toolbar-API#filesuggester]]
 * - [[ntb.getActiveItem|Note-Toolbar-API#getactiveitem]]
 * - [[ntb.getItem|Note-Toolbar-API#getitem]]
 * - [[ntb.getProperty|Note-Toolbar-API#getproperty]]
 * - [[ntb.getSelection|Note-Toolbar-API#getselection]]
 * - [[ntb.getToolbars|Note-Toolbar-API#gettoolbars]]
 * - [[ntb.menu|Note-Toolbar-API#menu]]
 * - [[ntb.modal|Note-Toolbar-API#modal]]
 * - [[ntb.o|Note-Toolbar-API#o]]
 * - [[ntb.prompt|Note-Toolbar-API#prompt]]
 * - [[ntb.setProperty|Note-Toolbar-API#setproperty]]
 * - [[ntb.setSelection|Note-Toolbar-API#setselection]]
 * - [[ntb.suggester|Note-Toolbar-API#suggester]]
 * - [[ntb.t|Note-Toolbar-API#t]]
 * 
 * ---
 * 
 * @privateRemarks
 * This is the documentation for the [Note Toolbar API](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Note-Toolbar-API) page.
 */
export default interface INoteToolbarApi<T> {

    // testCallback: (buttonId: string, callback: Callback) => Promise<void>;

    /**
     * The Obsidian app instance. Use this instead of the global `app` when writing JavaScript.
     * @see https://docs.obsidian.md/Reference/TypeScript+API/App
     * 
     * @example
     * const currentFile = ntb.app.workspace.getActiveFile();
     * new Notice(currentFile.name);
     * 
     * @since 1.26
     */
    app: App;

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
     * @returns The selected `TAbstractFile`.
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
     * 
     * @example
     * ```js
     * // to get the ID, edit an item's settings and use _Copy developer ID_
     * const item = ntb.getItem('112c7ed3-d5c2-4750-b95d-75bc84e23513');
     * ```
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
     * Gets the currently selected text, or the word at the current cursor position, if nothing's selected.
     * 
     * @returns The selected text, or the word at the current cursor position. Otherwise returns an empty string.
     * 
     * @since 1.26
     */
    getSelection: () => string;

    /**
     * Gets all toolbars.
     * 
     * @returns All toolbars.
     */
    getToolbars: () => IToolbar[];

    /**
     * Shows a menu with the provided items.
     * 
     * @param {NtbMenuItem[]} items Array of items to display. See {@link NtbMenuItem}.
     * @param options Optional display options.
     * @returns Nothing. Displays the menu.
     * 
     * @example
     * await ntb.menu([
     *   { type: 'command', value: 'editor:toggle-bold', label: 'Toggle Bold', icon: 'bold' },
     *   { type: 'file', value: 'Home.md', label: 'Open File' },
     *   { type: 'uri', value: 'https://example.com', label: 'Visit Site' }
     * ]);
     * 
     * @example
     * // shows bookmarks in a menu
     * const b = ntb.app.internalPlugins.plugins['bookmarks'];
     * if (!b?.enabled) return;
     * const i = b.instance?.getBookmarks();
     * const b = ntb.app.internalPlugins.plugins['bookmarks'];
     * const mi = i
     *   .filter(b => b.type === 'file' || b.type === 'folder')
     *   .map(b => ({
     *       type: 'file',
     *       value: b.path,
     *       label: b.title ? b.title : b.path,
     *       icon: b.type === 'folder' ? 'folder' : 'file'
     *   }));
     * ntb.menu(mi);
     */
    menu: (items: NtbMenuItem[], options?: NtbMenuOptions) => Promise<void>;

    /**
     * Shows a modal with the provided content.
     * 
     * @param content Content to display in the modal, either as a string or a file within the vault.
     * @param options Optional display options.
     * @returns A `Modal`, in case you want to manipulate it further; can be ignored otherwise.
     * 
     * @example
     * // shows a modal with the provided string
     * await ntb.modal("_Hello_ world!");
     * 
     * @example
     * // shows a modal with the rendered contents of a file
     * const filename = "Welcome.md";
     * const file = ntb.app.vault.getAbstractFileByPath(filename);
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
    modal: (content: string | TFile, options?: NtbModalOptions) => Promise<Modal>;

    /**
     * Reference to the Obsidian API module for accessing Obsidian classes and utilities from scripts.
     * @see https://github.com/obsidianmd/obsidian-api/blob/master/obsidian.d.ts
     * 
     * @example
     * // get the current markdown view
     * const view = ntb.app.workspace.getActiveViewOfType(ntb.o.MarkdownView);
     * 
     * @since 1.26
     */
    o: typeof Obsidian;

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
     * Sets the given property's value in the active note.
     * 
     * @param property Propety to set in the frontmatter.
     * @param value Value to set for the property.
     * 
     * @example
     * await ntb.setProperty('Created', moment().format('YYYY-MM-DD'));
     * await ntb.setProperty('cssclasses', 'myclass');
     * await ntb.setProperty('A Link', '[[Some Note]]');
     * await ntb.setProperty('A Number', 1234);
     * await ntb.setProperty('A List', ['asdf', 'asdf2']);
     */
    setProperty: (property: string, value: any) => Promise<void>;

    /**
     * Replaces the selected text, or the word at the cursor position, with the provided string.
     * 
     * @param replacement The text to replace the selection with.
     * 
     * @example
     * // makes the selected text or the current word red
     * ntb.setSelection(`<span style="color: var(--color-red)">${ntb.getSelection()}</span>`);
     * 
     * @since 1.26
     */
    setSelection: (replacement: string) => void;

    /**
     * Shows a suggester modal and waits for the user's selection.
     * 
     * @param values Array of strings representing the text that will be displayed for each item in the suggester prompt. This can also be a function that maps an item to its text representation. Markdown formatting is supported: optionally mix in Obsidian and plugin markdown (e.g., Iconize) to have it rendered
     * @param keys Optional array containing the keys of each item in the correct order. If not provided or `null`, values are returned on selection.
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
 * Defines a menu item that can be dynamically created and displayed via [`ntb.menu()`](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Note-Toolbar-API#menu).
 */
export interface NtbMenuItem {
    /**
     * Optional icon to display in the menu item.
     */
    icon?: string;
    /**
     * Label for the menu item.
     */
    label: string;
    /**
     * Type of the menu item. Can be `command`, `file`, or `uri`.
     */
    type: 'command' | 'file' | 'uri';
    /**
     * Value for the menu item. For `command`, this is the command ID.
     */
    value: string;
}

/**
 * @inline
 * @hidden
 */
export interface NtbMenuOptions {
    /**
     * Optional CSS class(es) to add to the component.
     */
    class?: string;
    /**
     * If `true`, the menu item will be focused when the menu opens; defaults to `false`.
     */
    focusInMenu?: boolean;
}

/**
 * @inline
 * @hidden
 */
export interface NtbModalOptions {
    /**
     * Optional CSS class(es) to add to the component.
     */
    class?: string;
    /**
     * If `true`, and a file was provided, content can be edited; defaults to `false`.
     * @hidden
     */
    editable?: boolean;
    /**
     * Optional title for the modal, with markdown formatting supported.
     */
    title?: string;
    /**
     * If `true`, the modal will show the web page URL in `content` using the Web Viewer core plugin (if enabled); defaults to `false`.
     */
    webpage?: boolean;
}

/**
 * @inline
 * @hidden
 */
export interface NtbPromptOptions {
    /**
     * Optional text shown above the text field, with markdown formatting supported. Default is no label.
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
     * If set to `true`, the user can input a custom value that is not in the list of suggestions. Default is `false`.
     */
    allowCustomInput?: boolean;
    /**
     * Optional CSS class(es) to add to the component.
     */
    class?: string;
    /**
     * Optionally pre-set the suggester's input with this value. Matching results will be shown, as if you typed in that string yourself (assuming the string appears in the list of options provided). If not provided, no default is set.
     */
    default?: string;
    /**
     * Optional text shown above the input field, with markdown formatting supported. Default is no label.
     */
    label?: string;
    /**
     * Optional limit of the number of items rendered at once (useful to improve performance when displaying large lists).
     */
    limit?: number;
    /**
     * Optional placeholder text for input field; defaults to preset message.
     */
    placeholder?: string;
    /**
     * Set to `false` to disable rendering of suggestions as markdown. Default is `true`.
     */
    rendermd?: boolean;
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