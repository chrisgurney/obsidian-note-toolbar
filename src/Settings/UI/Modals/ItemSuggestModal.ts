import { Platform, SuggestModal, TFile, getIcon, setIcon, setTooltip } from "obsidian";
import NoteToolbarPlugin from "main";
import { calcItemVisToggles, debugLog } from "Utils/Utils";
import { ItemType, t, ToolbarItemSettings } from "Settings/NoteToolbarSettings";
import { ToolbarSuggestModal } from "./ToolbarSuggestModal";

export class ItemSuggestModal extends SuggestModal<ToolbarItemSettings> {

    // private parentEl: HTMLElement;
    public plugin: NoteToolbarPlugin;
    public activeFile: TFile | null;
    public toolbarId: string | undefined;

    /**
     * Creates a new modal.
     * @param plugin NoteToolbarPlugin
     * @param activeFile TFile for the active file (so vars can be replaced)
     * @param toolbarId string ID of the toolbar to optionally scope this ItemSuggestModal to
     */
	constructor(plugin: NoteToolbarPlugin, activeFile: TFile | null, toolbarId?: string) {

        super(plugin.app);
        this.modalEl.addClass("note-toolbar-setting-item-suggester-dialog");
        // this.parentEl = parentEl;
        this.plugin = plugin;
        this.activeFile = activeFile;
        this.toolbarId = toolbarId;

        this.setPlaceholder(t('setting.item-suggest-modal.placeholder'));
        let instructions = [];
        if (toolbarId) {
            instructions.push(
                {command: t('setting.item-suggest-modal.key-back'), purpose: t('setting.item-suggest-modal.instruction-back')},
            );
        }
        instructions.push(
            {command: t('setting.item-suggest-modal.key-navigate'), purpose: t('setting.item-suggest-modal.instruction-navigate')},
            {command: t('setting.item-suggest-modal.key-use'), purpose: t('setting.item-suggest-modal.instruction-use')},
            {command: t('setting.item-suggest-modal.key-dismiss'), purpose: t('setting.item-suggest-modal.instruction-dismiss')},
        );
        this.setInstructions(instructions);

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

    /**
     * Gets suggestions to display.
     * @param inputStr string to search
     * @returns array of ToolbarItemSettings
     */
    async getSuggestions(inputStr: string): Promise<ToolbarItemSettings[]> {

        let pluginToolbars = [];
        if (this.toolbarId) {
            let toolbar = this.plugin.settingsManager.getToolbarById(this.toolbarId);
            pluginToolbars = toolbar ? [toolbar] : [];
        }
        else {
            pluginToolbars = this.plugin.settings.toolbars
        }

        // const pluginToolbars = this.plugin.settings.toolbars;
        const itemSuggestions: ToolbarItemSettings[] = [];
        const lowerCaseInputStr = inputStr.toLowerCase();

        // get list of items
        for (const toolbar of pluginToolbars) {
            for (const item of toolbar.items) {
                let itemName = item.label || item.tooltip;
                if (!itemName) itemName = item.icon ? item.link : '';
                let itemStrings = (item.label + item.tooltip + item.link).toLowerCase();
                // add items with labels/tooltips, not menus, matching search string
                if (itemName && (item.linkAttr.type !== ItemType.Menu) && itemStrings.includes(lowerCaseInputStr)) {
                    const [showOnDesktop, showOnMobile, showOnTablet] = calcItemVisToggles(item.visibility);
                    // ...and is visible on this platform
                    if ((Platform.isMobile && showOnMobile) || (Platform.isDesktop && showOnDesktop)) {
                        // ...and does not have a var link and label/tooltip that resolves to nothing
                        if (!(this.plugin.hasVars(item.link) && await this.plugin.replaceVars(item.link, this.activeFile, false) === "") &&
                            !(this.plugin.hasVars(itemName) && await this.plugin.replaceVars(itemName, this.activeFile, false) === "")) {
                            itemSuggestions.push(item);
                        }
                    }
                }
            }
        }

        let sortedItemSuggestions: ToolbarItemSettings[] = [];

        // if we're scoped to a single toolbar, leave the results as-is, otherwise sort and remove dupes
        if (!this.toolbarId) {

            // remove duplicates (+ redundant item-suggester items)
            sortedItemSuggestions = 
                Array.from(
                    new Set(
                        itemSuggestions
                            .filter(item => item.linkAttr.commandId !== 'note-toolbar:open-item-suggester')
                            .map(item => 
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

            const recentItems: string[] = [];

            // sort the results
            sortedItemSuggestions.sort((a, b) => {
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
                const aPrimaryMatch = aItemName.includes(lowerCaseInputStr);
                const bPrimaryMatch = bItemName.includes(lowerCaseInputStr);
                if (aPrimaryMatch && !bPrimaryMatch) return -1;
                if (!aPrimaryMatch && bPrimaryMatch) return 1;

                return aItemNameRaw.localeCompare(bItemNameRaw);
            });

        }

        return this.toolbarId ? itemSuggestions : sortedItemSuggestions;

    }

    /**
     * Renders a suggestion in the modal's list.
     * @param item ToolbarItemSettings to render
     * @param el HTMLElement to render it in
     */
    renderSuggestion(item: ToolbarItemSettings, el: HTMLElement): void {
        if (!item) { return }
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
        let itemName = item.label || item.tooltip;

        // fallback if no label or tooltip
        let isItemNameLink = false;
        if (!itemName) {
            if (item.icon) {
                isItemNameLink = true;
                itemName = item.link;
            }
            else {
                itemName = '';
            }
        }

        itemNameEl.addClass("note-toolbar-item-suggester-name");
        let itemLabel = itemNameEl.createSpan();

        let itemMeta = itemNameEl.createSpan();
        let title = itemName;
        // replace variables in labels (or tooltip, if no label set)
        this.plugin.replaceVars(itemName, this.activeFile, false).then((resolvedName) => {
            itemLabel.setText(resolvedName);
        });

        itemMeta.addClass("note-toolbar-item-suggester-type");
        switch (item.linkAttr.type) {
            case ItemType.Command:
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
            case ItemType.Dataview:
            case ItemType.JsEngine:
                setIcon(itemMeta, 'scroll');
                setTooltip(itemMeta, "Script");
                break;
            case ItemType.Templater:
                setIcon(itemMeta, 'templater-icon');
                setTooltip(itemMeta, "Templater");
                break;
        }
        
        const inputStrLower = this.inputEl.value.toLowerCase();
        // if what's shown doesn't already contain the searched string, show it below
        if (!title.toLowerCase().includes(inputStrLower)) {
            let inputMatch = 
                item.label.toLowerCase().includes(inputStrLower)
                    ? item.label
                    : item.tooltip.toLowerCase().includes(inputStrLower) 
                        ? item.tooltip 
                        : item.link;
            let itemNoteEl = itemLabel.createDiv();
            itemNoteEl.addClass('note-toolbar-item-suggester-note');
            itemNoteEl.setText(inputMatch);
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
                    const modal = new ToolbarSuggestModal(this.plugin, activeFile);
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
        this.close();
        await this.plugin.handleItemLink(selectedItem, event);
    }

}