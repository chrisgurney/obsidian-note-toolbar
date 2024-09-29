import { ButtonComponent, Modal } from "obsidian";
import ToolbarSettingsModal from "Settings/UI/Modals/ToolbarSettingsModal";
import NoteToolbarPlugin from "main";
import { t, ToolbarSettings } from "Settings/NoteToolbarSettings";

export class DeleteModal extends Modal {

	private parent: ToolbarSettingsModal;
    public plugin: NoteToolbarPlugin;
    private toolbar: ToolbarSettings;

    public confirmed: boolean = false;

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
        this.modalEl.addClass('note-toolbar-setting-mini-dialog'); 
        this.parent = parent;
        this.plugin = parent.plugin;
        this.toolbar = parent.toolbar;
        this.strings = strings;
    }

    public onOpen() {

        this.setTitle(this.strings.title);

        this.contentEl.createEl("p", { text: this.strings.questionLabel });

        let btnContainerEl = this.contentEl.createDiv();
        btnContainerEl.addClass('note-toolbar-setting-confirm-dialog-buttons');

        let btn1 = new ButtonComponent(btnContainerEl)
            .setButtonText(this.strings.approveLabel)
            .onClick(() => {
                this.confirmed = true;
                this.delete();
            });

        btn1.setWarning(); 

        let btn2 = new ButtonComponent(btnContainerEl)
            .setButtonText(this.strings.denyLabel)
            .onClick(() => {
                this.close();
            });

    }

    protected async delete() {
        this.plugin.settingsManager.deleteToolbar(this.toolbar.uuid);
        await this.plugin.settingsManager.save();
        this.close();
        this.parent.close();
    }

}