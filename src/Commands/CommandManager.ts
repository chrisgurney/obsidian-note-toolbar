import { COMMAND_PREFIX_ITEM, COMMAND_PREFIX_TBAR, EMPTY_TOOLBAR_ID, LocalVar, PositionType, PropsState, t, ToolbarItemSettings, ToolbarSettings, ToolbarStyle } from "Settings/NoteToolbarSettings";
import { CommandSuggestModal } from "Settings/UI/Modals/CommandSuggestModal";
import { ItemSuggestModal } from "Settings/UI/Modals/ItemSuggestModal";
import ToolbarSettingsModal from "Settings/UI/Modals/ToolbarSettingsModal";
import { ToolbarSuggestModal } from "Settings/UI/Modals/ToolbarSuggestModal";
import { getItemText } from "Utils/Utils";
import NoteToolbarPlugin from "main";
import { Command, MarkdownView, Notice, Platform } from "obsidian";

export class CommandManager {

    public plugin: NoteToolbarPlugin;

    constructor(plugin: NoteToolbarPlugin) {
        this.plugin = plugin;
    }

    /**
     * Adds the toolbar item's command.
     */
    async addItemCommand(item: ToolbarItemSettings, callback: (commandName: string) => void): Promise<void> {
        const itemText = getItemText(this.plugin, item, true);
        const commandName = t('command.name-use-item', {item: itemText});
        if (itemText) {
            this.plugin.addCommand({ 
                id: COMMAND_PREFIX_ITEM + item.uuid, 
                name: commandName, 
                icon: item.icon ? item.icon : this.plugin.settings.icon, 
                callback: async () => {
                    let activeFile = this.plugin.app.workspace.getActiveFile();
                    await this.plugin.handleItemLink(item, undefined, activeFile);
                }
            });
            item.hasCommand = true;
            await this.plugin.settingsManager.save();
            callback(commandName);
        }
        else {
            item.hasCommand = false;
            await this.plugin.settingsManager.save();
            new Notice(t('setting.use-item-command.notice-command-error-noname'), 10000);
        }
    }

    /**
     * Utility to get command for the given toolbar or toolbar item, if the command exists.
     */
    getCommandFor(toolbarOrItem: ToolbarItemSettings | ToolbarSettings): Command | undefined {
        const prefix = ('items' in toolbarOrItem) ? COMMAND_PREFIX_TBAR : COMMAND_PREFIX_ITEM;
        const commandId = `${this.plugin.manifest.id}:${prefix}${toolbarOrItem.uuid}`;
        return this.plugin.app.commands.commands[commandId];
    }

    /**
     * Removes the toolbar item's command.
     */
    async removeItemCommand(item: ToolbarItemSettings): Promise<void> {
        const itemText = getItemText(this.plugin, item, true);
        const commandName = t('command.name-use-item', {item: itemText});
        this.plugin.removeCommand(COMMAND_PREFIX_ITEM + item.uuid);
        item.hasCommand = false;
        await this.plugin.settingsManager.save();
        itemText 
            ? new Notice(t('setting.use-item-command.notice-command-removed', { command: commandName }))
            : new Notice(t('setting.use-item-command.notice-command-removed_empty'));
    }

    /**
     * Adds commands to use each toolbar item.
     */
    setupItemCommands() {
        let hasIgnoredCommands: boolean = false;
        const ignoredCommandToolbars = new Set<string>();
        this.plugin.settings.toolbars.forEach(toolbar => {
            toolbar.items.forEach(item => {
                if (item.hasCommand) {
                    const itemText = getItemText(this.plugin, item, true);
                    if (itemText) {
                        const command = this.plugin.addCommand({
                            id: COMMAND_PREFIX_ITEM + item.uuid,
                            name: t('command.name-use-item', { item: itemText }),
                            icon: item.icon ? item.icon : this.plugin.settings.icon,
                            callback: async () => {
                                let activeFile = this.plugin.app.workspace.getActiveFile();
                                await this.plugin.handleItemLink(item, undefined, activeFile);
                            }
                        });
                    }
                    else {
                        hasIgnoredCommands = true;
                        ignoredCommandToolbars.add(toolbar.name);
                    }
                }
            });
        });
        if (hasIgnoredCommands) {
            new Notice(t('setting.use-item-command.notice-command-error-startup-noname', { toolbars: [...ignoredCommandToolbars].join(', ') }), 10000);
        }
    }

