import NoteToolbarPlugin from "main";
import { ButtonComponent, Modal, Platform, Setting, TextAreaComponent } from "obsidian";
import { t } from "Settings/NoteToolbarSettings";
import CalloutSettingsModal from "./CalloutSettingsModal";

export default class CopyTextModal extends Modal {

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

        this.contentEl.append(
            CopyTextModal.renderCopyTextContent(this.ntb, this.textOrFunction, this.desc, this.notes, this.showCalloutSettings)
        );

    }

    static renderCopyTextContent(
        ntb: NoteToolbarPlugin,
        textOrFunction: string | (() => Promise<string>),
        desc?: string | DocumentFragment,
        notes?: string,
        showCalloutSettings = false
    ): HTMLElement {

        const copyTextContentEl = createDiv();

        let textArea: TextAreaComponent;

        new Setting(copyTextContentEl)
            .setName(desc ?? t('copy.description'))
            .addTextArea(async (text: TextAreaComponent) => {
                textArea = text;
                const textValue = 
                    (typeof textOrFunction === 'function') ? await textOrFunction() : textOrFunction;
                text.setValue(textValue);
                window.requestAnimationFrame((): void => {
                    text.inputEl.focus();
                    text.inputEl.select();
                    text.inputEl.readOnly = true;
                    text.inputEl.scrollTop = 0;
                    ntb.registerDomEvent(text.inputEl, 'focus', () => {
                        text.inputEl.select();
                    });
                    window.setTimeout(() => {
                        text.inputEl.focus();
                        text.inputEl.select();
                    }, 50);
                });
            });
    
        copyTextContentEl.createEl('p', { 
            cls: 'note-toolbar-setting-field-help-copy',
            text: Platform.isDesktop ? t('copy.instructions_desktop') : t('copy.instructions_mobile')
        });

        if (notes) {
            const disclaimers = copyTextContentEl.createDiv();
            disclaimers.addClass('note-toolbar-setting-field-help');
            disclaimers.createEl('p', { text: notes });
        }

        if (showCalloutSettings) {
            new Setting(copyTextContentEl)
                .setName(t('setting.copy-as-callout.label-callout-settings'))
                .setDesc(t('setting.copy-as-callout.description'))
                .addButton((btn: ButtonComponent) => {
                    btn
                        .setButtonText(t('setting.copy-as-callout.button-callout-settings'))
                        .onClick((event: MouseEvent) => {
                            const calloutSettingsModal = new CalloutSettingsModal(ntb, async () => {
                                // on settings change, update callout text
                                const textValue = typeof textOrFunction === 'function'
                                    ? await textOrFunction()
                                    : textOrFunction;
                                if (textValue) textArea.setValue(textValue);
                            });
                            calloutSettingsModal.open();
                        });
                });
        }

        return copyTextContentEl;

    }

}