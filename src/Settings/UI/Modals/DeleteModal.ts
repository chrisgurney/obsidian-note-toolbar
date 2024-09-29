import { Modal } from "obsidian";
import ToolbarSettingsModal from "Settings/UI/Modals/ToolbarSettingsModal";
import NoteToolbarPlugin from "main";
import { t, ToolbarSettings } from "Settings/NoteToolbarSettings";

export class DeleteModal extends Modal {

	private parent: ToolbarSettingsModal;
    public plugin: NoteToolbarPlugin;
    private toolbar: ToolbarSettings;

    private strings: {
        title: string,
        questionLabel: string,
        approveLabel: string,
        denyLabel: string,
        approveClass: string
    };

	constructor(
        parent: ToolbarSettingsModal, 
        strings: { title: string; questionLabel: string; approveLabel: string; denyLabel: string; approveClass: string; }
    ) {
        super(parent.plugin.app);
        this.modalEl.addClass("note-toolbar-setting-mini-dialog"); 
        this.parent = parent;
        this.plugin = parent.plugin;
        this.toolbar = parent.toolbar;
        this.strings = strings;
    }

    public onOpen() {

        this.setTitle(this.strings.title);

        this.contentEl.createEl("p", {text: this.strings.questionLabel });
        
        let approveButton = this.contentEl.createEl('button', {text: this.strings.approveLabel});
        approveButton.addClass(this.strings.approveClass);
        this.contentEl.createEl('span').setText('\u00A0\u00A0');
        let denyButton = this.contentEl.createEl('button', {text: this.strings.denyLabel});

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