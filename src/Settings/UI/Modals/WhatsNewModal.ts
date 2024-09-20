import NoteToolbarPlugin from "main";
import { ButtonComponent, Component, MarkdownRenderer, Modal, Setting } from "obsidian";
import { iconTextFr } from "../Utils/SettingsUIUtils";
import { t, tdocs } from "Settings/NoteToolbarSettings";

export class WhatsNewModal extends Modal {

	public plugin: NoteToolbarPlugin;
	public component: Component;

	constructor(plugin: NoteToolbarPlugin) {
        super(plugin.app);
		this.plugin = plugin;
		this.component = new Component();
        this.modalEl.addClass('note-toolbar-setting-whatsnew-dialog');
    }

    public onOpen() {

		this.setTitle(t('setting.whats-new.title'));
		this.titleEl.addClass('note-toolbar-setting-whatsnew-banner');

		let footerEl = this.contentEl.createDiv();
		footerEl.addClass('note-toolbar-setting-whatsnew-notes');
		new Setting(footerEl)
			.setName(iconTextFr('book-text', t('setting.whats-new.label-release-notes')))
			.setDesc(t('setting.whats-new.label-release-notes-description'))
			.addButton((button: ButtonComponent) => {
				button
					.setButtonText(t('setting.whats-new.button-read'))
					.setTooltip(t('setting.whats-new.button-read-tooltip'))
					.setCta()
					.onClick(() => {
						window.open('https://github.com/chrisgurney/obsidian-note-toolbar/releases', '_blank');
					});
			});

		let markdownEl = this.contentEl.createDiv();
		markdownEl.addClass('note-toolbar-setting-whatsnew-content');

		MarkdownRenderer.render(this.plugin.app, tdocs('whats-new'), markdownEl, '/', this.component);

    }

}