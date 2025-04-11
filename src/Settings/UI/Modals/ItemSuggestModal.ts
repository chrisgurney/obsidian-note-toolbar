import { Platform, SuggestModal, TFile } from "obsidian";
import NoteToolbarPlugin from "main";
import { calcItemVisToggles, debugLog } from "Utils/Utils";
import { DEFAULT_ITEM_SETTINGS, ErrorBehavior, GALLERY_DIVIDER_ID, ITEM_GALLERY_DIVIDER, ItemType, t, ToolbarItemSettings, ToolbarSettings } from "Settings/NoteToolbarSettings";
import { ToolbarSuggestModal } from "./ToolbarSuggestModal";
import { renderItemSuggestion } from "../Utils/SettingsUIUtils";

/**
 * `Default` = Just uses modal to select an item, with no additional changes to UI.
 * `New` = Show the new item option; for use from the toolbar context menu.
 * `QuickTools` = Executes the item versus just selecting it.
 */
export type ItemSuggestMode = 'Default' | 'New' | 'QuickTools';

export class ItemSuggestModal extends SuggestModal<ToolbarItemSettings> {

    private activeFile: TFile | null;

    /**
     * Creates a new modal.
     * @param plugin NoteToolbarPlugin
     * @param activeFile TFile for the active file (so vars can be replaced)
     * @param toolbarId string ID of the toolbar to optionally scope this ItemSuggestModal to
     * @oaram callback function to call when an item is selected
     * @param mode ItemSuggestMode to use
     * @param quickToolsMode true if we're showing items that can be used; otherwise false to search for items
     */
	constructor(
        private plugin: NoteToolbarPlugin,
        private toolbarId?: string,
        private callback?: (item: ToolbarItemSettings) => void,
        private mode: ItemSuggestMode = 'Default'
    ) {

        super(plugin.app);
        this.modalEl.addClass("note-toolbar-setting-item-suggester-dialog");

        this.activeFile = plugin.app.workspace.getActiveFile();

        let toolbar = this.plugin.settingsManager.getToolbarById(toolbarId ?? null);
        // TODO: set more appropriate placeholders for Quick Tools
        this.setPlaceholder(toolbar ? t('setting.item-suggest-modal.placeholder-toolbar', {toolbar: toolbar.name}) : t('setting.item-suggest-modal.placeholder'));

        let instructions = [];
        if (toolbarId) {
            instructions.push(
                {command: t('setting.item-suggest-modal.key-back'), purpose: t('setting.item-suggest-modal.instruction-back')},
            );
        }
        instructions.push(
            {command: t('setting.item-suggest-modal.key-navigate'), purpose: t('setting.item-suggest-modal.instruction-navigate')},
            {command: t('setting.item-suggest-modal.key-use'), purpose: (this.mode === 'QuickTools') ? t('setting.item-suggest-modal.instruction-use') : t('setting.item-suggest-modal.instruction-select')},
            {command: t('setting.item-suggest-modal.key-dismiss'), purpose: t('setting.item-suggest-modal.instruction-dismiss')},
        );
        this.setInstructions(instructions);

        if (this.mode === 'QuickTools') {
            // handle meta key selections
            if (Platform.isWin || Platform.isLinux) {
                this.scope.register(['Ctrl'], 'Enter', (event) => this.handleKeyboardSelection(event));
                this.scope.register(['Ctrl', 'Alt'], 'Enter', (event) => this.handleKeyboardSelection(event));
            }
            else {
                this.scope.register(['Meta'], 'Enter', (event) => this.handleKeyboardSelection(event));
                this.scope.register(['Meta', 'Alt'], 'Enter', (event) => this.handleKeyboardSelection(event));
            }
            // handle back navigation
            if (toolbarId) {
                this.scope.register([], 'ArrowLeft', (event) => this.handleKeyboardSelection(event));
                this.scope.register([], 'Backspace', (event) => this.handleKeyboardSelection(event));
            }
        }
    
    }

