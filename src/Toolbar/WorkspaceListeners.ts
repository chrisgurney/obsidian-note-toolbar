import NoteToolbarPlugin from "main";
import { Editor, ItemView, MarkdownFileInfo, MarkdownView, MarkdownViewModeType, Menu, MenuItem, Notice, Platform, TFile } from "obsidian";
import { LocalVar, t } from "Settings/NoteToolbarSettings";
import { importFromCallout } from "Utils/ImportExport";
import { getViewId } from "Utils/Utils";
import RibbonMenu from "./RibbonMenu";
import { TbarData } from "./ToolbarRenderer";

/**
 * Handles Obsidian changes registered with Obsidian's `registerEvent()`.
 */
export default class WorkspaceListeners {

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
		this.ribbonMenu = new RibbonMenu(ntb);
	}

	/**
	 * Track changes to the theme (for better CSS overrides when rendering toolbars).
	 */
	onCssChange = async () => {
		this.ntb.debug('===== CSS-CHANGE =====');
		// update the global theme attribute (for styling)
		activeDocument.body.setAttr('data-ntb-csstheme', this.ntb.app.vault.getConfig('cssTheme'));
	};

	/**
	 * On opening of a file, track recent files that have been opened (for more helpful file select UI).
	 * @param file TFile that was opened.
	 */
	onFileOpen = async (file: TFile) => {
		this.ntb.debug('FILE-OPEN: updating recent file list:', file?.name);
		// update list of the most recently opened files
		if (file) await this.ntb.settingsManager.updateRecentList(LocalVar.RecentFiles, file.path);
	};

	/**
	 * On layout changes, render and update toolbars as necessary.
	 */
	onLayoutChange = async () => {
		
		// if workspace changed, render all toolbars, otherwise just render the toolbar for the active view (#367)
		const workspace = this.workspacesPlugin?.instance.activeWorkspace;
		if (workspace !== this.activeWorkspace) {
			await this.ntb.render.renderForAllLeaves();
			this.activeWorkspace = workspace;
		}
		else {
			const currentView = this.ntb.app.workspace.getActiveViewOfType(ItemView);
			if (currentView) await this.ntb.render.renderForView(currentView);
		}

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

		// update the active toolbar if its configuration changed
		if (toolbarEl) {
			let activeToolbar = this.ntb.settingsManager.getToolbarById(toolbarEl.id);
			if (activeToolbar && (activeToolbar.updated !== toolbarEl.getAttribute(TbarData.Updated))) {
				renderToolbar = true;
			}
		}

		// exit if the view has already been handled, after updating the toolbar
		if (!renderToolbar && viewId && this.ntb.render.activeViewIds.contains(viewId)) {
			this.ntb.debug('LEAF-CHANGE: SKIPPED RENDERING: VIEW ALREADY HANDLED');
			this.ntb.render.updateActive();
			return;
		};

		if (currentView) {
			// check for editing or reading mode
			if (currentView instanceof MarkdownView) {
				renderToolbar = ['source', 'preview'].includes((currentView as MarkdownView).getMode());
			}
		}
		else {
			currentView = this.ntb.app.workspace.getActiveViewOfType(ItemView);
			if (currentView) {
				renderToolbar = this.ntb.utils.checkToolbarForItemView(currentView);
				if (!renderToolbar) return;
			}
		}

		if (renderToolbar) {
			this.ntb.debug("LEAF-CHANGE: renderActiveToolbar");
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

	/**
	 * On opening of the editor menu, check what was selected and add relevant menu options.
	 */
	editorMenuHandler = async (menu: Menu, editor: Editor, view: MarkdownView | MarkdownFileInfo) => {

		// replace Editor menu with the selected toolbar
		if (this.ntb.settings.editorMenuToolbar) {
			// FIXME? should we check if the active file is what we're viewing? might be confusing otherwise
			const activeFile = this.ntb.app.workspace.getActiveFile();
			const toolbar = this.ntb.settingsManager.getToolbarById(this.ntb.settings.editorMenuToolbar);
			if (toolbar) {
				// @ts-ignore
				menu.items = [];
				if (this.ntb.settings.editorMenuAsToolbar) {
					const pointerPos = this.ntb.utils.getPosition('pointer');
					await this.ntb.render.renderFloatingToolbar(toolbar, pointerPos, pointerPos);
				}
				else {
					// not replacing variables here, because we need to call it synchronously
					this.ntb.render.renderMenuItems(menu, toolbar, activeFile, undefined, false);
				}
				return;
			}
			else {
				new Notice(t('setting.display-locations.option-editor-menu-error')).containerEl.addClass('mod-warning');
			}
		}
		// otherwise, add callout helper items to the standard Editor menu
		else {
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
							let toolbar = await importFromCallout(this.ntb, selection);
							await this.ntb.settingsManager.addToolbar(toolbar);
							await this.ntb.commands.openToolbarSettingsForId(toolbar.uuid);
						});
				});
			}
		}

	}

	/**
	 * On opening of the file menu, check and render toolbar as a submenu.
	 * @param menu the file Menu
	 * @param file TFile for link that was clicked on
	 */
	fileMenuHandler = (menu: Menu, file: TFile) => {
		if (this.ntb.settings.showToolbarInFileMenu) {
			// don't bother showing in the file menu for the active file
			let activeFile = this.ntb.app.workspace.getActiveFile();
			if (activeFile && file !== activeFile) {
				let cache = this.ntb.app.metadataCache.getFileCache(file);
				if (cache) {
					let toolbar = this.ntb.settingsManager.getMappedToolbar(cache.frontmatter, file);
					if (toolbar) {
						// the submenu UI doesn't appear to work on mobile, render items in menu
						if (Platform.isMobile) {
							toolbar ? this.ntb.render.renderMenuItems(menu, toolbar, file, 1) : undefined;
						}
						else {
							menu.addItem((item: MenuItem) => {
								item
									.setIcon(this.ntb.settings.icon)
									.setTitle(toolbar ? toolbar.name : '');
								let subMenu = item.setSubmenu() as Menu;
								toolbar ? this.ntb.render.renderMenuItems(subMenu, toolbar, file) : undefined;
							});
						}
					}
				}
			}
		}
	}
	
	// TODO: remove if not needed
	// onMarkdownViewFileChange(view: MarkdownView, callback: (oldFile: TFile, newFile: TFile) => void) {
	// 	if (!(view.leaf.id in this.__onNoteChange__leafFiles)) {
	// 		this.__onNoteChange__leafFiles[view.leaf.id] = view.file;
	// 		this.__onNoteChange__leafCallbacks[view.leaf.id] = callback;
	// 		this.ntb.debug('⭐️⭐️⭐️', this.__onNoteChange__leafFiles);
	// 	}
	//
	// 	if (!this.__onNoteChange__eventCreated) {
	// 		this.registerEvent(
	// 			this.ntb.app.workspace.on('layout-change', () => {
	// 				for (const leafId of Object.keys(this.__onNoteChange__leafFiles)) {
	// 					const leaf: WorkspaceLeaf | null = this.ntb.app.workspace.getLeafById(leafId);
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

}