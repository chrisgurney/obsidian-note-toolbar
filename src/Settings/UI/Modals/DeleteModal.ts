import { Modal } from "obsidian";
import ToolbarSettingsModal from "Settings/UI/Modals/ToolbarSettingsModal";
import NoteToolbarPlugin from "main";
import { t, ToolbarSettings } from "Settings/NoteToolbarSettings";

export class DeleteModal extends Modal {

	private parent: ToolbarSettingsModal;
    public plugin: NoteToolbarPlugin;
    private toolbar: ToolbarSettings;

	constructor(parent: ToolbarSettingsModal) {
        super(parent.plugin.app);
        this.modalEl.addClass("note-toolbar-setting-mini-dialog"); 
        this.parent = parent;
        this.plugin = parent.plugin;
        this.toolbar = parent.toolbar;
    }

    public onOpen() {
        this.setTitle(t('setting.delete-toolbar.title', { toolbar: this.toolbar.name }));
        this.contentEl.createEl("p", {text: t('setting.delete-toolbar.label-delete-confirm') });
        let delete_button = this.contentEl.createEl('button', {text: t('setting.delete-toolbar.button-delete-confirm')});
        delete_button.addClass("mod-warning");
        delete_button.onclick = async () => this.delete();
        this.contentEl.createEl('span').setText('\u00A0\u00A0');
        let cancel_button = this.contentEl.createEl('button', {text: t('setting.button-cancel')});
        cancel_button.onclick = async () => this.close();
    }

    protected async delete() {
        this.plugin.settingsManager.deleteToolbar(this.toolbar.uuid);
        await this.plugin.settingsManager.save();
        this.close();
        this.parent.close();
    }

}