import { CachedMetadata, Command, Editor, FileSystemAdapter, FrontMatterCache, ItemView, MarkdownFileInfo, MarkdownView, MarkdownViewModeType, Menu, MenuItem, MenuPositionDef, Notice, PaneType, Platform, Plugin, TFile, TFolder, WorkspaceLeaf, addIcon, debounce, getIcon, setIcon, setTooltip } from 'obsidian';
import { NoteToolbarSettingTab } from 'Settings/UI/NoteToolbarSettingTab';
import { ToolbarSettings, NoteToolbarSettings, PositionType, ItemType, CalloutAttr, t, ToolbarItemSettings, ToolbarStyle, RibbonAction, VIEW_TYPE_WHATS_NEW, ScriptConfig, LINK_OPTIONS, SCRIPT_ATTRIBUTE_MAP, DefaultStyleType, MobileStyleType, ErrorBehavior, VIEW_TYPE_GALLERY, LocalVar, PropsState, VIEW_TYPE_HELP, VIEW_TYPE_TIP, DEFAULT_SETTINGS, ItemFocusType } from 'Settings/NoteToolbarSettings';
import { calcComponentVisToggles, calcItemVisToggles, isValidUri, putFocusInMenu, getLinkUiTarget, insertTextAtCursor, getViewId, hasStyle, checkToolbarForItemView, getActiveView, calcMouseItemIndex } from 'Utils/Utils';
import ToolbarSettingsModal from 'Settings/UI/Modals/ToolbarSettingsModal';
import { WhatsNewView } from 'Help/WhatsNewView';
import { SettingsManager } from 'Settings/SettingsManager';
import { CommandManager } from 'Commands/CommandManager';
import { NoteToolbarApi } from 'Api/NoteToolbarApi';
import { INoteToolbarApi } from "Api/INoteToolbarApi";
import { exportToCallout, importFromCallout } from 'Utils/ImportExport';
import { learnMoreFr, openItemSuggestModal } from 'Settings/UI/Utils/SettingsUIUtils';
import { ProtocolManager } from 'Protocol/ProtocolManager';
import { ShareModal } from 'Settings/UI/Modals/ShareModal';
import DataviewAdapter from 'Adapters/DataviewAdapter';
import JavaScriptAdapter from 'Adapters/JavaScriptAdapter';
import JsEngineAdapter from 'Adapters/JsEngineAdapter';
import TemplaterAdapter from 'Adapters/TemplaterAdapter';
import { Adapter } from 'Adapters/Adapter';
import StyleModal from 'Settings/UI/Modals/StyleModal';
import ItemModal from 'Settings/UI/Modals/ItemModal';
import GalleryManager from 'Help/Gallery/GalleryManager';
import { HotkeyHelper } from 'Utils/Hotkeys';
import { GalleryView } from 'Help/Gallery/GalleryView';
import { HelpView } from 'Help/HelpView';
import { TipView } from 'Help/TipView';

export default class NoteToolbarPlugin extends Plugin {

	api: INoteToolbarApi<any>;
	commands: CommandManager;
	hotkeys: HotkeyHelper;
	gallery: GalleryManager;
	protocolManager: ProtocolManager;
	settings: NoteToolbarSettings;	
	settingsManager: SettingsManager;
	
	activeViewIds: string[] = []; // track opened views, to reduce unneccesary toolbar re-renders
	isRendering: Record<string, boolean> = {}; // track if a toolbar is being rendered in a view, to prevent >1 event from triggering two renders

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

	// for tracking other plugins available (for adapters and rendering edge cases)
	hasPlugin: { [key: string]: boolean } = {
		'dataview': false,
		'js-engine': false,
		'make-md': false,
		'templater-obsidian': false,
	}

	isInternalPluginEnabled: { [key: string]: boolean } = {
		'page-preview': false,
		'webviewer': false,
	}

	jsAdapter: JavaScriptAdapter | undefined;
	dvAdapter: DataviewAdapter | undefined;
	jsEngineAdapter: JsEngineAdapter | undefined;
	tpAdapter: TemplaterAdapter | undefined;

	// TODO: remove if not needed
	// __onNoteChange__leafFiles: { [id: string]: TFile | null } = {};
	// __onNoteChange__leafCallbacks: { [id: string]: (oldFile: TFile | null, newFile: TFile) => void } = {};
	// __onNoteChange__eventCreated: boolean = false;

