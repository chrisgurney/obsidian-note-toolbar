import { ToolbarSettings } from "Settings/NoteToolbarSettings";
import { IToolbar } from "./IToolbar";

export default class Toolbar implements IToolbar {

    public readonly id?: string;

    constructor(
        private settings: ToolbarSettings
    ) {
        this.id = settings.uuid;
    }

    /**
     * Gets the name of this toolbar.
     * 
     * @see IToolbar.getName
     */
    getName(): string | undefined {
        return this.settings?.name;
    }

}