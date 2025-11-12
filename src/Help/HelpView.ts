import NoteToolbarPlugin from "main";
import { ButtonComponent, ItemView, setIcon, Setting, WorkspaceLeaf } from "obsidian";
import { t, URL_FEEDBACK_FORM, URL_ISSUE_FORM, URL_USER_GUIDE, VIEW_TYPE_HELP } from "Settings/NoteToolbarSettings";
import { iconTextFr } from "../Settings/UI/Utils/SettingsUIUtils";

export default class HelpView extends ItemView {

    constructor(private ntb: NoteToolbarPlugin, leaf: WorkspaceLeaf) {
        super(leaf);
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

        const containerDiv = this.contentEl.createDiv();
        containerDiv.addClass('note-toolbar-setting-help-view', 'note-toolbar-setting-help-content');

        const contentDiv = containerDiv.createDiv();
        contentDiv.addClass('is-readable-line-width');
        
		const bannerEl = contentDiv.createDiv();
		bannerEl.addClass('note-toolbar-setting-view-banner', 'note-toolbar-setting-help-view-title');
		const bannerIconEl = bannerEl.createDiv();
		setIcon(bannerIconEl, 'circle-help');
		bannerEl.createEl('h1').setText(t('setting.help.heading'));

        // Tips

        // const tipsEl = contentDiv.createDiv();
        // tipsEl.addClass('note-toolbar-tips-card-items');
        // renderTipItems(this.plugin, tipsEl, ['gallery', 'getting-started', 'daily-notes', 'mobile-tips']);

        const galleryEl = contentDiv.createDiv();
        galleryEl.addClass('note-toolbar-setting-view-cta', 'note-toolbar-setting-help-view-section');
        new Setting(galleryEl)
            .setName(iconTextFr('layout-grid', t('setting.help.label-gallery')))
            .setDesc(t('setting.help.label-gallery-description'))
            .addButton((button: ButtonComponent) => {
                button
                    .setButtonText(t('setting.help.button-open'))
                    .setTooltip(t('setting.help.label-gallery'))
                    .setCta()
                    .onClick(() => {
                        window.open('obsidian://note-toolbar?gallery', '_blank');
                    });
            })
            .setClass('note-toolbar-setting-no-border');

        // User guide

        contentDiv.createEl('h2').setText(t('setting.help.heading-user-guide'));

        const guideEl = contentDiv.createDiv();
        guideEl.addClass('note-toolbar-setting-view-cta', 'note-toolbar-setting-help-view-section');
        new Setting(guideEl)
            .setName(iconTextFr('book-open', t('setting.help.label-user-guide')))
            .addButton((button: ButtonComponent) => {
                button
                    .setButtonText(t('setting.help.button-read'))
                    .setTooltip(t('setting.help.button-open-github'))
                    .setCta()
                    .onClick(() => {
                        window.open(URL_USER_GUIDE, '_blank');
                    });
            })
            .setClass('note-toolbar-setting-no-border');

        // Support

        contentDiv.createEl('h2').setText(t('setting.help.heading-support'));

        const supportEl = contentDiv.createDiv();
        supportEl.addClass('note-toolbar-setting-view-cta', 'note-toolbar-setting-help-view-section');
        new Setting(supportEl)
            .setName(iconTextFr('messages-square', t('setting.help.label-support')))
            .addButton((button: ButtonComponent) => {
                button
                    .setButtonText(t('setting.help.button-open-external'))
                    .setTooltip(t('setting.help.button-open-github'))
                    .setCta()
                    .onClick(() => {
                        window.open('https://github.com/chrisgurney/obsidian-note-toolbar/discussions', '_blank');
                    });
            })
            .setClass('note-toolbar-setting-no-border');

        new Setting(supportEl)
            .setName(iconTextFr('circle-dot', t('setting.help.label-issues')))
            .addButton((button: ButtonComponent) => {
                button
                    .setButtonText(t('setting.help.button-open-external'))
                    .setTooltip(t('setting.help.button-open-github'))
                    .setCta()
                    .onClick(() => {
                        window.open('https://github.com/chrisgurney/obsidian-note-toolbar/issues', '_blank');
                    });
            });

        new Setting(supportEl)
            .setName(iconTextFr('bug', t('setting.help.label-bug')))
            .addButton((button: ButtonComponent) => {
                button
                    .setButtonText(t('setting.help.button-open-external'))
                    .setTooltip(t('setting.help.button-open-google'))
                    .setCta()
                    .onClick(() => {
                        window.open(URL_ISSUE_FORM, '_blank');
                    });
            });

        new Setting(supportEl)
            .setName(iconTextFr('pen-box', t('setting.help.label-feedback')))
            .addButton((button: ButtonComponent) => {
                button
                    .setButtonText(t('setting.help.button-open-external'))
                    .setTooltip(t('setting.help.button-open-google'))
                    .setCta()
                    .onClick(() => {
                        window.open(URL_FEEDBACK_FORM, '_blank');
                    });
            });

        // Donate

        contentDiv.createEl('h2').setText(t('setting.help.heading-donate'));

        const donateEl = contentDiv.createDiv();
        donateEl.addClass('note-toolbar-setting-view-cta', 'note-toolbar-setting-help-view-section');
        new Setting(donateEl)
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
            })
            .setClass('note-toolbar-setting-no-border');

    }

    async onClose() {
    }

}