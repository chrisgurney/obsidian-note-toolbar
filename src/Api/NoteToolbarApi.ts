import NoteToolbarPlugin from "main";
import { testCallback } from "Api/TestCallback";
import { SuggesterModal } from "./SuggesterModal";
import { PromptModal } from "./PromptModal";

type Callback = (arg: string) => void;

export interface INoteToolbarApi<T> {

    testCallback: (buttonId: string, callback: Callback) => Promise<void>;

    /**
     * Gets the clipboard value. 
     */
    clipboard: () => Promise<string | null>;

    /**
     * Shows the prompt modal and waits for the user's input.
     * @param prompt_text: Text placed above the input field.
     * @param multi_line: If set to true, the input field will be a multiline textarea. Defaults to false.
     * @param placeholder Placeholder string of the prompt.
     * @param default_value: A default value for the input field.
     * @returns The user's input.
     */
    prompt: (prompt_text: string, multi_line?: boolean, placeholder?: string, default_value?: string) => Promise<string | null>;

    /**
     * Shows a suggester modal and waits for the user's selection.
     * @param text_items Array of strings representing the text that will be displayed for each item in the suggester prompt. This can also be a function that maps an item to its text representation.
     * @param items Array containing the values of each item in the correct order.
     * @param placeholder Placeholder string of the prompt.
     * @param limit Limit the number of items rendered at once (useful to improve performance when displaying large lists).
     * @returns The selected item.
     */
    suggester: (text_items: string[] | ((item: T) => string), items?: T[], placeholder?: string, limit?: number) => Promise<T | null>;

}

export class NoteToolbarApi<T> implements INoteToolbarApi<T> {

    private noteToolbar: NoteToolbarPlugin;

    constructor(private plugin: NoteToolbarPlugin) {
        this.noteToolbar = plugin;
    }

    async testCallback(buttonId: string, callback: Callback) {
        return await testCallback(this.plugin, buttonId, callback);
    }

    /**
     * Gets the clipboard value. 
     */
    async clipboard(): Promise<string | null> {
        return await navigator.clipboard.readText();
    }

    /**
     * Shows the prompt modal and waits for the user's input. 
     * 
     * Adapted from Templater:
     * @link https://github.com/SilentVoid13/Templater/blob/master/src/core/functions/internal_functions/system/InternalModuleSystem.ts
     */
    async prompt(
        prompt_text: string, multi_line = false, placeholder?: string, default_value?: string
    ): Promise<string | null> {

        const prompt = new PromptModal(this.plugin.app, prompt_text, multi_line, placeholder, default_value);

        const promise = new Promise((resolve: (value: string) => void, reject: (reason?: Error) => void) => 
            prompt.openAndGetValue(resolve, reject)
        );

        try {
            return await promise;
        } 
        catch (error) {
            return null;
        }

    };

    /**
     * Shows a suggester modal and waits for the user's selection. 
     * 
     * Adapted from Templater:
     * @link https://github.com/SilentVoid13/Templater/blob/master/src/core/functions/internal_functions/system/InternalModuleSystem.ts
     */
    async suggester<T>(
        text_items: string[] | ((item: T) => string), items?: T[], placeholder = '', limit?: number
    ): Promise<T> {

        const suggester = new SuggesterModal(this.noteToolbar.app, text_items, items, placeholder, limit);

        const promise = new Promise((resolve: (value: T) => void, reject: (reason?: Error) => void) => 
            suggester.openAndGetValue(resolve, reject)
        );

        try {
            return await promise;
        } 
        catch (error) {
            return null as unknown as T;
        }

    };

}