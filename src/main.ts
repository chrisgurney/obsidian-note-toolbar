import { CachedMetadata, ItemView, MarkdownView, MarkdownViewModeType, Notice, Platform, Plugin, TFile, WorkspaceLeaf, addIcon, debounce } from 'obsidian';
import { NoteToolbarSettingTab } from 'Settings/UI/NoteToolbarSettingTab';
import { ToolbarSettings, NoteToolbarSettings, ItemType, CalloutAttr, t, ToolbarItemSettings, VIEW_TYPE_WHATS_NEW, ScriptConfig, SCRIPT_ATTRIBUTE_MAP, VIEW_TYPE_GALLERY, LocalVar, VIEW_TYPE_HELP, VIEW_TYPE_TIP } from 'Settings/NoteToolbarSettings';
import { getViewId, checkToolbarForItemView, getActiveView } from 'Utils/Utils';
import { WhatsNewView } from 'Help/WhatsNewView';
import { SettingsManager } from 'Settings/SettingsManager';
import { CommandManager } from 'Commands/CommandManager';
import { NoteToolbarApi } from 'Api/NoteToolbarApi';
import { INoteToolbarApi } from "Api/INoteToolbarApi";
import { ProtocolManager } from 'Protocol/ProtocolManager';
import GalleryManager from 'Gallery/GalleryManager';
import { HotkeyHelper } from 'Utils/Hotkeys';
import { GalleryView } from 'Gallery/GalleryView';
import { HelpView } from 'Help/HelpView';
import { TipView } from 'Help/TipView';
import { TextToolbarView } from 'Toolbar/TextToolbarView';
import AdapterManager from 'Adapters/AdapterManager';
import ToolbarElementHelper from 'Toolbar/ToolbarElementHelper';
import ToolbarEventHandler from 'Toolbar/ToolbarEventHandler';
import ToolbarItemHandler from 'Toolbar/ToolbarItemHandler';
import ToolbarRenderer from 'Toolbar/ToolbarRenderer';
import VariableResolver from 'Toolbar/VariableResolver';

export default class NoteToolbarPlugin extends Plugin {

	adapters: AdapterManager;
	api: INoteToolbarApi<any>;
	commands: CommandManager;
	hotkeys: HotkeyHelper;
	gallery: GalleryManager;
	protocolManager: ProtocolManager;
	settings: NoteToolbarSettings;	
	settingsManager: SettingsManager;
	
	el: ToolbarElementHelper;
	events: ToolbarEventHandler;
	items: ToolbarItemHandler;
	render: ToolbarRenderer;
	vars: VariableResolver;

	activeWorkspace: string; // track current workspace, to reduce unneccessary toolbar re-renders
	workspacesPlugin: { instance: any; enabled: boolean } | null = null;

	// track the last opened layout state, to reduce unneccessary re-renders 
	lastFileOpenedOnLayoutChange: TFile | null | undefined;
	lastViewModeOnLayoutChange: MarkdownViewModeType | undefined;

	// track the last used callout link, for the menu URI
	lastCalloutLink: Element | null = null;
	// track the last clicked element, for the menu API
	lastClickedEl: Element | null = null;

	// track the last used file and property, to prompt if Note Toolbar property references unknown toolbar
	lastFileOpenedOnCacheChange: TFile | null;
	lastNtbPropValue: string | undefined;

	// TODO: remove if not needed
	// __onNoteChange__leafFiles: { [id: string]: TFile | null } = {};
	// __onNoteChange__leafCallbacks: { [id: string]: (oldFile: TFile | null, newFile: TFile) => void } = {};
	// __onNoteChange__eventCreated: boolean = false;

