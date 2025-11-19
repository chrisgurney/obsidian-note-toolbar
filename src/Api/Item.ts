import NoteToolbarPlugin from "main";
import { getIcon } from "obsidian";
import { t, ToolbarItemSettings } from "Settings/NoteToolbarSettings";
import { IItem } from "./IItem";

export default class Item implements IItem {

    public readonly id?: string;

    constructor(private ntb: NoteToolbarPlugin, private item: ToolbarItemSettings) {
        this.id = this.item.uuid;
    }

    /**
     * Returns the item's icon (ID).
     * 
     * @see IItem.getIcon
     */
    getIcon(): string {
        return this.item.icon;
    }

    /**
     * Returns the item's label.
     * 
     * @see IItem.getLabel
     */
    getLabel(): string {
        return this.item.label;
    }

    /**
     * Returns the item's tooltip.
     * 
     * @see IItem.getTooltip
     */
    getTooltip(): string {
        return this.item.tooltip;
    }

    /**
     * Replaces the item's icon to the provided one, if it exists.
     * 
     * @see IItem.setIcon
     */
    setIcon(iconId: string): void {
        const newIcon = getIcon(iconId);
        if (newIcon || iconId === '') {
            this.item.icon = iconId;
            const toolbar = this.ntb.settingsManager.getToolbarByItemId(this.item.uuid);
            if (toolbar) toolbar.updated = new Date().toISOString();
            this.ntb.settingsManager.save();
        }
        else {
            throw new Error(t('api.item.error-invalid-icon', { iconId: iconId }));
        }
    }

    /**
     * Replaces the item's label with the provided text.
     * 
     * @see IItem.setLabel
     */
    setLabel(text: string): void {
        this.item.label = text;
        const toolbar = this.ntb.settingsManager.getToolbarByItemId(this.item.uuid);
        if (toolbar) toolbar.updated = new Date().toISOString();
        this.ntb.settingsManager.save();
    }

    /**
     * Replaces the item's tooltip with the provided text.
     * 
     * @see IItem.setTooltip
     */
    setTooltip(text: string): void {
        this.item.tooltip = text;
        const toolbar = this.ntb.settingsManager.getToolbarByItemId(this.item.uuid);
        if (toolbar) toolbar.updated = new Date().toISOString();
        this.ntb.settingsManager.save();
    }

}