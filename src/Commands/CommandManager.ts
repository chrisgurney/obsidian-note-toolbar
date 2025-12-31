import { EditorView } from "@codemirror/view";
import { COMMAND_PREFIX_ITEM, COMMAND_PREFIX_TBAR, EMPTY_TOOLBAR_ID, LocalVar, PositionType, ToggleUiStateType, t, ToolbarItemSettings, ToolbarSettings, ToolbarStyle, VIEW_TYPE_GALLERY } from "Settings/NoteToolbarSettings";
import CommandSuggestModal from "Settings/UI/Modals/CommandSuggestModal";
import ItemSuggestModal from "Settings/UI/Modals/ItemSuggestModal";
import ToolbarSettingsModal from "Settings/UI/Modals/ToolbarSettingsModal";
import ToolbarSuggestModal from "Settings/UI/Modals/ToolbarSuggestModal";
import { getItemText } from "Utils/Utils";
import NoteToolbarPlugin from "main";
import { Command, ItemView, MarkdownView, Notice } from "obsidian";

export default class CommandManager {

    constructor(
        private ntb: NoteToolbarPlugin
    ) {}

    /**
     * Adds plugin's commands. Called from plugin's `onLayoutReady()`.
     */
    addCommands(): void {

        this.ntb.addCommand({ id: 'copy-cmd-uri', name: t('command.name-copy-cmd-uri'), callback: async () => this.copy(false) });
        this.ntb.addCommand({ id: 'copy-cmd-as-data-element', name: t('command.name-copy-cmd-as-data-element'), callback: async () => this.copy(true) });
        this.ntb.addCommand({ id: 'focus', name: t('command.name-focus'), callback: async () => this.focus() });
        this.ntb.addCommand({ id: 'focus-text-toolbar', name: t('command.name-focus-text-toolbar'), callback: async () => this.focus(true) });
        this.ntb.addCommand({ id: 'open-gallery', name: t('command.name-open-gallery'), callback: async () => this.ntb.app.workspace.getLeaf(true).setViewState({ type: VIEW_TYPE_GALLERY, active: true }) });

        this.ntb.addCommand({ id: 'open-item-suggester', name: t('command.name-item-suggester'), callback: async () => this.openQuickTools() });
        this.ntb.addCommand({ id: 'open-item-suggester-current', name: t('command.name-item-suggester-current'), icon: this.ntb.settings.icon, checkCallback: this.checkHasToolbarAndRun(async () => { 
            const currentToolbar = this.ntb.settingsManager.getCurrentToolbar();
            if (currentToolbar) this.openQuickTools(currentToolbar.uuid);
        }) });
        this.ntb.addCommand({ id: 'open-toolbar-suggester', name: (t('command.name-toolbar-suggester')), callback: async () => this.openToolbarSuggester() });
        this.ntb.addCommand({ id: 'open-settings', name: t('command.name-settings'), callback: async () => this.openSettings() });
        this.ntb.addCommand({ id: 'open-toolbar-settings', name: t('command.name-toolbar-settings'), checkCallback: this.checkHasToolbarAndRun(async () => { this.openToolbarSettings(); }) });

        this.ntb.addCommand({ id: 'toggle-base-toolbar', name: t('command.name-toggle-base-toolbar'), callback: () => this.toggleUi('baseToolbar', 'toggle') });

        this.ntb.addCommand({ id: 'toggle-properties', name: t('command.name-toggle-properties'), checkCallback: this.checkViewAndRun('markdown', async () => { this.toggleUi('props', 'toggle'); }) });
        this.ntb.addCommand({ id: 'show-properties', name: t('command.name-show-properties'),  checkCallback: this.checkViewAndRun('markdown', async () => { this.toggleUi('props', 'show'); }) });
        this.ntb.addCommand({ id: 'hide-properties', name: t('command.name-hide-properties'), checkCallback: this.checkViewAndRun('markdown', async () => { this.toggleUi('props', 'hide'); }) });
        this.ntb.addCommand({ id: 'fold-properties', name: t('command.name-fold-properties'), checkCallback: this.checkViewAndRun('markdown', async () => { this.toggleUi('props', 'fold'); }) });

        this.ntb.addCommand({ id: 'toggle-lock-callouts', name: t('command.name-toggle-lock-callouts'), callback: async () => this.toggleLockCallouts() });

    }

