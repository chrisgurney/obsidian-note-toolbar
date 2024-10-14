import NoteToolbarPlugin from "main";
import { Notice, ObsidianProtocolData } from "obsidian";
import { ExportSettings, t, ToolbarSettings } from "Settings/NoteToolbarSettings";
import { HelpModal } from "Settings/UI/Modals/HelpModal";
import { confirmImportWithModal } from "Settings/UI/Modals/ImportConfirmModal";
import ToolbarSettingsModal from "Settings/UI/Modals/ToolbarSettingsModal";
import { WhatsNewModal } from "Settings/UI/Modals/WhatsNewModal";
import { exportToCallout, importFromCallout } from "Utils/ImportExport";
import { debugLog } from "Utils/Utils";

export class ProtocolManager {

    public plugin: NoteToolbarPlugin;

    constructor(plugin: NoteToolbarPlugin) {
        this.plugin = plugin;
    }

	/**
	 * Handles calls to the obsidian://note-toolbar URI.
	 * Supported: command=workspace%3Atoggle-pin | folder=Demos | menu=Tools | help | toolbarsettings=Tools | whatsnew
	 * @param data ObsidianProtocolData
	 */
	async handle(data: ObsidianProtocolData) {
		debugLog('protocolHandler', data);
		// supports both commandid= and command= for backwards-compatability with Advanced URI
		if (data.commandid || data.commandId || data.command) {
			this.plugin.handleLinkCommand(decodeURIComponent(data.commandid || data.commandId || data.command));
		}
		else if (data.folder) {
			this.plugin.handleLinkFolder(data.folder);
		}
		else if (data.help) {
			const helpModal = new HelpModal(this.plugin);
			helpModal.open();
		}
        else if (data.import) {
            const content = decodeURIComponent(data.import);
			// double-check provided text is a Note Toolbar Callout
			if (data.import.includes('[!note-toolbar')) {
				confirmImportWithModal(
					this.plugin, 
					content
				).then((isConfirmed: boolean) => {
					if (isConfirmed) {
						importFromCallout(this.plugin, content, undefined, true)
							.then(toolbar => {
								this.plugin.settingsManager.addToolbar(toolbar)
									.then(res => {
										this.plugin.commands.openToolbarSettingsForId(toolbar.uuid);
									});
							});
					}
				});
			}
			else {
				new Notice(t('import.error-invalid-uri-content'));
			}
        }
		else if (data.menu) {
			let activeFile = this.plugin.app.workspace.getActiveFile();
			let toolbar: ToolbarSettings | undefined = this.plugin.settingsManager.getToolbarByName(data.menu);
			toolbar = toolbar ? toolbar : this.plugin.settingsManager.getToolbarById(data.menu); // try getting by UUID
			if (activeFile) {
				if (toolbar) {
					this.plugin.renderToolbarAsMenu(toolbar, activeFile).then(menu => { 
						this.plugin.showMenuAtElement(menu, this.plugin.lastCalloutLink);
					});
				}
				else {
					new Notice(t('notice.error-item-menu-not-found', { toolbar: data.menu }));
				}
			}
		}
		else if (data.toolbarsettings) {
			let toolbarSettings;
			if (data.toolbarsettings.length > 0) {
				toolbarSettings = this.plugin.settingsManager.getToolbarByName(data.toolbarsettings);
				!toolbarSettings ? new Notice(t('notice.error-toolbar-not-found', { toolbar: data.toolbarsettings })) : undefined;
			}
			else {
				let toolbarEl = this.plugin.getToolbarEl(); // if not given, figure out what toolbar is on screen
				toolbarSettings = toolbarEl ? this.plugin.settingsManager.getToolbarById(toolbarEl?.id) : undefined;
			}
			if (toolbarSettings) {
				const modal = new ToolbarSettingsModal(this.plugin.app, this.plugin, null, toolbarSettings);
				modal.setTitle(t('setting.title-edit-toolbar', { toolbar: toolbarSettings.name }));
				modal.open();
			}
		}
		else if (data.whatsnew) {
			const whatsNewModal = new WhatsNewModal(this.plugin);
			whatsNewModal.open();
		}
		else {
			new Notice(t('notice.error-uri-params-not-supported', { params: Object.keys(data).join(', ')}));
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
        let callout = await exportToCallout(this.plugin, toolbar, options);
		const shareUri = useObsidianUri 
			? `obsidian://note-toolbar?import=${encodeURIComponent(callout)}`
			: `https://chrisgurney.github.io/obsidian-note-toolbar/open.htm?uri=${encodeURIComponent(`obsidian://note-toolbar?import=${callout}`)}`
        return shareUri;
    }

}