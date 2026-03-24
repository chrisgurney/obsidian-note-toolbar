import NoteToolbarPlugin from "main";
import { Editor, ItemView, MarkdownFileInfo, MarkdownView, MarkdownViewModeType, Menu, Platform, TFile } from "obsidian";
import { LocalVar } from "Settings/NoteToolbarSettings";
import { getViewId } from "Utils/Utils";
import EditorMenu from "../Toolbar/EditorMenu";
import FileMenu from "../Toolbar/FileMenu";
import RibbonMenu from "../Toolbar/RibbonMenu";
import { TbarData } from "../Toolbar/ToolbarRenderer";

/**
 * Handles Obsidian changes registered with Obsidian's `registerEvent()`.
 */
export default class WorkspaceListeners {

	private editorMenu: EditorMenu;
	private fileMenu: FileMenu;
	private ribbonMenu: RibbonMenu;

    workspacesPlugin: { instance: any; enabled: boolean } | null = null;
    
	// track to reduce unneccessary re-renders 
	activeWorkspace: string;
	lastFileOpenedOnLayoutChange: TFile | null | undefined;
	lastViewModeOnLayoutChange: MarkdownViewModeType | undefined;

	// TODO: remove if not needed
	// __onNoteChange__leafFiles: { [id: string]: TFile | null } = {};
	// __onNoteChange__leafCallbacks: { [id: string]: (oldFile: TFile | null, newFile: TFile) => void } = {};
	// __onNoteChange__eventCreated: boolean = false;

    constructor(
        private ntb: NoteToolbarPlugin
    ) {
		this.editorMenu = new EditorMenu(ntb);
		this.fileMenu = new FileMenu(ntb);
		this.ribbonMenu = new RibbonMenu(ntb);
	}

	register() {
		this.ntb.registerEvent(this.ntb.app.workspace.on('file-open', this.onFileOpen));
		this.ntb.registerEvent(this.ntb.app.workspace.on('active-leaf-change', this.onLeafChange));
		this.ntb.registerEvent(this.ntb.app.workspace.on('layout-change', this.onLayoutChange));
		this.ntb.registerEvent(this.ntb.app.workspace.on('css-change', this.onCssChange));

		// add items to menus
		this.ntb.registerEvent(this.ntb.app.workspace.on('file-menu', this.onFileMenu));
		this.ntb.registerEvent(this.ntb.app.workspace.on('editor-menu', this.onEditorMenu));
	}

	/**
	 * Track changes to the theme (for better CSS overrides when rendering toolbars).
	 */
	onCssChange = async () => {
		// this.ntb.debug('===== CSS-CHANGE =====');
		// update the global theme attribute (for styling)
		activeDocument.body.setAttr('data-ntb-csstheme', this.ntb.app.vault.getConfig('cssTheme'));
	};

	/**
	 * On opening of the editor menu, check what was selected and add relevant menu options.
	 */
	onEditorMenu = async (menu: Menu, editor: Editor, view: MarkdownView | MarkdownFileInfo) => {
		await this.editorMenu.render(menu, editor, view);
	}

	/**
	 * On opening of the file menu, check and render toolbar as a submenu.
	 * @param menu the file Menu
	 * @param file TFile for link that was clicked on
	 */
	onFileMenu = (menu: Menu, file: TFile) => {
		this.fileMenu.render(menu, file);
	}

	/**
	 * On opening of a file, track recent files that have been opened (for more helpful file select UI).
	 * @param file TFile that was opened.
	 */
	onFileOpen = async (file: TFile) => {
		// this.ntb.debug('FILE-OPEN: updating recent file list:', file?.name);
		// update list of the most recently opened files
		if (file) await this.ntb.settingsManager.updateRecentList(LocalVar.RecentFiles, file.path);
	};

