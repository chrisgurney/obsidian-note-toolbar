import NoteToolbarPlugin from "main";
import { testCallback } from "Api/TestCallback";

type Callback = (arg: string) => void;

export interface INoteToolbarApi {
    testCallback: (buttonId: string, callback: Callback) => Promise<void>;
}

export class NoteToolbarApi {

    constructor(private plugin: NoteToolbarPlugin) { }

    public initialize(): INoteToolbarApi {
        return {
            testCallback: this.testCallback(),
        }
    }

    private testCallback(): (buttonId: string, callback: Callback) => Promise<void> {
        return async (buttonId: string, callback: Callback) => testCallback(this.plugin, buttonId, callback)
    }

    // TODO: add APIs to allow updating item’s label, tooltip (e.g., to show previous/next date)

}