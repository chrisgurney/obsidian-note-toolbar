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
import { Platform, Plugin, WorkspaceLeaf } from 'obsidian';
import ProtocolManager from 'Protocol/ProtocolManager';
import { NoteToolbarSettings, t, VIEW_TYPE_GALLERY, VIEW_TYPE_HELP, VIEW_TYPE_TIP, VIEW_TYPE_WHATS_NEW } from 'Settings/NoteToolbarSettings';
import SettingsIcons from 'Settings/SettingsIcons';
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
			SettingsIcons.register();

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
		/* eslint-disable no-console */
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
		/* eslint-enable no-console */
	}

	// #endregion

}