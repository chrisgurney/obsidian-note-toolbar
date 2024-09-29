import { Modal } from "obsidian";
import ToolbarSettingsModal from "Settings/UI/Modals/ToolbarSettingsModal";
import NoteToolbarPlugin from "main";
import { t, ToolbarSettings } from "Settings/NoteToolbarSettings";

export class DeleteModal extends Modal {

	private parent: ToolbarSettingsModal;
    public plugin: NoteToolbarPlugin;
    private toolbar: ToolbarSettings;

    private title: string;
    private questionLabel: string;
    private approveLabel: string;
    private denyLabel: string;
    private approveClass: string;

	constructor(parent: ToolbarSettingsModal, title: string, questionLabel: string, approveLabel: string, denyLabel: string, approveClass: string) {
        super(parent.plugin.app);
        this.modalEl.addClass("note-toolbar-setting-mini-dialog"); 
        this.parent = parent;
        this.plugin = parent.plugin;
        this.toolbar = parent.toolbar;

        this.title = title;
        this.questionLabel = questionLabel;
        this.approveLabel = approveLabel;
        this.denyLabel = denyLabel;
        this.approveClass = approveClass;
    }

    public onOpen() {
        this.setTitle(this.title);
        this.contentEl.createEl("p", {text: this.questionLabel });
        let approveButton = this.contentEl.createEl('button', {text: this.approveLabel});
        approveButton.addClass(this.approveClass);
        this.contentEl.createEl('span').setText('\u00A0\u00A0');
        let denyButton = this.contentEl.createEl('button', {text: this.denyLabel});
        approveButton.onclick = async () => this.delete();
        denyButton.onclick = async () => this.close();
    }

    protected async delete() {
        this.plugin.settingsManager.deleteToolbar(this.toolbar.uuid);
        await this.plugin.settingsManager.save();
        this.close();
        this.parent.close();
    }

}