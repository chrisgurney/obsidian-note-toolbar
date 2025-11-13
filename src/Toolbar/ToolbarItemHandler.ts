import NoteToolbarPlugin from "main";
import { TFile, PaneType, TFolder, Notice, MarkdownView, Command, ItemView } from "obsidian";
import { ToolbarItemSettings, ItemType, t, ItemFocusType, LINK_OPTIONS, ScriptConfig, CalloutAttr, SCRIPT_ATTRIBUTE_MAP, ToolbarSettings } from "Settings/NoteToolbarSettings";
import { getLinkUiTarget, insertTextAtCursor, isValidUri, putFocusInMenu } from "Utils/Utils";

/**
 * Handles interactions with toolbar items.
 */
export default class ToolbarItemHandler {

    // track the last used callout link, for the menu URI
    lastCalloutLink: Element | null = null;

    // track the last clicked element, for the menu API
    lastClickedEl: Element | null = null;

    constructor(
        private ntb: NoteToolbarPlugin
    ) {}

	/**
	 * Handles links followed from Note Toolbar Callouts, including handling commands, folders, and menus.
	 * Links take the form [Tools]()<data data-ntb-menu="Tools"/>
	 * @param MouseEvent 
	 */
	async calloutLinkHandler(e: MouseEvent) {

		const target = e.target as HTMLElement | null;
		const clickedCalloutEl = target?.closest('.callout[data-callout="note-toolbar"]');
		
		// only process clicks inside of Note Toolbar callouts
		if (clickedCalloutEl) {

			// remove any active item attributes from the main toolbar, so the API doesn't fetch the wrong item
			// (not supported for Note Toolbar Callouts)
			this.ntb.render.updateActiveItem();

			// prevent expansion of callouts if setting is enabled
			if (this.ntb.settings.lockCallouts) {
				if (clickedCalloutEl.hasAttribute('data-callout-fold')) {
					e.preventDefault();
				}
			}

			const clickedItemEl = target?.closest('.callout[data-callout="note-toolbar"] a.external-link');
			if (clickedItemEl) {
				// this.debug('calloutLinkHandler:', target, clickedItemEl);
				this.lastCalloutLink = clickedItemEl as HTMLLinkElement;
				let dataEl = clickedItemEl?.nextElementSibling;
				if (dataEl) {
					// make sure it's a valid attribute, and get its value
					const attribute = Object.values(CalloutAttr).find(attr => dataEl?.hasAttribute(attr));
					attribute ? e.preventDefault() : undefined; // prevent callout code block from opening
					const value = attribute ? dataEl?.getAttribute(attribute) : null;
					
					switch (attribute) {
						case CalloutAttr.Command:
						case CalloutAttr.CommandNtb:
							this.handleLinkCommand(value);
							break;
						case CalloutAttr.Dataview:
						case CalloutAttr.JavaScript:
						case CalloutAttr.JsEngine:
						case CalloutAttr.Templater: {
							const scriptConfig = {
								pluginFunction: value,
								expression: dataEl?.getAttribute(SCRIPT_ATTRIBUTE_MAP['expression']) ?? undefined,
								sourceFile: dataEl?.getAttribute(SCRIPT_ATTRIBUTE_MAP['sourceFile']) ?? undefined,
								sourceFunction: dataEl?.getAttribute(SCRIPT_ATTRIBUTE_MAP['sourceFunction']) ?? undefined,
								sourceArgs: dataEl?.getAttribute(SCRIPT_ATTRIBUTE_MAP['sourceArgs']) ?? undefined,
								outputContainer: dataEl?.getAttribute(SCRIPT_ATTRIBUTE_MAP['outputContainer']) ?? undefined,
								outputFile: dataEl?.getAttribute(SCRIPT_ATTRIBUTE_MAP['outputFile']) ?? undefined,
							} as ScriptConfig;
							switch (attribute) {
								case CalloutAttr.Dataview:
									this.handleLinkScript(ItemType.Dataview, scriptConfig);
									break;
								case CalloutAttr.JavaScript:
									this.handleLinkScript(ItemType.JavaScript, scriptConfig);
									break;
								case CalloutAttr.JsEngine:
									this.handleLinkScript(ItemType.JsEngine, scriptConfig);
									break;
								case CalloutAttr.Templater:
									this.handleLinkScript(ItemType.Templater, scriptConfig);
									break;	
							}
							break;
						}
						case CalloutAttr.Folder:
						case CalloutAttr.FolderNtb:
							this.handleLinkFolder(value);
							break;
						case CalloutAttr.Menu:
						case CalloutAttr.MenuNtb: {
							const activeFile = this.ntb.app.workspace.getActiveFile();
							const toolbar: ToolbarSettings | undefined = this.ntb.settingsManager.getToolbar(value);
							if (activeFile) {
								if (toolbar) {
									this.ntb.render.renderAsMenu(toolbar, activeFile).then(menu => {
										this.ntb.render.showMenuAtElement(menu, this.lastCalloutLink);
									});
								}
								else {
									new Notice(t('notice.error-item-menu-not-found', { toolbar: value }));
								}
							}
							break;
						}
					}
				}
			}

		}

	}

