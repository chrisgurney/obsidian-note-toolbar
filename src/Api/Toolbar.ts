import NoteToolbarPlugin from "main";
import { ToolbarSettings } from "Settings/NoteToolbarSettings";
import { exportToCallout } from "Utils/ImportExport";
import { IToolbar } from "./IToolbar";

export default class Toolbar implements IToolbar {

    public readonly id?: string;

    constructor(private ntb: NoteToolbarPlugin, private toolbar: ToolbarSettings) {
        this.id = toolbar.uuid;
    }

    /**
     * Gets the name of this toolbar.
     * 
     * @see IToolbar.getName
     */
    getName(): string | undefined {
        return this.toolbar?.name;
    }

    /**
     * Exports this toolbar to a Note Toolbar callout.
     * 
     * @see IToolbar.export
     */
    async export(): Promise<string | null> {
        if (this.toolbar) {
            return await exportToCallout(this.ntb, this.toolbar, this.ntb.settings.export);
        }
        return null;
    }

}