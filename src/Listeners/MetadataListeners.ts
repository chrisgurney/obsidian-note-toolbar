import NoteToolbarPlugin from "main";
import { TFile, CachedMetadata, debounce, ItemView, Notice } from "obsidian";
import { t } from "Settings/NoteToolbarSettings";


export default class WorkspaceListeners {

	// track the last used file and property, to prompt if Note Toolbar property references unknown toolbar
	lastFileOpenedOnCacheChange: TFile | null;
	lastNtbPropValue: string | undefined;

    constructor(
        private ntb: NoteToolbarPlugin
    ) {}

	register() {
		this.ntb.registerEvent(this.ntb.app.metadataCache.on('changed', this.onMetadataChange));
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

}