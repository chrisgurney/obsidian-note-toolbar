import NoteToolbarPlugin from "main";
import { ToolbarSettings } from "Settings/NoteToolbarSettings";
import { exportToCallout } from "Utils/ImportExport";
import { IToolbar } from "./IToolbar";

export class Toolbar implements IToolbar {

    public readonly id: string;

    private toolbar: ToolbarSettings | undefined;

    constructor(private plugin: NoteToolbarPlugin, id: string) {
        this.id = id;
        this.toolbar = this.plugin.settingsManager.getToolbarById(id);
    }

    /**
     * Exports this toolbar to a Note Toolbar callout.
     * 
     * @see IToolbar.export
     */
    async export(): Promise<string | null> {
        if (this.toolbar) {
            return await exportToCallout(this.plugin, this.toolbar, this.plugin.settings.export);
        }
        return null;
    }

}