import NoteToolbarPlugin from "main";
import { testCallback } from "Api/TestCallback";
import { SuggesterModal } from "./SuggesterModal";
import { PromptModal } from "./PromptModal";

type Callback = (arg: string) => void;

export interface INoteToolbarApi<T> {
    testCallback: (buttonId: string, callback: Callback) => Promise<void>;
    clipboard: () => Promise<string | null>;
    prompt: (prompt_text: string, multiline?: boolean, placeholder?: string, default_value?: string) => Promise<string | null>;
    suggester: (text_items: string[] | ((item: T) => string), items: T[], placeholder?: string, limit?: number) => Promise<T | null>;
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
     * Adapted from Templater:
     * @link https://github.com/SilentVoid13/Templater/blob/master/src/core/functions/internal_functions/system/InternalModuleSystem.ts
     */
    generate_prompt() {
        
        return async (
            prompt_text: string,
            multi_line = false,
            placeholder: string,
            default_value: string,
        ): Promise<string | null> => {

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
    }

    /**
     * Generates a suggester modal.
     * 
     * @example const selected = await NoteToolbar.suggester((item) => item, ["Option 1", "Option 2"], "Select an option:", 5)
     * 
     * Adapted from Templater:
     * @link https://github.com/SilentVoid13/Templater/blob/master/src/core/functions/internal_functions/system/InternalModuleSystem.ts
     */
    private generate_suggester() {

        return async <T>(
            text_items: string[] | ((item: T) => string),
            items: T[],
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
                return null as unknown as T;
            }

        };
    }

}