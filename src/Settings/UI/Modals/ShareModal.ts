import NoteToolbarPlugin from "main";
import { ButtonComponent, Modal, Notice, Setting } from "obsidian";
import { t } from "Settings/NoteToolbarSettings";
import { learnMoreFr } from "../Utils/SettingsUIUtils";

export class ShareModal extends Modal {

    shareUri: string;

	constructor(plugin: NoteToolbarPlugin, shareUri: string) {
        super(plugin.app);
        this.shareUri = shareUri;
        this.modalEl.addClass('note-toolbar-setting-mini-dialog', 'note-toolbar-share-dialog');
    }

    public onOpen() {

        this.setTitle("Share Note Toolbar URI");

        this.contentEl.createEl("p", { text: learnMoreFr("Share this toolbar with another user with this link.", 'Importing-and-exporting') });

		new Setting(this.modalEl)
			.setName(this.shareUri)
			.addButton((button: ButtonComponent) => {
				button
					.setButtonText("Copy URI")
					.setTooltip("Copy this link to your clipboard")
					.setCta()
					.onClick(() => {
                        navigator.clipboard.writeText(this.shareUri);
                        new Notice(t('export.notice-shared'));
                        this.close();
					});
			});

    }

}