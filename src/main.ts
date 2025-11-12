import { CachedMetadata, Editor, FrontMatterCache, ItemView, MarkdownFileInfo, MarkdownView, MarkdownViewModeType, Menu, MenuItem, MenuPositionDef, Notice, Platform, Plugin, TFile, TFolder, WorkspaceLeaf, addIcon, debounce, getIcon, setIcon, setTooltip } from 'obsidian';
import { NoteToolbarSettingTab } from 'Settings/UI/NoteToolbarSettingTab';
import { ToolbarSettings, NoteToolbarSettings, PositionType, ItemType, CalloutAttr, t, ToolbarItemSettings, ToolbarStyle, RibbonAction, VIEW_TYPE_WHATS_NEW, ScriptConfig, SCRIPT_ATTRIBUTE_MAP, DefaultStyleType, MobileStyleType, VIEW_TYPE_GALLERY, LocalVar, PropsState, VIEW_TYPE_HELP, VIEW_TYPE_TIP } from 'Settings/NoteToolbarSettings';
import { calcComponentVisToggles, calcItemVisToggles, isValidUri, putFocusInMenu, getViewId, hasStyle, checkToolbarForItemView, getActiveView, calcMouseItemIndex } from 'Utils/Utils';
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
import StyleModal from 'Settings/UI/Modals/StyleModal';
import ItemModal from 'Settings/UI/Modals/ItemModal';
import GalleryManager from 'Gallery/GalleryManager';
import { HotkeyHelper } from 'Utils/Hotkeys';
import { GalleryView } from 'Gallery/GalleryView';
import { HelpView } from 'Help/HelpView';
import { TipView } from 'Help/TipView';
import { TextToolbarView } from 'Toolbar/TextToolbarView';
import { Rect } from '@codemirror/view';
import AdapterManager from 'Adapters/AdapterManager';
import ToolbarElementHelper from 'Toolbar/ToolbarElementHelper';
import VariableResolver from 'Toolbar/VariableResolver';
import ToolbarItemHandler from 'Toolbar/ToolbarItemHandler';
import ToolbarRenderer from 'Toolbar/ToolbarRenderer';

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
	vars: VariableResolver;
	items: ToolbarItemHandler;
	render: ToolbarRenderer;

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
		this.items = new ToolbarItemHandler(this);
		this.render = new ToolbarRenderer(this);
		this.vars = new VariableResolver(this);

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
							toolbar ? this.render.renderMenuItems(menu, toolbar, file, 1) : undefined;
						}
						else {
							menu.addItem((item: MenuItem) => {
								item
									.setIcon(this.settings.icon)
									.setTitle(toolbar ? toolbar.name : '');
								let subMenu = item.setSubmenu() as Menu;
								toolbar ? this.render.renderMenuItems(subMenu, toolbar, file) : undefined;
							});
						}
					}
				}
			}
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
						this.render.renderToolbarAsMenu(toolbar, activeFile, this.settings.showEditInFabMenu).then(menu => { 
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
					await this.items.handleItemLink(toolbarItem, event, activeFile);
				}
				else {
					new Notice(t('setting.position.notice-defaultitem-invalid'));
				}
			}
			else {
				this.render.renderToolbarAsMenu(toolbar, activeFile, this.settings.showEditInFabMenu).then(menu => { 
					let fabEl = this.el.getToolbarFabEl();
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
					else {
						// for Position.TabBar
						menu.showAtMouseEvent(event);
					}
				});
			}
		}

	}

	/**
	 * Handles keyboard navigation within the toolbar.
	 * @param e KeyboardEvent
	 * @param isTextToolbar set to true if this is for the text toolbar.
	 */
	async toolbarKeyboardHandler(e: KeyboardEvent, isTextToolbar: boolean = false) {

		this.debugGroup("toolbarKeyboardHandler");

		let itemsUl: HTMLElement | null = this.el.getToolbarListEl(isTextToolbar);
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
						await this.items.handleItemLink(selectedItem, e);
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

		this.debugGroupEnd();

	}

	/**
	 * Removes the focus class from all items in the toolbar.
	 */
	async removeFocusStyle() {
		// remove focus effect from all toolbar items
		let toolbarListEl = this.el.getToolbarListEl();
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

				await this.items.handleLink(itemUuid, linkHref, linkType, linkCommandId, event);
	
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

		// figure out what item was clicked on (if any)
		let toolbarItemEl: Element | null = null;
		if (mouseEvent.target instanceof HTMLLIElement) {
			toolbarItemEl = (mouseEvent.target as Element).querySelector('.cg-note-toolbar-item');
		}
		else {
			toolbarItemEl = (mouseEvent.target as Element).closest('.cg-note-toolbar-item');
		}
		let toolbarItem = toolbarItemEl?.id ? this.settingsManager.getToolbarItemById(toolbarItemEl.id) : undefined;

		let contextMenu = new Menu();

		const currentView = this.app.workspace.getActiveViewOfType(ItemView);
		const currentPosition = toolbarSettings ? this.settingsManager.getToolbarPosition(toolbarSettings) : undefined;
		const isTextToolbar = toolbarSettings ? (this.settings.textToolbar === toolbarSettings.uuid) : false;

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

			if (!isTextToolbar) {

				// workaround: sub-menus only work on non-tablet devices
				let positionMenu = contextMenu;
				if (!Platform.isTablet) {
					contextMenu.addItem((item: MenuItem) => {
						item.setTitle(t('toolbar.menu-position'));
						item.setIcon('move');
						positionMenu = item.setSubmenu() as Menu;
					});
				}

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
					if (currentPosition !== PositionType.TabBar) {
						positionMenu.addItem((item: MenuItem) => {
							item.setTitle(t('setting.position.option-tabbar'))
								.setIcon('panel-top')
								.onClick((menuEvent) => this.setPosition(toolbarSettings, PositionType.TabBar));
						});
					}
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

			}

			//
			// style toolbar
			//

			if (currentPosition !== PositionType.TabBar) {
				contextMenu.addItem((item: MenuItem) => {
					item
						.setIcon('palette')
						.setTitle(t('toolbar.menu-style'))
						.onClick(async () => {
							if (toolbarSettings) {
								const styleModal = new StyleModal(this, toolbarSettings);
								styleModal.open();
							}
						});
				});
			}

			//
			// show/hide properties
			//

			const propsEl = this.el.getPropsEl();
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

		//
		// add item
		//

		contextMenu.addItem((item: MenuItem) => {
			item
				.setIcon('plus')
				.setTitle(t('toolbar.menu-add-item'))
				.onClick(async () => {
					const toolbarItemIndex = calcMouseItemIndex(this, mouseEvent);
					if (toolbarSettings) openItemSuggestModal(this, toolbarSettings, 'New', undefined, toolbarItemIndex);
				});
		});

		//
		// edit item
		//

		if (toolbarItem) {
			const activeFile = this.app.workspace.getActiveFile();
			let itemText = await this.items.getItemText(toolbarItem, activeFile, true);
			if (!itemText && toolbarItem.linkAttr.type === ItemType.Separator) itemText = t('setting.item.option-separator');
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

		//
		// edit toolbar
		//

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

		//
		// swap toolbar
		//

		// (if filetype is markdown, and prop != 'tags' so we don't accidentally remove them)
		if (!isTextToolbar && currentView?.getViewType() === 'markdown' && this.settings.toolbarProp !== 'tags') {
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
			  .onClick(async (menuEvent) => {
				  await this.commands.openSettings();
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
	 * TOOLBAR REMOVAL
	 *************************************************************************/

	/**
	 * Remove the toolbar on the active file.
	 */
	async removeActiveToolbar(): Promise<void> {
		const toolbarEl = this.el.getToolbarEl();
		toolbarEl?.remove();
	}

	/**
	 * Removes toolbar in the current view only if needed: there is no valid toolbar to check against; 
	 * the toolbar names don't match; it's out of date with the settings; or it's not in the correct DOM position. 
	 * @param correctToolbar ToolbarSettings for the toolbar that should be used.
	 * @param view view to check toolbar in; if not provided, uses the active view.
	 * @returns true if the toolbar was removed (or doesn't exist), false otherwise.
	 */
	removeToolbarIfNeeded(correctToolbar: ToolbarSettings | undefined, view?: ItemView): boolean {

		this.debugGroup('removeToolbarIfNeeded');

		let toolbarRemoved: boolean = false;

		// get toolbar elements in current view, or active view if not provided
		const existingToolbarEls = this.el.getAllToolbarEl(view);

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
	 * Gets the settings for the toolbar in the current view.
	 * @returns ToolbarSettings for the current toolbar, or undefined if it doesn't exist.
	 */
	getCurrentToolbar(): ToolbarSettings | undefined {
		const noteToolbarEl = this.el.getToolbarEl();
		const noteToolbarSettings = noteToolbarEl ? this.settingsManager.getToolbarById(noteToolbarEl?.id) : undefined;
		return noteToolbarSettings;
	}

}