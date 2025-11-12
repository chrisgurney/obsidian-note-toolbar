import { AbstractInputSuggest, App } from "obsidian";
import { ToolbarItemSettings, ToolbarSettings } from "Settings/NoteToolbarSettings";
import NoteToolbarPlugin from "main";
import { renderItemSuggestion } from "../Utils/SettingsUIUtils";

export default class ItemSuggester extends AbstractInputSuggest<ToolbarItemSettings> {

    constructor(
        private ntb: NoteToolbarPlugin, 
        private toolbar: ToolbarSettings | undefined, 
        private inputEl: HTMLInputElement, 
        private callback: (item: ToolbarItemSettings) => void
    ) {
        super(ntb.app, inputEl);
    }

    getSuggestions(inputStr: string): ToolbarItemSettings[] {
        const itemSuggestions: ToolbarItemSettings[] = [];
        const itemsToSearch = this.toolbar ? this.toolbar.items : this.ntb.gallery.getItems();
        const lowerCaseInputStr = inputStr.toLowerCase();

        itemsToSearch.forEach((item: ToolbarItemSettings) => {
            let itemName = item.label || item.tooltip;
            if (!itemName) itemName = item.icon ? item.link : '';
            const itemStrings = `${item.label} ${item.tooltip} ${item.link} ${item.description ?? ''}`.toLowerCase();
            if (itemName && itemStrings.includes(lowerCaseInputStr)) {
                itemSuggestions.push(item);
            }
        });

        // sort the results
        itemSuggestions.sort((a, b) => {
            const q = lowerCaseInputStr;

            const getKey = (item: ToolbarItemSettings): string =>
                (item.label || item.tooltip || item.link || '').toLowerCase();

            const aKey = getKey(a);
            const bKey = getKey(b);

            // prioritize items that start with the search string
            const aStarts = aKey.startsWith(q);
            const bStarts = bKey.startsWith(q);
            if (aStarts && !bStarts) return -1;
            if (!aStarts && bStarts) return 1;

            const aIncludes = aKey.includes(q);
            const bIncludes = bKey.includes(q);
            if (aIncludes && !bIncludes) return -1;
            if (!aIncludes && bIncludes) return 1;

            return aKey.localeCompare(bKey);
        });

        return itemSuggestions;
    }
    
    /**
     * Renders a suggestion in the modal's list.
     * @param item ToolbarItemSettings to render
     * @param el HTMLElement to render it in
     */
    renderSuggestion(item: ToolbarItemSettings, el: HTMLElement): void {
        renderItemSuggestion(this.ntb, item, el, this.inputEl.value);
    }

    selectSuggestion(item: ToolbarItemSettings): void {
        this.callback(item);
        this.close();
    }    

}