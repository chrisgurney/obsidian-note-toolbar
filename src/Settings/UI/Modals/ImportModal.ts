import NoteToolbarPlugin from "main";
import { ButtonComponent, Modal, Setting, TextAreaComponent } from "obsidian";
import { t, ToolbarSettings } from "Settings/NoteToolbarSettings";
import { importFromCallout } from "Utils/ImportExport";
import { debugLog } from "Utils/Utils";

export class ImportModal extends Modal {

    plugin: NoteToolbarPlugin;
    toolbar: ToolbarSettings;
    callout: string = '';

	constructor(plugin: NoteToolbarPlugin, toolbar: ToolbarSettings) {
        super(plugin.app);
        this.plugin = plugin;
        this.toolbar = toolbar;
    }

    public onOpen() {

        this.setTitle("Import callout into toolbar: " + this.toolbar.name);

        this.modalEl.createEl('p', { text: "Paste a Note Toolbar callout below and its items will be imported into this toolbar." });

		new Setting(this.modalEl)
            .addTextArea((textArea: TextAreaComponent) => {
                textArea
                    .setPlaceholder("> [!note-toolbar]\n> - [Some Website](https://google.com)\n> - [Some Command](obsidian://...)\n> - [[Some Note]]\n...")
                    .onChange((value) => {
                        this.callout = value;
                    });
            })
            .setClass('note-toolbar-setting-import-text-area');

        let btnContainerEl = this.modalEl.createDiv();
        btnContainerEl.addClass('note-toolbar-setting-confirm-dialog-buttons');
        new ButtonComponent(btnContainerEl)
            .setButtonText(t('import.label-confirm'))
            .setCta()
            .onClick(async () => {
                let toolbar: ToolbarSettings = await importFromCallout(this.plugin, this.callout, undefined);
                debugLog(toolbar.items);
            });
        new ButtonComponent(btnContainerEl)
            .setButtonText(t('import.label-cancel'))
            .onClick(() => {
                this.close();
            });

    }

}