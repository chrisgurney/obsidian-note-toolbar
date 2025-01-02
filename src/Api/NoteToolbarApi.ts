import NoteToolbarPlugin from "main";
import { testCallback } from "Api/TestCallback";
import { SuggesterModal } from "./SuggesterModal";
import { PromptModal } from "./PromptModal";

type Callback = (arg: string) => void;

export interface INoteToolbarApi<T> {
    testCallback: (buttonId: string, callback: Callback) => Promise<void>;
    /**
     * https://silentvoid13.github.io/Templater/internal-functions/internal-modules/system-module.html#tpsystemclipboard
     */
    clipboard: () => Promise<string | null>;
    /**
     * @param text_items Array of strings representing the text that will be displayed for each item in the suggester prompt. This can also be a function that maps an item to its text representation.
     * @param items Array containing the values of each item in the correct order.
     * @param throw_on_cancel Throws an error if the prompt is canceled, instead of returning a `null` value.
     * @param placeholder Placeholder string of the prompt.
     * @param limit Limit the number of items rendered at once (useful to improve performance when displaying large lists).
     * @returns The user's chosen item.
     */
    suggester: (text_items: string[] | ((item: T) => string), items: T[], throw_on_cancel: boolean, placeholder: string, limit?: number) => Promise<T | null>;
    /**
     * https://silentvoid13.github.io/Templater/internal-functions/internal-modules/system-module.html#tpsystempromptprompt_text-string-default_value-string-throw_on_cancel-boolean--false-multiline-boolean--false
     */
    prompt: (prompt_text: string, default_value: string, throw_on_cancel: boolean, multiline?: boolean) => Promise<string | null>;
}

export class NoteToolbarApi {

    private noteToolbar: NoteToolbarPlugin;

    constructor(private plugin: NoteToolbarPlugin) {
        this.noteToolbar = plugin;
    }

    public initialize<T>(): INoteToolbarApi<T> {
        return {
            testCallback: this.testCallback(),
            clipboard: this.generate_clipboard(),
            prompt: this.generate_prompt(),
            suggester: this.generate_suggester(),
        }
    }

    private testCallback(): (buttonId: string, callback: Callback) => Promise<void> {
        return async (buttonId: string, callback: Callback) => testCallback(this.plugin, buttonId, callback)
    }

    /**
     * 
     * @link https://github.com/SilentVoid13/Templater/blob/master/src/core/functions/internal_functions/system/InternalModuleSystem.ts
     */
    generate_clipboard(): () => Promise<string | null> {
        return async () => {
            return await navigator.clipboard.readText();
        };
    }

    /**
     * Generates a prompt modal.
     * 
     * @link https://github.com/SilentVoid13/Templater/blob/master/src/core/functions/internal_functions/system/InternalModuleSystem.ts
     */
    generate_prompt() {
        
        return async (
            prompt_text: string,
            default_value: string,
            throw_on_cancel = false,
            multi_line = false
        ): Promise<string | null> => {

            const prompt = new PromptModal(this.plugin.app, prompt_text, default_value, multi_line);

            const promise = new Promise((resolve: (value: string) => void, reject: (reason?: Error) => void) => 
                prompt.openAndGetValue(resolve, reject)
            );

            try {
                return await promise;
            } 
            catch (error) {
                if (throw_on_cancel) throw error;
                return null;
            }

        };
    }

    /**
     * Generates a suggester modal.
     * 
     * @example const selected = await ntb.suggester((item) => item, ["Option 1", "Option 2"], true, "Select an option:")
     * 
     * Adapted from Templater:
     * @link https://github.com/SilentVoid13/Templater/blob/master/src/core/functions/internal_functions/system/InternalModuleSystem.ts
     */
    private generate_suggester() {

        return async <T>(
            text_items: string[] | ((item: T) => string),
            items: T[],
            throw_on_cancel = false,
            placeholder = '',
            limit?: number
        ): Promise<T> => {

            const suggester = new SuggesterModal(this.noteToolbar.app, text_items, items, placeholder, limit);

            const promise = new Promise((resolve: (value: T) => void, reject: (reason?: Error) => void) => 
                suggester.openAndGetValue(resolve, reject)
            );

            try {
                return await promise;
            } 
            catch (error) {
                if (throw_on_cancel) throw error;
                return null as unknown as T;
            }

        };
    }

    // TODO: add APIs to allow updating item’s label, tooltip (e.g., to show previous/next date)

}