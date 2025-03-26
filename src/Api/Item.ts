import { t, ToolbarItemSettings } from "Settings/NoteToolbarSettings";
import { IItem } from "./IItem";
import NoteToolbarPlugin from "main";
import { getIcon } from "obsidian";

export class Item implements IItem {

    public readonly id?: string;

    constructor(private plugin: NoteToolbarPlugin, private item: ToolbarItemSettings) {
        this.id = this.item.uuid;
    }

    /**
     * Updates the icon to the provided one, if it exists.
     * 
     * @see IItem.setIcon
     */
    setIcon(iconId: string): void {
        const newIcon = getIcon(iconId);
        if (newIcon) {
            this.item.icon = iconId;
            const toolbar = this.plugin.settingsManager.getToolbarByItemId(this.item.uuid);
            if (toolbar) toolbar.updated = new Date().toISOString();
            this.plugin.settingsManager.save();
        }
        else {
            throw new Error(t('api.item.error-invalid-icon', { iconId: iconId }));
        }
    }

}