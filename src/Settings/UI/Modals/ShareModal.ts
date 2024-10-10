import NoteToolbarPlugin from "main";
import { ButtonComponent, Modal, Notice, Setting, ToggleComponent } from "obsidian";
import { ItemType, t, ToolbarSettings } from "Settings/NoteToolbarSettings";
import { learnMoreFr } from "../Utils/SettingsUIUtils";

export class ShareModal extends Modal {

    plugin: NoteToolbarPlugin;
    shareUri: string;
    toolbar: ToolbarSettings;

    private useObsidianUri = false;

	constructor(plugin: NoteToolbarPlugin, shareUri: string, toolbar: ToolbarSettings) {
        super(plugin.app);
        this.plugin = plugin;
        this.shareUri = shareUri;
        this.toolbar = toolbar;
        this.modalEl.addClass('note-toolbar-share-dialog');
    }

    public onOpen() {
        this.setTitle(t('export.title-share', { toolbar: this.toolbar.name }));
        this.display();
    }

    public display() {

        this.contentEl.empty();

        this.contentEl.createEl(
            "p", 
            { text: learnMoreFr(t('export.label-share-description'), 'Importing-and-exporting') }
        );

        //
        // share link
        //

		let shareSetting = new Setting(this.contentEl)
			.setName(this.shareUri)
			.addButton((button: ButtonComponent) => {
				button
					.setButtonText(t('export.button-copy-link'))
					.setTooltip(t('export.button-copy-link-description'))
					.setCta()
					.onClick(() => {
                        navigator.clipboard.writeText(this.shareUri);
                        new Notice(t('export.notice-shared'));
                        this.close();
					});
			});

        new Setting(this.contentEl)
            .setName(t('export.option-uri'))
            .setDesc(t('export.option-uri-description'))
            .addToggle((cb: ToggleComponent) => {
                cb
                    .setValue(this.useObsidianUri)
                    .onChange(async (value) => {
                        this.useObsidianUri = value;
                        this.shareUri = await this.plugin.protocolManager.getShareUri(this.toolbar, this.useObsidianUri);
                        this.display();
                    });
            });

        //
        // disclaimers, if any
        //

        const isLongUri = this.shareUri.length > 2048;
        const hasMenu = this.toolbar.items.some(item => (item.linkAttr.type === ItemType.Menu) && (item.link));

        if (isLongUri || hasMenu) {
            let disclaimers = this.modalEl.createDiv();
            disclaimers.addClass('note-toolbar-setting-field-help');
            let disclaimersList = disclaimers.createEl('ul');
            isLongUri ? disclaimersList.createEl('li', { text: t('export.error-share-length') }) : undefined;
            hasMenu ? disclaimersList.createEl('li', { text: t('export.warning-share-menu') }) : undefined;
        }

    }

}