    /**
     * Handles the link in the item provided.
     * @param item: ToolbarItemSettings for the item that was selected
     * @param event MouseEvent or KeyboardEvent from where link is activated
     * @param file optional TFile if handling links outside of the active file
     */
    async handleItemLink(item: ToolbarItemSettings, event?: MouseEvent | KeyboardEvent, file?: TFile | null) {
        await this.handleLink(item.uuid, item.link, item.linkAttr.type, item.linkAttr.commandId, event, file);
    }

    /**
     * Handles the provided script item, based on the provided configuration.
     */
    async handleItemScript(toolbarItem: ToolbarItemSettings | undefined) {
        if (toolbarItem && toolbarItem?.scriptConfig) {
            await this.handleLinkScript(toolbarItem.linkAttr.type, toolbarItem.scriptConfig, toolbarItem.linkAttr.focus);
        }
    }

    /**
     * Handles the link provided.
     * @param uuid ID of the item
     * @param linkHref what the link is for
     * @param type: ItemType
     * @param commandId: string or null
     * @param event MouseEvent or KeyboardEvent from where link is activated
     * @param file optional TFile if handling links outside of the active file
     */
    async handleLink(uuid: string, linkHref: string, type: ItemType, commandId: string | null, event?: MouseEvent | KeyboardEvent, file?: TFile | null) {

        this.ntb.app.workspace.trigger("note-toolbar:item-activated", 'test');

        let activeFile = this.ntb.app.workspace.getActiveFile();
        const item = this.ntb.settingsManager.getToolbarItemById(uuid);

        const eventTarget = event?.target as HTMLElement | null;
        if (eventTarget) this.lastClickedEl = eventTarget.closest('.callout[data-callout="note-toolbar"] span.external-link');

        // update active item attributes in the toolbar, so the API can fetch the right active item
        this.ntb.render.updateActiveItem(uuid);

        if (this.ntb.vars.hasVars(linkHref)) {
            // TODO: expand to also replace vars in labels + tooltips
            linkHref = await this.ntb.vars.replaceVars(linkHref, activeFile);
            this.ntb.debug('- uri vars replaced: ', linkHref);
        }

        switch (type) {
            case ItemType.Command:
                (file && (file !== activeFile)) 
                    ? this.handleLinkInSidebar(item, file) 
                    : this.handleLinkCommand(commandId, item?.linkAttr.focus, item?.linkAttr.target as PaneType);
                break;
            case ItemType.File: {
                // it's an internal link (note); try to open it
                let activeFilePath = activeFile ? activeFile.path : '';
                this.ntb.debug("- openLinkText: ", linkHref, " from: ", activeFilePath);
                let fileOrFolder = this.ntb.app.vault.getAbstractFileByPath(linkHref);
                if (fileOrFolder instanceof TFolder) {
                    // @ts-ignore
                    this.ntb.app.internalPlugins.getEnabledPluginById("file-explorer").revealInFolder(fileOrFolder);
                }
                else if (fileOrFolder instanceof TFile && item?.linkAttr.target === 'modal') {
                    // this.ntb.api.modal(fileOrFolder, { editable: true });
                    this.ntb.api.modal(fileOrFolder);
                }
                else {
                    this.ntb.app.workspace.openLinkText(linkHref, activeFilePath, getLinkUiTarget(event) ?? item?.linkAttr.target as PaneType);
                }
                break;
            }
            case ItemType.Menu: {
                const toolbar = this.ntb.settingsManager.getToolbar(linkHref);
                if (toolbar) {
                    this.ntb.render.renderAsMenu(toolbar, activeFile).then(menu => {
                        let clickedItemEl = (event?.targetNode as HTMLLinkElement).closest('.external-link');
                        this.ntb.render.showMenuAtElement(menu, clickedItemEl);
                        event instanceof KeyboardEvent ? putFocusInMenu() : undefined;
                    });
                }
                else if (!toolbar) {
                    new Notice(t('notice.error-item-menu-not-found', { toolbar: linkHref }));
                }
                break;
            }
            case ItemType.Dataview:
            case ItemType.JavaScript:
            case ItemType.JsEngine:
            case ItemType.Templater:
                this.ntb.adapters.updateAdapters();
                if (this.ntb.settings.scriptingEnabled) {
                    (file && (file !== activeFile)) ? await this.handleLinkInSidebar(item, file) : await this.handleItemScript(item);
                }
                else {
                    new Notice(t('notice.error-scripting-not-enabled'));
                }
                break;
            case ItemType.Uri:
                await this.handleLinkUri(linkHref, event, item);
                break;
        }
        
    }

