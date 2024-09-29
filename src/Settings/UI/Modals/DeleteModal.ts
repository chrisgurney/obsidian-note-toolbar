import { ButtonComponent, Modal } from "obsidian";
import ToolbarSettingsModal from "Settings/UI/Modals/ToolbarSettingsModal";
import NoteToolbarPlugin from "main";
import { t, ToolbarSettings } from "Settings/NoteToolbarSettings";

export class DeleteModal extends Modal {

	private parent: ToolbarSettingsModal;
    public plugin: NoteToolbarPlugin;
    private toolbar: ToolbarSettings;

    public confirmed: boolean = false;

    private uiSettings: {
        title: string,
        questionLabel: string,
        approveLabel: string,
        denyLabel: string,
        warning: boolean
    };

	constructor(
        parent: ToolbarSettingsModal, 
        uiSettings: { title: string; questionLabel: string; approveLabel: string; denyLabel: string; warning: boolean; }
    ) {
        super(parent.plugin.app);
        this.modalEl.addClass('note-toolbar-setting-mini-dialog'); 
        this.parent = parent;
        this.plugin = parent.plugin;
        this.toolbar = parent.toolbar;
        this.uiSettings = uiSettings;
    }

    public onOpen() {
        this.display();
    }

    async display() {
        new Promise((resolve) => {
            
            this.setTitle(this.uiSettings.title);

            this.contentEl.createEl("p", { text: this.uiSettings.questionLabel });
    
            let btnContainerEl = this.contentEl.createDiv();
            btnContainerEl.addClass('note-toolbar-setting-confirm-dialog-buttons');
    
            let btn1 = new ButtonComponent(btnContainerEl)
                .setButtonText(this.uiSettings.approveLabel)
                .onClick(() => {
                    this.confirmed = true;
                    this.delete();
                });
    
            this.uiSettings.warning ? btn1.setWarning() : btn1.setCta();
    
            let btn2 = new ButtonComponent(btnContainerEl)
                .setButtonText(this.uiSettings.denyLabel)
                .onClick(() => {
                    this.close();
                });

        });
    }

    protected async delete() {
        this.plugin.settingsManager.deleteToolbar(this.toolbar.uuid);
        await this.plugin.settingsManager.save();
        this.close();
        this.parent.close();
    }

}