    /**
     * Gets suggestions to display.
     * @param inputStr string to search
     * @returns array of ToolbarItemSettings
     */
    async getSuggestions(inputStr: string): Promise<ToolbarItemSettings[]> {

        let toolbarsToSearch = [];
        if (this.toolbarId) {
            let toolbar = this.plugin.settingsManager.getToolbarById(this.toolbarId);
            toolbarsToSearch = toolbar ? [toolbar] : [];
        }
        else {
            toolbarsToSearch = this.plugin.settings.toolbars
        }

        const itemSuggestions: ToolbarItemSettings[] = [];
        const lowerCaseInputStr = inputStr.toLowerCase();

        // get matching items
        for (const toolbar of toolbarsToSearch) {
            for (const item of toolbar.items) {
                if (await this.isSearchMatch(item, lowerCaseInputStr)) itemSuggestions.push(item);
            }
        }

        let sortedSuggestions: ToolbarItemSettings[] = [];

        // placeholder for creating a new item
        if (this.mode === 'New') {
            const newItem: ToolbarItemSettings = {
                ...DEFAULT_ITEM_SETTINGS,
                uuid: 'NEW_ITEM',
                label: t('setting.item-suggest-modal.option-new')
            };
            sortedSuggestions.push(newItem);
        }

        // if we're scoped to a single toolbar, leave the results as-is, otherwise sort and remove dupes
        if (!this.toolbarId) {
            sortedSuggestions = sortedSuggestions.concat(this.sortSuggestions(itemSuggestions, lowerCaseInputStr));
        }

        if (this.mode !== 'QuickTools') {
            // add gallery items
            let gallerySuggestions: ToolbarItemSettings[] = [];
            for (const galleryItem of this.plugin.gallery.getItems()) {
                if (await this.isSearchMatch(galleryItem, lowerCaseInputStr)) gallerySuggestions.push(galleryItem);
            }
            gallerySuggestions = this.sortSuggestions(gallerySuggestions, lowerCaseInputStr);
            if (gallerySuggestions.length > 0) {
                sortedSuggestions.push(ITEM_GALLERY_DIVIDER);
                const browseGallery: ToolbarItemSettings = {
                    ...DEFAULT_ITEM_SETTINGS,
                    uuid: 'OPEN_GALLERY',
                    label: t('setting.item-suggest-modal.link-gallery')
                };
                sortedSuggestions.push(browseGallery);
                sortedSuggestions.push(...gallerySuggestions);
            }
        }

        return this.toolbarId ? itemSuggestions : sortedSuggestions;

    }

    /**
     * Returns true if item matches provided search string.
     * @param item ToolbarItemSettings to check
     * @param searchString provided search string
     * @returns true if match; false otherwise
     */
    async isSearchMatch(item: ToolbarItemSettings, searchString: string): Promise<boolean> {

        let itemName = item.label || item.tooltip;
        if (!itemName) itemName = item.icon ? item.link : '';
        let itemStrings = `${item.label} ${item.tooltip} ${item.link} ${item.description ?? ''}`.toLowerCase();
        // add items with labels/tooltips, not menus, matching search string
        if (itemName && (item.linkAttr.type !== ItemType.Menu) && itemStrings.includes(searchString)) {
            if (this.mode === 'QuickTools') {
                const [showOnDesktop, showOnMobile, showOnTablet] = calcItemVisToggles(item.visibility);
                // ...and is visible on this platform
                if ((Platform.isMobile && showOnMobile) || (Platform.isDesktop && showOnDesktop)) {
                    // ...and does not have a var link and label/tooltip that resolves to nothing
                    if (
                        !(this.plugin.hasVars(item.link) && 
                            await this.plugin.replaceVars(item.link, this.activeFile, ErrorBehavior.Ignore) === '') &&
                        !(this.plugin.hasVars(itemName) && 
                            await this.plugin.replaceVars(itemName, this.activeFile, ErrorBehavior.Ignore) === '')
                    ) {
                        return true;
                    }
                }
            }
            else {
                return true;
            }
        }

        return false;

    }

    /**
     * Handles case where there's no suggestions.
     * If we're not in Quick Tools mode, it shows a link to the Gallery. 
     */
    onNoSuggestion(): void {
        this.resultContainerEl.empty();
        const emptyEl = this.resultContainerEl.createDiv();
        emptyEl.addClass('suggestion-empty');
        emptyEl.setText(t('setting.item-suggest-modal.label-empty-no-items'));
        if (this.mode !== 'QuickTools') {
            emptyEl.appendText(' ');
            const galleryLinkEl = emptyEl.createEl('a', { 
                href: 'obsidian://note-toolbar?gallery', 
                text: t('setting.item-suggest-modal.link-gallery')
            });
            galleryLinkEl.addClass('note-toolbar-setting-focussable-link');
        }
    }

