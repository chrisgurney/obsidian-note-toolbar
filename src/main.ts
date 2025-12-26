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
import { addIcon, Platform, Plugin, WorkspaceLeaf } from 'obsidian';
import ProtocolManager from 'Protocol/ProtocolManager';
import { NoteToolbarSettings, t, VIEW_TYPE_GALLERY, VIEW_TYPE_HELP, VIEW_TYPE_TIP, VIEW_TYPE_WHATS_NEW } from 'Settings/NoteToolbarSettings';
import SettingsManager from 'Settings/SettingsManager';
import NoteToolbarSettingTab from 'Settings/UI/NoteToolbarSettingTab';
import ChangeListener from 'Toolbar/ChangeListener';
import TextToolbar, { TextToolbarClass } from 'Toolbar/TextToolbar';
import ToolbarElementHelper from 'Toolbar/ToolbarElementHelper';
import ToolbarEventHandler from 'Toolbar/ToolbarEventHandler';
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
	
	el: ToolbarElementHelper;
	events: ToolbarEventHandler;
	items: ToolbarItemHandler;
	listeners: ChangeListener;
	render: ToolbarRenderer;
	vars: VariableResolver;

	textToolbar: ViewPlugin<TextToolbarClass> | null = null;

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
		this.listeners = new ChangeListener(this);
		this.render = new ToolbarRenderer(this);
		this.utils = new PluginUtils(this);
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
		
			// has to be done on plugin load
			// @ts-expect-error - internalPlugins is not in the public App type
			const internalPlugins = this.app.internalPlugins;
			this.listeners.workspacesPlugin = internalPlugins.getPluginById('workspaces');

			// add icons specific to the plugin
			addIcon('note-toolbar-empty', '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" class="svg-icon note-toolbar-empty”></svg>');
			addIcon('note-toolbar-none', '<svg xmlns="http://www.w3.org/2000/svg" width="0" height="24" viewBox="0 0 0 24" fill="none" class="svg-icon note-toolbar-none"></svg>');
			addIcon('note-toolbar-separator', '<path d="M23.4444 35.417H13.7222C8.35279 35.417 4 41.6988 4 44V55.5C4 57.8012 8.35279 64.5837 13.7222 64.5837H23.4444C28.8139 64.5837 33.1667 57.8012 33.1667 55.5L33.1667 44C33.1667 41.6988 28.8139 35.417 23.4444 35.417Z" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><path d="M86.4444 35.417H76.7222C71.3528 35.417 67 41.6988 67 44V55.5C67 57.8012 71.3528 64.5837 76.7222 64.5837H86.4444C91.8139 64.5837 96.1667 57.8012 96.1667 55.5L96.1667 44C96.1667 41.6988 91.8139 35.417 86.4444 35.417Z" stroke="currentColor" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M49.8333 8.33301V91.6663" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>');	

			// render the initial toolbar
			await this.render.renderForAllLeaves();

			// add the settings UI
			this.addSettingTab(new NoteToolbarSettingTab(this));

			this.registerEvent(this.app.workspace.on('file-open', this.listeners.onFileOpen));
			this.registerEvent(this.app.workspace.on('active-leaf-change', this.listeners.onLeafChange));
			this.registerEvent(this.app.metadataCache.on('changed', this.listeners.onMetadataChange));
			this.registerEvent(this.app.workspace.on('layout-change', this.listeners.onLayoutChange));
			this.registerEvent(this.app.workspace.on('css-change', this.listeners.onCssChange));

			// monitor files being renamed to update menu items
			this.registerEvent(this.app.vault.on('rename', this.listeners.onFileRename));

			// Note Toolbar Callout click handlers
			this.registerEvent(this.app.workspace.on('window-open', (win) => {
				this.registerDomEvent(win.doc, 'click', (e: MouseEvent) => {
					this.items.calloutLinkHandler(e);
				});
			}));
			this.registerDomEvent(activeDocument, 'click', (e: MouseEvent) => {
				const target = e.target as HTMLElement;
				if (!target.matches('.cg-note-toolbar-container')) {
					this.render.removeFocusStyle();
				}
				this.items.calloutLinkHandler(e);
			});
			
			// track mouse position for Editor menu toolbar placement
			this.registerDomEvent(activeDocument, 'mousemove', (e: MouseEvent) => {
				this.render.mouseX = e.clientX;
				this.render.mouseY = e.clientY;
			});

			// add items to menus, when needed
			this.registerEvent(this.app.workspace.on('file-menu', this.events.fileMenuHandler));
			this.registerEvent(this.app.workspace.on('editor-menu', this.events.editorMenuHandler));

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

			// set up the text toolbar if enabled; this might be required for backwards compat (#451)
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
		if (this.render.textToolbarEl) this.render.textToolbarEl.remove();
		// remove the global API
		if (window["ntb"]) delete window["ntb"];

		this.debug('UNLOADED');

	}
 
    // *****************************************************************************
    // #region DEBUGGING
    // *****************************************************************************

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

	// #endregion

}