import NoteToolbarPlugin from "main";
import { ButtonComponent, Modal, Setting, TextAreaComponent } from "obsidian";
import { t, ToolbarSettings } from "Settings/NoteToolbarSettings";
import { importFromCallout } from "Utils/ImportExport";
import { learnMoreFr } from "../Utils/SettingsUIUtils";

export async function importFromModal(ntb: NoteToolbarPlugin, toolbar?: ToolbarSettings): Promise<ToolbarSettings> {
    return new Promise((resolve, reject) => {
        const modal = new ImportModal(ntb, toolbar);
        modal.onClose = () => {
            resolve(modal.importedToolbar);
        };
        modal.open();
    });
}

export default class ImportModal extends Modal {

    public importedToolbar: ToolbarSettings;

    callout: string = '';

	constructor(
        private ntb: NoteToolbarPlugin, 
        private toolbar?: ToolbarSettings
    ) {
        super(ntb.app);
        this.modalEl.addClass('note-toolbar-setting-dialog-phonefix');
    }

    public onOpen() {

        new Promise((resolve) => {

            this.modalEl.addClass('note-toolbar-setting-modal-container');
            
            this.setTitle(this.toolbar
                ? t('import.title-import-into', { toolbar: this.toolbar.name })
                : t('import.title-import')
            );

            this.modalEl.createEl('p', { text: this.toolbar
                ? learnMoreFr(t('import.label-import-into'), 'Creating-toolbars-from-callouts') 
                : learnMoreFr(t('import.label-import'), 'Creating-toolbars-from-callouts') 
            });

            //
            // text area
            //

            new Setting(this.modalEl)
                .addTextArea((textArea: TextAreaComponent) => {
                    textArea
                        .setPlaceholder(t('import.placeholder-import-into'))
                        .onChange((value) => {
                            this.callout = value;
                        });
                })
                .setClass('note-toolbar-setting-import-text-area')
                .setClass('note-toolbar-setting-no-border');

            //
            // help
            //

            if (this.toolbar) {
                let help = this.modalEl.createDiv();
                help.addClass('note-toolbar-setting-field-help');
                help.setText(t('import.label-import-into-help'));
            }

            //
            // buttons
            //

            this.modalEl.createDiv().addClass('note-toolbar-setting-spacer');            
            let btnContainerEl = this.modalEl.createDiv();
            btnContainerEl.addClass('note-toolbar-setting-confirm-dialog-buttons');
            new ButtonComponent(btnContainerEl)
                .setButtonText(this.toolbar ? t('import.button-add-items') : t('import.button-create'))
                .setCta()
                .onClick(async () => {
                    this.importedToolbar = await importFromCallout(this.ntb, this.callout, this.toolbar);
                    this.close();
                });
            new ButtonComponent(btnContainerEl)
                .setButtonText(t('import.button-cancel'))
                .onClick(() => {
                    this.close();
                });

            // set focus in the textarea
            setTimeout(() => {
                const textArea = this.containerEl.querySelector('textarea') as HTMLElement;
                textArea?.focus();
            }, 50);

        });

    }

}