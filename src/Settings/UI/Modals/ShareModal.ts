import NoteToolbarPlugin from "main";
import { Modal, Platform, Setting, TextAreaComponent, ToggleComponent } from "obsidian";
import { ItemType, t, ToolbarItemSettings, ToolbarSettings } from "Settings/NoteToolbarSettings";
import { toolbarHasMenu } from "Utils/Utils";
import { fixToggleTab, learnMoreFr } from "../Utils/SettingsUIUtils";

export default class ShareModal extends Modal {

    private useObsidianUri = false;

	constructor(
        private ntb: NoteToolbarPlugin, 
        private shareUri: string, 
        private toolbarOrItem: ToolbarSettings | ToolbarItemSettings
    ) {
        super(ntb.app);
        this.modalEl.addClass('note-toolbar-share-dialog', 'note-toolbar-setting-dialog-phonefix');
    }

    public onOpen() {
        const isToolbar = 'items' in this.toolbarOrItem;
        if (isToolbar) {
            this.setTitle(t('export.title-share', { toolbar: (this.toolbarOrItem as ToolbarSettings).name, interpolation: { escapeValue: false } })); 
        }
        else {
            const itemText = (this.toolbarOrItem as ToolbarItemSettings).label || (this.toolbarOrItem as ToolbarItemSettings).tooltip || (this.toolbarOrItem as ToolbarItemSettings).icon;
            this.setTitle(t('export.item-share', { item: itemText, interpolation: { escapeValue: false } }));
        }
        this.display();
    }

    public display() {

        const isToolbar = 'items' in this.toolbarOrItem;

        this.contentEl.empty();
        this.modalEl.addClass('note-toolbar-setting-modal-container');

        new Setting(this.contentEl)
            .setName(learnMoreFr(t('export.label-share-description'), 'Sharing-toolbars'))
            .addTextArea((text: TextAreaComponent) => {
                text.setValue(this.shareUri);
                window.requestAnimationFrame((): void => {
                    text.inputEl.focus();
                    text.inputEl.select();
                    text.inputEl.readOnly = true;
                    text.inputEl.scrollTop = 0;
                    this.ntb.registerDomEvent(text.inputEl, 'focus', () => {
                        text.inputEl.select();
                    });
                    if (Platform.isDesktop) {
                        text.inputEl.addEventListener('copy', () => {
                            window.requestAnimationFrame(() => this.close());
                        });
                    }
                    window.setTimeout(() => {
                        text.inputEl.focus();
                        text.inputEl.select();
                    }, 50);
                });
            });

        this.contentEl.createEl('p', { 
            cls: 'note-toolbar-setting-field-help-copy',
            text: Platform.isDesktop ? t('copy.instructions_desktop') : t('copy.instructions_mobile')
        });

        new Setting(this.contentEl)
            .setName(t('export.option-uri'))
            .setDesc(t('export.option-uri-description'))
            .addToggle((toggle: ToggleComponent) => {
                toggle
                    .setValue(this.useObsidianUri)
                    .onChange(async (value) => {
                        this.useObsidianUri = value;
                        this.shareUri = await this.ntb.protocolManager.getShareUri(this.toolbarOrItem, this.useObsidianUri);
                        this.display();
                    });
                fixToggleTab(toggle);
            });

        //
        // disclaimers, if any
        //

        const isLongUri = this.shareUri.length > 2048;
        const hasMenu = isToolbar 
            ? toolbarHasMenu((this.toolbarOrItem as ToolbarSettings)) 
            : ((this.toolbarOrItem as ToolbarItemSettings).linkAttr.type === ItemType.Menu);

        if (isLongUri || hasMenu) {
            const disclaimers = this.contentEl.createDiv();
            disclaimers.addClass('note-toolbar-setting-field-help');
            const disclaimersList = disclaimers.createEl('ul');
            if (isLongUri) disclaimersList.createEl('li', { text: t('export.warning-share-length') });
            if (hasMenu) disclaimersList.createEl('li', { text: t('export.warning-share-menu') });
        }

    }

}