	/**
	 * When this plugin is loaded (e.g., on Obsidian startup, or plugin is enabled in settings):
	 * adds listeners, settings, and renders the toolbar for the active file.
	 */
	async onload() {

		this.adapters = new AdapterManager(this);

		// initialize managers + helpers
		this.el = new ToolbarElementHelper(this);
		this.events = new ToolbarEventHandler(this);
		this.items = new ToolbarItemHandler(this);
		this.render = new ToolbarRenderer(this);
		this.vars = new VariableResolver(this);

		// load the settings
		this.settingsManager = new SettingsManager(this);
		await this.settingsManager.load();

		// add the ribbon icon, on phone only (seems redundant to add on desktop + tablet)
		if (Platform.isPhone) {
			this.addRibbonIcon(this.settings.icon, t('plugin.note-toolbar'), (event) => this.events.ribbonMenuHandler(event));
		}

		this.api = new NoteToolbarApi(this);
		this.commands = new CommandManager(this);
		this.hotkeys = new HotkeyHelper(this);
		this.gallery = new GalleryManager(this);
		this.protocolManager = new ProtocolManager(this);

		this.app.workspace.onLayoutReady(async () => {

			// make API available
			(window["ntb"] = this.api) && this.register(() => delete window["ntb"]);

			// check what other plugins are enabled that we need to know about
			this.adapters.checkPlugins();
			this.adapters.updateAdapters();
			// @ts-ignore
			this.workspacesPlugin = this.app.internalPlugins.getPluginById('workspaces');

			// add icons specific to the plugin
			addIcon('note-toolbar-empty', '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" class="svg-icon note-toolbar-empty”></svg>');
			addIcon('note-toolbar-none', '<svg xmlns="http://www.w3.org/2000/svg" width="0" height="24" viewBox="0 0 0 24" fill="none" class="svg-icon note-toolbar-none"></svg>');
			addIcon('note-toolbar-separator', '<path d="M23.4444 35.417H13.7222C8.35279 35.417 4 41.6988 4 44V55.5C4 57.8012 8.35279 64.5837 13.7222 64.5837H23.4444C28.8139 64.5837 33.1667 57.8012 33.1667 55.5L33.1667 44C33.1667 41.6988 28.8139 35.417 23.4444 35.417Z" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><path d="M86.4444 35.417H76.7222C71.3528 35.417 67 41.6988 67 44V55.5C67 57.8012 71.3528 64.5837 76.7222 64.5837H86.4444C91.8139 64.5837 96.1667 57.8012 96.1667 55.5L96.1667 44C96.1667 41.6988 91.8139 35.417 86.4444 35.417Z" stroke="currentColor" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M49.8333 8.33301V91.6663" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>');	

			// render the initial toolbar
			await this.render.renderToolbarForAllLeaves();

			// add the settings UI
			this.addSettingTab(new NoteToolbarSettingTab(this));

			this.registerEvent(this.app.workspace.on('file-open', this.fileOpenListener));
			this.registerEvent(this.app.workspace.on('active-leaf-change', this.leafChangeListener));
			this.registerEvent(this.app.metadataCache.on('changed', this.metadataCacheListener));
			this.registerEvent(this.app.workspace.on('layout-change', this.layoutChangeListener));

			// monitor files being renamed to update menu items
			this.registerEvent(this.app.vault.on('rename', this.fileRenameListener));

			// Note Toolbar Callout click handlers
			this.registerEvent(this.app.workspace.on('window-open', (win) => {
				this.registerDomEvent(win.doc, 'click', (e: MouseEvent) => {
					this.calloutLinkHandler(e);
				});
			}));
			this.registerDomEvent(activeDocument, 'click', (e: MouseEvent) => {
				const target = e.target as HTMLElement;
				if (!target.matches('.cg-note-toolbar-container')) {
					this.render.removeFocusStyle();
				}
				this.calloutLinkHandler(e);
			});

			// add items to menus, when needed
			this.registerEvent(this.app.workspace.on('file-menu', this.events.fileMenuHandler));
			this.registerEvent(this.app.workspace.on('editor-menu', this.events.editorMenuHandler));

			// add commands
			this.addCommand({ id: 'copy-cmd-uri', name: t('command.name-copy-cmd-uri'), callback: async () => this.commands.copyCommand(false) });
			this.addCommand({ id: 'copy-cmd-as-data-element', name: t('command.name-copy-cmd-as-data-element'), callback: async () => this.commands.copyCommand(true) });
			this.addCommand({ id: 'focus', name: t('command.name-focus'), callback: async () => this.commands.focus() });
			this.addCommand({ id: 'focus-text-toolbar', name: t('command.name-focus-text-toolbar'), callback: async () => this.commands.focus(true) });
			this.addCommand({ id: 'open-gallery', name: t('command.name-open-gallery'), callback: async () => this.app.workspace.getLeaf(true).setViewState({ type: VIEW_TYPE_GALLERY, active: true }) });
			this.addCommand({ id: 'open-item-suggester', name: t('command.name-item-suggester'), callback: async () => this.commands.openQuickTools() });
			this.addCommand({ id: 'open-item-suggester-current', name: t('command.name-item-suggester-current'), icon: this.settings.icon, callback: async () => {
				const currentToolbar = this.getCurrentToolbar();
				if (currentToolbar) this.commands.openQuickTools(currentToolbar.uuid);
			}});
			this.addCommand({ id: 'open-toolbar-suggester', name: (t('command.name-toolbar-suggester')), callback: async () => this.commands.openToolbarSuggester() });
			this.addCommand({ id: 'open-settings', name: t('command.name-settings'), callback: async () => this.commands.openSettings() });
			this.addCommand({ id: 'open-toolbar-settings', name: t('command.name-toolbar-settings'), callback: async () => this.commands.openToolbarSettings() });
			this.addCommand({ id: 'show-properties', name: t('command.name-show-properties'), callback: async () => this.commands.toggleProps('show') });
			this.addCommand({ id: 'hide-properties', name: t('command.name-hide-properties'), callback: async () => this.commands.toggleProps('hide') });
			this.addCommand({ id: 'fold-properties', name: t('command.name-fold-properties'), callback: async () => this.commands.toggleProps('fold') });
			this.addCommand({ id: 'toggle-properties', name: t('command.name-toggle-properties'), callback: async () => this.commands.toggleProps('toggle') });
			this.addCommand({ id: 'toggle-lock-callouts', name: t('command.name-toggle-lock-callouts'), callback: async () => this.commands.toggleLockCallouts() });

			// prototcol handler
			this.registerObsidianProtocolHandler("note-toolbar", async (data) => this.protocolManager.handle(data));
	
			// provides support for the Style Settings plugin: https://github.com/mgmeyers/obsidian-style-settings
			this.app.workspace.trigger("parse-style-settings");

			// register custom views
			this.registerView(VIEW_TYPE_GALLERY, (leaf: WorkspaceLeaf) => new GalleryView(this, leaf));
			this.registerView(VIEW_TYPE_HELP, (leaf: WorkspaceLeaf) => new HelpView(this, leaf));
			this.registerView(VIEW_TYPE_TIP, (leaf: WorkspaceLeaf) => new TipView(this, leaf));
			this.registerView(VIEW_TYPE_WHATS_NEW, (leaf: WorkspaceLeaf) => new WhatsNewView(this, leaf));

			// needs to be done after plugins are setup so that string variable checks work
			this.commands.setupItemCommands();
			this.commands.setupToolbarCommands();

			this.registerEditorExtension(TextToolbarView(this));

		});

	}

