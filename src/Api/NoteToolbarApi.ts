import NoteToolbarPlugin from "main";
import { testCallback } from "Api/TestCallback";
import { SuggesterModal } from "./SuggesterModal";

type Callback = (arg: string) => void;

export interface INoteToolbarApi<T> {
    testCallback: (buttonId: string, callback: Callback) => Promise<void>;
    suggester: (text_items: string[] | ((item: T) => string), items: T[], throw_on_cancel: boolean, placeholder: string, limit?: number) => Promise<T | null>;
}

export class NoteToolbarApi {

    private noteToolbar: NoteToolbarPlugin;

    constructor(private plugin: NoteToolbarPlugin) {
        this.noteToolbar = plugin;
    }

    public initialize<T>(): INoteToolbarApi<T> {
        return {
            testCallback: this.testCallback(),
            suggester: this.generate_suggester(),
        }
    }

    private testCallback(): (buttonId: string, callback: Callback) => Promise<void> {
        return async (buttonId: string, callback: Callback) => testCallback(this.plugin, buttonId, callback)
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
            const suggester = new SuggesterModal(
                this.noteToolbar.app,
                text_items,
                items,
                placeholder,
                limit
            );

            const promise = new Promise(
                (resolve: (value: T) => void, reject: (reason?: Error) => void) => 
                    suggester.openAndGetValue(resolve, reject)
            );

            try {
                return await promise;
            } 
            catch (error) {
                if (throw_on_cancel) {
                    throw error;
                }
                return null as T;
            }
        };
    }

    // TODO: add APIs to allow updating item’s label, tooltip (e.g., to show previous/next date)

}