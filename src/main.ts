import { ViewPlugin } from '@codemirror/view';
import AdapterManager from 'Adapters/AdapterManager';
import INoteToolbarApi from "Api/INoteToolbarApi";
import NoteToolbarApi from 'Api/NoteToolbarApi';
import CommandManager from 'Commands/CommandManager';
import GalleryManager from 'Gallery/GalleryManager';
import GalleryView from 'Gallery/GalleryView';
import HelpView from 'Help/HelpView';
import TipView from 'Help/TipView';
import WhatsNewView from 'Help/WhatsNewView';
import CalloutListeners from 'Listeners/CalloutListeners';
import DocumentListeners from 'Listeners/DocumentListeners';
import MetadataListeners from 'Listeners/MetadataListeners';
import VaultListeners from 'Listeners/VaultListeners';
import ViewListeners from 'Listeners/ViewListeners';
import WindowListeners from 'Listeners/WindowListeners';
import WorkspaceListeners from 'Listeners/WorkspaceListeners';
import { addIcon, Platform, Plugin, WorkspaceLeaf } from 'obsidian';
import ProtocolManager from 'Protocol/ProtocolManager';
import { NoteToolbarSettings, t, VIEW_TYPE_GALLERY, VIEW_TYPE_HELP, VIEW_TYPE_TIP, VIEW_TYPE_WHATS_NEW } from 'Settings/NoteToolbarSettings';
import SettingsManager from 'Settings/SettingsManager';
import NoteToolbarSettingTab from 'Settings/UI/NoteToolbarSettingTab';
import CalloutHandler from 'Toolbar/CalloutHandler';
import TextToolbar, { TextToolbarClass } from 'Toolbar/TextToolbar';
import ToolbarElementHelper from 'Toolbar/ToolbarElementHelper';
import ToolbarHandler from 'Toolbar/ToolbarHandler';
import ToolbarItemHandler from 'Toolbar/ToolbarItemHandler';
import ToolbarRenderer from 'Toolbar/ToolbarRenderer';
import VariableResolver from 'Toolbar/VariableResolver';
import HotkeyHelper from 'Utils/Hotkeys';
import PluginUtils from 'Utils/Utils';

export default class NoteToolbarPlugin extends Plugin {

	adapters: AdapterManager;
	api: INoteToolbarApi<any>;
	commands: CommandManager;
	hotkeys: HotkeyHelper;
	gallery: GalleryManager;
	protocolManager: ProtocolManager;
	settings: NoteToolbarSettings;	
	settingsManager: SettingsManager;
	utils: PluginUtils;
	
	callouts: CalloutHandler;
	el: ToolbarElementHelper;
	items: ToolbarItemHandler;
	render: ToolbarRenderer;
	toolbars: ToolbarHandler;
	vars: VariableResolver;

	listeners: {
		callout: CalloutListeners;
		document: DocumentListeners;
		metadata: MetadataListeners;
		vault: VaultListeners;
		view: ViewListeners;
		window: WindowListeners;
		workspace: WorkspaceListeners;
	};

	textToolbar: ViewPlugin<TextToolbarClass> | null = null;

	debug!: (...args: any[]) => void;
	debugGroup!: (...args: any[]) => void;
	debugGroupEnd!: (...args: any[]) => void;