	/**
	 * Cleanup when the plugin is unloaded (e.g., disabled in settings, or Obsidian is restarted).
	 */
	onunload() {

		// remove any toolbars
		this.el.getAllToolbarEl().forEach((toolbarEl) => { toolbarEl.remove(); });
		if (this.render.textToolbarEl) this.render.textToolbarEl.remove();
		// remove the global API
		if (window["ntb"]) delete window["ntb"];

		this.debug('UNLOADED');

	}
 
	/**
	 * Loads settings if the data file is changed externally (e.g., by Obsidian Sync).
	 * FIXME: DISABLED DUE TO DATA LOSS ISSUES WITH USERS NOT EVEN USING SETTING (POTENTIAL CAUSE)
	 * More info: https://github.com/chrisgurney/obsidian-note-toolbar/issues/340
	 */
	// async onExternalSettingsChange(): Promise<void> {
	// 	const loadSettingsChanges = this.app.loadLocalStorage(LocalVar.LoadSettings) === 'true';
	// 	if (loadSettingsChanges) {
	// 		this.debug('onExternalSettingsChange: loading settings changes...');
	// 		const loaded_settings = await this.loadData();
	// 		if (typeof loaded_settings === 'object' && loaded_settings != null) {
	// 			this.debug('onExternalSettingsChange: loaded:', loaded_settings);
	// 			this.settings = Object.assign({}, DEFAULT_SETTINGS, loaded_settings);
	// 			await this.settingsManager.save();
	// 			// TODO: if we're in the settings tab and this occurs, should it refresh? show a refresh CTA? (if so, how?)
	// 			// check if a settings tab or modal is open, and show a notice if so?
	// 		}
	// 		else {
	// 			this.debug('onExternalSettingsChange: settings EMPTY, ignoring');
	// 		}
	// 	}
	// }

