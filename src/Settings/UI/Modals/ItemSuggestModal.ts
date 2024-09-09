import { Platform, SuggestModal, TFile, getIcon, setIcon, setTooltip } from "obsidian";
import NoteToolbarPlugin from "main";
import { calcItemVisToggles, debugLog, hasVars, replaceVars } from "Utils/Utils";
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

        // handle meta key selections
        if (Platform.isWin || Platform.isLinux) {
            this.scope.register(['Ctrl'], 'Enter', (event) => this.handleKeyboardSelection(event));
            this.scope.register(['Ctrl', 'Alt'], 'Enter', (event) => this.handleKeyboardSelection(event));
        }
        else {
            this.scope.register(['Meta'], 'Enter', (event) => this.handleKeyboardSelection(event));
            this.scope.register(['Meta', 'Alt'], 'Enter', (event) => this.handleKeyboardSelection(event));
        }

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

        // get list of items
        pluginToolbars.forEach((toolbar: ToolbarSettings) => {
            toolbar.items.forEach((item: ToolbarItemSettings) => {
                let itemName = item.label || item.tooltip;
                let itemStrings = (item.label + item.tooltip + item.link).toLowerCase();
                // add items with labels/tooltips, not menus, matching search string
                if (itemName && (item.linkAttr.type !== ItemType.Menu) && itemStrings.includes(lowerCaseInputStr)) {
                    const [showOnDesktop, showOnMobile, showOnTablet] = calcItemVisToggles(item.visibility);
                    // ...and is visible on this platform
                    if ((Platform.isMobile && showOnMobile) || (Platform.isDesktop && showOnDesktop)) {
                        // ...and does not have a var link and label/tooltip that resolves to nothing
                        if (!(hasVars(item.link) && replaceVars(this.app, item.link, this.activeFile, false) === "") &&
                            !(hasVars(itemName) && replaceVars(this.app, itemName, this.activeFile, false) === "")) {
                            itemSuggestions.push(item);
                        }
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
            const cleanString = (str: string) => str.replace(/[^\p{L}\p{N}]/gu, '').toLowerCase();
            const aItemNameRaw = cleanString(a.label || a.tooltip || '');
            const bItemNameRaw = cleanString(b.label || b.tooltip || '');
            const aItemName = cleanString((!hasVars(a.label) ? a.label : '') || (!hasVars(a.tooltip) ? a.tooltip : ''));
            const bItemName = cleanString((!hasVars(b.label) ? b.label : '') || (!hasVars(b.tooltip) ? b.tooltip : ''));

            // check if primary contains the search string, and prioritize primary matches
            const aPrimaryMatch = aItemName.includes(lowerCaseInputStr);
            const bPrimaryMatch = bItemName.includes(lowerCaseInputStr);
            if (aPrimaryMatch && !bPrimaryMatch) return -1;
            if (!aPrimaryMatch && bPrimaryMatch) return 1;

            return aItemNameRaw.localeCompare(bItemNameRaw);
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
        el.setAttribute('id', item.uuid);
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
        
        itemLabel.setText(title);

        const inputStrLower = this.inputEl.value.toLowerCase();
        // if what's shown doesn't already contain the searched string, show it below
        if (!title.toLowerCase().includes(inputStrLower)) {
            let inputMatch = 
                item.label.toLowerCase().includes(inputStrLower)
                    ? item.label
                    : item.tooltip.toLowerCase().includes(inputStrLower) 
                        ? item.tooltip 
                        : item.link;
            let itemRawEl = itemLabel.createDiv();
            itemRawEl.addClass('note-toolbar-item-suggester-meta');
            itemRawEl.setText(inputMatch);
        }

    }

    /**
     * Handle case where keyboard with meta key is used to make selection. 
     * @param event KeyboardEvent
     */
    async handleKeyboardSelection(event: KeyboardEvent) {
        let selectedItem = this.modalEl.querySelector('.note-toolbar-item-suggestion.is-selected');
        let item = selectedItem?.id ? this.plugin.settingsManager.getToolbarItemById(selectedItem?.id) : undefined;
        item ? this.onChooseSuggestion(item, event) : undefined;
    }

    /**
     * Closes the modal and executes the given item.
     * @param selectedItem Item to use.
     */
    async onChooseSuggestion(selectedItem: ToolbarItemSettings, event: MouseEvent | KeyboardEvent) {
        debugLog("onChooseSuggestion: ", selectedItem, this.activeFile, event);
        this.close();
        await this.plugin.handleItemLink(selectedItem, event);
    }

}