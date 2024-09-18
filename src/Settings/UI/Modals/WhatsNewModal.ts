import NoteToolbarPlugin from "main";
import { ButtonComponent, Component, MarkdownRenderer, Modal, Setting } from "obsidian";
import { iconTextFr } from "../Utils/SettingsUIUtils";
import { t } from "Settings/NoteToolbarSettings";
import whatsnew from "whatsnew.md";

export class WhatsNewModal extends Modal {

	public plugin: NoteToolbarPlugin;
	public component: Component;

	constructor(plugin: NoteToolbarPlugin) {
        super(plugin.app);
		this.plugin = plugin;
		this.component = new Component();
        this.modalEl.addClass('note-toolbar-setting-mini-dialog', 'note-toolbar-setting-help-dialog');
    }

    public onOpen() {

        this.setTitle("What's New");

		let contentEl = this.modalEl.createDiv();
		let markdown = whatsnew;
		
		MarkdownRenderer.render(this.plugin.app, markdown, contentEl, '/', this.component);

		new Setting(this.modalEl)
			.setName(iconTextFr('messages-square', t('setting.help.label-support')))
			.setDesc(t('setting.help.label-support-description'))
			.addButton((button: ButtonComponent) => {
				button
					.setButtonText(t('setting.help.button-open'))
					.setTooltip(t('setting.help.button-open-github'))
					.setCta()
					.onClick(() => {
						window.open('https://github.com/chrisgurney/obsidian-note-toolbar/discussions', '_blank');
					});
			});

    }

}