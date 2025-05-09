import { ButtonComponent, ItemView, Setting, WorkspaceLeaf } from "obsidian";
import { t, URL_FEEDBACK_FORM, URL_ISSUE_FORM, URL_USER_GUIDE, VIEW_TYPE_HELP } from "Settings/NoteToolbarSettings";
import { iconTextFr } from "../Utils/SettingsUIUtils";
import NoteToolbarPlugin from "main";


export class HelpView extends ItemView {

    plugin: NoteToolbarPlugin;

    constructor(plugin: NoteToolbarPlugin, leaf: WorkspaceLeaf) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType(): string {
        return VIEW_TYPE_HELP;
    }

    getDisplayText(): string {
        return t('setting.help.title');
    }

    getIcon(): string {
        return 'circle-help';
    }

    async onOpen() {

        const contentDiv = this.contentEl.createDiv();
        contentDiv.addClass('note-toolbar-setting-help-view');

        const helpLinkDiv = contentDiv.createDiv();
        helpLinkDiv.addClass('is-readable-line-width');
        new Setting(helpLinkDiv)
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

        new Setting(helpLinkDiv)
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

        new Setting(helpLinkDiv)
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

        new Setting(helpLinkDiv)
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

        new Setting(helpLinkDiv)
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

        new Setting(helpLinkDiv)
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

    async onClose() {
    }

}