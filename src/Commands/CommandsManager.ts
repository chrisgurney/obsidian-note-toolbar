import { t, ToolbarStyle } from "Settings/NoteToolbarSettings";
import { ItemSuggestModal } from "Settings/UI/Modals/ItemSuggestModal";
import ToolbarSettingsModal from "Settings/UI/Modals/ToolbarSettingsModal";
import { ToolbarSuggestModal } from "Settings/UI/Modals/ToolbarSuggestModal";
import { debugLog } from "Utils/Utils";
import NoteToolbarPlugin from "main";
import { MarkdownView } from "obsidian";

export class CommandsManager {

    public plugin: NoteToolbarPlugin;

    constructor(plugin: NoteToolbarPlugin) {
        this.plugin = plugin;
    }

    /**
     * Sets the keyboard's focus on the first visible item in the toolbar.
     */
    async focus(): Promise<void> {

        debugLog("focusCommand()");
        // need to get the type of toolbar first
        let toolbarEl = this.plugin.getToolbarEl();
        let toolbarPosition = toolbarEl?.getAttribute('data-tbar-position');
        switch (toolbarPosition) {
            case 'fabr':
            case 'fabl':
                // trigger the menu
                let toolbarFab = toolbarEl?.querySelector('button.cg-note-toolbar-fab') as HTMLButtonElement;
                debugLog("focusCommand: button: ", toolbarFab);
                toolbarFab.click();
                break;
            case 'props':
            case 'top':
                // get the list and set focus on the first visible item
                let itemsUl: HTMLElement | null = this.plugin.getToolbarListEl();
                if (itemsUl) {
                    debugLog("focusCommand: toolbar: ", itemsUl);
                    let items = Array.from(itemsUl.children);
                    const visibleItems = items.filter(item => {
                        const hasSpan = item.querySelector('span') !== null; // to filter out separators
                        const isVisible = window.getComputedStyle(item).getPropertyValue('display') !== 'none';
                        return hasSpan && isVisible;
                    });
                    const linkEl = visibleItems[0] ? visibleItems[0].querySelector('span') : null;
                    debugLog("focusCommand: focussed item: ", linkEl);
                    visibleItems[0]?.addClass(ToolbarStyle.ItemFocused);
                    linkEl?.focus();
                }
                break;
            case 'hidden':
            default:
                // do nothing
                break;
        }

    }

    /**
     * Opens the item suggester modal.
     * @param toolbarId optional ID of a toolbar to limit the ItemSuggestModal to show
     */
    async openItemSuggester(toolbarId?: string): Promise<void> {
        let activeFile = this.plugin.app.workspace.getActiveFile();
        const modal = new ItemSuggestModal(this.plugin, activeFile, toolbarId);
        modal.open();
    }

    /**
     * Convenience command to open Note Toolbar's settings.
     */
    async openSettings(): Promise<void> {
        // @ts-ignore
        const settings = this.plugin.app.setting;
        settings.open();
        settings.openTabById('note-toolbar');
    }

    /**
     * Convenience command to open the active toolbar's settings.
     */
    async openToolbarSettings(): Promise<void> {
        // figure out what toolbar is on the screen
        let toolbarEl = this.plugin.getToolbarEl();
        toolbarEl?.id ? await this.openToolbarSettingsForId(toolbarEl.id) : undefined;
    }

    /**
     * Opens settings for a particular toolbar by ID.
     */
    async openToolbarSettingsForId(uuid: string): Promise<void> {
        let toolbarSettings = this.plugin.settingsManager.getToolbarById(uuid);
        if (toolbarSettings) {
            const modal = new ToolbarSettingsModal(this.plugin.app, this.plugin, null, toolbarSettings);
            modal.setTitle(t('setting.title-edit-toolbar', { toolbar: toolbarSettings.name }));
            modal.open();
        }
    }

    /**
     * Opens the toolbar suggester modal.
     */
    async openToolbarSuggester(): Promise<void> {
        let activeFile = this.plugin.app.workspace.getActiveFile();
        const modal = new ToolbarSuggestModal(this.plugin, activeFile);
        modal.open();
    }

    /**
     * Shows, completely hides, folds, or toggles the visibility of this note's Properties.
     * @param visibility Set to 'show', 'hide', 'fold', or 'toggle'
     */
    async toggleProps(visibility: 'show' | 'hide' | 'fold' | 'toggle'): Promise<void> {

        let propsEl = this.plugin.getPropsEl();
        let currentView = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
        debugLog("togglePropsCommand: ", "visibility: ", visibility, "props: ", propsEl);
        // @ts-ignore make sure we're not in source (code) view
        if (propsEl && !currentView.editMode.sourceMode) {
            let propsDisplayStyle = getComputedStyle(propsEl).getPropertyValue('display');
            visibility === 'toggle' ? (propsDisplayStyle === 'none' ? visibility = 'show' : visibility = 'hide') : undefined;
            switch (visibility) {
                case 'show':
                    propsEl.style.display = 'var(--metadata-display-editing)';
                    // expand the Properties heading if it's collapsed, because it will stay closed if the file is saved in that state
                    if (propsEl.classList.contains('is-collapsed')) {
                        (propsEl.querySelector('.metadata-properties-heading') as HTMLElement).click();
                    }	
                    break;
                case 'hide':
                    propsEl.style.display = 'none';
                    break;
                case 'fold':
                    if (!propsEl.classList.contains('is-collapsed')) {
                        (propsEl.querySelector('.metadata-properties-heading') as HTMLElement).click();
                    }
                    break;	
            }
        }

    }

}