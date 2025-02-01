import NoteToolbarPlugin from "main";
import { testCallback } from "Api/TestCallback";
import { NtbSuggester } from "./NtbSuggester";
import { NtbPrompt } from "./NtbPrompt";
import { INoteToolbarApi, NtbModalOptions, NtbPromptOptions, NtbSuggesterOptions } from "./INoteToolbarApi";
import { NtbModal } from "./NtbModal";
import { TFile } from "obsidian";

export type Callback = (arg: string) => void;

export class NoteToolbarApi<T> implements INoteToolbarApi<T> {

    constructor(private plugin: NoteToolbarPlugin) {
    }

    // async testCallback(buttonId: string, callback: Callback) {
    //     return await testCallback(this.plugin, buttonId, callback);
    // }

    /**
     * Gets the clipboard value. 
     */
    async clipboard(): Promise<string | null> {
        return await navigator.clipboard.readText();
    }

    /**
     * Shows a modal containing the provided content.
     * 
     * @see INoteToolbarApi.modal
     */
    async modal(content: string | TFile, options?: NtbModalOptions): Promise<void> {
        const modal = new NtbModal(this.plugin, content, options);
        const promise = new Promise((resolve: (value: string) => void, reject: (reason?: Error) => void) => 
            modal.openWithContent(resolve, reject)
        );

        try {
            await promise;
        }
        catch (error) {
            // do nothing
            // TODO: throw error in future if option provided?
        }
    }

    /**
     * Shows the prompt modal and waits for the user's input.
     * 
     * @see INoteToolbarApi.prompt
     * @see Adapted from [Templater](https://github.com/SilentVoid13/Templater/blob/master/src/core/functions/internal_functions/system/InternalModuleSystem.ts)
     */
    async prompt(options?: NtbPromptOptions): Promise<string | null> {

        const prompt = new NtbPrompt(this.plugin, options);

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
     * @see INoteToolbarApi.suggester
     * @see Adapted from [Templater](https://github.com/SilentVoid13/Templater/blob/master/src/core/functions/internal_functions/system/InternalModuleSystem.ts)
     */
    async suggester<T>(
        values: string[] | ((value: T) => string), keys?: T[], options?: NtbSuggesterOptions
    ): Promise<T> {

        const suggester = new NtbSuggester(this.plugin, values, keys, options);

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