import NoteToolbarPlugin from "main";
import { Modal, Platform, Setting, TextAreaComponent, ToggleComponent } from "obsidian";
import { t, ToolbarSettings } from "Settings/NoteToolbarSettings";
import { toolbarHasMenu } from "Utils/Utils";
import { fixToggleTab, learnMoreFr } from "../Utils/SettingsUIUtils";

export default class ShareModal extends Modal {

    private useObsidianUri = false;

	constructor(
        private ntb: NoteToolbarPlugin, 
        private shareUri: string, 
        private toolbar: ToolbarSettings
    ) {
        super(ntb.app);
        this.modalEl.addClass('note-toolbar-share-dialog', 'note-toolbar-setting-dialog-phonefix');
    }

    public onOpen() {
        this.setTitle(t('export.title-share', { toolbar: this.toolbar.name, interpolation: { escapeValue: false } }));
        this.display();
    }

    public display() {

        this.contentEl.empty();
        this.modalEl.addClass('note-toolbar-setting-modal-container');

        new Setting(this.contentEl)
            .setName(learnMoreFr(t('export.label-share-description'), 'Sharing-toolbars'))
            .addTextArea((text: TextAreaComponent) => {
                text.setValue(this.shareUri);
                requestAnimationFrame((): void => {
                    text.inputEl.focus();
                    text.inputEl.select();
                    text.inputEl.readOnly = true;
                    text.inputEl.scrollTop = 0;
                    this.ntb.registerDomEvent(text.inputEl, 'focus', (event) => {
                        text.inputEl.select();
                    });
                    if (Platform.isDesktop) {
                        text.inputEl.addEventListener('copy', () => {
                            requestAnimationFrame(() => this.close());
                        });
                    }
                    setTimeout(() => {
                        text.inputEl.focus();
                        text.inputEl.select();
                    }, 50);
                });
            });

        new Setting(this.contentEl)
            .setName(t('export.option-uri'))
            .setDesc(t('export.option-uri-description'))
            .addToggle((toggle: ToggleComponent) => {
                toggle
                    .setValue(this.useObsidianUri)
                    .onChange(async (value) => {
                        this.useObsidianUri = value;
                        this.shareUri = await this.ntb.protocolManager.getShareUri(this.toolbar, this.useObsidianUri);
                        this.display();
                    });
                fixToggleTab(toggle);
            });

        //
        // disclaimers, if any
        //

        const isLongUri = this.shareUri.length > 2048;
        const hasMenu = toolbarHasMenu(this.toolbar);

        if (isLongUri || hasMenu) {
            const disclaimers = this.contentEl.createDiv();
            disclaimers.addClass('note-toolbar-setting-field-help');
            const disclaimersList = disclaimers.createEl('ul');
            if (isLongUri) disclaimersList.createEl('li', { text: t('export.warning-share-length') });
            if (hasMenu) disclaimersList.createEl('li', { text: t('export.warning-share-menu') });
        }

    }

}