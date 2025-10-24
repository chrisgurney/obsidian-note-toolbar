import NoteToolbarPlugin from "main";
import { ButtonComponent, Modal, Setting } from "obsidian";
import { t, ToolbarSettings } from "Settings/NoteToolbarSettings";
import { createToolbarPreviewFr, learnMoreFr, pluginLinkFr } from "../Utils/SettingsUIUtils";
import { importFromCallout } from "Utils/ImportExport";
import { toolbarInvalidCommands } from "Utils/Utils";

export async function confirmImportWithModal(plugin: NoteToolbarPlugin, callout: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
        const modal = new ImportConfirmModal(plugin, callout);
        modal.onClose = () => {
            resolve(modal.isConfirmed);
        };
        modal.open();
    });
}

export class ImportConfirmModal extends Modal {

    public isConfirmed: boolean = false;
    plugin: NoteToolbarPlugin;
    callout: string;

	constructor(plugin: NoteToolbarPlugin, callout: string) {
        super(plugin.app);
        this.modalEl.addClass('note-toolbar-setting-dialog-phonefix');
        this.plugin = plugin;
        this.callout = callout;
    }

    public onOpen() {
        this.display();
    }

    async display() {

        this.modalEl.addClass('note-toolbar-setting-modal-container');

        // parse the callout to show a preview
        let toolbar: ToolbarSettings = await importFromCallout(this.plugin, this.callout, undefined, true);

        new Promise((resolve) => {

            this.setTitle(t('import.title-import-confirmation', { toolbar: toolbar.name, interpolation: { escapeValue: false } }));

            this.modalEl.createEl('p').append(learnMoreFr(t('import.label-import-confirmation'), 'Defining-where-to-show-toolbars'));

            let previewFr = toolbar ? createToolbarPreviewFr(this.plugin, toolbar, undefined) : '';

            let previewContainerEl = this.modalEl.createDiv();
            previewContainerEl.addClass('note-toolbar-setting-import-confirm-preview');
            previewContainerEl.createEl('p', { text: t('export.label-share-preview'), cls: 'note-toolbar-setting-small-heading' });
            previewContainerEl.createDiv().append(previewFr);

            //
            // disclaimers, if any
            //

            let importInvalidCommands = toolbarInvalidCommands(this.plugin, toolbar);
            let importHasVars = this.plugin.toolbarHasVars(toolbar);

            if (importInvalidCommands.length > 0 || importHasVars) {

                let disclaimers = this.modalEl.createDiv();
                disclaimers.addClass('note-toolbar-setting-field-help');
                let disclaimersList = disclaimers.createEl('ul');

                if (importInvalidCommands.length > 0) {
                    let commandDisclaimer = disclaimersList.createEl('li', { text: t('import.warning-invalid-plugins') });
                    let commandsList = commandDisclaimer.createEl('ul');
                    importInvalidCommands.map((id, index) => {
                        let commandsListItem = commandsList.createEl('li');
                        let pluginLink = pluginLinkFr(id, id);
                        pluginLink ? commandsListItem.appendChild(pluginLink) : undefined;
                    });
                }
    
                if (importHasVars) {
                    disclaimersList.createEl('li', { text: learnMoreFr(t('import.warning-vars'), 'Variables') });
                }
    
            }

            //
            // buttons
            //

            this.modalEl.createDiv().addClass('note-toolbar-setting-spacer');
            let btnContainerEl = this.modalEl.createDiv();
            btnContainerEl.addClass('note-toolbar-setting-confirm-dialog-buttons');
            new ButtonComponent(btnContainerEl)
                .setButtonText(t('import.button-confirm'))
                .setCta()
                .onClick(() => {
                    this.isConfirmed = true;
                    this.close();
                });
            new ButtonComponent(btnContainerEl)
                .setButtonText(t('import.button-cancel'))
                .onClick(() => {
                    this.close();
                });

        });

    }

}