    /**
     * Sorts the provided suggestions based on the provided search string.
     * @param itemsToSort ToolbarItemSettings to sort
     * @param searchString provided search string
     * @returns sorted results
     */
    sortSuggestions(itemsToSort: ToolbarItemSettings[], searchString: string): ToolbarItemSettings[] {

        // remove duplicates (+ redundant item-suggester items)
        let sortedSuggestions = 
            Array.from(
                new Set(
                    itemsToSort
                        .filter(item => item.linkAttr.commandId !== 'note-toolbar:open-item-suggester')
                        .map(item => 
                            `${(item.label || item.tooltip).toLowerCase()}|${item.link}`
                    )
                )
            ).map(uniqueKey => {
                const [labelOrTooltip, link] = uniqueKey.split('|');
                return itemsToSort.find(item =>
                    (item.label || item.tooltip).toLowerCase() === labelOrTooltip &&
                    item.link === link
                )!;
            });

        // TODO? prioritize recent items 
        const recentItems: string[] = [];

        // sort the results
        sortedSuggestions.sort((a, b) => {
            // remove non-alphanumeric characters including emojis
            const cleanString = (str: string) => str.replace(/[^\p{L}\p{N}]/gu, '').toLowerCase();
            const aItemNameRaw = cleanString(a.label || a.tooltip || a.link || '');
            const bItemNameRaw = cleanString(b.label || b.tooltip || a.link || '');
            const aItemName = cleanString((!this.plugin.hasVars(a.label) ? a.label : '') || 
                (!this.plugin.hasVars(a.tooltip) ? a.tooltip : '') || (!this.plugin.hasVars(a.link) ? a.link : ''));
            const bItemName = cleanString((!this.plugin.hasVars(b.label) ? b.label : '') || 
                (!this.plugin.hasVars(b.tooltip) ? b.tooltip : '') || (!this.plugin.hasVars(b.link) ? b.link : ''));

            // prioritize recent items
            const isARecent = recentItems.includes(aItemNameRaw);
            const isBRecent = recentItems.includes(bItemNameRaw);
            if (isARecent && !isBRecent) return -1;
            if (!isARecent && isBRecent) return 1;

            // check if primary contains the search string, and prioritize primary matches
            const aPrimaryMatch = aItemName.includes(searchString);
            const bPrimaryMatch = bItemName.includes(searchString);
            if (aPrimaryMatch && !bPrimaryMatch) return -1;
            if (!aPrimaryMatch && bPrimaryMatch) return 1;

            return aItemNameRaw.localeCompare(bItemNameRaw);
        });

        return sortedSuggestions;

    }

    /**
     * Renders a suggestion in the modal's list.
     * @param item ToolbarItemSettings to render
     * @param el HTMLElement to render it in
     */
    renderSuggestion(item: ToolbarItemSettings, el: HTMLElement): void {
        if (item?.uuid === GALLERY_DIVIDER_ID) {
            el.setText(t('gallery.label-suggestions'));
            el.addClass('note-toolbar-gallery-item-divider');
            el.removeClass('suggestion-item');
            el.removeClass('is-selected');
        }
        else {
            if (item?.inGallery) {
                el.addClass('note-toolbar-gallery-item-suggestion');
            }
            renderItemSuggestion(this.plugin, item, el, this.inputEl.value, true, (this.mode === 'QuickTools'));
        }
    }

    /**
     * Handle case where keyboard with meta key is used to make selection. 
     * @param event KeyboardEvent
     */
    async handleKeyboardSelection(event: KeyboardEvent) {
        switch (event.key) {
            case 'ArrowLeft':
            case 'Backspace':
                if (this.toolbarId && this.inputEl.value === '') {
                    this.close();
                    let activeFile = this.plugin.app.workspace.getActiveFile();
                    const modal = new ToolbarSuggestModal(this.plugin, false, false, false, async (toolbar: ToolbarSettings) => {
                        await this.plugin.commands.openQuickTools(toolbar.uuid);
                    });
                    modal.open();
                }
                break;
            default:
                let selectedItem = this.modalEl.querySelector('.note-toolbar-item-suggestion.is-selected');
                let item = selectedItem?.id ? this.plugin.settingsManager.getToolbarItemById(selectedItem?.id) : undefined;
                item ? this.onChooseSuggestion(item, event) : undefined;
                break;    
        }
    }

    /**
     * Closes the modal and executes the given item.
     * @param selectedItem Item to use.
     */
    async onChooseSuggestion(selectedItem: ToolbarItemSettings, event: MouseEvent | KeyboardEvent) {
        debugLog("onChooseSuggestion: ", selectedItem, this.activeFile, event);
        if (selectedItem.uuid !== GALLERY_DIVIDER_ID) {
            this.close();
            if (this.mode === 'QuickTools') await this.plugin.handleItemLink(selectedItem, event);
            else if (this.callback !== undefined) this.callback(selectedItem);
        }
    }

}