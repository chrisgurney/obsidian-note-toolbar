import { AbstractInputSuggest, App } from "obsidian";
import { ToolbarItemSettings, ToolbarSettings } from "Settings/NoteToolbarSettings";
import NoteToolbarPlugin from "main";
import { renderItemSuggestion } from "../Utils/SettingsUIUtils";
import GalleryManager from "Gallery/GalleryManager";

export class ItemSuggester extends AbstractInputSuggest<ToolbarItemSettings> {

    private plugin: NoteToolbarPlugin;
    private toolbar: ToolbarSettings | undefined;
    private inputEl: HTMLInputElement;
    private callback: (item: ToolbarItemSettings) => void

    constructor(
        app: App, 
        plugin: NoteToolbarPlugin, 
        toolbar: ToolbarSettings | undefined, 
        inputEl: HTMLInputElement, 
        callback: (item: ToolbarItemSettings) => void
    ) {
        super(app, inputEl);
        this.plugin = plugin;
        this.toolbar = toolbar;
        this.inputEl = inputEl;
        this.callback = callback;
    }

    getSuggestions(inputStr: string): ToolbarItemSettings[] {
        const itemSuggestions: ToolbarItemSettings[] = [];
        const itemsToSearch = this.toolbar ? this.toolbar.items : this.plugin.gallery.getItems();
        const lowerCaseInputStr = inputStr.toLowerCase();

        itemsToSearch.forEach((item: ToolbarItemSettings) => {
            let itemName = item.label || item.tooltip;
            if (!itemName) itemName = item.icon ? item.link : '';
            const itemStrings = `${item.label} ${item.tooltip} ${item.link} ${item.description ?? ''}`.toLowerCase();
            if (itemName && itemStrings.includes(lowerCaseInputStr)) {
                itemSuggestions.push(item);
            }
        });

        return itemSuggestions;
    }
    
    /**
     * Renders a suggestion in the modal's list.
     * @param item ToolbarItemSettings to render
     * @param el HTMLElement to render it in
     */
    renderSuggestion(item: ToolbarItemSettings, el: HTMLElement): void {
        renderItemSuggestion(this.plugin, item, el, this.inputEl.value);
    }

    selectSuggestion(item: ToolbarItemSettings): void {
        this.callback(item);
        this.close();
    }    

}