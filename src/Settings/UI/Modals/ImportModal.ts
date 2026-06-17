import NoteToolbarPlugin from "main";
import { ButtonComponent, Component, MarkdownRenderer, Modal, Setting, TextAreaComponent } from "obsidian";
import { t, ToolbarSettings } from "Settings/NoteToolbarSettings";
import { importFromCallout } from "Utils/ImportExport";
import { learnMoreFr, removeFieldError } from "../Utils/SettingsUIUtils";

export async function importFromModal(ntb: NoteToolbarPlugin, toolbar?: ToolbarSettings): Promise<[ ToolbarSettings, string ]> {
    return new Promise((resolve) => {
        const modal = new ImportModal(ntb, toolbar);
        modal.onClose = () => {
            resolve([modal.importedToolbar, modal.errorLog]);
        };
        modal.open();
    });
}

export default class ImportModal extends Modal {

    public importedToolbar!: ToolbarSettings;
    public errorLog!: string;
    private component: Component;

    callout: string = '';

	constructor(
        private ntb: NoteToolbarPlugin, 
        private toolbar?: ToolbarSettings
    ) {
        super(ntb.app);
        this.modalEl.addClass('note-toolbar-setting-dialog-phonefix');
        this.component = new Component();
        this.component.load();
    }

    public onOpen() {

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

        const calloutSetting = new Setting(this.modalEl)
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
            const help = this.modalEl.createDiv();
            help.addClass('note-toolbar-setting-field-help');
            help.setText(t('import.label-import-into-help'));
        }

        //
        // buttons
        //

        this.modalEl.createDiv().addClass('note-toolbar-setting-spacer');            
        const btnContainerEl = this.modalEl.createDiv();
        btnContainerEl.addClass('note-toolbar-setting-confirm-dialog-buttons');
        
        new ButtonComponent(btnContainerEl)
            .setButtonText(t('import.button-cancel'))
            .onClick(() => {
                this.close();
            });
        new ButtonComponent(btnContainerEl)
            .setButtonText(this.toolbar ? t('import.button-add-items') : t('import.button-create'))
            .setCta()
            .onClick(async () => {
                [ this.importedToolbar, this.errorLog ] = importFromCallout(this.ntb, this.callout, this.toolbar, false);
                if (this.errorLog) {
                    removeFieldError(calloutSetting.controlEl, "beforeend");
                    const errorEl = createDiv();
                    await MarkdownRenderer.render(this.ntb.app, this.errorLog, errorEl, '', this.component);
                    this.ntb.settingsUtils.setFieldError(null, calloutSetting.controlEl, "beforeend", errorEl);
                }
                else {
                    this.close();
                }
            });

        // set focus in the textarea
        window.setTimeout(() => {
            const textArea = this.containerEl.querySelector('textarea') as HTMLElement;
            textArea?.focus();
        }, 50);

    }

    public onClose() {
        this.component.unload();
    }

}