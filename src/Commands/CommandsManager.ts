import { COMMAND_PREFIX_ITEM, COMMAND_PREFIX_TBAR, PositionType, t, ToolbarStyle } from "Settings/NoteToolbarSettings";
import { CommandSuggestModal } from "Settings/UI/Modals/CommandSuggestModal";
import { ItemSuggestModal } from "Settings/UI/Modals/ItemSuggestModal";
import ToolbarSettingsModal from "Settings/UI/Modals/ToolbarSettingsModal";
import { ToolbarSuggestModal } from "Settings/UI/Modals/ToolbarSuggestModal";
import { debugLog } from "Utils/Utils";
import NoteToolbarPlugin from "main";
import { MarkdownView, Notice } from "obsidian";

export class CommandsManager {

    public plugin: NoteToolbarPlugin;

    constructor(plugin: NoteToolbarPlugin) {
        this.plugin = plugin;
    }

    /**
     * Adds commands to use each toolbar item.
     */
    setupItemCommands() {
        this.plugin.settings.toolbars.forEach(toolbar => {
            toolbar.items.forEach(item => {
                if (item.hasCommand) {
                    this.plugin.addCommand({
                        id: COMMAND_PREFIX_ITEM + item.uuid,
                        name: t('command.name-use-item', {item: item.label || item.tooltip}),
                        icon: this.plugin.settings.icon,
                        callback: async () => {
                            let activeFile = this.plugin.app.workspace.getActiveFile();
                            await this.plugin.handleItemLink(item, undefined, activeFile);
                        }
                    });
                }
            });
        });
    }

    /**
     * Adds commands to open each toolbar in a Quick Tools window.
     */
    setupToolbarCommands() {
        this.plugin.settings.toolbars.forEach(toolbar => {
            if (toolbar.hasCommand) {
                this.plugin.addCommand({ 
                    id: COMMAND_PREFIX_TBAR + toolbar.uuid,
                    name: t('command.name-open-toolbar', {toolbar: toolbar.name}),
                    icon: this.plugin.settings.icon,
                    callback: async () => {
                        this.plugin.commands.openItemSuggester(toolbar.uuid);
                    }}
                );
            }
        });
    }

    /******************************************************************************
     COMMANDS
    ******************************************************************************/

    /**
     * Sets the keyboard's focus on the first visible item in the toolbar.
     */
    async focus(): Promise<void> {

        debugLog("focusCommand()");
        // need to get the type of toolbar first
        let toolbarEl = this.plugin.getToolbarEl();
        let toolbarPosition = toolbarEl?.getAttribute('data-tbar-position');
        switch (toolbarPosition) {
            case PositionType.FabRight:
            case PositionType.FabLeft:
                // trigger the menu
                let toolbarFabEl = toolbarEl?.querySelector('button.cg-note-toolbar-fab') as HTMLButtonElement;
                debugLog("focusCommand: button: ", toolbarFabEl);
                if (toolbarEl) {
                    const toolbar = this.plugin.settingsManager.getToolbarById(toolbarEl.id);
                    // show the toolbar's menu if it has a default item set
                    if (toolbar?.defaultItem) {
                        // TODO: this is a copy of toolbarFabHandler() -- put in a function?
                        let activeFile = this.plugin.app.workspace.getActiveFile();
                        this.plugin.renderToolbarAsMenu(toolbar, activeFile, this.plugin.settings.showEditInFabMenu).then(menu => { 
                            let fabPos = toolbarFabEl.getAttribute('data-tbar-position');
                            // determine menu orientation based on button position
                            let elemRect = toolbarFabEl.getBoundingClientRect();
                            let menuPos = { 
                                x: (fabPos === PositionType.FabLeft ? elemRect.x : elemRect.x + elemRect.width), 
                                y: (elemRect.top - 4),
                                overlap: true,
                                left: (fabPos === PositionType.FabLeft ? false : true)
                            };
                            // store menu position for sub-menu positioning
                            localStorage.setItem('note-toolbar-menu-pos', JSON.stringify(menuPos));
                            menu.showAtPosition(menuPos);
                        });
                    }
                    else {
                        toolbarFabEl.click();
                    }
                }
                break;
            case PositionType.Bottom:
            case PositionType.Props:
            case PositionType.Top:
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
            case PositionType.Hidden:
            default:
                // do nothing
                break;
        }

    }

    /**
     * Copies the selected command to the clipboard as a NTB URI or callout data element.
     */
    async copyCommand(returnDataElement: boolean = false): Promise<void> {
        const modal = new CommandSuggestModal(this.plugin, (command) => {
            const commandText = returnDataElement
                ? `[]()<data data-ntb-command="${command.id}"/> <!-- ${command.name} -->`
                : `obsidian://note-toolbar?command=${command.id}`;
            navigator.clipboard.writeText(commandText);
            new Notice(t('command.copy-command-notice'));
        });
        modal.open();
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