    /**
     * Executes the provided command.
     * @param commandId encoded command string, or null if nothing to do.
     * @param target where to execute the command.
     */
    async handleLinkCommand(commandId: string | null, focus?: ItemFocusType, target?: PaneType | undefined) {
        // this.debug('handleLinkCommand:', commandId);
        if (commandId) {
            if (!(commandId in this.ntb.app.commands.commands)) {
                new Notice(t('notice.error-command-not-found', { command: commandId }));
                return;
            }
            try {
                if (target) this.ntb.app.workspace.getLeaf(target);
                await this.ntb.app.commands.executeCommandById(commandId);
                if (focus === 'editor') this.ntb.app.workspace.activeEditor?.editor?.focus();
            } 
            catch (error) {
                console.error(error);
                new Notice(error);
            }
        }
    }

    /**
     * Executes the provided script using the provided configuration.
     * @param type type of script.
     * @param scriptConfig ScriptConfig to execute.
     * @param focus where to set focus after executing the script; defaults to 'editor'.
     */
    async handleLinkScript(type: ItemType, scriptConfig: ScriptConfig, focus?: ItemFocusType) {
        type ScriptType = Extract<keyof typeof LINK_OPTIONS, ItemType.Dataview | ItemType.JavaScript | ItemType.JsEngine | ItemType.Templater>;
        const adapter = this.ntb.adapters.getAdapterForItemType(type);
        if (!adapter) {
            new Notice(t('notice.error-scripting-plugin-not-enabled', { plugin: LINK_OPTIONS[type as ScriptType] }));
            return;
        }
        let result;
        switch (type) {
            case ItemType.Dataview:
                result = await this.ntb.adapters.dv?.use(scriptConfig);
                break;
            case ItemType.JavaScript:
                result = await this.ntb.adapters.js?.use(scriptConfig);
                break;
            case ItemType.JsEngine:
                result = await this.ntb.adapters.jsEngine?.use(scriptConfig);
                break;
            case ItemType.Templater:
                result = await this.ntb.adapters.tp?.use(scriptConfig);
                break;
        }
        result ? insertTextAtCursor(this.ntb.app, result) : undefined;

        if (!focus || focus === 'editor') {
            this.ntb.app.workspace.activeEditor?.editor?.focus();
        }
    }

    async handleLinkUri(linkHref: string, event?: MouseEvent | KeyboardEvent, item?: ToolbarItemSettings) {
        if (isValidUri(linkHref)) {
            let target = getLinkUiTarget(event) ?? item?.linkAttr.target as PaneType | 'modal';

            // @ts-ignore
            const isWebViewerEnabled = this.ntb.app.internalPlugins.plugins['webviewer']?.enabled ?? false;
            // @ts-ignore
            const isWebViewerOpeningUrls = this.ntb.app.internalPlugins.plugins['webviewer']?.instance?.options?.openExternalURLs ?? false;					
            let usingWebViewer = false;

            // use Web Viewer for certain targets even if the 'Open external links' setting is disabled
            if (isWebViewerEnabled 
                && linkHref.toLowerCase().startsWith('http') 
                && (['modal', 'split', 'tab', 'window'].includes(target) || isWebViewerOpeningUrls)
            ) {
                usingWebViewer = true;
            }

            if (usingWebViewer) {
                if (target === 'modal') {
                    this.ntb.api.modal(linkHref, { webpage: true });
                }
                else {
                    const leaf = this.ntb.app.workspace.getLeaf(target);
                    await leaf.setViewState({type: 'webviewer', state: { url: linkHref, navigate: true }, active: true});
                }
            }
            else {
                window.open(linkHref, '_blank');
            }
        }
        else {
            // as fallback, treat it as internal note
            let activeFilePath = this.ntb.app.workspace.getActiveFile()?.path ?? "";
            let fileOrFolder = this.ntb.app.vault.getAbstractFileByPath(linkHref);
            if (fileOrFolder instanceof TFile && item?.linkAttr.target === 'modal') {
                // this.ntb.api.modal(fileOrFolder, { editable: true });
                this.ntb.api.modal(fileOrFolder);
            }
            else {
                this.ntb.app.workspace.openLinkText(linkHref, activeFilePath, getLinkUiTarget(event) ?? item?.linkAttr.target as PaneType);
            }
        }
    }

