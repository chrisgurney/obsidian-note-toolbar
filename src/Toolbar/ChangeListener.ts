import NoteToolbarPlugin from "main";
import { TFile, ItemView, MarkdownView, CachedMetadata, debounce, Notice, MarkdownViewModeType } from "obsidian";
import { LocalVar, ToolbarSettings, ToolbarItemSettings, t } from "Settings/NoteToolbarSettings";
import { getViewId } from "Utils/Utils";
import { TbarData } from "./ToolbarRenderer";

/**
 * Handles Obsidian changes registered with Obsidian's `registerEvent()`.
 */
export default class ChangeListener {

    workspacesPlugin: { instance: any; enabled: boolean } | null = null;
    
	// track to reduce unneccessary re-renders 
	activeWorkspace: string;
	lastFileOpenedOnLayoutChange: TFile | null | undefined;
	lastViewModeOnLayoutChange: MarkdownViewModeType | undefined;

	// track the last used file and property, to prompt if Note Toolbar property references unknown toolbar
	lastFileOpenedOnCacheChange: TFile | null;
	lastNtbPropValue: string | undefined;

	// TODO: remove if not needed
	// __onNoteChange__leafFiles: { [id: string]: TFile | null } = {};
	// __onNoteChange__leafCallbacks: { [id: string]: (oldFile: TFile | null, newFile: TFile) => void } = {};
	// __onNoteChange__eventCreated: boolean = false;

    constructor(
        private ntb: NoteToolbarPlugin
    ) {}

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
	 * On rename of file, update any item links that reference the old name.
	 * @param file TFile of the new file.
	 * @param oldPath old path.
	 */
	onFileRename = async (file: TFile, oldPath: string) => {
		let settingsChanged = false;
		this.ntb.settings.toolbars.forEach((toolbar: ToolbarSettings) => {
			toolbar.items.forEach((item: ToolbarItemSettings) => {
				if (item.link === oldPath) {
					this.ntb.debug('fileRenameListener: changing', item.link, 'to', file.path);
					item.link = file.path;
					settingsChanged = true;
				}
				if (item.scriptConfig?.sourceFile === oldPath) {
					this.ntb.debug('fileRenameListener: changing', item.scriptConfig?.sourceFile, 'to', file.path);
					item.scriptConfig.sourceFile = file.path;
					settingsChanged = true;
				}
			});
		});
		if (settingsChanged) await this.ntb.settingsManager.save();
	}

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
	 * On changes to metadata, trigger the checks and rendering of a toolbar if necessary.
	 * @param file TFile in which metadata changed.
	 * @param data ??? (not used)
	 * @param cache CachedMetadata, from which we look at the frontmatter.
	 */
	onMetadataChange = async (file: TFile, data: any, cache: CachedMetadata) => {
		const activeFile = this.ntb.app.workspace.getActiveFile();
		// if the active file is the one that changed,
		// and the file was modified after it was created (fix for a duplicate toolbar on Create new note)
		if (activeFile === file && (file.stat.mtime > file.stat.ctime)) {
			this.ntb.debug('===== METADATA-CHANGE ===== ', file.name);
			debounce(async () => {
				// FIXME: should this instead update all visible toolbars?
				const toolbarView = this.ntb.app.workspace.getActiveViewOfType(ItemView) ?? undefined;
				await this.ntb.render.checkAndRender(file, cache.frontmatter, toolbarView);
	
				// prompt to create a toolbar if it doesn't exist in the Note Toolbar property
				const ntbPropValue = this.ntb.settingsManager.getToolbarNameFromProps(cache.frontmatter);
				if (ntbPropValue && this.ntb.settings.toolbarProp !== 'tags') {
					// make sure just the relevant property changed in the open file
					if (this.lastFileOpenedOnCacheChange !== activeFile) this.lastNtbPropValue = undefined;
					const ignoreToolbar = ntbPropValue.includes('none') ? true : false;
					if (ntbPropValue !== this.lastNtbPropValue) {
						const matchingToolbar = ignoreToolbar ? undefined : this.ntb.settingsManager.getToolbarByName(ntbPropValue);
						if (!matchingToolbar && !ignoreToolbar) {
							const notice = new Notice(t('notice.warning-no-matching-toolbar', { toolbar: ntbPropValue }), 7500);
							notice.messageEl.addClass('note-toolbar-notice-pointer');
							this.ntb.registerDomEvent(notice.messageEl, 'click', async () => {
								const newToolbar = await this.ntb.settingsManager.newToolbar(ntbPropValue);
								this.ntb.settingsManager.openToolbarSettings(newToolbar);
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