import NoteToolbarPlugin from "main";
import { Platform, SuggestModal, TFile } from "obsidian";
import { DEFAULT_ITEM_SETTINGS, ErrorBehavior, GALLERY_DIVIDER_ID, ITEM_GALLERY_DIVIDER, ItemType, LocalVar, t, ToolbarItemSettings, ToolbarSettings } from "Settings/NoteToolbarSettings";
import { calcItemVisToggles } from "Utils/Utils";
import { renderItemSuggestion } from "../Utils/SettingsUIUtils";
import ItemModal from "./ItemModal";
import ToolbarSuggestModal from "./ToolbarSuggestModal";

/**
 * `Default` = Just uses modal to select an item, with no additional changes to UI.
 * `New` = Show the new item option; for use from the toolbar context menu.
 * `QuickTools` = Executes the item versus just selecting it.
 */
export type ItemSuggestMode = 'Default' | 'New' | 'QuickTools';

export default class ItemSuggestModal extends SuggestModal<ToolbarItemSettings> {

    private activeFile: TFile | null;
    private hasResults: boolean = false;

    private readonly NEW_ITEM: ToolbarItemSettings = {
        ...DEFAULT_ITEM_SETTINGS,
        uuid: 'NEW_ITEM',
        label: t('setting.item-suggest-modal.option-new'),
        icon: 'plus'
    };

    private readonly BROWSE_GALLERY_ITEM: ToolbarItemSettings = {
        ...DEFAULT_ITEM_SETTINGS,
        uuid: 'OPEN_GALLERY',
        label: t('setting.item-suggest-modal.link-gallery'),
        icon: 'layout-grid'
    };

    /**
     * Creates a new modal.
     * @param ntb NoteToolbarPlugin
     * @param activeFile TFile for the active file (so vars can be replaced)
     * @param toolbarId string ID of the toolbar to optionally scope this ItemSuggestModal to
     * @oaram callback function to call when an item is selected
     * @param mode ItemSuggestMode to use
     * @param quickToolsMode true if we're showing items that can be used; otherwise false to search for items
     */
	constructor(
        private ntb: NoteToolbarPlugin,
        private toolbarId?: string,
        private callback?: (item: ToolbarItemSettings) => void,
        private mode: ItemSuggestMode = 'Default'
    ) {

        super(ntb.app);
        this.modalEl.addClass("note-toolbar-setting-item-suggester-dialog");

        this.activeFile = ntb.app.workspace.getActiveFile();

        let toolbar = this.ntb.settingsManager.getToolbarById(toolbarId ?? null);

        const placeholder = toolbar
            ? t('setting.item-suggest-modal.placeholder-toolbar', { toolbar: toolbar.name, interpolation: { escapeValue: false } })
            : this.mode === 'QuickTools'
                ? t('setting.item-suggest-modal.placeholder-use')
                : t('setting.item-suggest-modal.placeholder');
        this.setPlaceholder(placeholder);

        let instructions = [];
        if (toolbarId) {
            instructions.push(
                {command: t('setting.item-suggest-modal.key-back'), purpose: t('setting.item-suggest-modal.instruction-back')},
            );
        }
        instructions.push(
            {command: t('setting.item-suggest-modal.key-navigate'), purpose: t('setting.item-suggest-modal.instruction-navigate')},
            {command: t('setting.item-suggest-modal.key-use'), purpose: (this.mode === 'QuickTools') ? t('setting.item-suggest-modal.instruction-use') : t('setting.item-suggest-modal.instruction-select')},
        );
        if (this.mode === 'QuickTools') {
            instructions.push(
                {command: (Platform.isWin || Platform.isLinux) ? t('setting.item-suggest-modal.key-edit-windows') : t('setting.item-suggest-modal.key-edit-macos'), purpose: t('setting.item-suggest-modal.instruction-edit')}
            );
        }
        instructions.push(
            {command: t('setting.item-suggest-modal.key-dismiss'), purpose: t('setting.item-suggest-modal.instruction-dismiss')}
        );
        this.setInstructions(instructions);

        if (this.mode === 'QuickTools') {
            // handle meta key selections
            this.scope.register(null, 'Enter', (event) => this.handleKeyboardSelection(event));
            // handle back navigation
            if (toolbarId) {
                this.scope.register(null, 'ArrowLeft', (event) => this.handleKeyboardSelection(event));
                this.scope.register(null, 'Backspace', (event) => this.handleKeyboardSelection(event));
            }
        }
    
    }

    /**
     * Removes non-alphanumeric characters including emojis
     */ 
    cleanString(str: string): string {
        return str.replace(/[^\p{L}\p{N}]/gu, '').toLowerCase();
    }