    /**
     * Opens the provided file in a sidebar and executes handles the item. Supports Commands.
     * @param toolbarItem ToolbarItemSettings to handle 
     * @param file TFile to open in a sidebar
     * @link https://github.com/platers/obsidian-linter/blob/cc23589d778fb56b95fe53b499e9f35683a2b129/src/main.ts#L699
     */
    private async handleLinkInSidebar(toolbarItem: ToolbarItemSettings | undefined, file: TFile) {

        const sidebarTab = this.ntb.app.workspace.getRightLeaf(false);
        const activeLeaf = this.ntb.app.workspace.getActiveViewOfType(MarkdownView);
        const activeEditor = activeLeaf ? activeLeaf.editor : null;
        if (sidebarTab) {
            await sidebarTab.openFile(file);
            switch (toolbarItem?.linkAttr.type) {
                case ItemType.Command: {
                    const commandId = toolbarItem?.linkAttr.commandId;
                    if (!(commandId in this.ntb.app.commands.commands)) {
                        new Notice(t('notice.error-command-not-found', { command: commandId }));
                        return;
                    }
                    try {
                        await this.ntb.app.commands.executeCommandById(commandId);
                    } 
                    catch (error) {
                        console.error(error);
                        new Notice(error);
                    }
                    break;
                }
                case ItemType.Dataview:
                case ItemType.JavaScript:
                case ItemType.JsEngine:
                case ItemType.Templater:
                    await this.handleItemScript(toolbarItem);
                    break;
            }
            sidebarTab.detach();
            if (activeEditor) {
                activeEditor.focus();
            }
        }

    }

    /**
     * Highlights the provided folder in the file explorer.
     * @param folder folder to highlight, or null if nothing to do.
     */
    async handleLinkFolder(folder: string | null) {
        // this.debug('handleLinkFolder:', folder);
        let tFileOrFolder = folder ? this.ntb.app.vault.getAbstractFileByPath(folder) : undefined;
        if (tFileOrFolder instanceof TFolder) {
            // @ts-ignore
            this.ntb.app.internalPlugins.getEnabledPluginById("file-explorer").revealInFolder(tFileOrFolder);
        }
        else {
            new Notice(t('notice.error-folder-not-found', { folder: folder }));
        }
    }

	/**
	 * Gets the text to display on the toolbar item, taking into account title, tooltip, vars, and expressions.
	 * @param toolbarItem ToolbarItemSettings to get the text for.
	 * @param file TFile of the note that the toolbar is being rendered within, or null.
	 * @param truncate if true, truncate the text; defaults to false.
	 * @returns string to display on the toolbar
	 */
	async getItemText(toolbarItem: ToolbarItemSettings, file: TFile | null, truncate: boolean = false): Promise<string> {
		let itemText = toolbarItem.label ? 
			(this.ntb.vars.hasVars(toolbarItem.label) ? await this.ntb.vars.replaceVars(toolbarItem.label, file) : toolbarItem.label) : 
			(this.ntb.vars.hasVars(toolbarItem.tooltip) ? await this.ntb.vars.replaceVars(toolbarItem.tooltip, file) : toolbarItem.tooltip);
		if (truncate) itemText = itemText.slice(0, 24);
		return itemText;
	}

	/**
	 * Checks if the command item exists and is available in the current context.
	 * @param item toolbar item to check
	 * @param toolbarView view to check the command availability in
	 * @returns true if item is a command and is available, false otherwise.
	 */
	isCommandItemAvailable(item: ToolbarItemSettings, toolbarView: ItemView | null): boolean {
		let isCommandAvailable: boolean = true;
		if (item.linkAttr.type === ItemType.Command && item.linkAttr.commandId) {
			const command: Command = this.ntb.app.commands.commands[item.linkAttr.commandId];
			// command doesn't exist
			if (!command) {
				isCommandAvailable = false;				
			}
			// command is not available in the current context
			else if (item.linkAttr.commandCheck) {
				if ((toolbarView instanceof MarkdownView) && typeof command?.editorCheckCallback === 'function') {
					isCommandAvailable = command.editorCheckCallback(true, toolbarView.editor, toolbarView) ?? false;
				}
				if (isCommandAvailable && typeof command?.checkCallback === 'function') {
					isCommandAvailable = command.checkCallback(true) ?? false;
				}
			}
			// this.debug('command available:', item.linkAttr.commandId, '→', isCommandAvailable);
		}
		return isCommandAvailable;
	}

}