	/**
	 * When this plugin is loaded (e.g., on Obsidian startup, or plugin is enabled in settings):
	 * adds listeners, settings, and renders the toolbar for the active file.
	 */
	async onload() {

		// load the settings
		this.settingsManager = new SettingsManager(this);
		await this.settingsManager.load();

		// add the ribbon icon, on phone only (seems redundant to add on desktop + tablet)
		if (Platform.isPhone) {
			this.addRibbonIcon(this.settings.icon, t('plugin.note-toolbar'), (event) => this.ribbonMenuHandler(event));
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
			this.checkPlugins();
			this.updateAdapters();
			// @ts-ignore
			this.workspacesPlugin = this.app.internalPlugins.getPluginById('workspaces');

			// add icons specific to the plugin
			addIcon('note-toolbar-empty', '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" class="svg-icon note-toolbar-empty”></svg>');
			addIcon('note-toolbar-none', '<svg xmlns="http://www.w3.org/2000/svg" width="0" height="24" viewBox="0 0 0 24" fill="none" class="svg-icon note-toolbar-none"></svg>');
			addIcon('note-toolbar-separator', '<path d="M23.4444 35.417H13.7222C8.35279 35.417 4 41.6988 4 44V55.5C4 57.8012 8.35279 64.5837 13.7222 64.5837H23.4444C28.8139 64.5837 33.1667 57.8012 33.1667 55.5L33.1667 44C33.1667 41.6988 28.8139 35.417 23.4444 35.417Z" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><path d="M86.4444 35.417H76.7222C71.3528 35.417 67 41.6988 67 44V55.5C67 57.8012 71.3528 64.5837 76.7222 64.5837H86.4444C91.8139 64.5837 96.1667 57.8012 96.1667 55.5L96.1667 44C96.1667 41.6988 91.8139 35.417 86.4444 35.417Z" stroke="currentColor" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M49.8333 8.33301V91.6663" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>');	

			// render the initial toolbar
			await this.renderToolbarForAllLeaves();

			// add the settings UI
			this.addSettingTab(new NoteToolbarSettingTab(this.app, this));

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
					this.removeFocusStyle();
				}
				this.calloutLinkHandler(e);
			});

			// add items to menus, when needed
			this.registerEvent(this.app.workspace.on('file-menu', this.fileMenuHandler));
			this.registerEvent(this.app.workspace.on('editor-menu', this.editorMenuHandler));

			// add commands
			this.addCommand({ id: 'copy-cmd-uri', name: t('command.name-copy-cmd-uri'), callback: async () => this.commands.copyCommand(false) });
			this.addCommand({ id: 'copy-cmd-as-data-element', name: t('command.name-copy-cmd-as-data-element'), callback: async () => this.commands.copyCommand(true) });
			this.addCommand({ id: 'focus', name: t('command.name-focus'), callback: async () => this.commands.focus() });
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

		});

	}

	/**
	 * Cleanup when the plugin is unloaded (e.g., disabled in settings, or Obsidian is restarted).
	 */
	async onunload() {

		// remove any toolbars
		this.getAllToolbarEl().forEach((toolbarEl) => { toolbarEl.remove(); });
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
			await this.renderToolbarForAllLeaves();
			this.activeWorkspace = workspace;
		}
		else {
			const currentView = this.app.workspace.getActiveViewOfType(ItemView);
			if (currentView) await this.renderToolbarForView(currentView);
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
		let toolbarEl = this.getToolbarEl();
		let currentView = getActiveView();

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
		if (!renderToolbar && viewId && this.activeViewIds.contains(viewId)) {
			this.debug('LEAF-CHANGE: SKIPPED RENDERING: VIEW ALREADY HANDLED');
			this.updateActiveToolbar();
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
			await this.renderToolbarForView();
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
				await this.checkAndRenderToolbar(file, cache.frontmatter, toolbarView);
	
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

	/**
	 * Updates the list of currently active views.
	 */
	updateActiveViewIds() {
		const currentView: MarkdownView | null = this.app.workspace.getActiveViewOfType(MarkdownView);
		const currentViewId = getViewId(currentView);

		// if not in the list, add it
		if (currentViewId && !(currentViewId in this.activeViewIds)) this.activeViewIds.push(currentViewId);

		// update list of open views and remove any views that are not currently open
		let openViewIds: string[] = [];
		this.app.workspace.iterateAllLeaves((leaf) => {
			if (leaf.view instanceof MarkdownView) {
				// this.debug('🚚', leaf);
				const openViewId = getViewId(leaf.view);
				if (openViewId) openViewIds.push(openViewId);
			}
		});
		this.activeViewIds = this.activeViewIds.filter(item => openViewIds.includes(item));
		// this.debug('🚗', this.activeViewIds);
	}

	/*************************************************************************
	 * TOOLBAR RENDERERS
	 *************************************************************************/

	/**
	 * Checks if the provided file and frontmatter meets the criteria to render a toolbar,
	 * or if we need to remove the toolbar if it shouldn't be there.
	 * @param file TFile (note) to check if we need to create a toolbar.
	 * @param frontmatter FrontMatterCache to check if there's a prop for the toolbar.
	 * @param view view to render toolbar in; defaults to active view if not provided.
	 */
	async checkAndRenderToolbar(file: TFile, frontmatter: FrontMatterCache | undefined, view?: ItemView): Promise<void> {

		this.debug('checkAndRenderToolbar: file:', file.name, 'view:', getViewId(view));

		const viewId = getViewId(view);
		if (viewId) {	
			if (this.isRendering[viewId]) {
				this.debug('checkAndRenderToolbar: SKIPPED: ALREADY RENDERING', viewId);
				return;
			};
			this.isRendering[viewId] = true;
		}
		else return;

		try {
			// get matching toolbar for this note, if there is one		
			let matchingToolbar: ToolbarSettings | undefined = this.settingsManager.getMappedToolbar(frontmatter, file);
			
			// remove existing toolbar if needed
			let toolbarRemoved: boolean = this.removeToolbarIfNeeded(matchingToolbar, view);

			this.debug('checkAndRenderToolbar:', matchingToolbar?.name);

			if (matchingToolbar) {
				// render the toolbar if we have one, and we don't have an existing toolbar to keep
				if (toolbarRemoved) {
					this.updateActiveViewIds();
					await this.renderToolbar(matchingToolbar, file, view);	
				}
				await this.updateToolbar(matchingToolbar, file, view);
			}
		}
		finally {
			this.isRendering[viewId] = false;
		}

	}

	/**
	 * Renders the toolbar for the provided toolbar settings.
	 * @param toolbar ToolbarSettings
	 * @param file TFile for the note that the toolbar is being rendered for
	 * @param view MarkdownView or ItemView to render toolbar in; if not provided uses active view
	 */
	async renderToolbar(toolbar: ToolbarSettings, file: TFile | null, view?: ItemView): Promise<void> {

		this.debugGroup(`renderToolbar: ${toolbar.name}`);

		// get position for this platform; default to 'props' if it's not set for some reason (should not be the case)
		let position;
		Platform.isMobile
			? position = toolbar.position.mobile?.allViews?.position ?? 'props'
			: position = toolbar.position.desktop?.allViews?.position ?? 'props';

		// if no view is provided, get the active view
		if (!view) view = this.app.workspace.getActiveViewOfType(MarkdownView) ?? undefined;
		if (!view) view = this.app.workspace.getActiveViewOfType(ItemView) ?? undefined;
		if (!view) {
			this.debugGroupEnd();
			return;
		}

		if (!(view instanceof MarkdownView)) {
			const isToolbarVisible = checkToolbarForItemView(this, view);
			if (!isToolbarVisible) {
				this.debug("🛑 renderToolbar: nothing to render in this view");
				this.debugGroupEnd();
				return;
			}
			if (position === 'props') position = 'top';
		}

		let noteToolbarElement: HTMLElement | undefined;
		let embedBlock = activeDocument.createElement("div");
		embedBlock.addClass('cg-note-toolbar-container');
		toolbar.uuid ? embedBlock.id = toolbar.uuid : undefined;
		const markdownViewMode = (view instanceof MarkdownView) ? view.getMode() : '';
		embedBlock.setAttrs({
			'data-name': toolbar.name,
			'data-tbar-position': position,
			'data-updated': toolbar.updated,
			'data-view-mode': markdownViewMode,
			'data-csstheme': this.app.vault.getConfig('cssTheme')
		});

		// render the toolbar based on its position
		switch (position) {
			case PositionType.FabLeft:
			case PositionType.FabRight:
				noteToolbarElement = await this.renderToolbarAsFab(toolbar, position);
				embedBlock.append(noteToolbarElement);
				this.registerDomEvent(embedBlock, 'click', (e) => this.toolbarFabHandler(e, noteToolbarElement!));
				// render toolbar in context menu if a default item is set
				if (toolbar.defaultItem) {
					this.registerDomEvent(noteToolbarElement, 'contextmenu', (event) => {
						this.renderToolbarAsMenu(toolbar, file, this.settings.showEditInFabMenu).then(menu => {
							navigator.vibrate(50);
							menu.showAtPosition(event);
							event instanceof KeyboardEvent ? putFocusInMenu() : undefined;
						});
					});
				}
				else {
					this.registerDomEvent(noteToolbarElement, 'contextmenu', (e) => this.toolbarContextMenuHandler(e));
				}
				break;
			case PositionType.Bottom:
			case PositionType.Props:
			case PositionType.Top: {
				noteToolbarElement = await this.renderToolbarAsCallout(toolbar, file, view);
				// extra div workaround to emulate callout-in-content structure, to use same sticky css
				let div = activeDocument.createElement("div");
				div.append(noteToolbarElement);
				embedBlock.addClasses(['cm-embed-block', 'cm-callout', 'cg-note-toolbar-bar-container']);
				embedBlock.append(div);
				this.registerDomEvent(embedBlock, 'contextmenu', (e) => this.toolbarContextMenuHandler(e));
				this.registerDomEvent(embedBlock, 'keydown', (e) => this.toolbarKeyboardHandler(e));	
				break;
			}
			case PositionType.Hidden:
			default:
				// we're not rendering it
				break;
		}

		const useLaunchpad = Boolean(
			!(view instanceof MarkdownView) && view.getViewType() === 'empty' 
			&& this.settings.showLaunchpad && this.settings.emptyViewToolbar
		);
		view.contentEl.toggleClass('note-toolbar-launchpad-container', useLaunchpad);
		if (useLaunchpad && noteToolbarElement) {
			noteToolbarElement.addClass('note-toolbar-launchpad');
			view.contentEl.insertAdjacentElement('afterbegin', embedBlock);
			this.debugGroupEnd();
			return;
		}

		// add the toolbar to the editor or modal UI
		const viewEl = view?.containerEl as HTMLElement | null;
		const modalEl = activeDocument.querySelector('.modal-container .note-toolbar-ui') as HTMLElement;
		switch(position) {
			case PositionType.Bottom:
				// position relative to modal container if in a modal
				if (modalEl) modalEl.insertAdjacentElement('afterbegin', embedBlock)
				else viewEl
					? viewEl.insertAdjacentElement('afterbegin', embedBlock)
					: this.debug(`🛑 renderToolbar: Unable to find active leaf to insert toolbar`);
				break;
			case PositionType.FabLeft:
			case PositionType.FabRight:
				// position relative to modal container if in a modal
				if (modalEl) modalEl.appendChild(embedBlock)
				else viewEl?.appendChild(embedBlock);
				break;
			case PositionType.Top: {
				let viewHeader = viewEl?.querySelector('.view-header') as HTMLElement;
				// FIXME: add to modal header, but this is causing duplicate toolbars
				// if (modalEl) viewHeader = modalEl.querySelector('.modal-header') as HTMLElement;
				viewHeader 
					? viewHeader.insertAdjacentElement("afterend", embedBlock)
					: this.debug("🛑 renderToolbar: Unable to find .view-header to insert toolbar");
				break;
			}
			default:
				// default case includes Hidden and Props positions; Hidden is rendered for command reference
				if (view instanceof MarkdownView) {
					// inject it between the properties and content divs
					let propsEl = this.getPropsEl(view);
					if (!propsEl) {
						this.debug("🛑 renderToolbar: Unable to find .metadata-container to insert toolbar");
					}
					propsEl?.insertAdjacentElement("afterend", embedBlock);
				}
				break;
		}

		this.debug(`⭐️ Rendered: ${toolbar.name} in view:`, getViewId(view));
		this.debugGroupEnd();

	}
	
	/**
	 * Adds the styles to the bottom toolbar.
	 * @param toolbar toolbar to check for style settings.
	 * @param toolbarEl toolbar element.
	 */
	renderBottomToolbarStyles(toolbar: ToolbarSettings, toolbarEl: HTMLElement) {
		let bottomStyles: string[] = [];
		if (hasStyle(toolbar, DefaultStyleType.Wide, MobileStyleType.Wide)) {
			bottomStyles.push(`width: 100%`);
		}
		else {
			hasStyle(toolbar, DefaultStyleType.Right, MobileStyleType.Right)
				? bottomStyles.push(`right: 0`)
				: hasStyle(toolbar, DefaultStyleType.Left, MobileStyleType.Left)
					? bottomStyles.push(`left: 0`)
					: bottomStyles.push(this.renderBottomLeftStyle(toolbarEl));
		}
		toolbarEl.setAttribute('style', bottomStyles.join(';'));
	}

	/**
	 * Calculates the left position for bottom toolbars.
	 * @param toolbarEl toolbar element.
	 * @returns CSS style string.
	 */
	renderBottomLeftStyle(toolbarEl: HTMLElement): string {
		let viewPaddingOffset = 0;
		let activeLeaf: MarkdownView | ItemView | null = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!activeLeaf) activeLeaf = this.app.workspace.getActiveViewOfType(ItemView);
		// if (activeLeaf) {
		// 	const contentElStyle = getComputedStyle(activeLeaf?.contentEl);
		// 	viewPaddingOffset = parseFloat(contentElStyle.paddingLeft) || 0;
		// }
		return `left: max(0%, calc(50% - calc(${toolbarEl.offsetWidth}px / 2) + ${viewPaddingOffset}px))`;
	}

	/**
	 * Renders the given toolbar as a callout (to add to the container) and returns it.
	 * @param toolbar ToolbarSettings to render
	 * @param file TFile of the note to render the toolbar for
	 * @param view ItemView to render toolbar in, just used for context
	 * @returns HTMLElement cg-note-toolbar-callout
	 */
	async renderToolbarAsCallout(toolbar: ToolbarSettings, file: TFile | null, view: ItemView): Promise<HTMLElement> {
		
		/* create the unordered list of menu items */
		let noteToolbarUl = activeDocument.createElement("ul");
		noteToolbarUl.setAttribute("role", "menu");

		let noteToolbarLiArray = await this.renderToolbarLItems(toolbar, file, view);
		noteToolbarUl.append(...noteToolbarLiArray);

		let noteToolbarCallout = activeDocument.createElement("div");

		// don't render content if it's empty, but keep the metadata so the toolbar commands & menu still work
		// TODO: also check if all child items are display: none - use Platform.isMobile and check the mb booleans, dk otherwise?
		if (toolbar.items.length > 0) {

			let noteToolbarCalloutContent = activeDocument.createElement("div");
			noteToolbarCalloutContent.className = "callout-content";
			noteToolbarCalloutContent.append(noteToolbarUl);

			noteToolbarCallout.addClasses(["callout", "cg-note-toolbar-callout"]);
			toolbar.customClasses && noteToolbarCallout.addClasses([...toolbar.customClasses.split(' ')]);
			noteToolbarCallout.setAttribute("data-callout", "note-toolbar");
			noteToolbarCallout.setAttribute("data-callout-metadata", [...toolbar.defaultStyles, ...toolbar.mobileStyles].join('-'));
			noteToolbarCallout.append(noteToolbarCalloutContent);
			
			// support for Page preview plugin
			this.registerDomEvent(noteToolbarCallout, 'mouseover', async (evt: MouseEvent) => {
				const target = (evt.target as HTMLElement)?.closest('.external-link');
				const type = target?.getAttribute('data-toolbar-link-attr-type');
				if (target && type && [ItemType.File, ItemType.Uri].contains(type as ItemType)) {
					let itemLink = target.getAttribute('href') || '';
					itemLink = await this.replaceVars(itemLink, this.app.workspace.getActiveFile());
					// make sure it's not actually a folder or URI, as we can't preview them
					const isFolder = this.app.vault.getAbstractFileByPath(itemLink) instanceof TFolder;
					const isUri = ((type === ItemType.Uri) && isValidUri(itemLink));
					if (!isFolder && !isUri) {
						// source doesn't seem to be required as Page preview plugin settings aren't being respected
						this.app.workspace.trigger('hover-link', {
							event: evt,
							source: '',
							hoverParent: noteToolbarCallout,
							targetEl: target,
							linktext: itemLink,
						});
					}
				}
			});

		}

		return noteToolbarCallout;

	}

	/**
	 * Returns the callout LIs for the items in the given toolbar.
	 * @param toolbar ToolbarSettings to render
	 * @param file TFile to render the toolbar for
	 * @param view ItemView items are being rendered for, for context
	 * @param recursions tracks how deep we are to stop recursion
	 * @returns Array of HTMLLIElements
	 */
	async renderToolbarLItems(toolbar: ToolbarSettings, file: TFile | null, view: ItemView, recursions: number = 0): Promise<HTMLLIElement[]> {

		if (recursions >= 2) {
			return []; // stop recursion
		}

		let noteToolbarLiArray: HTMLLIElement[] = [];

		const resolvedLabels: string[] = await this.resolveLabels(toolbar, file);

		for (let i = 0; i < toolbar.items.length; i++) {

			const item = toolbar.items[i];

			// TODO: use calcItemVisToggles for the relevant platform here instead?
			// filter out empty items on display
			if (item.label === "" && item.icon === "" 
				&& ![ItemType.Break, ItemType.Group, ItemType.Separator].includes(item.linkAttr.type)) {
				continue;
			}

			let toolbarItem: HTMLElement | undefined = undefined;
			const [showOnDesktop, showOnMobile, showOnTablet] = calcItemVisToggles(item.visibility);

			switch (item.linkAttr.type) {
				case ItemType.Break:
				case ItemType.Separator: {
					if (view.getViewType() === 'empty' && this.settings.showLaunchpad) continue;
					toolbarItem = activeDocument.createElement('data');
					toolbarItem.setAttribute(
						item.linkAttr.type === ItemType.Break ? 'data-break' : 'data-sep', '');
					toolbarItem.setAttribute('role', 'separator');
					break;
				}
				case ItemType.Group: {
					const groupToolbar = this.settingsManager.getToolbar(item.link);
					if (groupToolbar) {
						if ((Platform.isMobile && showOnMobile) || (Platform.isDesktop && showOnDesktop)) {
							const groupLItems = await this.renderToolbarLItems(groupToolbar, file, view, recursions + 1);
							noteToolbarLiArray.push(...groupLItems);
						}
					}
					break;
				}
				default: {
					// changed to span as temporary(?) fix (#19) for links on Android
					toolbarItem = activeDocument.createElement('span');
					item.uuid ? toolbarItem.id = item.uuid : undefined;
					toolbarItem.className = "external-link";
					toolbarItem.setAttrs({
						'href': item.link,
						'role': 'link',
						'rel': 'noopener'
					});
					toolbarItem.tabIndex = 0;
					Object.entries(item.linkAttr).forEach(([key, value]) => {
						toolbarItem?.setAttribute(`data-toolbar-link-attr-${key}`, value);
					});

					if (!Platform.isPhone) {
						const itemCommand = this.commands.getCommandFor(item);
						let hotkeyText = itemCommand ? this.hotkeys.getHotkeyText(itemCommand) : undefined;
						let tooltipText = item.tooltip ? item.tooltip + (hotkeyText ? ` (${hotkeyText})` : '') : hotkeyText || '';
						if (tooltipText) setTooltip(toolbarItem, tooltipText, { placement: "top" });
					}

					this.registerDomEvent(toolbarItem, 'click', (e) => this.toolbarClickHandler(e));
					this.registerDomEvent(toolbarItem, 'auxclick', (e) => this.toolbarClickHandler(e));
		
					const [dkHasIcon, dkHasLabel, mbHasIcon, mbHasLabel, tabHasIcon, tabHasLabel] = calcComponentVisToggles(item.visibility);
					toolbarItem.addClass('cg-note-toolbar-item');
					if (item.label) {
						if (item.icon) {
							let itemIcon = toolbarItem.createSpan();
							this.setComponentDisplayClass(itemIcon, dkHasIcon, mbHasIcon);
							setIcon(itemIcon, item.icon);
		
							let itemLabelEl = toolbarItem.createSpan();
							this.setComponentDisplayClass(itemLabelEl, dkHasLabel, mbHasLabel);
							itemLabelEl.innerText = resolvedLabels[i];
							itemLabelEl.addClass('cg-note-toolbar-item-label');
						}
						else {
							this.setComponentDisplayClass(toolbarItem, dkHasLabel, mbHasLabel);
							toolbarItem.innerText = resolvedLabels[i];
							toolbarItem.addClass('cg-note-toolbar-item-label');
						}
					}
					else {
						this.setComponentDisplayClass(toolbarItem, dkHasIcon, mbHasIcon);
						setIcon(toolbarItem, item.icon);
					}
					break;
				}
			}

			if (toolbarItem) {
				let noteToolbarLi = activeDocument.createElement("li");
				noteToolbarLi.dataset.index = i.toString();
				!showOnMobile ? noteToolbarLi.addClass('hide-on-mobile') : false;
				!showOnDesktop ? noteToolbarLi.addClass('hide-on-desktop') : false;
				noteToolbarLi.append(toolbarItem);
				noteToolbarLiArray.push(noteToolbarLi);
			}

		}

		return noteToolbarLiArray;

	}

	/** 
	 * Replaces all vars in all labels for the given toolbar, so they can be replaced before render.
	 * @param toolbar toolbar to replace labels for
	 * @param file TFile to render the toolbar within (for context to resolve variables and expressions)
	 * @returns string array of labels with resolved values 
	 */
	async resolveLabels(toolbar: ToolbarSettings, file: TFile | null): Promise<string[]> {
		let resolvedLabels: string[] = [];
		for (const item of toolbar.items) {
			const resolvedLabel = await this.replaceVars(item.label, file);
			resolvedLabels.push(resolvedLabel);
		}
		return resolvedLabels;
	}

	/**
	 * Creates a floating button to attach event to, to render the menu.
	 * @param position button position (i.e., 'fabl' or 'fabr') 
	 * @returns HTMLElement cg-note-toolbar-fab
	 */
	async renderToolbarAsFab(toolbar: ToolbarSettings, position: string): Promise<HTMLElement> {

		let noteToolbarFabContainer = activeDocument.createElement('div');
		noteToolbarFabContainer.addClass('cg-note-toolbar-fab-container');
		noteToolbarFabContainer.setAttrs({
			role: 'group',
			'data-tbar-position': position
		});

		let noteToolbarFabButton = activeDocument.createElement('button');
		noteToolbarFabButton.addClass('cg-note-toolbar-fab');
		noteToolbarFabButton.setAttribute("data-fab-metadata", [...toolbar.defaultStyles, ...toolbar.mobileStyles].join('-'));

		const defaultItem = toolbar.defaultItem ? this.settingsManager.getToolbarItemById(toolbar.defaultItem) : undefined;
		// show default item if set
		if (defaultItem) {
			let activeFile = this.app.workspace.getActiveFile();
			let defaultItemText = defaultItem.label || defaultItem.tooltip;
			if (this.hasVars(defaultItemText)) defaultItemText = await this.replaceVars(defaultItemText, activeFile);
			noteToolbarFabButton.setAttribute('aria-label', defaultItemText);
			setIcon(noteToolbarFabButton, defaultItem.icon ? defaultItem.icon : this.settings.icon);
		}
		else {
			noteToolbarFabButton.setAttribute('aria-label', toolbar.name);
			setIcon(noteToolbarFabButton, this.settings.icon);
		}
		
		noteToolbarFabContainer.append(noteToolbarFabButton);

		return noteToolbarFabContainer;

	}

	/**
	 * Renders the given toolbar as a menu and returns it.
	 * @param toolbar ToolbarSettings to show menu for.
	 * @param activeFile TFile to show menu for.
	 * @param showEditToolbar set true to show Edit Toolbar link at bottom of menu.
	 * @param showToolbarName set true to show the menu toolbar's name at top of menu.
	 * @returns Menu with toolbar's items
	 */
	async renderToolbarAsMenu(
		toolbar: ToolbarSettings, 
		activeFile: TFile | null, 
		showEditToolbar: boolean = false
	): Promise<Menu> {

		let menu = new Menu();

		if (Platform.isMobile) {
			menu.addItem((item: MenuItem) => {
				item
					.setTitle(toolbar.name)
					.setIsLabel(true)
			});
		}

		await this.renderMenuItems(menu, toolbar, activeFile);

		if (showEditToolbar) {
			menu.addSeparator();
			menu.addItem((item: MenuItem) => {
				item
					.setTitle(t('toolbar.menu-edit-toolbar', { toolbar: toolbar.name, interpolation: { escapeValue: false } }))
					.setIcon('rectangle-ellipsis')
					.onClick((menuEvent) => {
						const modal = new ToolbarSettingsModal(this.app, this, null, toolbar as ToolbarSettings);
						modal.setTitle(t('setting.title-edit-toolbar', { toolbar: toolbar.name, interpolation: { escapeValue: false } }));
						modal.open();
					});
			});
		}

		// add class so we can style the menu
		menu.dom.addClass('note-toolbar-menu');

		// apply custom classes to the sub-menu by getting the note's toolbar 
		const activeToolbar = this.getCurrentToolbar();
		if (activeToolbar && activeToolbar.customClasses) menu.dom.addClasses([...activeToolbar.customClasses.split(' ')]);

		return menu;

	}

	/**
	 * Adds items from the given toolbar to the given menu.
	 * @param menu Menu to add items to.
	 * @param toolbar ToolbarSettings to add menu items for.
	 * @param file TFile to show menu for.
	 * @param recursions tracks how deep we are to stop recursion.
	 * @returns 
	 */
	async renderMenuItems(menu: Menu, toolbar: ToolbarSettings, file: TFile | null, recursions: number = 0): Promise<void> {

		if (recursions >= 2) {
			return; // stop recursion
		}

		// check if the toolbar has icons, so we know whether to show placeholders or not
		// FIXME: this does not take platform visibility into account
		const hasIcons = toolbar.items.some(item => item.icon?.length);

		const toolbarView = this.app.workspace.getActiveViewOfType(ItemView);

		for (const toolbarItem of toolbar.items) { 
			// skip empty items
			if (![ItemType.Break, ItemType.Group, ItemType.Separator].includes(toolbarItem.linkAttr.type) &&
				!toolbarItem.icon && !toolbarItem.label && !toolbarItem.tooltip) continue;
		
			const [showOnDesktop, showOnMobile, showOnTablet] = calcItemVisToggles(toolbarItem.visibility);
			if ((Platform.isMobile && showOnMobile) || (Platform.isDesktop && showOnDesktop)) {
				// replace variables in labels (or tooltip, if no label set)
				const title = await this.getItemText(toolbarItem, file);
				switch(toolbarItem.linkAttr.type) {
					case ItemType.Break:
						// show breaks as separators in menus
						menu.addSeparator();
						break;
					case ItemType.Separator:
						menu.addSeparator();
						break;
					case ItemType.Group: {
						const groupToolbar = this.settingsManager.getToolbar(toolbarItem.link);
						groupToolbar ? await this.renderMenuItems(menu, groupToolbar, file, recursions + 1) : undefined;
						break;
					}
					case ItemType.Menu:
						// the sub-menu UI doesn't appear to work on mobile, so default to treat as link
						if (!Platform.isMobile) {
							// display menus in sub-menus, but only if we're not more than a level deep
							if (recursions >= 1) break;
							menu.addItem((item: MenuItem) => {
								item
									.setIcon(toolbarItem.icon && getIcon(toolbarItem.icon)
										? toolbarItem.icon 
										: (hasIcons ? 'note-toolbar-empty' : null))
									.setTitle(title);
								let subMenu = item.setSubmenu() as Menu;
								// add class so we can style the menu
								subMenu.dom.addClass('note-toolbar-menu');
								// apply custom classes to the sub-menu by getting the note's toolbar 
								const activeToolbar = this.getCurrentToolbar();
								if (activeToolbar && activeToolbar.customClasses) subMenu.dom.addClasses([...activeToolbar.customClasses.split(' ')]);
								// render the sub-menu items
								let menuToolbar = this.settingsManager.getToolbar(toolbarItem.link);
								menuToolbar ? this.renderMenuItems(subMenu, menuToolbar, file, recursions + 1) : undefined;
							});
						}
						break;
					default: {
						// don't show the item if the link has variables and resolves to nothing
						if (this.hasVars(toolbarItem.link) && await this.replaceVars(toolbarItem.link, file) === "") {
							break;
						}						
						// don't show command if not available
						const isCommandAvailable = this.isCommandItemAvailable(toolbarItem, toolbarView);
						if (!isCommandAvailable) break;

						menu.addItem((item: MenuItem) => {

							const itemTitleFr = document.createDocumentFragment();
							itemTitleFr.append(title);
							// show hotkey
							if (!Platform.isPhone) {
								const itemCommand = this.commands.getCommandFor(toolbarItem);
								if (itemCommand) {
									const itemHotkeyEl = this.hotkeys.getHotkeyEl(itemCommand);
									if (itemHotkeyEl) itemTitleFr.appendChild(itemHotkeyEl);
								}
							}
							
							item
								.setIcon(toolbarItem.icon && getIcon(toolbarItem.icon)
									? toolbarItem.icon 
									: (hasIcons ? 'note-toolbar-empty' : null))
								.setTitle(itemTitleFr)
								.onClick(async (menuEvent) => {
									await this.handleItemLink(toolbarItem, menuEvent, file);
									// fixes issue where focus sticks on executing commands
									if (toolbarItem.linkAttr.type !== ItemType.Menu) {
										await this.removeFocusStyle();
										this.app.workspace.activeEditor?.editor?.focus();
									}
								});
							});
						break;
					}
				}
			}
		};

	}

	/**
	 * Renders the toolbar in the provided view or active view, assuming it needs one.
	 */
	async renderToolbarForView(view?: ItemView) {

		const toolbarView = view ? view : this.app.workspace.getActiveViewOfType(ItemView);

		let activeFile: TFile | null = null;
		if (!toolbarView) return;
		if (toolbarView instanceof MarkdownView) {
			activeFile = toolbarView.file;
		}
		else if (toolbarView instanceof ItemView) {
			const viewState = toolbarView.getState();
			const abstractFile = viewState.file ? this.app.vault.getAbstractFileByPath(viewState.file as string) : null;
			if (abstractFile && abstractFile instanceof TFile) activeFile = abstractFile; 
		}
		
		// for notes and other file types
		if (activeFile) {
			let frontmatter = activeFile ? this.app.metadataCache.getFileCache(activeFile)?.frontmatter : undefined;
			await this.checkAndRenderToolbar(activeFile, frontmatter, toolbarView);
		}
		// for New tab view
		else {
			if (this.settings.emptyViewToolbar) {
				const toolbar = this.settingsManager.getToolbarById(this.settings.emptyViewToolbar);
				const toolbarRemoved = this.removeToolbarIfNeeded(toolbar, toolbarView);
				if (toolbar) {
					// render the toolbar if we have one, and we don't have an existing toolbar to keep
					if (toolbarRemoved) {
						await this.renderToolbar(toolbar, null, toolbarView);	
					}
					await this.updateToolbar(toolbar, null, toolbarView);
				}
			}
		}

	}

	/**
	 * Iterates all leaves and renders toolbars for all active leaves.
	 */
	async renderToolbarForAllLeaves() {
		this.app.workspace.iterateAllLeaves(leaf => {
			if (leaf.view instanceof ItemView) this.renderToolbarForView(leaf.view as ItemView);
		});
	}

	/**
	 * Sets the appropriate class on the given component, based on its visibility settings.
	 * @param element HTMLElement to set the display class on
	 * @param dkVisible true if component is visible on desktop
	 * @param mbVisibile true if component is visible on mobile
	 */
	setComponentDisplayClass(element: HTMLElement, dkVisible: boolean, mbVisibile: boolean): void {
		// remove any display classes in case they were set elsewhere
		element.removeClasses(['hide', 'hide-on-desktop', 'hide-on-mobile']);
		if (!dkVisible && !mbVisibile) {
			element.addClass('hide');
		} else {
			!dkVisible && element.addClass('hide-on-desktop');
			!mbVisibile && element.addClass('hide-on-mobile');
			// !tabVisible && element.addClass('hide-on-tablet');
		}
	}

	/**
	 * Shows toolbar menu at the given element, adjusting its position if necessary.
	 * @param Menu
	 * @param Element to position the menu at, or null if using a saved menu position.
	 */
	async showMenuAtElement(menu: Menu, clickedItemEl: Element | null) {

		this.debug('showMenuAtElement', clickedItemEl);
		let menuPos: MenuPositionDef | undefined = undefined;

		// store menu position for sub-menu positioning
		if (clickedItemEl) {
			let elemRect = clickedItemEl.getBoundingClientRect();
			menuPos = { x: elemRect.x, y: elemRect.bottom, overlap: true, left: false };
			this.app.saveLocalStorage(LocalVar.MenuPos, JSON.stringify(menuPos));
		}

		// if we don't have a position yet, try to get it from the previous menu
		if (!menuPos) {
			let previousPosData = this.app.loadLocalStorage(LocalVar.MenuPos);
			menuPos = previousPosData ? JSON.parse(previousPosData) : undefined;
		}

		// position (and potentially offset) the menu, and then set focus in it if necessary
		if (menuPos) {
			menu.showAtPosition(menuPos);
			if (!menuPos.left) {
				// reposition if the menu overlaps the right edge
				let menuOverflow = activeWindow.innerWidth - (menuPos.x + menu.dom.offsetWidth);
				// not sure why this is close to 2 -- border pixels on either side? is this theme-dependent?
				if (menuOverflow <= 2) {
					this.debug('⬅️ repositioned menu');
					// show the menu along the right edge of the window instead
					menu.showAtPosition( { x: activeWindow.innerWidth, y: menuPos.y, overlap: true, left: true } );
				}
			}
		}

	}

	/**
	 * Updates any toolbar elements that use properties, including labels and tooltips.
	 * If the item resolves to a URI that's empty, the item is hidden.
	 * @param toolbar ToolbarSettings to get values from.
	 * @param activeFile TFile to update toolbar for.
	 * @param view ItemView to update toolbar within; uses active view otherwise.
	 */
	async updateToolbar(toolbar: ToolbarSettings, activeFile: TFile | null, view?: ItemView) {

		this.debugGroup(`updateToolbar: ${toolbar.name}`);
		const toolbarView = view ? view : this.app.workspace.getActiveViewOfType(ItemView);

		if (this.settings.keepPropsState) {
			// restore properties to the state they were before
			const propsState = this.app.loadLocalStorage(LocalVar.PropsState);
			if (propsState && ['toggle', 'show', 'hide', 'fold'].includes(propsState)) {
				this.commands.toggleProps(propsState as PropsState, true);
			}
		}

		const toolbarEl = this.getToolbarEl(toolbarView ?? undefined);
		const currentPosition = this.settingsManager.getToolbarPosition(toolbar);

		// no need to run update for certain positions
		if ([PositionType.FabLeft, PositionType.FabRight, PositionType.Hidden, undefined].includes(currentPosition)) {
			this.debugGroupEnd();
			return;
		}

		// if we have a toolbarEl, double-check toolbar's name and updated stamp are as provided
		let toolbarElName = toolbarEl?.getAttribute("data-name");
		let toolbarElUpdated = toolbarEl?.getAttribute("data-updated");
		if (toolbarEl === null || toolbar.name !== toolbarElName || toolbar.updated !== toolbarElUpdated) {
			this.debugGroupEnd();
			return;
		}

		// iterate over the item elements of this toolbarEl
		let toolbarItemEls = Array.from(toolbarEl.querySelectorAll('.callout-content > ul > li') as NodeListOf<HTMLElement>);
		for (const itemEl of toolbarItemEls) {

			let itemSpanEl = itemEl.querySelector('span.external-link') as HTMLSpanElement;

			// skip separators and breaks
			if (!itemSpanEl) { continue }

			let itemSetting = this.settingsManager.getToolbarItemById(itemSpanEl.id);
			if (itemSetting && itemSpanEl.id === itemSetting.uuid) {
				const isCommandAvailable = this.isCommandItemAvailable(itemSetting, toolbarView);
				if (isCommandAvailable) {
					itemEl.removeClass('hide');
				}
				else {
					itemEl.addClass('hide');
					continue;
				}

				// update tooltip + label
				if (this.hasVars(itemSetting.tooltip)) {
					let newTooltip = await this.replaceVars(itemSetting.tooltip, activeFile);
					setTooltip(itemSpanEl, newTooltip, { placement: "top" });
				}
				if (this.hasVars(itemSetting.label)) {
					let newLabel = await this.replaceVars(itemSetting.label, activeFile);
					let itemElLabel = itemEl.querySelector('.cg-note-toolbar-item-label');
					if (newLabel) {
						itemElLabel?.removeClass('hide');
						itemElLabel?.setText(newLabel);
					}
					else {
						itemElLabel?.addClass('hide');
						itemElLabel?.setText('');
					}
				}

				// if item's empty, is not visible, or its link resolves to nothing, do not show it
				const isItemEmpty = itemSpanEl.innerText === '' && itemSetting.icon === '';
				const isItemHidden = getComputedStyle(itemSpanEl).display === 'none';
				const isLinkEmpty = this.hasVars(itemSetting.link) && (await this.replaceVars(itemSetting.link, activeFile) === '');
				if (isItemEmpty || isLinkEmpty || isItemHidden) {
					itemEl.addClass('hide');
					continue;
				}
				else {
					itemEl.removeClass('hide');
				}

				// update li active-file property, to allow tab-like styling
				if (activeFile && itemSetting.linkAttr.type === ItemType.File) {
					itemSpanEl.parentElement?.toggleAttribute('data-active-file', activeFile.path === itemSetting.link);
				}

			}

		}

		// re-align bottom toolbar in case width changed 
		if (currentPosition === PositionType.Bottom) {
			this.renderBottomToolbarStyles(toolbar, toolbarEl);
		}

		this.debugGroupEnd();

	}

	/**
	 * Updates the toolbar for the active file.
	 */
	async updateActiveToolbar(): Promise<void> {
		let activeFile = this.app.workspace.getActiveFile();
		if (activeFile) {
			let frontmatter = this.app.metadataCache.getFileCache(activeFile)?.frontmatter;
			let toolbar: ToolbarSettings | undefined = this.settingsManager.getMappedToolbar(frontmatter, activeFile);
			if (toolbar) await this.updateToolbar(toolbar, activeFile);
		}
	}

	/**
	 * Updates an `active-item` property with the given element ID.
	 * Used by the Note Toolbar API to expose the last activated item.
	 * @param activeItemId UUID of the item that was clicked/tapped; provide nothing to unset.
	 */
	updateActiveToolbarItem(activeItemId?: string): void {
		this.app.saveLocalStorage(LocalVar.ActiveItem, activeItemId ?? '');
	}

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
			this.updateActiveToolbarItem();

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
							const activeFile = this.app.workspace.getActiveFile();
							const toolbar: ToolbarSettings | undefined = this.settingsManager.getToolbar(value);
							if (activeFile) {
								if (toolbar) {
									this.renderToolbarAsMenu(toolbar, activeFile).then(menu => {
										this.showMenuAtElement(menu, this.lastCalloutLink);
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
	 * On opening of the editor menu, check what was selected and add relevant menu options.
	 */
	editorMenuHandler = (menu: Menu, editor: Editor, info: MarkdownView | MarkdownFileInfo) => {
		const selection = editor.getSelection().trim();
		const line = editor.getLine(editor.getCursor().line).trim();
		if (selection.includes('[!note-toolbar') || line.includes('[!note-toolbar')) {
			menu.addItem((item: MenuItem) => {
				item
					.setIcon('info')
					.setTitle(t('import.option-help'))
					.onClick(async () => {
						window.open('https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Note-Toolbar-Callouts', '_blank');
					});
			});
		}
		if (selection.includes('[!note-toolbar')) {
			menu.addItem((item: MenuItem) => {
				item
					.setIcon('import')
					.setTitle(t('import.option-create'))
					.onClick(async () => {
						let toolbar = await importFromCallout(this, selection);
						await this.settingsManager.addToolbar(toolbar);
						await this.commands.openToolbarSettingsForId(toolbar.uuid);
					});
			});
		}
	}

	/**
	 * On opening of the file menu, check and render toolbar as a submenu.
	 * @param menu the file Menu
	 * @param file TFile for link that was clicked on
	 */
	fileMenuHandler = (menu: Menu, file: TFile) => {
		if (this.settings.showToolbarInFileMenu) {
			// don't bother showing in the file menu for the active file
			let activeFile = this.app.workspace.getActiveFile();
			if (activeFile && file !== activeFile) {
				let cache = this.app.metadataCache.getFileCache(file);
				if (cache) {
					let toolbar = this.settingsManager.getMappedToolbar(cache.frontmatter, file);
					if (toolbar) {
						// the submenu UI doesn't appear to work on mobile, render items in menu
						if (Platform.isMobile) {
							toolbar ? this.renderMenuItems(menu, toolbar, file, 1) : undefined;
						}
						else {
							menu.addItem((item: MenuItem) => {
								item
									.setIcon(this.settings.icon)
									.setTitle(toolbar ? toolbar.name : '');
								let subMenu = item.setSubmenu() as Menu;
								toolbar ? this.renderMenuItems(subMenu, toolbar, file) : undefined;
							});
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

		this.app.workspace.trigger("note-toolbar:item-activated", 'test');

		let activeFile = this.app.workspace.getActiveFile();
		const item = this.settingsManager.getToolbarItemById(uuid);

		const eventTarget = event?.target as HTMLElement | null;
		if (eventTarget) this.lastClickedEl = eventTarget.closest('.callout[data-callout="note-toolbar"] span.external-link');

		// update active item attributes in the toolbar, so the API can fetch the right active item
		this.updateActiveToolbarItem(uuid);

		if (this.hasVars(linkHref)) {
			// TODO: expand to also replace vars in labels + tooltips
			linkHref = await this.replaceVars(linkHref, activeFile);
			this.debug('- uri vars replaced: ', linkHref);
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
				this.debug("- openLinkText: ", linkHref, " from: ", activeFilePath);
				let fileOrFolder = this.app.vault.getAbstractFileByPath(linkHref);
				if (fileOrFolder instanceof TFolder) {
					// @ts-ignore
					this.app.internalPlugins.getEnabledPluginById("file-explorer").revealInFolder(fileOrFolder);
				}
				else if (fileOrFolder instanceof TFile && item?.linkAttr.target === 'modal') {
					// this.api.modal(fileOrFolder, { editable: true });
					this.api.modal(fileOrFolder);
				}
				else {
					this.app.workspace.openLinkText(linkHref, activeFilePath, getLinkUiTarget(event) ?? item?.linkAttr.target as PaneType);
				}
				break;
			}
			case ItemType.Menu: {
				const toolbar = this.settingsManager.getToolbar(linkHref);
				if (toolbar) {
					this.renderToolbarAsMenu(toolbar, activeFile).then(menu => {
						let clickedItemEl = (event?.targetNode as HTMLLinkElement).closest('.external-link');
						this.showMenuAtElement(menu, clickedItemEl);
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
				this.updateAdapters();
				if (this.settings.scriptingEnabled) {
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
			if (!(commandId in this.app.commands.commands)) {
				new Notice(t('notice.error-command-not-found', { command: commandId }));
				return;
			}
			try {
				if (target) this.app.workspace.getLeaf(target);
				await this.app.commands.executeCommandById(commandId);
				if (focus === 'editor') this.app.workspace.activeEditor?.editor?.focus();
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
		const adapter = this.getAdapterForItemType(type);
		if (!adapter) {
			new Notice(t('notice.error-scripting-plugin-not-enabled', { plugin: LINK_OPTIONS[type as ScriptType] }));
			return;
		}
		let result;
		switch (type) {
			case ItemType.Dataview:
				result = await this.dvAdapter?.use(scriptConfig);
				break;
			case ItemType.JavaScript:
				result = await this.jsAdapter?.use(scriptConfig);
				break;
			case ItemType.JsEngine:
				result = await this.jsEngineAdapter?.use(scriptConfig);
				break;
			case ItemType.Templater:
				result = await this.tpAdapter?.use(scriptConfig);
				break;
		}
		result ? insertTextAtCursor(this.app, result) : undefined;

		if (!focus || focus === 'editor') {
			this.app.workspace.activeEditor?.editor?.focus();
		}
	}

	async handleLinkUri(linkHref: string, event?: MouseEvent | KeyboardEvent, item?: ToolbarItemSettings) {
		if (isValidUri(linkHref)) {
			let target = getLinkUiTarget(event) ?? item?.linkAttr.target as PaneType | 'modal';

			// @ts-ignore
			const isWebViewerEnabled = this.app.internalPlugins.plugins['webviewer']?.enabled ?? false;
			// @ts-ignore
			const isWebViewerOpeningUrls = this.app.internalPlugins.plugins['webviewer']?.instance?.options?.openExternalURLs ?? false;					
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
					this.api.modal(linkHref, { webpage: true });
				}
				else {
					const leaf = this.app.workspace.getLeaf(target);
					await leaf.setViewState({type: 'webviewer', state: { url: linkHref, navigate: true }, active: true});
				}
			}
			else {
				window.open(linkHref, '_blank');
			}
		}
		else {
			// as fallback, treat it as internal note
			let activeFilePath = this.app.workspace.getActiveFile()?.path ?? "";
			let fileOrFolder = this.app.vault.getAbstractFileByPath(linkHref);
			if (fileOrFolder instanceof TFile && item?.linkAttr.target === 'modal') {
				// this.api.modal(fileOrFolder, { editable: true });
				this.api.modal(fileOrFolder);
			}
			else {
				this.app.workspace.openLinkText(linkHref, activeFilePath, getLinkUiTarget(event) ?? item?.linkAttr.target as PaneType);
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

		const sidebarTab = this.app.workspace.getRightLeaf(false);
		const activeLeaf = this.app.workspace.getActiveViewOfType(MarkdownView);
		const activeEditor = activeLeaf ? activeLeaf.editor : null;
		if (sidebarTab) {
			await sidebarTab.openFile(file);
			switch (toolbarItem?.linkAttr.type) {
				case ItemType.Command: {
					const commandId = toolbarItem?.linkAttr.commandId;
					if (!(commandId in this.app.commands.commands)) {
						new Notice(t('notice.error-command-not-found', { command: commandId }));
						return;
					}
					try {
						await this.app.commands.executeCommandById(commandId);
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
		let tFileOrFolder = folder ? this.app.vault.getAbstractFileByPath(folder) : undefined;
		if (tFileOrFolder instanceof TFolder) {
			// @ts-ignore
			this.app.internalPlugins.getEnabledPluginById("file-explorer").revealInFolder(tFileOrFolder);
		}
		else {
			new Notice(t('notice.error-folder-not-found', { folder: folder }));
		}
	}

	/**
	 * Handles what happens when the ribbon icon is used.
	 * @param event MouseEvent
	 */
	async ribbonMenuHandler(event: MouseEvent) {
		switch (this.settings.ribbonAction) {
			case (RibbonAction.ItemSuggester):
				await this.commands.openQuickTools();
				break;
			case (RibbonAction.ToolbarSuggester):
				await this.commands.openToolbarSuggester();
				break;
			case (RibbonAction.Toolbar): {
				let activeFile = this.app.workspace.getActiveFile();
				if (activeFile) {
					let frontmatter = activeFile ? this.app.metadataCache.getFileCache(activeFile)?.frontmatter : undefined;
					let toolbar: ToolbarSettings | undefined = this.settingsManager.getMappedToolbar(frontmatter, activeFile);
					if (toolbar) {
						this.renderToolbarAsMenu(toolbar, activeFile, this.settings.showEditInFabMenu).then(menu => { 
							menu.showAtPosition(event); 
						});
					}
				}
				break;
			}
		}
	}

	/**
	 * Handles the floating action button.
	 * @param event MouseEvent
	 * @param posAtElement HTMLElement to position the menu at, which might be different from where the event originated
	 */
	async toolbarFabHandler(event: MouseEvent, posAtElement: HTMLElement) {

		// this.debug("toolbarFabHandler: ", event);
		event.preventDefault();

		let activeFile = this.app.workspace.getActiveFile();
		let toolbar: ToolbarSettings | undefined;
		
		// get toolbar to show
		if (activeFile) {
			let frontmatter = activeFile ? this.app.metadataCache.getFileCache(activeFile)?.frontmatter : undefined;
			toolbar = this.settingsManager.getMappedToolbar(frontmatter, activeFile);
		}
		else {
			toolbar = this.settingsManager.getEmptyViewToolbar();
		}

		if (toolbar) {
			// if the default option is set, handle the item
			if (toolbar.defaultItem) {
				const toolbarItem = this.settingsManager.getToolbarItemById(toolbar.defaultItem);
				if (toolbarItem) {
					await this.handleItemLink(toolbarItem, event, activeFile);
				}
				else {
					new Notice(t('setting.position.notice-defaultitem-invalid'));
				}
			}
			else {
				this.renderToolbarAsMenu(toolbar, activeFile, this.settings.showEditInFabMenu).then(menu => { 
					let fabEl = this.getToolbarFabEl();
					if (fabEl) {
						let fabPos = fabEl.getAttribute('data-tbar-position');
						// determine menu orientation based on button position
						let elemRect = posAtElement.getBoundingClientRect();
						let menuPos = { 
							x: (fabPos === PositionType.FabLeft ? elemRect.x : elemRect.x + elemRect.width), 
							y: (elemRect.top - 4),
							overlap: true,
							left: (fabPos === PositionType.FabLeft ? false : true)
						};
						// store menu position for sub-menu positioning
						this.app.saveLocalStorage(LocalVar.MenuPos, JSON.stringify(menuPos));
						menu.showAtPosition(menuPos);
					}
				});
			}
		}

	}

	/**
	 * Handles keyboard navigation within the toolbar.
	 * @param e KeyboardEvent
	 */
	async toolbarKeyboardHandler(e: KeyboardEvent) {

		this.debug("toolbarKeyboardHandler: ", e);

		let itemsUl: HTMLElement | null = this.getToolbarListEl();
		if (itemsUl) {

			// not preventing default from 'Escape' for now (I think this helps)
			e.key ? (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Enter', 'Shift', 'Tab', ' '].includes(e.key) ? e.preventDefault() : undefined) : undefined;

			// remove any items that are not visible (i.e., hidden on desktop/mobile) as they are not navigable
			let items = Array.from(itemsUl.children);
			const visibleItems = items.filter(item => {
				const hasSpan = item.querySelector('span') !== null; // to filter out separators
				const isVisible = window.getComputedStyle(item).getPropertyValue('display') !== 'none';
				return hasSpan && isVisible;
			});
			let currentEl = activeDocument.activeElement?.parentElement as HTMLElement;
			let currentIndex = visibleItems.indexOf(currentEl);

			let key = e.key;
			// need to capture tab in order to move the focus style across the toolbar
			if (e.key === 'Tab') {
				key = e.shiftKey ? 'ArrowLeft' : 'ArrowRight';
			}

			switch (key) {
				case 'ArrowRight':
				case 'ArrowDown': {
					const nextIndex = (currentIndex + 1) % visibleItems.length;
					this.debug(currentEl);
					currentEl.removeClass(ToolbarStyle.ItemFocused);
					visibleItems[nextIndex].addClass(ToolbarStyle.ItemFocused);
					visibleItems[nextIndex].querySelector('span')?.focus();
					break;
				}
				case 'ArrowLeft':
				case 'ArrowUp': {
					const prevIndex = (currentIndex - 1 + visibleItems.length) % visibleItems.length;
					currentEl.removeClass(ToolbarStyle.ItemFocused);
					visibleItems[prevIndex].addClass(ToolbarStyle.ItemFocused);
					visibleItems[prevIndex].querySelector('span')?.focus();
					break;
				}
				case 'Enter':
				case ' ': {
					let activeEl = activeDocument?.activeElement as HTMLElement;
					let selectedItem = this.settingsManager.getToolbarItemById(activeEl?.id);
					if (selectedItem) {
						await this.handleItemLink(selectedItem, e);
					}
					break;
				}
				case 'Escape': {
					// need this implemented for Reading mode, as escape does nothing
					let currentView = this.app.workspace.getActiveViewOfType(MarkdownView);
					let viewMode = currentView?.getMode();
					if (viewMode === 'preview') {
						(activeDocument?.activeElement as HTMLElement).blur();
					}
					// put focus back on element if it's a toolbar item
					if (currentEl.tagName === 'LI' && currentEl.closest('.cg-note-toolbar-callout')) {
						currentEl.addClass(ToolbarStyle.ItemFocused);
					}
					else {
						await this.removeFocusStyle();
					}
					break;
				}
			}

		}

	}

	/**
	 * Removes the focus class from all items in the toolbar.
	 */
	async removeFocusStyle() {
		// remove focus effect from all toolbar items
		let toolbarListEl = this.getToolbarListEl();
		if (toolbarListEl) {
			Array.from(toolbarListEl.children).forEach(element => {
				element.removeClass(ToolbarStyle.ItemFocused);
			});
		}
	}

	/**
	 * On click of an item in the toolbar, we replace any variables that might
	 * be in the URL, and then open it.
	 * @param event MouseEvent
	 */
	async toolbarClickHandler(event: MouseEvent) {

		// this.debug('toolbarClickHandler:', event);

		// allow standard and middle clicks through
		if (event.type === 'click' || (event.type === 'auxclick' && event.button === 1)) {

			let clickedEl = event.currentTarget as HTMLLinkElement;
			let linkHref = clickedEl.getAttribute("href");
	
			if (linkHref != null) {
				
				const itemUuid = clickedEl.id;

				let linkType = clickedEl.getAttribute("data-toolbar-link-attr-type") as ItemType;
				linkType ? (Object.values(ItemType).includes(linkType) ? event.preventDefault() : undefined) : undefined
	
				// this.debug('toolbarClickHandler: ', 'clickedEl: ', clickedEl);
	
				let linkCommandId = clickedEl.getAttribute("data-toolbar-link-attr-commandid");
				
				// remove the focus effect if clicked with a mouse
				if ((event as PointerEvent)?.pointerType === "mouse") {
					clickedEl.blur();
					await this.removeFocusStyle();
				}

				await this.handleLink(itemUuid, linkHref, linkType, linkCommandId, event);
	
			}

		}

	}
	
	/**
	 * Shows a context menu with links to settings/configuration.
	 * @param mouseEvent MouseEvent
	 */
	async toolbarContextMenuHandler(mouseEvent: MouseEvent) {

		mouseEvent.preventDefault();

		// figure out what toolbar we're in
		let toolbarEl = (mouseEvent.target as Element).closest('.cg-note-toolbar-container');
		let toolbarSettings = toolbarEl?.id ? this.settingsManager.getToolbarById(toolbarEl.id) : undefined;
		
		let toolbarItemEl = (mouseEvent.target as Element).closest('.cg-note-toolbar-item');
		let toolbarItem = toolbarItemEl?.id ? this.settingsManager.getToolbarItemById(toolbarItemEl.id) : undefined;

		let contextMenu = new Menu();

		const currentView = this.app.workspace.getActiveViewOfType(ItemView);

		if (toolbarSettings !== undefined) {

			if (Platform.isPhone) {
				contextMenu.addItem((item: MenuItem) => {
					item
						.setTitle(toolbarSettings.name)
						.setIsLabel(true)
				});
			}

			//
			// position
			//

			// workaround: sub-menus only work on non-tablet devices
			let positionMenu = contextMenu;
			if (!Platform.isTablet) {
				contextMenu.addItem((item: MenuItem) => {
					item.setTitle(t('toolbar.menu-position'));
					item.setIcon('move');
					positionMenu = item.setSubmenu() as Menu;
				});
			}

			let currentPosition = this.settingsManager.getToolbarPosition(toolbarSettings);
			if (currentView?.getViewType() === 'empty') {
				if (this.settings.showLaunchpad) {
					if (currentPosition !== PositionType.Top && currentPosition !== PositionType.Props) {
						positionMenu.addItem((item: MenuItem) => {
							item.setTitle(t('setting.position.option-centered'))
								.setIcon('layout-grid')
								.onClick((menuEvent) => this.setPosition(toolbarSettings, PositionType.Props));
						});
					}
				}
				else {
					if (currentPosition !== PositionType.Top) {
						positionMenu.addItem((item: MenuItem) => {
							item.setTitle(t('setting.position.option-top'))
								.setIcon('arrow-up-to-line')
								.onClick((menuEvent) => this.setPosition(toolbarSettings, PositionType.Top));
						});
					}
				}
			} 
			else {
				if (currentPosition !== PositionType.Top) {
					positionMenu.addItem((item: MenuItem) => {
						item.setTitle(t('setting.position.option-top'))
							.setIcon('arrow-up-to-line')
							.onClick((menuEvent) => this.setPosition(toolbarSettings, PositionType.Top));
					});
				}
				if (currentPosition !== PositionType.Props) {
					positionMenu.addItem((item: MenuItem) => {
						item.setTitle(t('setting.position.option-props'))
							.setIcon('arrow-down-narrow-wide')
							.onClick((menuEvent) => this.setPosition(toolbarSettings, PositionType.Props));
					});
				}
				if (currentPosition !== PositionType.Bottom) {
					positionMenu.addItem((item: MenuItem) => {
						item.setTitle(t('setting.position.option-bottom'))
							.setIcon('arrow-down-to-line')
							.onClick((menuEvent) => this.setPosition(toolbarSettings, PositionType.Bottom));
					});
				}
			}

			if (currentPosition !== PositionType.FabLeft) {
				positionMenu.addItem((item: MenuItem) => {
					item.setTitle(t('setting.position.option-fabl'))
						.setIcon('circle-chevron-left')
						.onClick((menuEvent) => this.setPosition(toolbarSettings, PositionType.FabLeft));
				});
			}
			if (currentPosition !== PositionType.FabRight) {
				positionMenu.addItem((item: MenuItem) => {
					item.setTitle(t('setting.position.option-fabr'))
						.setIcon('circle-chevron-right')
						.onClick((menuEvent) => this.setPosition(toolbarSettings, PositionType.FabRight));
				});
			}

			if (Platform.isTablet) contextMenu.addSeparator();

			// style toolbar
			contextMenu.addItem((item: MenuItem) => {
				item
					.setIcon('palette')
					.setTitle(t('toolbar.menu-style'))
					.onClick(async () => {
						if (toolbarSettings) {
							const styleModal = new StyleModal(this.app, this, toolbarSettings);
							styleModal.open();
						}
					});
			});

			// show/hide properties
			const propsEl = this.getPropsEl();
			if ((currentView?.getViewType() === 'markdown') && propsEl) {
				const propsDisplayStyle = getComputedStyle(propsEl).getPropertyValue('display');
				if (propsDisplayStyle === 'none') {
					contextMenu.addItem((item: MenuItem) => {
						item.setTitle(t('toolbar.menu-show-properties'))
							.setIcon('table-properties')
							.onClick(async (menuEvent) => this.commands.toggleProps('show'));
					});
				}
				else {
					contextMenu.addItem((item: MenuItem) => {
						item.setTitle(t('toolbar.menu-hide-properties'))
							.setIcon('table-properties')
							.onClick(async (menuEvent) => this.commands.toggleProps('hide'));
					});
				}
			}

		}
		
		contextMenu.addSeparator();

		// add item
		contextMenu.addItem((item: MenuItem) => {
			item
				.setIcon('plus')
				.setTitle(t('toolbar.menu-add-item'))
				.onClick(async () => {
					const toolbarItemIndex = calcMouseItemIndex(this, mouseEvent);
					if (toolbarSettings) openItemSuggestModal(this, toolbarSettings, 'New', undefined, toolbarItemIndex);
				});
		});

		// edit item
		if (toolbarItem) {
			const activeFile = this.app.workspace.getActiveFile();
			let itemText = await this.getItemText(toolbarItem, activeFile, true);
			contextMenu.addItem((item: MenuItem) => {
				item
					.setIcon('lucide-pen-box')
					.setTitle(itemText 
						? t('toolbar.menu-edit-item', { text: itemText, interpolation: { escapeValue: false } }) 
						: t('toolbar.menu-edit-item_none'))
					.onClick(async () => {
						if (toolbarSettings) {
							const itemModal = new ItemModal(this, toolbarSettings, toolbarItem);
							itemModal.open();
						}
					});
			});

			if (toolbarItem.linkAttr.type === ItemType.Menu) {
				const menuToolbar = this.settingsManager.getToolbar(toolbarItem.link);
				if (menuToolbar) {
					contextMenu.addItem((item: MenuItem) => {
						item
							.setIcon('square-menu')
							.setTitle(t('toolbar.menu-edit-menu', { toolbar: menuToolbar.name, interpolation: { escapeValue: false } }))
							.onClick(async () => {
								const modal = new ToolbarSettingsModal(this.app, this, null, menuToolbar as ToolbarSettings);
								modal.setTitle(t('setting.title-edit-toolbar', { toolbar: menuToolbar.name, interpolation: { escapeValue: false } }));
								modal.open();
							});
					});					
				}
			}
		}

		contextMenu.addSeparator();

		// edit toolbar
		if (toolbarSettings !== undefined) {
			contextMenu.addItem((item: MenuItem) => {
				item
					.setTitle(t('toolbar.menu-edit-toolbar', { toolbar: toolbarSettings?.name, interpolation: { escapeValue: false } }))
					.setIcon('rectangle-ellipsis')
					.onClick((menuEvent) => {
						const modal = new ToolbarSettingsModal(this.app, this, null, toolbarSettings as ToolbarSettings);
						modal.setTitle(t('setting.title-edit-toolbar', { toolbar: toolbarSettings?.name, interpolation: { escapeValue: false } }));
						modal.open();
					});
			  });
		}

		// swap toolbar
		// (if filetype is markdown, and prop != 'tags' so we don't accidentally remove them)
		if ((currentView?.getViewType() === 'markdown') && this.settings.toolbarProp !== 'tags') {
			contextMenu.addItem((item: MenuItem) => {
				item
					.setIcon('repeat')
					.setTitle(t('toolbar.menu-swap-toolbar'))
					.onClick(() => this.commands.swapToolbar());
			});
		}

		if (toolbarSettings !== undefined) {

			contextMenu.addSeparator();

			// share
			contextMenu.addItem((item: MenuItem) => {
				item
					.setIcon('share')
					.setTitle(t('export.label-share'))
					.onClick(async () => {
						if (toolbarSettings) {
							const shareUri = await this.protocolManager.getShareUri(toolbarSettings);
							let shareModal = new ShareModal(this, shareUri, toolbarSettings);
							shareModal.open();
						}
					});
			});

			// copy as callout
			contextMenu.addItem((item: MenuItem) => {
				item
					.setTitle(t('export.label-callout'))
					.setIcon('copy')
					.onClick(async (menuEvent) => {
						if (toolbarSettings) {
							let calloutExport = await exportToCallout(this, toolbarSettings, this.settings.export);
							navigator.clipboard.writeText(calloutExport);
							new Notice(learnMoreFr(t('export.notice-completed'), 'Creating-callouts-from-toolbars'));
						}
					})
				});

			contextMenu.addSeparator();

		}

		contextMenu.addItem((item: MenuItem) => {
			item
			  .setTitle(t('toolbar.menu-toolbar-settings'))
			  .setIcon('gear')
			  .onClick((menuEvent) => {
				  this.commands.openSettings();
			  });
		  });

		navigator.vibrate(50);
		contextMenu.showAtPosition(mouseEvent);

	}

	async setPosition(toolbarSettings: ToolbarSettings | undefined, newPosition: PositionType) {
		if (toolbarSettings?.position) {
			Platform.isDesktop ?
				toolbarSettings.position.desktop = { allViews: { position: newPosition } }
				: toolbarSettings.position.mobile = { allViews: { position: newPosition } };
			toolbarSettings.updated = new Date().toISOString();
			await this.settingsManager.save();
		}
	}

	/*************************************************************************
	 * ELEMENT GETTERS
	 *************************************************************************/

	/**
	 * Gets the active (last activated) item's ID.
	 * @returns last activated toolbar item ID, or null if it can't be found.
	 */
	getActiveItemId(): string | null {
		return this.app.loadLocalStorage(LocalVar.ActiveItem);
	}

	/**
	 * Gets all toolbar elements in the current or provided view.
	 * @returns all toolbar elements in the current view, or an empty NodeList if none found.
	 */
	getAllToolbarEl(view?: ItemView): NodeListOf<HTMLElement> {
		let toolbarViewEl = view ? view.containerEl : this.app.workspace.getActiveViewOfType(ItemView)?.containerEl as HTMLElement;
		toolbarViewEl = toolbarViewEl?.closest('.modal-container .note-toolbar-ui') ?? toolbarViewEl;
		return toolbarViewEl?.querySelectorAll('.cg-note-toolbar-container') as NodeListOf<HTMLElement>;
	}

	/**
	 * Gets the Properties container for the active or provided view.
	 * @param view optional MarkdownView to find the Properties container for; otherwise uses the active view.
	 * @returns HTMLElement or null, if it doesn't exist.
	 */
	getPropsEl(view?: MarkdownView): HTMLElement | null {
		const currentView = view ?? this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!currentView) return null;
		const currentMode = currentView.getMode();
		const currentViewEl = currentView.containerEl as HTMLElement;
		// get the props container based on view mode; fix for toolbar not showing below props in reading mode, in notes with an embed (#392)
		const propertiesContainer = currentViewEl?.querySelector(`.markdown-${currentMode === 'preview' ? 'reading' : 'source'}-view .metadata-container`) as HTMLElement;
		// fix for toolbar rendering in Make.md frames, causing unpredictable behavior (#151)
		if (this.hasPlugin['make-md'] && propertiesContainer?.closest('.mk-frame-edit')) {
			return null;
		}
		return propertiesContainer;
	}

	/**
	 * Gets the note-toolbar-output callout container in the current view, matching the provided metadata string.
	 * @example
	 * > [!note-toolbar-output|META]
	 * @param calloutMeta string to match
	 * @returns HTMLElement or null, if it doesn't exist.
	 */
	getOutputEl(calloutMeta: string): HTMLElement | null {
		const currentViewEl = this.app.workspace.getActiveViewOfType(MarkdownView)?.leaf.containerEl as HTMLElement | null;
		const containerEl = currentViewEl?.querySelector('.callout[data-callout="note-toolbar-output"][data-callout-metadata*="' + calloutMeta + '"]') as HTMLElement;
		// this.debug("getScriptOutputEl:", containerEl);
		return containerEl;
	}

	/**
	 * Get the toolbar element, in the current view.
	 * @param view optional ItemView to find the toolbar container for; otherwise uses the active view.
	 * @returns HTMLElement or null, if it doesn't exist.
	 */
	getToolbarEl(view?: ItemView): HTMLElement | null {
		const toolbarView = view ? view : this.app.workspace.getActiveViewOfType(ItemView);
		const toolbarViewEl = toolbarView?.containerEl as HTMLElement;
		return toolbarViewEl?.querySelector('.cg-note-toolbar-container') as HTMLElement;
	}

	/**
	 * Get the toolbar element's <ul> element, in the current view.
	 * @returns HTMLElement or null, if it doesn't exist.
	 */
	getToolbarListEl(): HTMLElement | null {
		const toolbarEl = this.getToolbarEl();
		return toolbarEl?.querySelector('.callout-content > ul') as HTMLElement;
	}

	/**
	 * Get the floating action button, if it exists.
	 * @returns HTMLElement or null, if it doesn't exist.
	 */
	getToolbarFabEl(): HTMLElement | null {
		let existingToolbarFabEl = activeDocument.querySelector('.cg-note-toolbar-fab-container') as HTMLElement;
		return existingToolbarFabEl;
	}

	/*************************************************************************
	 * TOOLBAR REMOVAL
	 *************************************************************************/

	/**
	 * Remove the toolbar on the active file.
	 */
	async removeActiveToolbar(): Promise<void> {
		const toolbarEl = this.getToolbarEl();
		toolbarEl?.remove();
	}

	/**
	 * Removes toolbar in the current view only if needed: there is no valid toolbar to check against; 
	 * the toolbar names don't match; it's out of date with the settings; or it's not in the correct DOM position. 
	 * @param correctToolbar ToolbarSettings for the toolbar that should be used.
	 * @param view view to check toolbar in; if not provided, uses the active view.
	 * @returns true if the toolbar was removed (or doesn't exist), false otherwise.
	 */
	private removeToolbarIfNeeded(correctToolbar: ToolbarSettings | undefined, view?: ItemView): boolean {

		this.debugGroup('removeToolbarIfNeeded');

		let toolbarRemoved: boolean = false;

		// get toolbar elements in current view, or active view if not provided
		const existingToolbarEls = this.getAllToolbarEl(view);

		this.debug("🛑 removeToolbarIfNeeded: correct:", correctToolbar?.name, "existing:", existingToolbarEls);
		if (existingToolbarEls?.length > 0) {
			// loop over elements and remove any that are not the correct one, ensuring there's only one (or none)
			existingToolbarEls.forEach((toolbarEl) => {
				if (toolbarRemoved) toolbarEl.remove() // remove any other toolbar elements
				else {
					toolbarRemoved = this.checkRemoveToolbarEl(correctToolbar, toolbarEl as HTMLElement, view);
					if (toolbarRemoved) toolbarEl.remove();
				}
			});
			this.debug(existingToolbarEls);
		}
		else {
			this.debug("⛔️ no existing toolbar");
			toolbarRemoved = true;
		}

		this.debugGroupEnd();
		return toolbarRemoved;

	}

	private checkRemoveToolbarEl(correctToolbar: ToolbarSettings | undefined, existingToolbarEl: HTMLElement, view?: ItemView): boolean {

		let removeToolbar = false;
		const toolbarView: ItemView | MarkdownView | null = view ? view : this.app.workspace.getActiveViewOfType(MarkdownView);

		// this.debug('checkRemoveToolbarEl: existing toolbar');
		const existingToolbarName = existingToolbarEl?.getAttribute('data-name');
		const existingToolbarUpdated = existingToolbarEl.getAttribute('data-updated');
		const existingToolbarHasSibling = existingToolbarEl.nextElementSibling;
		const existingToolbarViewMode = existingToolbarEl.getAttribute('data-view-mode');

		// if we don't have a toolbar to check against
		if (!correctToolbar) {
			this.debug("⛔️ toolbar not needed, removing existing toolbar: " + existingToolbarName);
			removeToolbar = true;
		}
		// we need a toolbar BUT the name of the existing toolbar doesn't match
		else if (correctToolbar.name !== existingToolbarName) {
			this.debug("⛔️ removing existing toolbar (name does not match): " + existingToolbarName);
			removeToolbar = true;
		}
		// we need a toolbar BUT it needs to be updated
		else if (correctToolbar.updated !== existingToolbarUpdated) {
			this.debug("⛔️ existing toolbar out of date, removing existing toolbar");
			removeToolbar = true;
		}
		// existingToolbarEl is not in the correct position, in preview mode
		else if (existingToolbarHasSibling?.hasClass('inline-title')) {
			this.debug("⛔️ toolbar not in correct position (sibling is `inline-title`), removing existing toolbar");
			removeToolbar = true;
		}
		// ensure the toolbar is for the correct view mode
		else if (toolbarView instanceof MarkdownView && toolbarView?.getMode() !== existingToolbarViewMode) {
			this.debug("⛔️ toolbar not for correct view mode");
			removeToolbar = true;
		}

		return removeToolbar;

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
	 * Updates status of other installed plugins we're interested in.
	 */
	checkPlugins() {
		// @ts-ignore
		const appPlugins = this.app.plugins.plugins;
		// @ts-ignore
		const internalPlugins = this.app.internalPlugins.plugins;

		Object.keys(this.hasPlugin).forEach(key => {
			this.hasPlugin[key] = key in appPlugins;
		});
		Object.keys(this.isInternalPluginEnabled).forEach(key => {
			this.isInternalPluginEnabled[key] = internalPlugins[key]?.enabled ?? false;
		});
	}

	/**
	 * Returns the Adapter for the provided item type, if the plugin is available and the adapter instance exists.
	 * @param type ItemType to get the Adapter for
	 * @returns the Adapter or undefined
	 */
	getAdapterForItemType(type: ItemType): Adapter | undefined {
		let adapter: Adapter | undefined;
		switch (type) {
			case ItemType.Dataview:
				adapter = this.hasPlugin[ItemType.Dataview] ? this.dvAdapter : undefined;
				break;
			case ItemType.JavaScript:
				adapter = this.jsAdapter; // built-in, doens't rely on plugin
				break;
			case ItemType.JsEngine:
				adapter = this.hasPlugin[ItemType.JsEngine] ? this.jsEngineAdapter : undefined;
				break;
			case ItemType.Templater:
				adapter = this.hasPlugin[ItemType.Templater] ? this.tpAdapter : undefined;
				break;
		}
		return adapter;
	}

	/**
	 * Gets the settings for the toolbar in the current view.
	 * @returns ToolbarSettings for the current toolbar, or undefined if it doesn't exist.
	 */
	getCurrentToolbar(): ToolbarSettings | undefined {
		const noteToolbarEl = this.getToolbarEl();
		const noteToolbarSettings = noteToolbarEl ? this.settingsManager.getToolbarById(noteToolbarEl?.id) : undefined;
		return noteToolbarSettings;
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
			(this.hasVars(toolbarItem.label) ? await this.replaceVars(toolbarItem.label, file) : toolbarItem.label) : 
			(this.hasVars(toolbarItem.tooltip) ? await this.replaceVars(toolbarItem.tooltip, file) : toolbarItem.tooltip);
		if (truncate) itemText = itemText.slice(0, 24);
		return itemText;
	}

	/**
	 * Check if a string has vars {{ }} or expressions (Dataview or Templater)
	 * @param s The string to check.
	 */
	hasVars(s: string): boolean {
		let hasVars = /{{.*?}}/g.test(s);
		if (this.settings.scriptingEnabled) {
			if (!hasVars && this.hasPlugin[ItemType.Dataview]) {
				let prefix = this.dvAdapter?.getSetting('inlineQueryPrefix');
				hasVars = !!prefix && s.trim().startsWith(prefix);
				if (!hasVars) hasVars = s.trim().startsWith('{{dv:');
				// TODO? support dvjs? check for $= JS inline queries
				// if (!hasVars) {
				// 	prefix = this.dvAdapter?.getSetting('inlineJsQueryPrefix');
				// 	hasVars = !!prefix && s.trim().startsWith(prefix);
				// }
			}
			if (!hasVars && this.hasPlugin[ItemType.Templater]) {
				hasVars = s.trim().startsWith('<%');
			}
		}
		return hasVars;
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
			const command: Command = this.app.commands.commands[item.linkAttr.commandId];
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

	/**
	 * Replace variables in the given string of the format {{prefix:variable_name}}, with metadata from the file.
	 * @param s String to replace the variables in.
	 * @param file File with the metadata (name, frontmatter) we'll use to fill in the variables.
	 * @param errorBehavior What to do with errors when they occur when replacing variables.
	 * @returns String with the variables replaced.
	 */
	async replaceVars(s: string, file: TFile | null, errorBehavior: ErrorBehavior = ErrorBehavior.Report): Promise<string> {

		// NOTE_TITLE
		const noteTitle = file?.basename;
		if (noteTitle) s = this.replaceVar(s, 'note_title', noteTitle);
	
		// FILE_PATH
		const filePath = file?.path;
		if (filePath) s = this.replaceVar(s, 'file_path', filePath);
		
		// VAULT_PATH
		if (this.app.vault.adapter instanceof FileSystemAdapter) {
			const vaultPath = this.app.vault.adapter.getBasePath();
			s = this.replaceVar(s, 'vault_path', vaultPath);
		}

		// PROP_ VARIABLES
		// have to get this at run/click-time, as file or metadata may not have changed
		let frontmatter = file ? this.app.metadataCache.getFileCache(file)?.frontmatter : undefined;
		// replace any variable of format {{prop_KEY}} with the value of the frontmatter dictionary with key = KEY
		s = s.replace(/{{\s*(encode:)?\s*prop_(.*?)\s*}}/g, (match, encode, p1) => {
			const key = p1.trim();
			if (frontmatter && frontmatter[key] !== undefined) {
				// regex to remove [[ and ]] and any alias (bug #75), in case an internal link was passed
				// eslint-disable-next-line no-useless-escape
				const linkWrap = /\[\[([^\|\]]+)(?:\|[^\]]*)?\]\]/g;
				// handle the case where the prop might be a list, and convert numbers to strings
				let fm = Array.isArray(frontmatter[key]) ? frontmatter[key].join(',') : String(frontmatter[key]);
				fm = fm ? fm.replace(linkWrap, '$1') : '';
				// FIXME: should this be returning here? or just updating the string?
				return encode ? encodeURIComponent(fm) : fm;
			}
			else {
				return '';
			}
		});

		if (this.settings.scriptingEnabled) {

			// JAVASCRIPT
			if (s.trim().startsWith('{{js:')) {
				s = s.replace(/^{{js:\s*|\s*}}$/g, '');
				let result = await this.jsAdapter?.use({ 
					pluginFunction: (errorBehavior === ErrorBehavior.Ignore) ?  'evaluateIgnore' : 'evaluateInline',
					expression: s
				});
				s = (result && typeof result === 'string') ? result : '';
			}

			// PLUGIN EXPRESSIONS
			if (this.hasPlugin[ItemType.Dataview]) {
				let prefix = this.dvAdapter?.getSetting('inlineQueryPrefix');
				if ((prefix && s.trim().startsWith(prefix)) || s.trim().startsWith('{{dv:')) {
					// strip prefix before evaluation
					if (prefix && s.trim().startsWith(prefix)) s = s.slice(prefix.length);
					if (s.trim().startsWith('{{dv:')) s = s.trim().replace(/^{{dv:\s*|\s*}}$/g, '');
					s = s.trim();
					let result = await this.dvAdapter?.use({
						pluginFunction: (errorBehavior === ErrorBehavior.Ignore) ?  'evaluateIgnore' : 'evaluateInline',
						expression: s
					});
					s = (result && typeof result === 'string') ? result : '';
				}
				// TODO? support for dvjs? example: $=dv.el('p', dv.current().file.mtime)
				// prefix = this.dvAdapter?.getSetting('inlineJsQueryPrefix');
				// if (prefix && s.trim().startsWith(prefix)) {
				// 	s = s.trim().slice(prefix.length); // strip prefix before evaluation
				// 	let result = await this.dvAdapter?.use({ pluginFunction: 'executeJs', expression: s });
				// 	s = result ? result : '';
				// }
			}

			if (this.hasPlugin[ItemType.JsEngine]) {
				if (s.trim().startsWith('{{jse:')) {
					s = s.replace(/^{{jse:\s*|\s*}}$/g, '');
					let result = await this.jsEngineAdapter?.use({ 
						pluginFunction: (errorBehavior === ErrorBehavior.Ignore) ?  'evaluateIgnore' : 'evaluateInline',
						expression: s
					});
					s = (result && typeof result === 'string') ? result : '';
				}
			}

			if (this.hasPlugin[ItemType.Templater]) {
				if (s.trim().startsWith('<%') || s.trim().startsWith('{{tp:')) {
					// strip all prefixes
					if (s.trim().startsWith('{{tp:')) s = s.replace(/^{{tp:\s*|\s*}}$/g, '');
					s = s.trim();
					// add Templater's prefix back in for evaluation
					if (!s.startsWith('<%')) s = '<%' + s;
					if (!s.endsWith('%>')) s += '%>';
					let result = await this.tpAdapter?.use({ 
						pluginFunction: (errorBehavior === ErrorBehavior.Ignore) ? 'parseIgnore' : 'parseInline',
						expression: s
					});
					s = (result && typeof result === 'string') ? result : '';
				}
			}

		}

		return s;

	}

	replaceVar(s: string, varKey: string, replaceText: string): string {
		const regex = new RegExp(`{{\\s*(encode:)?\\s*${varKey}\\s*}}`);
		return s.replace(regex, (_, encode) => encode ? encodeURIComponent(replaceText) : replaceText);
	}

	/**
	 * Checks if the given toolbar uses variables at all.
	 * @param toolbar ToolbarSettings to check for variable usage
	 * @returns true if variables are used in the toolbar; false otherwise
	 */
	toolbarHasVars(toolbar: ToolbarSettings): boolean {
		return toolbar.items.some(item =>
			this.hasVars([item.label, item.tooltip, item.link].join(' '))
		);
	}

	/**
	 * Creates the adapters if scripting, and the plugins, are enabled; otherwise disables all adapters.
	 */
	updateAdapters() {
		if (this.settings.scriptingEnabled) {
			this.checkPlugins(); // update status of enabled plugins
			this.dvAdapter = this.hasPlugin[ItemType.Dataview] ? (this.dvAdapter || new DataviewAdapter(this)) : undefined;
			this.jsAdapter = this.jsAdapter || new JavaScriptAdapter(this);
			this.jsEngineAdapter = this.hasPlugin[ItemType.JsEngine] ? (this.jsEngineAdapter || new JsEngineAdapter(this)) : undefined;
			this.tpAdapter = this.hasPlugin[ItemType.Templater] ? (this.tpAdapter || new TemplaterAdapter(this)) : undefined;
		}
		else {
			this.dvAdapter?.disable();
			this.jsAdapter?.disable();
			this.jsEngineAdapter?.disable();
			this.tpAdapter?.disable();
			this.dvAdapter = undefined;
			this.jsAdapter = undefined;
			this.jsEngineAdapter = undefined;
			this.tpAdapter = undefined;
		}
	}

}