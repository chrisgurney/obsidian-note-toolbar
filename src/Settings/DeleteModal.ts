import { Modal } from "obsidian";
import ToolbarSettingsModal from "./ToolbarSettingsModal";
import NoteToolbarPlugin from "src/main";
import { ToolbarSettings } from "./NoteToolbarSettings";

export class DeleteModal extends Modal {

	private parent: ToolbarSettingsModal;
    public plugin: NoteToolbarPlugin;
    private toolbar: ToolbarSettings;

	constructor(parent: ToolbarSettingsModal) {
        super(parent.plugin.app);
        this.modalEl.addClass("note-toolbar-setting-confirm-dialog"); 
        this.parent = parent;
        this.plugin = parent.plugin;
        this.toolbar = parent.toolbar;
    }

    public onOpen() {
        this.setTitle("Delete toolbar: " + this.toolbar.name);
        this.contentEl.createEl("p", {text: "Are you sure you want to delete this toolbar?"});
        const delete_button = this.contentEl.createEl("button", {text: "Yes, delete"});
        delete_button.onclick = async () => this.delete();
    }

    protected async delete() {
        this.plugin.deleteToolbarFromSettings(this.toolbar.name);
        this.plugin.saveSettings();
        
        await this.plugin.saveSettings();
        this.close();
        this.parent.close();
    }

}