    /**
     * Adds the toolbar item's command.
     */
    async addItemCommand(item: ToolbarItemSettings, callback: (commandName: string) => void): Promise<void> {
        const itemText = getItemText(this.ntb, item, true);
        const commandName = t('command.name-use-item', { item: itemText, interpolation: { escapeValue: false } });
        if (itemText) {
            this.ntb.addCommand({ 
                id: COMMAND_PREFIX_ITEM + item.uuid, 
                name: commandName, 
                icon: item.icon ? item.icon : this.ntb.settings.icon, 
                callback: async () => {
                    let activeFile = this.ntb.app.workspace.getActiveFile();
                    await this.ntb.items.handleItemLink(item, undefined, activeFile);
                }
            });
            item.hasCommand = true;
            await this.ntb.settingsManager.save();
            callback(commandName);
        }
        else {
            item.hasCommand = false;
            await this.ntb.settingsManager.save();
            new Notice(t('setting.use-item-command.notice-command-error-noname'), 10000);
        }
    }

    /**
     * Utility to get command for the given toolbar or toolbar item, if the command exists.
     */
    getCommandFor(toolbarOrItem: ToolbarItemSettings | ToolbarSettings): Command | undefined {
        const prefix = ('items' in toolbarOrItem) ? COMMAND_PREFIX_TBAR : COMMAND_PREFIX_ITEM;
        const commandId = `${this.ntb.manifest.id}:${prefix}${toolbarOrItem.uuid}`;
        return this.ntb.app.commands.commands[commandId];
    }

    /**
     * Removes the toolbar item's command.
     */
    async removeItemCommand(item: ToolbarItemSettings): Promise<void> {
        const itemText = getItemText(this.ntb, item, true);
        const commandName = t('command.name-use-item', { item: itemText, interpolation: { escapeValue: false } });
        this.ntb.removeCommand(COMMAND_PREFIX_ITEM + item.uuid);
        item.hasCommand = false;
        await this.ntb.settingsManager.save();
        itemText 
            ? new Notice(t('setting.use-item-command.notice-command-removed', { command: commandName, interpolation: { escapeValue: false } }))
            : new Notice(t('setting.use-item-command.notice-command-removed_empty'));
    }

