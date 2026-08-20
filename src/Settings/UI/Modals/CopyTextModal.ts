import NoteToolbarPlugin from "main";
import { ButtonComponent, Modal, Platform, Setting, TextAreaComponent } from "obsidian";
import { t } from "Settings/NoteToolbarSettings";
import CalloutSettingsModal from "./CalloutSettingsModal";

export default class CopyTextModal extends Modal {

    private textArea!: TextAreaComponent;

	constructor(
        private ntb: NoteToolbarPlugin,
        private textOrFunction: string | (() => Promise<string>),
        private title: string,
        private desc?: string | DocumentFragment,
        private notes?: string,
        private showCalloutSettings = false
    ) {
        super(ntb.app);
        this.modalEl.addClass('note-toolbar-copy-text-dialog');
    }

    public onOpen() {
        this.setTitle(this.title);
        this.display();
    }

    public display() {

        this.contentEl.empty();
        this.modalEl.addClass('note-toolbar-setting-modal-container');

        new Setting(this.contentEl)
            .setName(this.desc ?? t('copy.description'))
            .addTextArea(async (text: TextAreaComponent) => {
                this.textArea = text;
                const textValue = 
                    (typeof this.textOrFunction === 'function') ? await this.textOrFunction() : this.textOrFunction;
                text.setValue(textValue);
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

        if (this.notes) {
            const disclaimers = this.contentEl.createDiv();
            disclaimers.addClass('note-toolbar-setting-field-help');
            disclaimers.createEl('p', { text: this.notes });
        }

        if (this.showCalloutSettings) {
            new Setting(this.contentEl)
                .setName(t('setting.copy-as-callout.label-callout-settings'))
                .setDesc(t('setting.copy-as-callout.description'))
                .addButton((btn: ButtonComponent) => {
                    btn
                        .setButtonText(t('setting.copy-as-callout.button-callout-settings'))
                        .onClick((event: MouseEvent) => {
                            const calloutSettingsModal = new CalloutSettingsModal(this.ntb, async () => {
                                // on settings change, update callout text
                                const textValue = typeof this.textOrFunction === 'function'
                                    ? await this.textOrFunction()
                                    : this.textOrFunction;
                                if (textValue) this.textArea.setValue(textValue);
                            });
                            calloutSettingsModal.open();
                        });
                });
        }

    }

}