	/**
	 * On layout changes, render and update toolbars as necessary.
	 */
	onLayoutChange = async () => {

		this.ntb.debug('===== LAYOUT-CHANGE =====');

		const currentView = this.ntb.app.workspace.getActiveViewOfType(ItemView);

		// if workspace changed, render all toolbars, otherwise just render the toolbar for the active view (#367)
		// on phones we can just render for the active view
		const workspace = this.workspacesPlugin?.instance.activeWorkspace;
		if (!Platform.isPhone && workspace !== this.activeWorkspace) {
			await this.ntb.render.renderForAllLeaves();
			this.activeWorkspace = workspace;
		}
		else {
			if (currentView) await this.ntb.render.renderForView(currentView);
		}

		// listen to scroll events for floating toolbars
		// (layout change is fired when switching between reading and editing modes) 
		this.ntb.listeners.view.register();

		// const toolbarEl = this.getToolbarEl();
		// const currentView = this.ntb.app.workspace.getActiveViewOfType(MarkdownView);
		// const currentViewId = getViewId(currentView);
		// const currentViewMode = currentView?.getMode();
		// this.ntb.debug('===== LAYOUT-CHANGE ===== ', currentViewId, currentView, currentViewMode);

		// // show empty view or other data type toolbar
		// if (!currentView) {
		// 	await this.ntb.renderToolbarForView();
		// 	return;
		// }

		// // if we're in a popover, do nothing
		// if (currentView?.containerEl.closest('popover')) return;

		// // exit if the view has already been handled, after updating the toolbar
		// if (toolbarEl && currentViewId && this.activeViewIds.contains(currentViewId)) {
		// 	this.ntb.debug('LAYOUT-CHANGE: SKIPPED RENDERING: VIEW ALREADY HANDLED');
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
		// 		this.ntb.app.workspace.onLayoutReady(debounce(async () => {
		// 			// keeping just in case:
		// 			// the props position is the only case where we have to reset the toolbar, due to re-rendering order of the editor
		// 			// const toolbarPos = toolbarEl?.getAttribute('data-tbar-position');
		// 			// toolbarPos === 'props' ? this.removeActiveToolbar() : undefined;
		// 			this.ntb.debug("LAYOUT-CHANGE: renderActiveToolbar");
		// 			// this.updateActiveViewIds();
		// 			await this.ntb.renderToolbarForView();
		// 		}, (currentViewMode === "preview" ? 200 : 0)));
		// 		break;
		// 	default:
		// 		return;
		// }
	};

	/**
	 * On leaf changes, delete, check and render toolbar if necessary. 
	 */
	onLeafChange = async (leaf: any) => {
		let renderToolbar = false;
		// FIXME? what if there's more than one toolbar?
		let toolbarEl = this.ntb.el.getToolbarEl();
		let currentView = this.ntb.utils.getActiveView();

		const viewId = getViewId(currentView);
		this.ntb.debug('===== LEAF-CHANGE ===== ', viewId);

		// listen to scroll events for floating toolbars
		this.ntb.listeners.view.register();

		// update the active toolbar if its configuration changed
		if (toolbarEl) {
			let activeToolbar = this.ntb.settingsManager.getToolbarById(toolbarEl.id);
			if (activeToolbar && (activeToolbar.updated !== toolbarEl.getAttribute(TbarData.Updated))) {
				renderToolbar = true;
			}
		}

		// exit if the view has already been handled, after updating the toolbar
		if (!renderToolbar && !Platform.isPhone && viewId && this.ntb.render.activeViewIds.contains(viewId)) {
			this.ntb.debug('LEAF-CHANGE: SKIPPED RENDERING: VIEW ALREADY HANDLED');
			this.ntb.render.updateActive();
			return;
		};

		if (currentView) {
			// check for editing or reading mode
			// if (currentView instanceof MarkdownView) {
			// 	renderToolbar = ['source', 'preview'].includes((currentView as MarkdownView).getMode());
			// }
			if (!renderToolbar) renderToolbar = this.ntb.utils.checkToolbarForItemView(currentView);
		}

		if (renderToolbar) {
			this.ntb.debug("LEAF-CHANGE: renderForView...");
			// this.removeActiveToolbar();
			// don't seem to need a delay before rendering for leaf changes
			await this.ntb.render.renderForView();
		}
	}

	/**
	 * Handles what happens when the ribbon icon is used.
	 * @param event MouseEvent
	 */
	onRibbonMenu = async (event: MouseEvent) => {
		await this.ribbonMenu.render(event);
	}

}