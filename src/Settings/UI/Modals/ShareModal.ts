import NoteToolbarPlugin from "main";
import { ButtonComponent, Modal, Notice, Setting } from "obsidian";
import { ItemType, t, ToolbarSettings } from "Settings/NoteToolbarSettings";
import { learnMoreFr } from "../Utils/SettingsUIUtils";

export class ShareModal extends Modal {

    shareUri: string;
    toolbar: ToolbarSettings;

	constructor(plugin: NoteToolbarPlugin, shareUri: string, toolbar: ToolbarSettings) {
        super(plugin.app);
        this.shareUri = shareUri;
        this.toolbar = toolbar;
        this.modalEl.addClass('note-toolbar-share-dialog');
    }

    public onOpen() {

        this.setTitle(t('export.title-share', { toolbar: this.toolbar.name }));

        this.modalEl.createEl(
            "p", 
            { text: learnMoreFr(t('export.label-share-description'), 'Importing-and-exporting') }
        );

        //
        // share link
        //

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

        //
        // disclaimers, if any
        //

        let hasMenu = this.toolbar.items.some(item => (item.linkAttr.type === ItemType.Menu) && (item.link));
        if (hasMenu) {
            let disclaimers = this.modalEl.createDiv();
            disclaimers.addClass('note-toolbar-setting-field-help')
            let disclaimersList = disclaimers.createEl('ul');
            disclaimersList.createEl('li', { text: t('export.warning-share-menu') });
        }

    }

}