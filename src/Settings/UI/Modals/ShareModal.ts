import NoteToolbarPlugin from "main";
import { ButtonComponent, Modal, Notice, Setting } from "obsidian";
import { t } from "Settings/NoteToolbarSettings";
import { learnMoreFr } from "../Utils/SettingsUIUtils";

export class ShareModal extends Modal {

    shareUri: string;
    toolbarName: string;

	constructor(plugin: NoteToolbarPlugin, shareUri: string, toolbarName: string) {
        super(plugin.app);
        this.shareUri = shareUri;
        this.toolbarName = toolbarName;
        this.modalEl.addClass('note-toolbar-setting-mini-dialog', 'note-toolbar-share-dialog');
    }

    public onOpen() {

        this.setTitle(t('export.title-share', { toolbar: this.toolbarName }));

        this.contentEl.createEl(
            "p", 
            { text: learnMoreFr(t('export.label-share-description'), 'Importing-and-exporting') }
        );

		new Setting(this.modalEl)
			.setName(this.shareUri)
			.addButton((button: ButtonComponent) => {
				button
					.setButtonText(t('export.button-copy-uri'))
					.setTooltip(t('export.button-copy-uri-description'))
					.setCta()
					.onClick(() => {
                        navigator.clipboard.writeText(this.shareUri);
                        new Notice(t('export.notice-shared'));
                        this.close();
					});
			});

    }

}