    /**
     * Gets suggestions to display.
     * @param inputStr string to search
     * @returns array of ToolbarItemSettings
     */
    async getSuggestions(inputStr: string): Promise<ToolbarItemSettings[]> {

        const itemSuggestions: ToolbarItemSettings[] = [];
        const lowerCaseInputStr = inputStr.trim().toLowerCase();
        const isInputEmpty = lowerCaseInputStr.length === 0;
        let sortedSuggestions: ToolbarItemSettings[] = [];
        let toolbarsToSearch = [];

        // scope search to toolbar if applicable
        if (this.toolbarId) {
            let toolbar = this.ntb.settingsManager.getToolbarById(this.toolbarId);
            toolbarsToSearch = toolbar ? [toolbar] : [];
        }
        else {
            toolbarsToSearch = this.ntb.settings.toolbars
        }

        // get matching items
        for (const toolbar of toolbarsToSearch) {
            for (const item of toolbar.items) {
                if (await this.isSearchMatch(item, lowerCaseInputStr)) itemSuggestions.push(item);
            }
        }

        // if we're scoped to a single toolbar, leave the results as-is, otherwise sort and remove dupes
        if (!this.toolbarId) {
            sortedSuggestions = sortedSuggestions.concat(this.sortSuggestions(itemSuggestions, lowerCaseInputStr));
        }

        this.hasResults = sortedSuggestions.length > 0;

        // placeholder for creating a new item
        if (this.mode === 'New') {
            if (isInputEmpty) {
                // put at the top if nothing's been entered
                sortedSuggestions.unshift(this.NEW_ITEM);
            }
            else if (this.hasResults) {
                // put at the bottom if there are results
                sortedSuggestions.push(this.NEW_ITEM);
            }
        }

        // add matching gallery items
        if (this.mode !== 'QuickTools' && !isInputEmpty) {
            let gallerySuggestions: ToolbarItemSettings[] = [];
            for (const galleryItem of this.ntb.gallery.getItems()) {
                if (await this.isSearchMatch(galleryItem, lowerCaseInputStr)) gallerySuggestions.push(galleryItem);
            }
            gallerySuggestions = this.sortSuggestions(gallerySuggestions, lowerCaseInputStr);
            if (gallerySuggestions.length > 0) {
                sortedSuggestions.push(ITEM_GALLERY_DIVIDER);
                sortedSuggestions.push(...gallerySuggestions);
                this.hasResults = true;
            }
        }

        if (!this.hasResults) {
            sortedSuggestions = [this.NEW_ITEM];
        }

        // always have the Gallery item at the end of any results (including empty)
        if (this.mode !== 'QuickTools') {
            sortedSuggestions.push(this.BROWSE_GALLERY_ITEM);
            // add gallery items as suggestions if nothing's been entered yet
            if (isInputEmpty) {
                let gallerySuggestions: ToolbarItemSettings[] = [];
                gallerySuggestions.push(...this.ntb.gallery.getItems());
                sortedSuggestions.push(ITEM_GALLERY_DIVIDER);
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
        // add items with labels/tooltips, matching search string
        if (itemName && itemStrings.includes(searchString)) {
            if (this.mode === 'QuickTools') {
                // menu items can't be "used"
                if (item.linkAttr.type === ItemType.Menu) return false;
                const [showOnDesktop, showOnMobile, showOnTablet] = calcItemVisToggles(item.visibility);
                // ...and is visible on this platform
                if ((Platform.isMobile && showOnMobile) || (Platform.isDesktop && showOnDesktop)) {
                    // ...and does not have a var link and label/tooltip that resolves to nothing
                    if (
                        !(this.ntb.vars.hasVars(item.link) && 
                            await this.ntb.vars.replaceVars(item.link, this.activeFile, ErrorBehavior.Ignore) === '') &&
                        !(this.ntb.vars.hasVars(itemName) && 
                            await this.ntb.vars.replaceVars(itemName, this.activeFile, ErrorBehavior.Ignore) === '')
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
     * Sorts the provided suggestions based on the provided search string.
     * @param itemsToSort ToolbarItemSettings to sort
     * @param searchString provided search string
     * @returns sorted results
     */
    sortSuggestions(itemsToSort: ToolbarItemSettings[], searchString: string): ToolbarItemSettings[] {

        const sortedSuggestions = [];
        
        // remove duplicates (+ redundant item-suggester items)
        const seen = new Set<string>();
        for (const item of itemsToSort) {
            if (item.linkAttr.commandId === 'note-toolbar:open-item-suggester') continue;
            const key = `${(item.label || item.tooltip).toLowerCase()}|${item.linkAttr.type === ItemType.Command ? item.linkAttr.commandId : item.link}`;
            if (seen.has(key)) continue;
            seen.add(key);
            sortedSuggestions.push(item);
        }

        // sort the results
        const recentItems = JSON.parse(this.ntb.app.loadLocalStorage(LocalVar.RecentItems) || '[]');
        sortedSuggestions.sort((a, b) => {
            const aItemNameRaw = this.cleanString(a.label || a.tooltip || '');
            const bItemNameRaw = this.cleanString(b.label || b.tooltip || '');
            const aItemName = this.cleanString((!this.ntb.vars.hasVars(a.label) ? a.label : '') || 
                (!this.ntb.vars.hasVars(a.tooltip) ? a.tooltip : '') || '');
            const bItemName = this.cleanString((!this.ntb.vars.hasVars(b.label) ? b.label : '') || 
                (!this.ntb.vars.hasVars(b.tooltip) ? b.tooltip : '') || '');

            const aStartsWith = aItemName.startsWith(searchString);
            const bStartsWith = bItemName.startsWith(searchString);

            // for Quick Tools, prioritize recent items if they start with the search string
            if (this.mode === 'QuickTools') {
                if (aStartsWith && bStartsWith) {
                    const isARecent = recentItems.includes(aItemNameRaw);
                    const isBRecent = recentItems.includes(bItemNameRaw);
                    if (isARecent && !isBRecent) return -1;
                    if (!isARecent && isBRecent) return 1;
                }
            }

            // prioritize items that start with the search string
            if (aStartsWith && !bStartsWith) return -1;
            if (!aStartsWith && bStartsWith) return 1;

            // check if primary contains the search string, and then prioritize primary matches
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
            if (item === this.NEW_ITEM || item === this.BROWSE_GALLERY_ITEM) {
                el.addClass('cm-em');
            }
            if (!this.hasResults && item === this.NEW_ITEM) {
                const emptyEl = this.resultContainerEl.createDiv();
                emptyEl.addClass('suggestion-empty');
                emptyEl.setText(t('setting.item-suggest-modal.label-empty-no-items'));
                emptyEl.insertAdjacentElement('afterend', el);
            }
            renderItemSuggestion(this.ntb, item, el, this.inputEl.value, true, (this.mode === 'QuickTools'));
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
                    let activeFile = this.ntb.app.workspace.getActiveFile();
                    const modal = new ToolbarSuggestModal(this.ntb, false, false, false, async (toolbar: ToolbarSettings) => {
                        await this.ntb.commands.openQuickTools(toolbar.uuid);
                    });
                    modal.open();
                }
                break;
            default: {
                let selectedItem = this.modalEl.querySelector('.note-toolbar-item-suggestion.is-selected');
                let item = selectedItem?.id ? this.ntb.settingsManager.getToolbarItemById(selectedItem?.id) : undefined;
                item ? this.onChooseSuggestion(item, event) : undefined;
                break;
            }
        }
    }

    /**
     * Closes the modal and executes the given item.
     * @param selectedItem Item to use.
     */
    async onChooseSuggestion(selectedItem: ToolbarItemSettings, event: MouseEvent | KeyboardEvent) {
        this.ntb.debug("onChooseSuggestion: ", selectedItem, this.activeFile, event);
        if (this.mode === 'QuickTools') {
            const itemName = this.cleanString(selectedItem.label || selectedItem.tooltip || selectedItem.link || '');
            await this.ntb.settingsManager.updateRecentList(LocalVar.RecentItems, itemName);
        }
        if (selectedItem.uuid !== GALLERY_DIVIDER_ID) {
            this.close();
            if (this.mode === 'QuickTools') {
                // open the item editor if the proper key modifiers are pressed
                const isModifierPressed = (Platform.isWin || Platform.isLinux) ? event?.ctrlKey : event?.metaKey;
                if (isModifierPressed && event?.shiftKey && !event?.altKey) {
                    const toolbar = this.ntb.settingsManager.getToolbarByItemId(selectedItem.uuid);
                    if (toolbar) {
                        const itemModal = new ItemModal(this.ntb, toolbar, selectedItem);
                        itemModal.open();
                        return;
                    }
                }
                // fall back to handling the item
                await this.ntb.items.handleItemLink(selectedItem, event);
            }
            else {
                // clear out the icon if it's the new item (which uses an icon for decoration in the suggester)
                if (selectedItem.uuid === this.NEW_ITEM.uuid) selectedItem.icon = '';
                if (this.callback !== undefined) this.callback(selectedItem);
            }
        }
    }

}