import NoteToolbarPlugin from "main";
import { ButtonComponent, Modal, Setting } from "obsidian";
import { t, ToolbarSettings } from "Settings/NoteToolbarSettings";
import { createToolbarPreviewFr, learnMoreFr, pluginLinkFr } from "../Utils/SettingsUIUtils";
import { importFromCallout } from "Utils/ImportExport";
import { toolbarHasVars, toolbarInvalidCommands } from "Utils/Utils";

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
        this.plugin = plugin;
        this.callout = callout;
    }

    public onOpen() {
        this.display();
    }

    async display() {

        // parse the callout to show a preview
        let toolbar: ToolbarSettings = await importFromCallout(this.plugin, this.callout, undefined, true);

        new Promise((resolve) => {

            this.setTitle("Import Note Toolbar: " + toolbar.name);

            this.contentEl.createEl("p", { text: "Confirm you would like to import this toolbar:" });

            let previewFr = toolbar ? createToolbarPreviewFr(toolbar, undefined) : '';

            let previewContainerEl = this.contentEl.createDiv();
            previewContainerEl.addClass('note-toolbar-setting-import-confirm-preview');
            previewContainerEl.createEl("p", { text: "preview", cls: 'note-toolbar-setting-small-heading' });
            previewContainerEl.createDiv().append(previewFr);

            //
            // disclaimers, if any
            //

            let importInvalidCommands = toolbarInvalidCommands(this.plugin, toolbar);
            let importHasVars = toolbarHasVars(toolbar);

            if (importInvalidCommands.length > 0 || importHasVars) {

                let disclaimers = this.contentEl.createDiv();
                disclaimers.addClass('note-toolbar-setting-field-help')
                let disclaimersList = disclaimers.createEl('ol');

                if (importInvalidCommands.length > 0) {
                    let commandDisclaimer = disclaimersList.createEl('li', { text: `This toolbar uses plugins you do not have installed and enabled:` });
                    let commandsList = commandDisclaimer.createEl('ul');
                    importInvalidCommands.map((id, index) => {
                        let commandsListItem = commandsList.createEl('li');
                        commandsListItem.appendChild(pluginLinkFr(id, id));
                    });
                }
    
                if (importHasVars) {
                    disclaimersList.createEl('li', { text: learnMoreFr("This toolbar uses variables, which you can modify to work with your vault.", 'Variables') });
                }
    
            }

            //
            // buttons
            //

            this.contentEl.createDiv().addClass('note-toolbar-setting-spacer');
            let btnContainerEl = this.contentEl.createDiv();
            btnContainerEl.addClass('note-toolbar-setting-confirm-dialog-buttons');
            new ButtonComponent(btnContainerEl)
                .setButtonText("Confirm")
                .setCta()
                .onClick(() => {
                    this.isConfirmed = true;
                    this.close();
                });
            new ButtonComponent(btnContainerEl)
                .setButtonText("Cancel")
                .onClick(() => {
                    this.close();
                });

        });

    }

}