	/* keeping for potential future use
	async storeLeafId(currentView: MarkdownView) {
		// @ts-ignore
		this.activeLeafIds.push(currentView?.file?.path + '_' + currentView?.leaf.id);
	}

	haveLeafId(currentView: MarkdownView): boolean {
		// @ts-ignore
		return this.activeLeafIds.contains(currentView?.file?.path + '_' + currentView?.leaf.id);
	}

	async removeLeafId(idToRemove: string) {
		// not sure when to call this; can't find event that's fired when leaf closes
		this.activeLeafIds.remove(idToRemove);
	}
	*/

	/*************************************************************************
	 * LISTENERS
	 *************************************************************************/

	/**
	 * On opening of a file, track recent files that have been opened (for more helpful file select UI).
	 * @param file TFile that was opened.
	 */
	fileOpenListener = async (file: TFile) => {
		this.debug('FILE-OPEN: updating recent file list:', file?.name);
		// update list of the most recently opened files
		if (file) await this.settingsManager.updateRecentList(LocalVar.RecentFiles, file.path);
	};

	/**
	 * On rename of file, update any item links that reference the old name.
	 * @param file TFile of the new file.
	 * @param oldPath old path.
	 */
	fileRenameListener = async (file: TFile, oldPath: string) => {
		let settingsChanged = false;
		this.settings.toolbars.forEach((toolbar: ToolbarSettings) => {
			toolbar.items.forEach((item: ToolbarItemSettings) => {
				if (item.link === oldPath) {
					this.debug('fileRenameListener: changing', item.link, 'to', file.path);
					item.link = file.path;
					settingsChanged = true;
				}
				if (item.scriptConfig?.sourceFile === oldPath) {
					this.debug('fileRenameListener: changing', item.scriptConfig?.sourceFile, 'to', file.path);
					item.scriptConfig.sourceFile = file.path;
					settingsChanged = true;
				}
			});
		});
		if (settingsChanged) await this.settingsManager.save();
	}

	/**
	 * On layout changes, render and update toolbars as necessary.
	 */
	layoutChangeListener = async () => {
		
		// if workspace changed, render all toolbars, otherwise just render the toolbar for the active view (#367)
		const workspace = this.workspacesPlugin?.instance.activeWorkspace;
		if (workspace !== this.activeWorkspace) {
			await this.render.renderToolbarForAllLeaves();
			this.activeWorkspace = workspace;
		}
		else {
			const currentView = this.app.workspace.getActiveViewOfType(ItemView);
			if (currentView) await this.render.renderToolbarForView(currentView);
		}

		// const toolbarEl = this.getToolbarEl();
		// const currentView = this.app.workspace.getActiveViewOfType(MarkdownView);
		// const currentViewId = getViewId(currentView);
		// const currentViewMode = currentView?.getMode();
		// this.debug('===== LAYOUT-CHANGE ===== ', currentViewId, currentView, currentViewMode);

		// // show empty view or other data type toolbar
		// if (!currentView) {
		// 	await this.renderToolbarForView();
		// 	return;
		// }

		// // if we're in a popover, do nothing
		// if (currentView?.containerEl.closest('popover')) return;

		// // exit if the view has already been handled, after updating the toolbar
		// if (toolbarEl && currentViewId && this.activeViewIds.contains(currentViewId)) {
		// 	this.debug('LAYOUT-CHANGE: SKIPPED RENDERING: VIEW ALREADY HANDLED');
		// 	this.updateActiveToolbar();
		// 	return;
		// }

		// // partial fix for Hover Editor bug where toolbar is redrawn if in Properties position (#14)
		// const fileChanged = this.lastFileOpenedOnLayoutChange !== currentView?.file;
		// const viewModeChanged = this.lastViewModeOnLayoutChange !== currentViewMode;
		// if (fileChanged || viewModeChanged) {
		// 	this.lastFileOpenedOnLayoutChange = fileChanged ? currentView?.file : this.lastFileOpenedOnLayoutChange;
		// 	this.lastViewModeOnLayoutChange = viewModeChanged ? currentViewMode : this.lastViewModeOnLayoutChange;
		// }
		// else {
		// 	if (toolbarEl) return; // no changes, so do nothing
		// }

		// // check for editing or reading mode
		// switch(currentViewMode) {
		// 	case "source":
		// 	case "preview":
		// 		this.app.workspace.onLayoutReady(debounce(async () => {
		// 			// keeping just in case:
		// 			// the props position is the only case where we have to reset the toolbar, due to re-rendering order of the editor
		// 			// const toolbarPos = toolbarEl?.getAttribute('data-tbar-position');
		// 			// toolbarPos === 'props' ? this.removeActiveToolbar() : undefined;
		// 			this.debug("LAYOUT-CHANGE: renderActiveToolbar");
		// 			// this.updateActiveViewIds();
		// 			await this.renderToolbarForView();
		// 		}, (currentViewMode === "preview" ? 200 : 0)));
		// 		break;
		// 	default:
		// 		return;
		// }
	};

