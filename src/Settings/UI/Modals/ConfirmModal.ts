import { App, ButtonComponent, Modal } from "obsidian";

interface UiSettings {
    title: string,
    questionLabel?: string,
    questionFragment?: DocumentFragment,
    approveLabel: string,
    denyLabel: string,
    warning?: boolean
};

export async function confirmWithModal(app: App, uiSettings: UiSettings): Promise<boolean> {
    return new Promise((resolve, reject) => {
        const modal = new ConfirmModal(app, uiSettings);
        modal.onClose = () => {
            resolve(modal.isConfirmed);
        };
        modal.open();
    });
}

export class ConfirmModal extends Modal {

    public isConfirmed: boolean = false;
    public uiSettings: UiSettings;

	constructor(app: App, uiSettings: UiSettings) {
        super(app);
        this.modalEl.addClass('note-toolbar-setting-mini-dialog', 'note-toolbar-setting-dialog-phonefix'); 
        this.uiSettings = uiSettings;
    }

    public onOpen() {
        this.display();
    }

    async display() {
        new Promise((resolve) => {

            this.setTitle(this.uiSettings.title);

            if (this.uiSettings.questionLabel) {
                this.modalEl.createEl('p', { text: this.uiSettings.questionLabel });
            }
            else if (this.uiSettings.questionFragment) {
                this.modalEl.createEl('p').append(this.uiSettings.questionFragment);
            }
    
            let btnContainerEl = this.modalEl.createDiv();
            btnContainerEl.addClass('note-toolbar-setting-confirm-dialog-buttons');
    
            let btn1 = new ButtonComponent(btnContainerEl)
                .setButtonText(this.uiSettings.approveLabel)
                .onClick(() => {
                    this.isConfirmed = true;
                    this.close();
                });
    
            this.uiSettings.warning ? btn1.setWarning() : btn1.setCta();
    
            let btn2 = new ButtonComponent(btnContainerEl)
                .setButtonText(this.uiSettings.denyLabel)
                .onClick(() => {
                    this.close();
                });

        });
    }

}