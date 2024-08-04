import ToolbarSettingsModal from "Settings/UI/Modals/ToolbarSettingsModal";
import { debugLog } from "Utils/Utils";
import NoteToolbarPlugin from "main";
import { MarkdownView } from "obsidian";

export class CommandsManager {

    public plugin: NoteToolbarPlugin;

    constructor(plugin: NoteToolbarPlugin) {
        this.plugin = plugin;
    }

    /**
     * Sets the focus on the first item in the toolbar.
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
                    const link = visibleItems[0] ? visibleItems[0].querySelector('span') : null;
                    debugLog("focusCommand: focussed item: ", link);
                    link?.focus();
                }
                break;
            case 'hidden':
            default:
                // do nothing
                break;
        }

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
     * Convenience command to open this toolbar's settings.
     */
    async openToolbarSettings(): Promise<void> {
        // figure out what toolbar is on the screen
        let toolbarEl = this.plugin.getToolbarEl();
        let toolbarSettings = toolbarEl ? this.plugin.settingsManager.getToolbarById(toolbarEl?.id) : undefined;
        if (toolbarSettings) {
            const modal = new ToolbarSettingsModal(this.plugin.app, this.plugin, null, toolbarSettings);
            modal.setTitle("Edit Toolbar: " + toolbarSettings.name);
            modal.open();
        }
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