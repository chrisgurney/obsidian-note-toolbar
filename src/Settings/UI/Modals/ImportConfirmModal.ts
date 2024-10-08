import NoteToolbarPlugin from "main";
import { ButtonComponent, Modal, Setting } from "obsidian";
import { t, ToolbarSettings } from "Settings/NoteToolbarSettings";
import { createToolbarPreviewFr, learnMoreFr } from "../Utils/SettingsUIUtils";
import { importFromCallout } from "Utils/ImportExport";
import { toolbarHasInvalidCommands, toolbarHasVars } from "Utils/Utils";

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

        let toolbar: ToolbarSettings = await importFromCallout(this.plugin, this.callout, undefined, true);

        new Promise((resolve) => {

            this.setTitle("Import to Note Toolbar");

            this.contentEl.createEl("p", { text: "Do you want to import this toolbar?" });

            let previewFr = toolbar ? createToolbarPreviewFr(toolbar, undefined) : '';

            let previewContainerEl = this.contentEl.createDiv();
            previewContainerEl.addClass('note-toolbar-setting-import-confirm-preview');
            previewContainerEl.createEl("p", { text: "toolbar name", cls: 'note-toolbar-setting-small-heading' });
            previewContainerEl.createDiv().setText(toolbar.name);
            previewContainerEl.createEl("p", { text: "preview", cls: 'note-toolbar-setting-small-heading' });
            previewContainerEl.createDiv().append(previewFr);

            this.contentEl.createDiv().addClass('note-toolbar-setting-spacer');

            if (toolbarHasInvalidCommands(this.plugin, toolbar)) {
                let disclaimerCommands = this.contentEl.createEl("p", { text: "This toolbar uses commands for plugins you do not have installed in your vault." });
                disclaimerCommands.addClass('note-toolbar-setting-field-help');
            }

            if (toolbarHasVars(toolbar)) {
                let disclaimerVars = this.contentEl.createEl("p", { text: learnMoreFr("This toolbar uses variables, which you will likely need to review to work with your vault.", 'Variables') });
                disclaimerVars.addClass('note-toolbar-setting-field-help');
            }

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