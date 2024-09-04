import { SuggestModal, TFile, getIcon, setIcon, setTooltip } from "obsidian";
import NoteToolbarPlugin from "main";
import { debugLog, hasVars, replaceVars } from "Utils/Utils";
import { ItemType, t, ToolbarItemSettings, ToolbarSettings } from "Settings/NoteToolbarSettings";

export class ItemSuggestModal extends SuggestModal<ToolbarItemSettings> {

    // private parentEl: HTMLElement;
    public plugin: NoteToolbarPlugin;
    public activeFile: TFile | null;

    /**
     * Creates a new modal.
     * @param plugin NoteToolbarPlugin
     * @param activeFile TFile for the active file (so vars can be replaced)
     */
	constructor(plugin: NoteToolbarPlugin, activeFile: TFile | null) {
        super(plugin.app);
        this.modalEl.addClass("note-toolbar-setting-item-suggester-dialog");
        // this.parentEl = parentEl;
        this.plugin = plugin;
        this.activeFile = activeFile;
        this.setPlaceholder(t('setting.item-suggester.placeholder'));
        this.setInstructions([
            {command: '↑↓', purpose: t('setting.item-suggester.instruction-navigate')},
            {command: '↵', purpose: t('setting.item-suggester.instruction-use')},
            {command: 'esc', purpose: t('setting.item-suggester.instruction-dismiss')},
        ]);
    }

    /**
     * Gets suggestions to display.
     * @param inputStr string to search
     * @returns array of ToolbarItemSettings
     */
    getSuggestions(inputStr: string): ToolbarItemSettings[] {
        const pluginToolbars = this.plugin.settings.toolbars;
        const itemSuggestions: ToolbarItemSettings[] = [];
        const lowerCaseInputStr = inputStr.toLowerCase();

        // add items with labels/tooltips, not menus, match search string, 
        // and does not have a var link and label/tooltip that resolves to nothing
        pluginToolbars.forEach((toolbar: ToolbarSettings) => {
            toolbar.items.forEach((item: ToolbarItemSettings) => {
                let itemName = (item.label || item.tooltip).toLowerCase();
                if (itemName && (item.linkAttr.type !== ItemType.Menu) && itemName.contains(lowerCaseInputStr)) {
                    if (!(hasVars(item.link) && replaceVars(this.app, item.link, this.activeFile, false) === "") &&
                        !(hasVars(itemName) && replaceVars(this.app, itemName, this.activeFile, false) === "")) {
                        itemSuggestions.push(item);
                    }
                }
            });
        });

        // remove duplicates
        let uniqueItemSuggestions = Array.from(
            new Set(
                itemSuggestions.map(item => 
                    `${(item.label || item.tooltip).toLowerCase()}|${item.link}`
                )
            )
        ).map(uniqueKey => {
            const [labelOrTooltip, link] = uniqueKey.split('|');
            return itemSuggestions.find(item =>
                (item.label || item.tooltip).toLowerCase() === labelOrTooltip &&
                item.link === link
            )!;
        });

        // sort the results
        uniqueItemSuggestions.sort((a, b) => {
            // remove non-alphanumeric characters including emojis
            const cleanString = (str: string) => str.replace(/[^\p{L}\p{N}]/gu, '');
            const aValue = cleanString(a.label || a.tooltip || '');
            const bValue = cleanString(b.label || b.tooltip || '');
            return aValue.localeCompare(bValue);
        });

        return uniqueItemSuggestions;
    }

    /**
     * Renders a suggestion in the modal's list.
     * @param item ToolbarItemSettings to render
     * @param el HTMLElement to render it in
     */
    renderSuggestion(item: ToolbarItemSettings, el: HTMLElement): void {
        el.addClass("note-toolbar-item-suggestion");
        if (item.icon) {
            let svgExists = getIcon(item.icon);
            if (svgExists) {
                let iconGlyph = el.createSpan();
                setIcon(iconGlyph, item.icon);
            }
        }
        let itemNameEl = el.createSpan();
        var itemName = item.label || item.tooltip;
        itemNameEl.addClass("note-toolbar-item-suggester-name");
        let itemLabel = itemNameEl.createSpan();

        let itemMeta = itemNameEl.createSpan();
        // replace variables in labels (or tooltip, if no label set)
        let title = hasVars(itemName) ? replaceVars(this.app, itemName, this.activeFile, false) : itemName;

        itemMeta.addClass("note-toolbar-item-suggester-type");
        switch (item.linkAttr.type) {
            case ItemType.Command:
                // setIcon(itemType, 'terminal');
                setTooltip(itemMeta, t('setting.item.option-command'));
                break;
            case ItemType.File:
                setIcon(itemMeta, 'file');
                setTooltip(itemMeta, t('setting.item.option-file'));
                break;
            case ItemType.Uri:
                setIcon(itemMeta, 'globe');
                setTooltip(itemMeta, t('setting.item.option-uri'));
                break;
        }
        
        if (hasVars(itemName)) {
            // let itemVar = itemNameEl.createSpan();
            itemMeta.setText(itemName);
            itemMeta.addClass("note-toolbar-item-suggester-var");
        }

        itemLabel.setText(title);
    }

    /**
     * Closes the modal and executes the given item.
     * @param selectedItem Item to use.
     */
    async onChooseSuggestion(selectedItem: ToolbarItemSettings, evt: MouseEvent | KeyboardEvent) {
        debugLog("onChooseSuggestion: ", selectedItem, this.activeFile);
        this.close();
        await this.plugin.handleLink(selectedItem.link, selectedItem.linkAttr.type, selectedItem.linkAttr.hasVars, selectedItem.linkAttr.commandId);
    }

}