    /**
     * Adds commands to use each toolbar item.
     */
    setupItemCommands() {
        let hasIgnoredCommands: boolean = false;
        const ignoredCommandToolbars = new Set<string>();
        this.ntb.settings.toolbars.forEach(toolbar => {
            toolbar.items.forEach(item => {
                if (item.hasCommand) {
                    const itemText = getItemText(this.ntb, item, true);
                    if (itemText) {
                        const command = this.ntb.addCommand({
                            id: COMMAND_PREFIX_ITEM + item.uuid,
                            name: t('command.name-use-item', { item: itemText, interpolation: { escapeValue: false } }),
                            icon: item.icon ? item.icon : this.ntb.settings.icon,
                            callback: async () => {
                                let activeFile = this.ntb.app.workspace.getActiveFile();
                                await this.ntb.items.handleItemLink(item, undefined, activeFile);
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
            const itemText = getItemText(this.ntb, item, true);
            if (itemText) {
                const oldCommandName = command.name;
                command.name = `${this.ntb.manifest.name}: ${t('command.name-use-item', { item: itemText, interpolation: { escapeValue: false } })}`;
                command.icon = item.icon ? item.icon : this.ntb.settings.icon;
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
        this.ntb.settings.toolbars.forEach(toolbar => {
            if (toolbar.hasCommand) {
                this.ntb.addCommand({ 
                    id: COMMAND_PREFIX_TBAR + toolbar.uuid,
                    name: t('command.name-open-toolbar', { toolbar: toolbar.name, interpolation: { escapeValue: false } }),
                    icon: this.ntb.settings.icon,
                    callback: async () => {
                        // if no cursor position (or editor not in focus), fall back to mouse position
                        // TODO: fall back to Quick Tools necessary, for tablets?
                        const showAtPosition = this.ntb.utils.getPosition('cursor');
                        switch (toolbar.commandPosition) {
                            case PositionType.Menu: {
                                if (!showAtPosition) break;
                                const activeFile = this.ntb.app.workspace.getActiveFile();
                                this.ntb.render.renderAsMenu(toolbar, activeFile).then(menu => {
                                    menu.showAtPosition({x: showAtPosition.left, y: showAtPosition.top});
                                });
                                // TODO? is there a need to put the focus in the menu? test on tablet
                                break;
                            }
                            case PositionType.QuickTools: {
                                this.ntb.commands.openQuickTools(toolbar.uuid);
                                break;
                            }
                            case PositionType.Floating:
                            default: {
                                if (!showAtPosition) break;
                                await this.ntb.render.renderFloatingToolbar(toolbar, showAtPosition, showAtPosition);
                                await this.focus(true);
                                break;
                            }
                        }
                    }}
                );
            }
        });
    }

    // *****************************************************************************
    // #region COMMANDS
    // *****************************************************************************

    /**
     * Sets the keyboard's focus on the first visible item in the toolbar.
     * @param isFloatingToolbar set to true if this is for the floating toolbar.
     */
    async focus(isFloatingToolbar: boolean = false): Promise<void> {

        this.ntb.debugGroup("focus");

        // display the text toolbar at the current cursor position, if it's not already rendered
        if (isFloatingToolbar && !this.ntb.render.hasFloatingToolbar()) {
            // FIXME? remove this check because of Reading/Preview mode?
            const editor = this.ntb.app.workspace.activeEditor?.editor;
            if (!editor) {
                this.ntb.debugGroupEnd();
                return;
            };
            const toolbar = this.ntb.settingsManager.getToolbarById(this.ntb.settings.textToolbar);
            const showAtPosition = this.ntb.utils.getPosition('cursor');
            await this.ntb.render.renderFloatingToolbar(toolbar, showAtPosition, showAtPosition);
        }

        // need to get the type of toolbar first
        let toolbarEl = this.ntb.el.getToolbarEl(undefined, isFloatingToolbar);
        let toolbarPosition = toolbarEl?.getAttribute('data-tbar-position');
        switch (toolbarPosition) {
            case PositionType.FabRight:
            case PositionType.FabLeft: {
                // trigger the menu
                let toolbarFabEl = toolbarEl?.querySelector('button.cg-note-toolbar-fab') as HTMLButtonElement;
                this.ntb.debug("button: ", toolbarFabEl);
                if (toolbarEl) {
                    const toolbar = this.ntb.settingsManager.getToolbarById(toolbarEl.id);
                    // show the toolbar's menu if it has a default item set
                    if (toolbar?.defaultItem) {
                        // TODO: this is a copy of toolbarFabHandler() -- put in a function?
                        let activeFile = this.ntb.app.workspace.getActiveFile();
                        this.ntb.render.renderAsMenu(toolbar, activeFile, this.ntb.settings.showEditInFabMenu).then(menu => { 
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
                            this.ntb.app.saveLocalStorage(LocalVar.MenuPos, JSON.stringify(menuPos));
                            menu.showAtPosition(menuPos);
                        });
                    }
                    else {
                        toolbarFabEl.click();
                    }
                }
                break;
            }
            case PositionType.Bottom:
            case PositionType.Props:
            case PositionType.Floating:
            case PositionType.Top: {
                // get the list and set focus on the first visible item
                const itemsUl: HTMLElement | null = this.ntb.el.getToolbarListEl(isFloatingToolbar);
                if (itemsUl) {
                    this.ntb.debug("toolbar: ", itemsUl);
                    let items = Array.from(itemsUl.children);
                    const visibleItems = items.filter(item => {
                        const hasSpan = item.querySelector('span') !== null; // to filter out separators
                        const isVisible = window.getComputedStyle(item).getPropertyValue('display') !== 'none';
                        return hasSpan && isVisible;
                    });
                    const linkEl = visibleItems[0] ? visibleItems[0].querySelector('span') : null;
                    this.ntb.debug("focussed item: ", linkEl);
                    visibleItems[0]?.addClass(ToolbarStyle.ItemFocused);
                    linkEl?.focus();
                }
                break;
            }
            case PositionType.Hidden:
            default:
                // do nothing
                break;
        }

        this.ntb.debugGroupEnd();

    }

    /**
     * Copies the selected command to the clipboard as a NTB URI or callout data element.
     */
    async copy(returnDataElement: boolean = false): Promise<void> {
        const modal = new CommandSuggestModal(this.ntb, (command) => {
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
        const modal = new ItemSuggestModal(this.ntb, toolbarId, undefined, 'QuickTools');
        modal.open();
    }

    /**
     * Convenience command to open settings (Note Toolbar's by default).
     */
    async openSettings(tabId: string = 'note-toolbar'): Promise<void> {
        // @ts-ignore
        const settings = this.ntb.app.setting;
        await settings.open();
        settings.openTabById(tabId);
    }

    /**
     * Convenience command to open the active toolbar's settings.
     */
    async openToolbarSettings(): Promise<void> {
        // figure out what toolbar is on the screen
        let toolbarEl = this.ntb.el.getToolbarEl();
        toolbarEl?.id ? await this.openToolbarSettingsForId(toolbarEl.id) : undefined;
    }

    /**
     * Opens settings for a particular toolbar by ID.
     */
    async openToolbarSettingsForId(uuid: string, focusItemId?: string): Promise<void> {
        let toolbarSettings = this.ntb.settingsManager.getToolbarById(uuid);
        if (toolbarSettings) {
            const modal = new ToolbarSettingsModal(this.ntb.app, this.ntb, null, toolbarSettings);
            modal.setTitle(t('setting.title-edit-toolbar', { toolbar: toolbarSettings.name, interpolation: { escapeValue: false } }));
            modal.open();
            if (focusItemId) modal.display(focusItemId);
        }
    }

    /**
     * Opens the toolbar suggester modal.
     */
    async openToolbarSuggester(): Promise<void> {
        let activeFile = this.ntb.app.workspace.getActiveFile();
        const modal = new ToolbarSuggestModal(this.ntb, false, false, false, async (toolbar: ToolbarSettings) => {
            await this.ntb.commands.openQuickTools(toolbar.uuid);
        });
        modal.open();
    }

    /**
     * Opens the toolbar suggester and replaces the current toolbar using the property.
     */
    async swapToolbar(): Promise<void> {
        const modal = new ToolbarSuggestModal(this.ntb, true, true, false, async (toolbar: ToolbarSettings) => {
            const activeFile = this.ntb.app.workspace.getActiveFile();
            if (activeFile) {
                await this.ntb.app.fileManager.processFrontMatter(activeFile, (frontmatter) => {
                    if (toolbar.uuid === EMPTY_TOOLBAR_ID) {
                        delete frontmatter[this.ntb.settings.toolbarProp];
                        return;
                    }
                    frontmatter[this.ntb.settings.toolbarProp] = toolbar.name;
                });
            }
        });
        modal.open();
    }

    /**
     * Toggles the Lock Note Toolbars callout setting.
     */
    async toggleLockCallouts(): Promise<void> {
        this.ntb.settings.lockCallouts = !this.ntb.settings.lockCallouts;
        await this.ntb.settingsManager.save();
        new Notice(
            this.ntb.settings.lockCallouts
                ? t('command.callouts-locked-notice')
                : t('command.callouts-unlocked-notice')
        );
    }

    /**
     * Shows, completely hides, folds, or toggles the visibility of Obsidian UI, including: this Base's toolbar, this note's Properties.
     * @param component component to toggle visibility of
     * @param visibility set to 'show', 'hide', 'fold', or 'toggle'
     * @param isAutoFold set to `true` if triggering automatically
     */
    async toggleUi(component: 'baseToolbar' | 'props', visibility: ToggleUiStateType, isAutoFold: boolean = false): Promise<void> {

        const activeFile = this.ntb.app.workspace.getActiveFile();
        const currentView = this.ntb.app.workspace.getActiveViewOfType(ItemView);
        // @ts-ignore make sure we're not in source (code) view
        const isSourceView = currentView?.editMode?.sourceMode;
        if (!activeFile || !currentView || isSourceView) return;

        if (component === 'baseToolbar') {
            const shouldHide = visibility === 'toggle' 
                ? !activeDocument.body.classList.contains('ntb-hide-bases-header')
                : visibility === 'hide';
            activeDocument.body.toggleClass('ntb-hide-bases-header', shouldHide);
        }
        else if (component === 'props') {
            const propsEl = this.ntb.el.getPropsEl();
            if (!propsEl) return;

            const computedDisplay = getComputedStyle(propsEl).getPropertyValue('display');
            visibility === 'toggle' ? (computedDisplay === 'none' ? visibility = 'show' : visibility = 'hide') : undefined;
            ['--metadata-display-reading', '--metadata-display-editing'].forEach((prop) => {
                propsEl.style.setProperty(
                    prop, ['show', 'fold'].contains(visibility) ? 'block' : 'none');
            });

            if (component === 'props') {
                this.toggleUiFoldProps(propsEl, visibility, isAutoFold);
                // update the saved state
                this.ntb.app.saveLocalStorage(LocalVar.TogglePropsState, visibility);
            }
        }

    }

    /**
     * Toggles folding of the Properties section.
     * @param elToToggle 
     * @param visibility 
     * @param isAutoFold 
     */
    async toggleUiFoldProps(elToToggle: HTMLElement, visibility: ToggleUiStateType, isAutoFold: boolean) {

        // click the element to trigger the code to fold the section, if needed
        switch (visibility) {
            case 'fold': {
                if (!elToToggle.classList.contains('is-collapsed')) {
                    (elToToggle.querySelector('.metadata-properties-heading') as HTMLElement).click();
                }
                break;
            }
            case 'show': {
                // expand the Properties heading if it's collapsed, because it will stay closed if the file is saved in that state
                if (elToToggle.classList.contains('is-collapsed')) {
                    (elToToggle.querySelector('.metadata-properties-heading') as HTMLElement).click();
                }
                else if (!isAutoFold) {
                    // if there's no properties, execute the Add property command
                    const activeFile = this.ntb.app.workspace.getActiveFile();
                    if (!activeFile) break;
                    const metadata = this.ntb.app.metadataCache.getFileCache(activeFile);
                    const hasProperties = !!metadata?.frontmatter && Object.keys(metadata.frontmatter).length > 0;
                    if (!hasProperties) await this.ntb.app.commands.executeCommandById('markdown:add-metadata-property');
                }
                break;
            }
        }

    }

    // #endregion

    // *****************************************************************************
    // #region UTILITIES
    // *****************************************************************************

    checkHasToolbarAndRun(callback: () => void): (checking: boolean) => boolean {
        return (checking: boolean) => {
            const hasToolbar = this.ntb.render.hasToolbar();
            if (!checking && hasToolbar) callback();
            return hasToolbar;
        };
    }

    checkViewAndRun(viewType: string, callback: () => void): (checking: boolean) => boolean {
        return (checking: boolean) => {
            const isCorrectView = this.ntb.utils.hasView(viewType)
            if (!checking && isCorrectView) callback();
            return isCorrectView;
        };
    }

    // #endregion
}