import NoteToolbarPlugin from "main";
import { ButtonComponent, Modal } from "obsidian";
import { t, ToolbarSettings } from "Settings/NoteToolbarSettings";
import { importFromCallout } from "Utils/ImportExport";
import { learnMoreFr, pluginLinkFr } from "../Utils/SettingsUIUtils";

export async function confirmImportWithModal(ntb: NoteToolbarPlugin, callout: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
        const modal = new ImportConfirmModal(ntb, callout);
        modal.onClose = () => {
            resolve(modal.isConfirmed);
        };
        modal.open();
    });
}

export default class ImportConfirmModal extends Modal {

    public isConfirmed: boolean = false;

	constructor(
        private ntb: NoteToolbarPlugin, 
        private callout: string
    ) {
        super(ntb.app);
        this.modalEl.addClass('note-toolbar-setting-dialog-phonefix');
    }

    onOpen() {
        this.display();
    }

    display() {

        this.modalEl.addClass('note-toolbar-setting-modal-container');

        // parse the callout to show a preview
        const toolbar: ToolbarSettings = importFromCallout(this.ntb, this.callout, undefined, true);

        this.setTitle(t('import.title-import-confirmation', { toolbar: toolbar.name, interpolation: { escapeValue: false } }));

        this.modalEl.createEl('p').append(learnMoreFr(t('import.label-import-confirmation'), 'Defining-where-to-show-toolbars'));

        const previewFr = toolbar ? this.ntb.settingsUtils.createToolbarPreviewFr(toolbar, undefined) : '';

        const previewContainerEl = this.modalEl.createDiv();
        previewContainerEl.addClass('note-toolbar-setting-import-confirm-preview');
        previewContainerEl.createEl('p', { text: t('export.label-share-preview'), cls: 'note-toolbar-setting-small-heading' });
        previewContainerEl.createDiv().append(previewFr);

        //
        // disclaimers, if any
        //

        const importInvalidCommands = this.ntb.utils.getInvalidCommandsForToolbar(toolbar);
        const importHasVars = this.ntb.vars.toolbarHasVars(toolbar);

        if (importInvalidCommands.length > 0 || importHasVars) {

            const disclaimers = this.modalEl.createDiv();
            disclaimers.addClass('note-toolbar-setting-field-help');
            const disclaimersList = disclaimers.createEl('ul');

            if (importInvalidCommands.length > 0) {
                const commandDisclaimer = disclaimersList.createEl('li', { text: t('import.warning-invalid-plugins') });
                const commandsList = commandDisclaimer.createEl('ul');
                importInvalidCommands.map((id, index) => {
                    const commandsListItem = commandsList.createEl('li');
                    const pluginLink = pluginLinkFr(id, id);
                    if (pluginLink) commandsListItem.appendChild(pluginLink);
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
        const btnContainerEl = this.modalEl.createDiv();
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

    }

}