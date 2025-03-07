import NoteToolbarPlugin from "main";
import { ButtonComponent, Modal, Setting } from "obsidian";
import { t, USER_GUIDE_URL } from "Settings/NoteToolbarSettings";
import { iconTextFr } from "../Utils/SettingsUIUtils";

export class HelpModal extends Modal {

	constructor(plugin: NoteToolbarPlugin) {
        super(plugin.app);
        this.modalEl.addClass('note-toolbar-setting-mini-dialog', 'note-toolbar-setting-help-dialog');
    }

    public onOpen() {

        this.setTitle(t('setting.help.title'));

		new Setting(this.modalEl)
			.setName(iconTextFr('book-open', t('setting.help.label-user-guide')))
			.setDesc(t('setting.help.label-user-guide-description'))
			.addButton((button: ButtonComponent) => {
				button
					.setButtonText(t('setting.help.button-read'))
					.setTooltip(t('setting.help.button-open-github'))
					.setCta()
					.onClick(() => {
						window.open(USER_GUIDE_URL, '_blank');
					});
			});

		new Setting(this.modalEl)
			.setName(iconTextFr('layout-grid', t('setting.help.label-examples')))
			.setDesc(t('setting.help.label-examples-description'))
			.addButton((button: ButtonComponent) => {
				button
					.setButtonText(t('setting.help.button-open'))
					.setTooltip(t('setting.help.button-open-github'))
					.onClick(() => {
						window.open('https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Examples', '_blank');
					});
			})
			.setClass('note-toolbar-setting-no-border');

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

		new Setting(this.modalEl)
			.setName(iconTextFr('bug', t('setting.help.label-bug')))
			.setDesc(t('setting.help.label-bug-description'))
			.addButton((button: ButtonComponent) => {
				button
					.setButtonText(t('setting.help.button-open'))
					.setTooltip(t('setting.help.button-open-google'))
					.onClick(() => {
						window.open('https://docs.google.com/forms/d/e/1FAIpQLSf_cABJLmNqPm-2DjH6vcxyuYKNoP-mmeyk8_vph8KMZHDSyg/viewform', '_blank');
					});
			})
			.setClass('note-toolbar-setting-no-border');

		new Setting(this.modalEl)
			.setName(iconTextFr('pen-box', t('setting.help.label-feedback')))
			.setDesc(t('setting.help.label-feedback-description'))
			.addButton((button: ButtonComponent) => {
				button
					.setButtonText(t('setting.help.button-open'))
					.setTooltip(t('setting.help.button-open-google'))
					.onClick(() => {
						window.open('https://docs.google.com/forms/d/e/1FAIpQLSeVWHVnookJr8HVQywk5TwupU-p7vkRkSt83Q5jscR6VwpZEQ/viewform', '_blank');
					});
			})
			.setClass('note-toolbar-setting-no-border');

		new Setting(this.modalEl)
			.setName(iconTextFr('heart', t('setting.help.label-donate')))
			.setDesc(t('setting.help.label-donate-description'))
			.addButton((button: ButtonComponent) => {
				button
					.setButtonText(t('setting.help.button-donate'))
					.setTooltip(t('setting.help.button-donate-tooltip'))
					.setCta()
					.onClick(() => {
						window.open('https://buymeacoffee.com/cheznine', '_blank');
					});
			});

    }

}