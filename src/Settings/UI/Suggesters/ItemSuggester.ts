import { AbstractInputSuggest, App } from "obsidian";
import { ToolbarItemSettings, ToolbarSettings } from "Settings/NoteToolbarSettings";
import NoteToolbarPlugin from "main";
import { renderItemSuggestion } from "../Utils/SettingsUIUtils";

export class ItemSuggester extends AbstractInputSuggest<ToolbarItemSettings> {

    private plugin: NoteToolbarPlugin;
    private toolbar: ToolbarSettings;
    private inputEl: HTMLInputElement;

    constructor(app: App, plugin: NoteToolbarPlugin, toolbar: ToolbarSettings, inputEl: HTMLInputElement) {
        super(app, inputEl);
        this.plugin = plugin;
        this.toolbar = toolbar;
        this.inputEl = inputEl;
    }

    getSuggestions(inputStr: string): ToolbarItemSettings[] {
        const itemSuggestions: ToolbarItemSettings[] = [];
        const toolbarItems = this.toolbar.items;
        const lowerCaseInputStr = inputStr.toLowerCase();

        toolbarItems.forEach((item: ToolbarItemSettings) => {
            let itemName = item.label || item.tooltip;
            if (!itemName) itemName = item.icon ? item.link : '';
            let itemStrings = (item.label + item.tooltip + item.link).toLowerCase();
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

}