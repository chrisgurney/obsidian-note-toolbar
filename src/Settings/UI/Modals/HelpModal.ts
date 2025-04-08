import NoteToolbarPlugin from "main";
import { ButtonComponent, Modal, Setting } from "obsidian";
import { URL_FEEDBACK_FORM, URL_ISSUE_FORM, t, URL_USER_GUIDE } from "Settings/NoteToolbarSettings";
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
						window.open(URL_USER_GUIDE, '_blank');
					});
			});

		new Setting(this.modalEl)
			.setName(iconTextFr('layout-grid', t('setting.help.label-gallery')))
			.setDesc(t('setting.help.label-gallery-description'))
			.addButton((button: ButtonComponent) => {
				button
					.setButtonText(t('setting.help.button-open'))
					.setTooltip(t('setting.help.label-gallery'))
					.onClick(() => {
						window.open('obsidian://note-toolbar?gallery', '_blank');
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
						window.open(URL_ISSUE_FORM, '_blank');
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
						window.open(URL_FEEDBACK_FORM, '_blank');
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