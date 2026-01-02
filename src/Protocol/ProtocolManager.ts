import NoteToolbarPlugin from "main";
import { Notice, ObsidianProtocolData, Platform } from "obsidian";
import { ExportSettings, t, ToolbarSettings, VIEW_TYPE_GALLERY, VIEW_TYPE_HELP, VIEW_TYPE_TIP, VIEW_TYPE_WHATS_NEW } from "Settings/NoteToolbarSettings";
import { confirmImportWithModal } from "Settings/UI/Modals/ImportConfirmModal";
import ToolbarSettingsModal from "Settings/UI/Modals/ToolbarSettingsModal";
import { exportToCallout, importFromCallout } from "Utils/ImportExport";

export default class ProtocolManager {

    constructor(
		private ntb: NoteToolbarPlugin
	) {}

	/**
	 * Handles calls to the obsidian://note-toolbar URI.
	 * Supported: command=workspace%3Atoggle-pin | folder=Demos | menu=Tools | help | toolbarsettings=Tools | whatsnew
	 * @param data ObsidianProtocolData
	 */
	async handle(data: ObsidianProtocolData) {
		this.ntb.debug('protocolHandler', data);
		// supports both commandid= and command= for backwards-compatability with Advanced URI
		if (data.commandid || data.commandId || data.command) {
			this.ntb.items.handleLinkCommand(decodeURIComponent(data.commandid || data.commandId || data.command));
		}
		else if (data.folder) {
			this.ntb.items.handleLinkFolder(data.folder);
		}
		else if (data.gallery) {
			this.ntb.app.workspace.getLeaf(true).setViewState({
				type: VIEW_TYPE_GALLERY,
				active: true
			});
			if (Platform.isPhone) this.ntb.app.workspace.leftSplit?.collapse();
		}
		else if (data.help) {
			this.ntb.app.workspace.getLeaf(true).setViewState({ type: VIEW_TYPE_HELP, active: true });
			if (Platform.isPhone) this.ntb.app.workspace.leftSplit?.collapse();
		}
        else if (data.import) {
            const content = decodeURIComponent(data.import);
			// double-check provided text is a Note Toolbar Callout
			if (data.import.includes('[!note-toolbar')) {
				confirmImportWithModal(
					this.ntb, 
					content
				).then((isConfirmed: boolean) => {
					if (isConfirmed) {
						importFromCallout(this.ntb, content, undefined, true)
							.then(toolbar => {
								this.ntb.settingsManager.addToolbar(toolbar)
									.then(res => {
										this.ntb.commands.openToolbarSettingsForId(toolbar.uuid);
									});
							});
					}
				});
			}
			else {
				new Notice(t('import.error-invalid-uri-content')).containerEl.addClass('mod-warning');
			}
        }
		else if (data.menu) {
			const activeFile = this.ntb.app.workspace.getActiveFile();
			const toolbar: ToolbarSettings | undefined = this.ntb.settingsManager.getToolbar(data.menu);
			if (activeFile) {
				if (toolbar) {
					this.ntb.render.renderAsMenu(toolbar, activeFile).then(menu => { 
						this.ntb.render.showMenuAtElement(menu, this.ntb.callouts.lastCalloutLink);
					});
				}
				else {
					new Notice(t('notice.error-item-menu-not-found', { toolbar: data.menu })).containerEl.addClass('mod-warning');
				}
			}
		}
		else if (data.tip) {
			if (data.tip.length > 0) {
				this.ntb.app.workspace.getLeaf(true).setViewState({ type: VIEW_TYPE_TIP, state: { id: data.tip }, active: true });
			}
		}
		else if (data.toolbarsettings) {
			let toolbarSettings;
			if (data.toolbarsettings.length > 0) {
				toolbarSettings = this.ntb.settingsManager.getToolbarByName(data.toolbarsettings);
				!toolbarSettings 
					? new Notice(t('notice.error-toolbar-not-found', { toolbar: data.toolbarsettings })).containerEl.addClass('mod-warning') 
					: undefined;
			}
			else {
				let toolbarEl = this.ntb.el.getToolbarEl(); // if not given, figure out what toolbar is on screen
				toolbarSettings = toolbarEl ? this.ntb.settingsManager.getToolbarById(toolbarEl?.id) : undefined;
			}
			if (toolbarSettings) {
				const modal = new ToolbarSettingsModal(this.ntb.app, this.ntb, null, toolbarSettings);
				modal.setTitle(t('setting.title-edit-toolbar', { toolbar: toolbarSettings.name }));
				modal.open();
			}
		}
		else if (data.whatsnew) {
			this.ntb.app.workspace.getLeaf(true).setViewState({
				type: VIEW_TYPE_WHATS_NEW,
				active: true
			});
			if (Platform.isPhone) this.ntb.app.workspace.leftSplit?.collapse();
		}
		else {
			new Notice(
				t('notice.error-uri-params-not-supported', { params: Object.keys(data).join(', ')})
			).containerEl.addClass('mod-warning');
		}
	}

    /**
     * Returns a URI which can be shared with other users, that imports the provided toolbar's callout markdown.
     * @param toolbar ToolbarSettings to share
	 * @param useObsidianUri true if an obsidian:// URI should be generated versus an HTTP URL (default)
     * @returns URI to share as a string
     */
    async getShareUri(toolbar: ToolbarSettings, useObsidianUri: boolean = false): Promise<string> {
		const options = {
			includeIcons: true,
			replaceVars: false,
			useDataEls: true,
			useIds: false
		} as ExportSettings;
        let callout = await exportToCallout(this.ntb, toolbar, options);
		const shareUri = useObsidianUri 
			? `obsidian://note-toolbar?import=${encodeURIComponent(callout)}`
			: `https://chrisgurney.github.io/obsidian-note-toolbar/open.htm?uri=${encodeURIComponent(`obsidian://note-toolbar?import=${callout}`)}`
        return shareUri;
    }

}