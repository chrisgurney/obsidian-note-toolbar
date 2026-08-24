import NoteToolbarPlugin from "main";
import { Notice, ObsidianProtocolData, Platform } from "obsidian";
import { ExportSettings, t, ToolbarItemSettings, ToolbarSettings, VIEW_TYPE_GALLERY, VIEW_TYPE_HELP, VIEW_TYPE_TIP, VIEW_TYPE_WHATS_NEW } from "Settings/NoteToolbarSettings";
import { confirmImportWithModal } from "Settings/UI/Modals/ImportConfirmModal";
import ToolbarSettingsModal from "Settings/UI/Modals/ToolbarSettingsModal";
import ToolbarSuggestModal from "Settings/UI/Modals/ToolbarSuggestModal";
import { exportToCallout, importFromCallout } from "Utils/ImportExport";
import { URLS } from "Utils/Urls";

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
			await this.ntb.app.workspace.getLeaf(true).setViewState({
				type: VIEW_TYPE_GALLERY,
				active: true
			});
			if (Platform.isPhone) this.ntb.app.workspace.leftSplit?.collapse();
		}
		else if (data.help) {
			await this.ntb.app.workspace.getLeaf(true).setViewState({ type: VIEW_TYPE_HELP, active: true });
			if (Platform.isPhone) this.ntb.app.workspace.leftSplit?.collapse();
		}
        else if (data.import) {
            const content = decodeURIComponent(data.import);
			// double-check provided text is a Note Toolbar Callout
			await confirmImportWithModal(
				this.ntb, 
				content
			).then(async (isConfirmed: boolean) => {
				if (isConfirmed) {
					const [ importedToolbar ] = importFromCallout(this.ntb, content, undefined, false);
					if (data.import.includes('[!note-toolbar')) {
						await this.ntb.settingsManager.addToolbar(importedToolbar)
							.then(() => {
								this.ntb.commands.openToolbarSettingsForId(importedToolbar.uuid);
							});
					}
					else {
						if (importedToolbar.items.length === 0) {
							new Notice(t('import.error-no-items')).containerEl.addClass('mod-warning');
							return;
						}
						const toolbarSuggester = new ToolbarSuggestModal(this.ntb, true, false, true, (toolbar: ToolbarSettings) => {
							void this.ntb.settingsManager.addToolbarItem(toolbar, importedToolbar.items).then(() => {
								this.ntb.commands.openToolbarSettingsForId(toolbar.uuid);
							});
						});
						toolbarSuggester.open();
					}
				}
			});
        }
		else if (data.menu) {
			const activeFile = this.ntb.app.workspace.getActiveFile();
			const toolbar: ToolbarSettings | undefined = this.ntb.settingsManager.getToolbar(data.menu);
			if (activeFile) {
				if (toolbar) {
					await this.ntb.render.renderAsMenu(toolbar, activeFile).then(menu => { 
                        const position = this.ntb.render.lastClickedPos ?? this.ntb.utils.getPosition('pointer');
                        if (position) {
							this.ntb.render.showMenuAtPosition(menu,
								{ x: position.left, y: position.bottom, overlap: true, left: false }
							)
						}
						else {
                            this.ntb.error('No last clicked position available.');
						}
					});
				}
				else {
					new Notice(t('notice.error-item-menu-not-found', { toolbar: data.menu })).containerEl.addClass('mod-warning');
				}
			}
		}
		else if (data.new) {
			const toolbar = await this.ntb.settingsManager.newToolbar();
			this.ntb.commands.openToolbarSettingsForId(toolbar.uuid);
		}
		else if (data.settings) {
			this.ntb.commands.openSettings();
		}
		else if (data.tip) {
			if (data.tip.length > 0) {
				await this.ntb.app.workspace.getLeaf(true).setViewState({ type: VIEW_TYPE_TIP, state: { id: data.tip }, active: true });
			}
		}
		else if (data.toolbarsettings) {
			let toolbarSettings;
			if (data.toolbarsettings.length > 0) {
				toolbarSettings = this.ntb.settingsManager.getToolbarByName(data.toolbarsettings);
				if (!toolbarSettings) new Notice(t('notice.error-toolbar-not-found', { toolbar: data.toolbarsettings })).containerEl.addClass('mod-warning');
			}
			else {
				const toolbarEl = this.ntb.el.getToolbarEl(); // if not given, figure out what toolbar is on screen
				toolbarSettings = toolbarEl ? this.ntb.settingsManager.getToolbarById(toolbarEl?.id) : undefined;
			}
			if (toolbarSettings) {
				const modal = new ToolbarSettingsModal(this.ntb.app, this.ntb, null, toolbarSettings);
				modal.setTitle(t('setting.title-edit-toolbar', { toolbar: toolbarSettings.name }));
				modal.open();
			}
		}
		else if (data.whatsnew) {
			await this.ntb.app.workspace.getLeaf(true).setViewState({
				type: VIEW_TYPE_WHATS_NEW,
				active: true
			});
			if (Platform.isPhone) this.ntb.app.workspace.leftSplit?.collapse();
		}
		else {
			new Notice(
				t('notice.error-uri-params-not-supported', { params: Object.keys(data).join(', ')})
			, 10000).containerEl.addClass('mod-warning');
		}
	}

    /**
     * Returns a URI which can be shared with other users, that imports the provided Note Toolbar Callout markdown.
     * @param toolbarOrItem ToolbarSettings or ToolbarItemSettings to share
	 * @param useObsidianUri true if an obsidian:// URI should be generated versus an HTTP URL (default)
     * @returns URI to share as a string
     */
    async getShareUri(toolbarOrItem: ToolbarSettings | ToolbarItemSettings, useObsidianUri: boolean = false): Promise<string> {
		const options = {
			includeIcons: true,
			replaceVars: false,
			useDataEls: true,
			useIds: false
		} as ExportSettings;
        const callout = await exportToCallout(this.ntb, toolbarOrItem, options);
		const shareUri = useObsidianUri 
			? `obsidian://note-toolbar?import=${encodeURIComponent(callout)}`
			: `${URLS.GHIO_SHARE}${encodeURIComponent(`obsidian://note-toolbar?import=${callout}`)}`
        return shareUri;
    }

}