	/**
	 * When this plugin is loaded (e.g., on Obsidian startup, or plugin is enabled in settings):
	 * adds listeners, settings, and renders the toolbar for the active file.
	 */
	async onload() {

		this.adapters = new AdapterManager(this);

		// initialize managers + helpers
		this.callouts = new CalloutHandler(this);
		this.el = new ToolbarElementHelper(this);
		this.items = new ToolbarItemHandler(this);
		this.render = new ToolbarRenderer(this);
		this.toolbars = new ToolbarHandler(this);
		this.utils = new PluginUtils(this);
		this.vars = new VariableResolver(this);

		// listeners
		this.listeners = {
			callout: new CalloutListeners(this),
			document: new DocumentListeners(this),
			metadata: new MetadataListeners(this),
			vault: new VaultListeners(this),
			view: new ViewListeners(this),
			window: new WindowListeners(this),
			workspace: new WorkspaceListeners(this),
		}

		// load the settings
		this.settingsManager = new SettingsManager(this);
		await this.settingsManager.load();

		// add the ribbon icon, on phone only (seems redundant to add on desktop + tablet)
		if (Platform.isPhone) {
			this.addRibbonIcon(this.settings.icon, t('plugin.note-toolbar'), (event: MouseEvent) => this.listeners.workspace.onRibbonMenu(event));
		}

		// initialize managers + helpers that require settings to be loaded
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
		
			// has to be done on plugin load
			// @ts-expect-error - internalPlugins is not in the public App type
			const internalPlugins = this.app.internalPlugins;
			this.listeners.workspace.workspacesPlugin = internalPlugins.getPluginById('workspaces');

			// add icons specific to the plugin
			addIcon('note-toolbar-empty', '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" class="svg-icon note-toolbar-empty”></svg>');
			addIcon('note-toolbar-none', '<svg xmlns="http://www.w3.org/2000/svg" width="0" height="24" viewBox="0 0 0 24" fill="none" class="svg-icon note-toolbar-none"></svg>');
			addIcon('note-toolbar-separator', '<path d="M23.4444 35.417H13.7222C8.35279 35.417 4 41.6988 4 44V55.5C4 57.8012 8.35279 64.5837 13.7222 64.5837H23.4444C28.8139 64.5837 33.1667 57.8012 33.1667 55.5L33.1667 44C33.1667 41.6988 28.8139 35.417 23.4444 35.417Z" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><path d="M86.4444 35.417H76.7222C71.3528 35.417 67 41.6988 67 44V55.5C67 57.8012 71.3528 64.5837 76.7222 64.5837H86.4444C91.8139 64.5837 96.1667 57.8012 96.1667 55.5L96.1667 44C96.1667 41.6988 91.8139 35.417 86.4444 35.417Z" stroke="currentColor" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M49.8333 8.33301V91.6663" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>');	
			addIcon('note-toolbar-pen-book', '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="7"><path d="m69.9167 82.583h23.3333"/><path d="m93.7575 41.2011c1.5421-1.5416 2.4085-3.6328 2.4088-5.8133s-.8657-4.2719-2.4073-5.8139c-1.5417-1.5421-3.6328-2.4086-5.8134-2.4089-2.1805-.0002-4.2719.8657-5.8139 2.4074l-38.9259 38.9346c-.6772.6752-1.178 1.5065-1.4583 2.4208l-3.8529 12.6933c-.0754.2523-.0811.5202-.0165.7754.0646.2553.1971.4882.3834.6742s.4195.3181.6748.3823.5232.0581.7754-.0177l12.6962-3.85c.9134-.2778 1.7447-.7756 2.4209-1.4496z"/><path d="m39 26v22.4775"/><path d="m72.9749 20.1848c0-1.25 0-5.9348 0-7.1597-.6564-.6564-1.5467-1.0251-2.4749-1.0251h-17.5c-3.713 0-7.274 1.475-9.8995 4.1005s-4.1005 6.1865-4.1005 9.8995c0-3.713-1.475-7.274-4.1005-9.8995s-6.1865-4.1005-9.8995-4.1005h-17.5c-.92826 0-1.8185.3687-2.47487 1.0251-.65638.6564-1.02513 1.5466-1.02513 2.4749v45.5c0 .9283.36875 1.8185 1.02513 2.4749.65637.6564 1.54661 1.0251 2.47487 1.0251h21"/></g>');

			// render the initial toolbar
			if (Platform.isPhone) {
				await this.render.renderForView();
			}
			else {
				await this.render.renderForAllLeaves();
			}

			// add the settings UI
			this.addSettingTab(new NoteToolbarSettingTab(this));

			// setup listeners
			this.listeners.workspace.register();
			this.listeners.callout.register();
			this.listeners.metadata.register();
			this.listeners.vault.register();
			this.listeners.view.register();
			this.listeners.document.register();	
			this.listeners.window.register();

			// add commands
			this.commands.addCommands();

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

			// register the text toolbar if enabled; this might be required for backwards compat (#451)
			if (this.settings.textToolbar) {
				this.textToolbar = TextToolbar(this);
				this.registerEditorExtension(this.textToolbar);
			}

		});

	}

	/**
	 * Cleanup when the plugin is unloaded (e.g., disabled in settings, or Obsidian is restarted).
	 */
	onunload() {

		// remove any toolbars
		this.el.getAllToolbarEl().forEach((toolbarEl) => { toolbarEl.remove(); });
		if (this.render.floatingToolbarEl) this.render.floatingToolbarEl.remove();
		// remove the global API
		if (window["ntb"]) delete window["ntb"];

		this.debug('UNLOADED');

	}
 
    // *****************************************************************************
    // #region DEBUGGING
    // *****************************************************************************

	/** 
	 * Toggle debugging based on user setting.
	 */
	toggleDebugging() {
		// setup debug functions, preserving line numbers
		if (this.settings.debugEnabled) {
			this.debug = console.debug.bind(console);
			this.debugGroup = console.group.bind(console);
			this.debugGroupEnd = console.groupEnd.bind(console);
		}
		// otherwise do nothing when debug functions are called
		else {
			this.debug = (...args: any[]) => {};
			this.debugGroup = (...args: any[]) => {};
			this.debugGroupEnd = (...args: any[]) => {};
		}
	}

	// #endregion

}