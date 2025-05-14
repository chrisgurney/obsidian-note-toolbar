import { ButtonComponent, ItemView, MarkdownRenderer, Setting, WorkspaceLeaf } from "obsidian";
import { t, URL_FEEDBACK_FORM, URL_ISSUE_FORM, URL_USER_GUIDE, VIEW_TYPE_HELP, VIEW_TYPE_TIP } from "Settings/NoteToolbarSettings";
import { iconTextFr } from "../Settings/UI/Utils/SettingsUIUtils";
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

        const markdownEl = contentDiv.createDiv();
        markdownEl.addClass('markdown-preview-view', 'note-toolbar-setting-whatsnew-content', 'is-readable-line-width');

		const headingEl = markdownEl.createDiv();
		headingEl.addClass('note-toolbar-gallery-view-heading');
        MarkdownRenderer.render(this.plugin.app, `# ${t('setting.help.heading')}`, headingEl, '/', this.plugin);

        // const tipLink = markdownEl.createDiv().createEl("a", { href: "#", text: iconTextFr('help-circle', "Open a Tip") });
        // this.plugin.registerDomEvent(tipLink, 'click', (event) => { 
        //     this.plugin.app.workspace.getLeaf(false).setViewState({ 
        //         type: VIEW_TYPE_TIP, 
        //         state: {
        //             basename: 'getting-started',
        //             description: 'Getting started with the Note Toolbar plugin',
        //             galleryItems: ['copy', 'paste', 'undo', 'redo'],
        //             icon: 'rocket',
        //             title: 'Getting Started with Note Toolbar',
        //         },
        //         active: true 
        //     });
        // });

        // const tip2Link = markdownEl.createDiv().createEl("a", { href: "#", text: iconTextFr('help-circle', "Open another Tip") });
        // this.plugin.registerDomEvent(tip2Link, 'click', (event) => { 
        //     this.plugin.app.workspace.getLeaf(false).setViewState({ 
        //         type: VIEW_TYPE_TIP, 
        //         state: {
        //             basename: 'getting-started',
        //             description: 'Doing stuff and things',
        //             icon: 'smartphone',
        //             title: 'Mobile tips',
        //         },
        //         active: true 
        //     });
        // });

        const ctaEl = contentDiv.createDiv();
        ctaEl.addClass('note-toolbar-setting-view-cta', 'is-readable-line-width');
        new Setting(ctaEl)
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

        new Setting(ctaEl)
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
            });

        new Setting(ctaEl)
            .setName(iconTextFr('messages-square', t('setting.help.label-support')))
            .setDesc(t('setting.help.label-support-description'))
            .addButton((button: ButtonComponent) => {
                button
                    .setButtonText(t('setting.help.button-open-external'))
                    .setTooltip(t('setting.help.button-open-github'))
                    .setCta()
                    .onClick(() => {
                        window.open('https://github.com/chrisgurney/obsidian-note-toolbar/discussions', '_blank');
                    });
            });

        new Setting(ctaEl)
            .setName(iconTextFr('bug', t('setting.help.label-bug')))
            .setDesc(t('setting.help.label-bug-description'))
            .addButton((button: ButtonComponent) => {
                button
                    .setButtonText(t('setting.help.button-open-external'))
                    .setTooltip(t('setting.help.button-open-google'))
                    .onClick(() => {
                        window.open(URL_ISSUE_FORM, '_blank');
                    });
            })
            .setClass('note-toolbar-setting-no-border');

        new Setting(ctaEl)
            .setName(iconTextFr('pen-box', t('setting.help.label-feedback')))
            .setDesc(t('setting.help.label-feedback-description'))
            .addButton((button: ButtonComponent) => {
                button
                    .setButtonText(t('setting.help.button-open-external'))
                    .setTooltip(t('setting.help.button-open-google'))
                    .onClick(() => {
                        window.open(URL_FEEDBACK_FORM, '_blank');
                    });
            })
            .setClass('note-toolbar-setting-no-border');

        new Setting(ctaEl)
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