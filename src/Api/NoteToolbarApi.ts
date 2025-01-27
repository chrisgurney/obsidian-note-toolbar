import NoteToolbarPlugin from "main";
import { testCallback } from "Api/TestCallback";
import { SuggesterModal } from "./SuggesterModal";
import { PromptModal } from "./PromptModal";
import { INoteToolbarApi, NtbPromptOptions, NtbSuggesterOptions } from "./INoteToolbarApi";

export type Callback = (arg: string) => void;

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
    async prompt(options?: NtbPromptOptions): Promise<string | null> {

        const prompt = new PromptModal(this.plugin.app, options);

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
        values: string[] | ((value: T) => string), keys?: T[], options?: NtbSuggesterOptions
    ): Promise<T> {

        const suggester = new SuggesterModal(this.noteToolbar.app, values, keys, options);

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