	/**
	 * On leaf changes, delete, check and render toolbar if necessary. 
	 */
	leafChangeListener = async (leaf: any) => {
		let renderToolbar = false;
		// FIXME? what if there's more than one toolbar?
		let toolbarEl = this.el.getToolbarEl();
		let currentView = getActiveView(this);

		const viewId = getViewId(currentView);
		this.debug('===== LEAF-CHANGE ===== ', viewId);

		// update the active toolbar if its configuration changed
		if (toolbarEl) {
			let activeToolbar = this.settingsManager.getToolbarById(toolbarEl.id);
			if (activeToolbar && (activeToolbar.updated !== toolbarEl.getAttribute('data-updated'))) {
				renderToolbar = true;
			}
		}

		// exit if the view has already been handled, after updating the toolbar
		if (!renderToolbar && viewId && this.render.activeViewIds.contains(viewId)) {
			this.debug('LEAF-CHANGE: SKIPPED RENDERING: VIEW ALREADY HANDLED');
			this.render.updateActiveToolbar();
			return;
		};

		if (currentView) {
			// check for editing or reading mode
			if (currentView instanceof MarkdownView) {
				renderToolbar = ['source', 'preview'].includes((currentView as MarkdownView).getMode());
			}
		}
		else {
			currentView = this.app.workspace.getActiveViewOfType(ItemView);
			if (currentView) {
				renderToolbar = checkToolbarForItemView(this, currentView);
				if (!renderToolbar) return;
			}
		}

		if (renderToolbar) {
			this.debug("LEAF-CHANGE: renderActiveToolbar");
			// this.removeActiveToolbar();
			// don't seem to need a delay before rendering for leaf changes
			await this.render.renderToolbarForView();
		}
	}

	/**
	 * On changes to metadata, trigger the checks and rendering of a toolbar if necessary.
	 * @param file TFile in which metadata changed.
	 * @param data ??? (not used)
	 * @param cache CachedMetadata, from which we look at the frontmatter.
	 */
	metadataCacheListener = async (file: TFile, data: any, cache: CachedMetadata) => {
		const activeFile = this.app.workspace.getActiveFile();
		// if the active file is the one that changed,
		// and the file was modified after it was created (fix for a duplicate toolbar on Create new note)
		if (activeFile === file && (file.stat.mtime > file.stat.ctime)) {
			this.debug('===== METADATA-CHANGE ===== ', file.name);
			debounce(async () => {
				// FIXME: should this instead update all visible toolbars?
				const toolbarView = this.app.workspace.getActiveViewOfType(ItemView) ?? undefined;
				await this.render.checkAndRenderToolbar(file, cache.frontmatter, toolbarView);
	
				// prompt to create a toolbar if it doesn't exist in the Note Toolbar property
				const ntbPropValue = this.settingsManager.getToolbarNameFromProps(cache.frontmatter);
				if (ntbPropValue && this.settings.toolbarProp !== 'tags') {
					// make sure just the relevant property changed in the open file
					if (this.lastFileOpenedOnCacheChange !== activeFile) this.lastNtbPropValue = undefined;
					const ignoreToolbar = ntbPropValue.includes('none') ? true : false;
					if (ntbPropValue !== this.lastNtbPropValue) {
						const matchingToolbar = ignoreToolbar ? undefined : this.settingsManager.getToolbarByName(ntbPropValue);
						if (!matchingToolbar && !ignoreToolbar) {
							const notice = new Notice(t('notice.warning-no-matching-toolbar', { toolbar: ntbPropValue }), 7500);
							notice.messageEl.addClass('note-toolbar-notice-with-cta');
							this.registerDomEvent(notice.messageEl, 'click', async () => {
								const newToolbar = await this.settingsManager.newToolbar(ntbPropValue);
								this.settingsManager.openToolbarSettings(newToolbar);
							});
						}
					}
				}
				// track current state to look for future Note Toolbar property changes
				this.lastNtbPropValue = ntbPropValue;
				this.lastFileOpenedOnCacheChange = activeFile;
			}, 300)();
		}
	};

