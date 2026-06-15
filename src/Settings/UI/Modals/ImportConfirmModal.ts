import NoteToolbarPlugin from "main";
import { ButtonComponent, Modal } from "obsidian";
import { ScriptConfig, t, ToolbarItemSettings, ToolbarSettings } from "Settings/NoteToolbarSettings";
import { importFromCallout } from "Utils/ImportExport";
import { learnMoreFr, pluginLinkFr } from "../Utils/SettingsUIUtils";
import { renderItemPreviewEl } from "../Components/ItemListUi";

export async function confirmImportWithModal(ntb: NoteToolbarPlugin, callout: string): Promise<boolean> {
    return new Promise((resolve) => {
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
        let previewFr: DocumentFragment | undefined;
        const toolbar: ToolbarSettings = importFromCallout(this.ntb, this.callout, undefined, true);
        const isToolbar = this.callout.includes('[!note-toolbar');

        // if callout is a toolbar, preview as a toolbar
        if (isToolbar) {
            this.setTitle(t('import.title-import-confirmation', { toolbar: toolbar.name, interpolation: { escapeValue: false } }));
            this.modalEl.createEl('p').append(learnMoreFr(t('import.label-import-confirmation'), 'Defining-where-to-show-toolbars'));
            previewFr = toolbar ? this.ntb.settingsUtils.createToolbarPreviewFr(toolbar, undefined) : undefined;
        }
        // otherwise callout is just items; preview as a list of items
        else {
            this.setTitle(t('import.title-import-item'));
            this.modalEl.createEl('p').append(t('import.label-import-item-confirmation'));
            const itemPreviewsContainerEl = createDiv({ cls: ['note-toolbar-setting-item-preview-container', 'note-toolbar-setting-import-confirm-preview-container'] });
            toolbar.items.forEach((item: ToolbarItemSettings, ) => {
                const itemPreviewEl = itemPreviewsContainerEl.createDiv({ cls: 'note-toolbar-setting-item-preview' });
                renderItemPreviewEl(this.ntb, item, itemPreviewEl, false);
                // show preview of script content
                const scriptText = this.formatScriptSummary(item.scriptConfig, true);
                if (scriptText) {
                    itemPreviewsContainerEl.createEl('p', { text: t('export.label-share-script'), cls: 'note-toolbar-setting-small-heading' })
                    const scriptPreviewEl = itemPreviewsContainerEl.createDiv({ cls: 'note-toolbar-setting-script-preview' });
                    scriptPreviewEl.createDiv().setText(scriptText);
                }
            });
            previewFr = new DocumentFragment();
            previewFr.append(itemPreviewsContainerEl);
        }

        if (previewFr) {
            const previewContainerEl = this.modalEl.createDiv();
            previewContainerEl.addClass('note-toolbar-setting-import-confirm-preview');
            previewContainerEl.createEl('p', { text: t('export.label-share-preview'), cls: 'note-toolbar-setting-small-heading' });
            previewContainerEl.createDiv().append(previewFr);
        }

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
                importInvalidCommands.map((id, ) => {
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
            .setButtonText(t('import.button-cancel'))
            .onClick(() => {
                this.close();
            });
        new ButtonComponent(btnContainerEl)
            .setButtonText(isToolbar ? t('import.button-confirm') : t('import.button-select-toolbar'))
            .setCta()
            .onClick(() => {
                this.isConfirmed = true;
                this.close();
            });

    }

    formatScriptSummary(config: ScriptConfig | undefined, verbose: boolean): string {
        if (!config) return '';
        const parts: string[] = [];
        if (config.sourceFile) parts.push(`${config.sourceFile}`);
        if (config.sourceFunction) parts.push(`${config.sourceFunction}`);
        if (config.expression) parts.push(verbose ? config.expression : config.expression.replace(/\n/g, ' '));
        return parts.join(' | ');
    }
    
}