    /**
     * Update the command for the given toolbar item, to update its name and icon.
     */
    async updateItemCommand(item: ToolbarItemSettings, showNotice: boolean = true): Promise<void> {
        // get command for item
        const command = this.getCommandFor(item);
        if (command) {
            // get item text
            const itemText = getItemText(this.plugin, item, true);
            if (itemText) {
                const oldCommandName = command.name;
                command.name = `${this.plugin.manifest.name}: ${t('command.name-use-item', {item: itemText})}`;
                command.icon = item.icon ? item.icon : this.plugin.settings.icon;
                // only show notice if the command name changed, otherwise there's no need
                if (showNotice && (oldCommandName !== command.name)) {
                    new Notice(t('setting.use-item-command.notice-command-updated', { command: command.name }));
                }
            }
            else {
                await this.removeItemCommand(item);
            }
        }
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
                        this.plugin.commands.openQuickTools(toolbar.uuid);
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

        this.plugin.debug("focusCommand()");
        // need to get the type of toolbar first
        let toolbarEl = this.plugin.getToolbarEl();
        let toolbarPosition = toolbarEl?.getAttribute('data-tbar-position');
        switch (toolbarPosition) {
            case PositionType.FabRight:
            case PositionType.FabLeft:
                // trigger the menu
                let toolbarFabEl = toolbarEl?.querySelector('button.cg-note-toolbar-fab') as HTMLButtonElement;
                this.plugin.debug("focusCommand: button: ", toolbarFabEl);
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
                            this.plugin.app.saveLocalStorage(LocalVar.MenuPos, JSON.stringify(menuPos));
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
                    this.plugin.debug("focusCommand: toolbar: ", itemsUl);
                    let items = Array.from(itemsUl.children);
                    const visibleItems = items.filter(item => {
                        const hasSpan = item.querySelector('span') !== null; // to filter out separators
                        const isVisible = window.getComputedStyle(item).getPropertyValue('display') !== 'none';
                        return hasSpan && isVisible;
                    });
                    const linkEl = visibleItems[0] ? visibleItems[0].querySelector('span') : null;
                    this.plugin.debug("focusCommand: focussed item: ", linkEl);
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
     * Opens the item suggester modal for Quick Tools/Toolbars.
     * @param toolbarId optional ID of a toolbar to limit the ItemSuggestModal to show
     */
    async openQuickTools(toolbarId?: string): Promise<void> {
        const modal = new ItemSuggestModal(this.plugin, toolbarId, undefined, 'QuickTools');
        modal.open();
    }

    /**
     * Convenience command to open settings (Note Toolbar's by default).
     */
    async openSettings(tabId: string = 'note-toolbar'): Promise<void> {
        // @ts-ignore
        const settings = this.plugin.app.setting;
        await settings.open();
        settings.openTabById(tabId);
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
    async openToolbarSettingsForId(uuid: string, focusItemId?: string): Promise<void> {
        let toolbarSettings = this.plugin.settingsManager.getToolbarById(uuid);
        if (toolbarSettings) {
            const modal = new ToolbarSettingsModal(this.plugin.app, this.plugin, null, toolbarSettings);
            modal.setTitle(t('setting.title-edit-toolbar', { toolbar: toolbarSettings.name }));
            modal.open();
            if (focusItemId) modal.display(focusItemId);
        }
    }

    /**
     * Opens the toolbar suggester modal.
     */
    async openToolbarSuggester(): Promise<void> {
        let activeFile = this.plugin.app.workspace.getActiveFile();
        const modal = new ToolbarSuggestModal(this.plugin, false, false, false, async (toolbar: ToolbarSettings) => {
            await this.plugin.commands.openQuickTools(toolbar.uuid);
        });
        modal.open();
    }

    /**
     * Opens the toolbar suggester and replaces the current toolbar using the property.
     */
    async swapToolbar(): Promise<void> {
        const modal = new ToolbarSuggestModal(this.plugin, true, true, false, async (toolbar: ToolbarSettings) => {
            const activeFile = this.plugin.app.workspace.getActiveFile();
            if (activeFile) {
                await this.plugin.app.fileManager.processFrontMatter(activeFile, (frontmatter) => {
                    if (toolbar.uuid === EMPTY_TOOLBAR_ID) {
                        delete frontmatter[this.plugin.settings.toolbarProp];
                        return;
                    }
                    frontmatter[this.plugin.settings.toolbarProp] = toolbar.name;
                });
            }
        });
        modal.open();
    }

    /**
     * Toggles the Lock Note Toolbars callout setting.
     */
    async toggleLockCallouts(): Promise<void> {
        this.plugin.settings.lockCallouts = !this.plugin.settings.lockCallouts;
        await this.plugin.settingsManager.save();
        new Notice(
            this.plugin.settings.lockCallouts
                ? t('command.callouts-locked-notice')
                : t('command.callouts-unlocked-notice')
        );
    }

    /**
     * Shows, completely hides, folds, or toggles the visibility of this note's Properties.
     * @param visibility Set to 'show', 'hide', 'fold', or 'toggle'
     * @param isAutoFold Set to `true` if triggering automatically
     */
    async toggleProps(visibility: PropsState, isAutoFold: boolean = false): Promise<void> {

        let propsEl = this.plugin.getPropsEl();
        const activeFile = this.plugin.app.workspace.getActiveFile();
        const currentView = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
        // this.plugin.debug("togglePropsCommand: ", "visibility: ", visibility, "props: ", propsEl);
        // @ts-ignore make sure we're not in source (code) view
        if (activeFile && propsEl && !currentView?.editMode.sourceMode) {
            const propsDisplayStyle = getComputedStyle(propsEl).getPropertyValue('display');
            visibility === 'toggle' ? (propsDisplayStyle === 'none' ? visibility = 'show' : visibility = 'hide') : undefined;
            propsEl.style.setProperty(
                '--metadata-display-reading', ['show', 'fold'].contains(visibility) ? 'block' : 'none');
            propsEl.style.setProperty(
                '--metadata-display-editing', ['show', 'fold'].contains(visibility) ? 'block' : 'none');
            switch (visibility) {
                case 'fold':
                    if (!propsEl.classList.contains('is-collapsed')) {
                        (propsEl.querySelector('.metadata-properties-heading') as HTMLElement).click();
                    }
                    break;
                case 'show':
                    // expand the Properties heading if it's collapsed, because it will stay closed if the file is saved in that state
                    if (propsEl.classList.contains('is-collapsed')) {
                        (propsEl.querySelector('.metadata-properties-heading') as HTMLElement).click();
                    }
                    else if (!isAutoFold) {
                        // if there's no properties, execute the Add property command
                        const metadata = this.plugin.app.metadataCache.getFileCache(activeFile);
                        const hasProperties = !!metadata?.frontmatter && Object.keys(metadata.frontmatter).length > 0;
                        if (!hasProperties) await this.plugin.app.commands.executeCommandById('markdown:add-metadata-property');
                    }
                    break;
            }
            this.plugin.app.saveLocalStorage(LocalVar.PropsState, visibility);
        }

    }

}