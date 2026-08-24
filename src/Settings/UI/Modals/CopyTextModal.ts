import NoteToolbarPlugin from "main";
import { Modal, Platform, Setting, TextAreaComponent } from "obsidian";
import { t } from "Settings/NoteToolbarSettings";

export default class CopyTextModal extends Modal {

	constructor(
        private ntb: NoteToolbarPlugin,
        private text: string,
        private title: string,
        private desc?: string | DocumentFragment,
        private notes?: string
    ) {
        super(ntb.app);
        this.modalEl.addClass('note-toolbar-copy-text-dialog', 'note-toolbar-setting-dialog-phonefix');
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
            .addTextArea((text: TextAreaComponent) => {
                text.setValue(this.text);
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

    }

}