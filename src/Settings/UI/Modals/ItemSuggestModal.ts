import { Platform, SuggestModal, TFile, getIcon, setIcon, setTooltip } from "obsidian";
import NoteToolbarPlugin from "main";
import { calcItemVisToggles, debugLog } from "Utils/Utils";
import { ErrorBehavior, ItemType, t, ToolbarItemSettings, ToolbarSettings } from "Settings/NoteToolbarSettings";
import { ToolbarSuggestModal } from "./ToolbarSuggestModal";
import { renderItemSuggestion } from "../Utils/SettingsUIUtils";

export class ItemSuggestModal extends SuggestModal<ToolbarItemSettings> {

    public plugin: NoteToolbarPlugin;
    public activeFile: TFile | null;
    public toolbarId: string | undefined;
    private callback: ((item: ToolbarItemSettings) => void) | undefined;

    /**
     * Creates a new modal.
     * @param plugin NoteToolbarPlugin
     * @param activeFile TFile for the active file (so vars can be replaced)
     * @param toolbarId string ID of the toolbar to optionally scope this ItemSuggestModal to
     * @oaram callback function to call when an item is selected
     */
	constructor(plugin: NoteToolbarPlugin, toolbarId?: string, callback?: (item: ToolbarItemSettings) => void) {

        super(plugin.app);
        this.modalEl.addClass("note-toolbar-setting-item-suggester-dialog");

        this.plugin = plugin;
        this.activeFile = plugin.app.workspace.getActiveFile();
        this.toolbarId = toolbarId;
        this.callback = callback;

        let toolbar = this.plugin.settingsManager.getToolbarById(toolbarId ?? null);
        this.setPlaceholder(toolbar ? t('setting.item-suggest-modal.placeholder-toolbar', {toolbar: toolbar.name}) : t('setting.item-suggest-modal.placeholder'));

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

        // get list of items
        for (const toolbar of toolbarsToSearch) {
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
                        if (
                            !(
                                this.plugin.hasVars(item.link) && 
                                await this.plugin.replaceVars(
                                    item.link,
                                    this.activeFile,
                                    this.activeFile ? ErrorBehavior.Report : ErrorBehavior.Ignore) === ''
                            ) &&
                            !(
                                this.plugin.hasVars(itemName) && 
                                await this.plugin.replaceVars(
                                    itemName,
                                    this.activeFile,
                                    this.activeFile ? ErrorBehavior.Report : ErrorBehavior.Ignore) === ''
                            )
                        ) {
                            itemSuggestions.push(item);
                        }
                    }
                }
            }
        }

        let sortedItemSuggestions: ToolbarItemSettings[] = [];

        // if we're scoped to a single toolbar, leave the results as-is, otherwise sort and remove dupes
        if (!this.toolbarId) {

            // TODO? refactor as function to return item suggestions, for search?

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
        renderItemSuggestion(this.plugin, item, el, this.inputEl.value, true);
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
                    const modal = new ToolbarSuggestModal(this.plugin, false, false, (toolbar: ToolbarSettings) => {
                        this.plugin.commands.openItemSuggester(toolbar.uuid);
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
        this.close();
        (this.callback !== undefined)
            ? this.callback(selectedItem) 
            : await this.plugin.handleItemLink(selectedItem, event);
    }

}