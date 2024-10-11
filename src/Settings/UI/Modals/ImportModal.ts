import NoteToolbarPlugin from "main";
import { ButtonComponent, Modal, Setting, TextAreaComponent } from "obsidian";
import { t, ToolbarSettings } from "Settings/NoteToolbarSettings";
import { importFromCallout } from "Utils/ImportExport";
import { learnMoreFr } from "../Utils/SettingsUIUtils";

export async function importFromModal(plugin: NoteToolbarPlugin, toolbar?: ToolbarSettings): Promise<ToolbarSettings> {
    return new Promise((resolve, reject) => {
        const modal = new ImportModal(plugin, toolbar);
        modal.onClose = () => {
            resolve(modal.importedToolbar);
        };
        modal.open();
    });
}

export class ImportModal extends Modal {

    public importedToolbar: ToolbarSettings;

    plugin: NoteToolbarPlugin;
    toolbar?: ToolbarSettings;
    callout: string = '';

	constructor(plugin: NoteToolbarPlugin, toolbar?: ToolbarSettings) {
        super(plugin.app);
        this.modalEl.addClass('note-toolbar-setting-dialog-phonefix');
        this.plugin = plugin;
        this.toolbar = toolbar;
    }

    public onOpen() {

        new Promise((resolve) => {

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
                .setClass('note-toolbar-setting-import-text-area');

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
                .setButtonText(t('import.label-confirm'))
                .setCta()
                .onClick(async () => {
                    this.importedToolbar = await importFromCallout(this.plugin, this.callout, this.toolbar);
                    this.close();
                });
            new ButtonComponent(btnContainerEl)
                .setButtonText(t('import.label-cancel'))
                .onClick(() => {
                    this.close();
                });

        });

    }

}