	// TODO: remove if not needed
	// onMarkdownViewFileChange(view: MarkdownView, callback: (oldFile: TFile, newFile: TFile) => void) {
	// 	if (!(view.leaf.id in this.__onNoteChange__leafFiles)) {
	// 		this.__onNoteChange__leafFiles[view.leaf.id] = view.file;
	// 		this.__onNoteChange__leafCallbacks[view.leaf.id] = callback;
	// 		this.debug('⭐️⭐️⭐️', this.__onNoteChange__leafFiles);
	// 	}
	//
	// 	if (!this.__onNoteChange__eventCreated) {
	// 		this.registerEvent(
	// 			this.app.workspace.on('layout-change', () => {
	// 				for (const leafId of Object.keys(this.__onNoteChange__leafFiles)) {
	// 					const leaf: WorkspaceLeaf | null = this.app.workspace.getLeafById(leafId);
	// 					// @ts-ignore
	// 					if (leaf && leaf?.view?.file?.path !== this.__onNoteChange__leafFiles[leafId]?.path) {
	// 						// @ts-ignore
	// 						this.__onNoteChange__leafCallbacks[leafId](this.__onNoteChange__leafFiles[leafId], leaf.view.file);
	// 						// @ts-ignore
	// 						this.__onNoteChange__leafFiles[leafId] = leaf.view.file;
	// 					}
	// 				}
	// 			})
	// 		)
	// 		this.__onNoteChange__eventCreated = true;
	// 	}
	// }

	/*************************************************************************
	 * HANDLERS
	 *************************************************************************/

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
			this.render.updateActiveToolbarItem();

			// prevent expansion of callouts if setting is enabled
			if (this.settings.lockCallouts) {
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
							this.items.handleLinkCommand(value);
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
									this.items.handleLinkScript(ItemType.Dataview, scriptConfig);
									break;
								case CalloutAttr.JavaScript:
									this.items.handleLinkScript(ItemType.JavaScript, scriptConfig);
									break;
								case CalloutAttr.JsEngine:
									this.items.handleLinkScript(ItemType.JsEngine, scriptConfig);
									break;
								case CalloutAttr.Templater:
									this.items.handleLinkScript(ItemType.Templater, scriptConfig);
									break;	
							}
							break;
						}
						case CalloutAttr.Folder:
						case CalloutAttr.FolderNtb:
							this.items.handleLinkFolder(value);
							break;
						case CalloutAttr.Menu:
						case CalloutAttr.MenuNtb: {
							const activeFile = this.app.workspace.getActiveFile();
							const toolbar: ToolbarSettings | undefined = this.settingsManager.getToolbar(value);
							if (activeFile) {
								if (toolbar) {
									this.render.renderToolbarAsMenu(toolbar, activeFile).then(menu => {
										this.render.showMenuAtElement(menu, this.lastCalloutLink);
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

	/*************************************************************************
	 * DEBUGGING
	 *************************************************************************/

    /**
     * Utility for debug logging.
     * @param message Message to output to console for debugging.
     */
    debug(message?: any, ...optionalParams: any[]): void {
        this.settings.debugEnabled && console.debug(message, ...optionalParams);
        // const stack = new Error().stack;
        // this.settings.debugEnabled && console.debug('Call stack:', stack);
    }

	debugGroup(label: string): void {
		// eslint-disable-next-line
		this.settings.debugEnabled && console.group(label);
	}

	debugGroupEnd(): void {
		// eslint-disable-next-line
		this.settings.debugEnabled && console.groupEnd();
	}

	/*************************************************************************
	 * UTILITIES
	 *************************************************************************/

	/**
	 * Gets the settings for the toolbar in the current view.
	 * @returns ToolbarSettings for the current toolbar, or undefined if it doesn't exist.
	 */
	getCurrentToolbar(): ToolbarSettings | undefined {
		const noteToolbarEl = this.el.getToolbarEl();
		const noteToolbarSettings = noteToolbarEl ? this.settingsManager.getToolbarById(noteToolbarEl?.id) : undefined;
		return noteToolbarSettings;
	}

}