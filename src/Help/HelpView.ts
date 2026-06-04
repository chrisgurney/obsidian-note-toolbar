import NoteToolbarPlugin from "main";
import { ItemView, WorkspaceLeaf } from "obsidian";
import { PositionType, t, VIEW_TYPE_HELP, VIEW_TYPE_WHATS_NEW } from "Settings/NoteToolbarSettings";
import { URLS } from "Utils/Urls";
import { PLUGIN_VERSION } from "version";
import { iconTextFr } from "../Settings/UI/Utils/SettingsUIUtils";
import { renderTipItems } from "./TipView";

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

        // reset navbar position if needed
        this.ntb.render.updatePhoneNavigation(PositionType.Hidden);
        activeDocument.body.toggleClass('ntb-remove-view-header', false);

        const containerDiv = this.contentEl.createDiv();
        containerDiv.addClass('note-toolbar-setting-help-view', 'note-toolbar-setting-help-content');

        const contentDiv = containerDiv.createDiv();
        contentDiv.addClass('is-readable-line-width');
        
        this.ntb.settingsUtils.addCloseToPhoneNav(this);

        // Heading + Onboarding message

		const bannerEl = contentDiv.createDiv();
		bannerEl.addClass('note-toolbar-setting-help-view-title', 'note-toolbar-setting-view-banner');
        bannerEl.createEl('h1').setText(t('plugin.note-toolbar') + ' v' + PLUGIN_VERSION);
        await this.ntb.settingsUtils.runOnboarding('startup-help-welcome', () => {
            const welcomeEl = bannerEl.createDiv();
            welcomeEl.createEl('p', { text: t('setting.help.label-welcome') });
        });

        // Tips

        const tipsEl = contentDiv.createDiv();
        tipsEl.addClass('note-toolbar-tips-card-items');
        renderTipItems(this.ntb, tipsEl, ['getting-started', 'gallery']);

        // User guide

        contentDiv.createEl('h2').setText(t('setting.help.heading-learn'));
        const guideEl = contentDiv.createDiv();
        guideEl.addClass('note-toolbar-setting-help-view-section');

        guideEl.createDiv({ cls: 'note-toolbar-setting-link' }).append(
            createDiv({ cls: 'note-toolbar-setting-link-text' }, el => el.append(iconTextFr('party-popper', t('setting.help.label-whats-new')))),
            createEl('a', { cls: 'note-toolbar-setting-link-button', text: t('setting.help.button-open'), attr: { 'aria-label': t('setting.button-whats-new-tooltip') } }, el => {
                el.addEventListener('click', () => void this.ntb.app.workspace.getLeaf(true).setViewState({ type: VIEW_TYPE_WHATS_NEW, active: true }));
            })
        );

        guideEl.createDiv({ cls: 'note-toolbar-setting-link' }).append(
            createDiv({ cls: 'note-toolbar-setting-link-text' }, el => el.append(iconTextFr('book-open', t('setting.help.label-user-guide')))),
            createEl('a', { cls: 'note-toolbar-setting-link-button', text: t('setting.help.button-read'), href: URLS.GH_USER_GUIDE, attr: { 'aria-label': t('setting.help.button-open-github'), 'target': '_blank', 'rel': 'noopener noreferrer' } })
        );

        guideEl.createDiv({ cls: 'note-toolbar-setting-link' }).append(
            createDiv({ cls: 'note-toolbar-setting-link-text' }, el => el.append(iconTextFr('settings', t('setting.help.label-settings')))),
            createEl('a', { cls: 'note-toolbar-setting-link-button', text: t('setting.help.button-open'), attr: { 'aria-label': t('setting.help.tooltip-settings') } }, el => {
                el.addEventListener('click', () => this.ntb.commands.openSettings());
            })
        );

        // Support

        contentDiv.createEl('h2').setText(t('setting.help.heading-support'));
        const supportEl = contentDiv.createDiv();
        supportEl.addClass('note-toolbar-setting-help-view-section');

        supportEl.createDiv({ cls: 'note-toolbar-setting-link' }).append(
            createDiv({ cls: 'note-toolbar-setting-link-text' }, el => el.append(iconTextFr('messages-square', t('setting.help.label-support')))),
            createEl('a', { cls: 'note-toolbar-setting-link-button', text: t('setting.help.button-open-external'), href: URLS.GH_DISCUSSIONS, attr: { 'aria-label': t('setting.help.button-open-github') } })
        );

        supportEl.createDiv({ cls: 'note-toolbar-setting-link' }).append(
            createDiv({ cls: 'note-toolbar-setting-link-text' }, el => el.append(iconTextFr('circle-dot', t('setting.help.label-issues')))),
            createEl('a', { cls: 'note-toolbar-setting-link-button', text: t('setting.help.button-open-external'), href: URLS.GH_ISSUES, attr: { 'aria-label': t('setting.help.button-open-github') } })
        );

        supportEl.createDiv({ cls: 'note-toolbar-setting-link' }).append(
            createDiv({ cls: 'note-toolbar-setting-link-text' }, el => el.append(iconTextFr('bug', t('setting.help.label-bug')))),
            createEl('a', { cls: 'note-toolbar-setting-link-button', text: t('setting.help.button-open-external'), href: URLS.GH_USER_GUIDE + '/Feedback', attr: { 'aria-label': t('setting.help.button-open-github') } })
        );

        // Donate

        contentDiv.createEl('h2').setText(t('setting.help.heading-donate'));
        const contribEl = contentDiv.createDiv();
        contribEl.addClass('note-toolbar-setting-help-view-section');

        contribEl.createDiv({ cls: 'note-toolbar-setting-link' }).append(
            createDiv({ cls: 'note-toolbar-setting-link-text' }, el => el.append(iconTextFr('pen-box', t('setting.help.label-feedback')))),
            createEl('a', { cls: 'note-toolbar-setting-link-button', text: t('setting.help.button-open-external'), href: URLS.GH_USER_GUIDE + '/Feedback', attr: { 'aria-label': t('setting.help.button-open-github') } })
        );

        contribEl.createDiv({ cls: 'note-toolbar-setting-link' }).append(
            createDiv({ cls: 'note-toolbar-setting-link-text' }, el => 
                el.append( iconTextFr('heart', t('setting.help.label-donate')), createSpan({ cls: 'note-toolbar-setting-link-description', text: t('setting.help.label-donate-description') }) )
            ),
            createDiv().createEl('a', { cls: 'note-toolbar-setting-link-button', text: t('setting.help.button-donate'), href: URLS.DONATE, attr: { 'aria-label': t('setting.help.button-donate-tooltip') } })
        );

    }

    async onClose() {
    }

}