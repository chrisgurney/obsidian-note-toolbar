import NoteToolbarPlugin from 'main';
import { Component, ItemView, MarkdownRenderer, WorkspaceLeaf } from 'obsidian';
import { t, VIEW_TYPE_WHATS_NEW, WHATSNEW_VERSION } from 'Settings/NoteToolbarSettings';
import { URLS } from "Utils/Urls";
import { iconTextFr } from '../Settings/UI/Utils/SettingsUIUtils';
import { getRelease } from './HelpContent';

export default class WhatsNewView extends ItemView {

    constructor(private ntb: NoteToolbarPlugin, leaf: WorkspaceLeaf) {
        super(leaf);
    }

    getViewType(): string {
        return VIEW_TYPE_WHATS_NEW;
    }

    getDisplayText(): string {
        return t('setting.whats-new.title');
    }

    getIcon(): string {
        return 'file-text';
    }

    async onOpen() {

		this.ntb.settingsUtils.addCloseToPhoneNav(this);
		activeDocument.body.toggleClass('ntb-remove-view-header', false);

        const contentDiv = this.contentEl.createDiv();
        contentDiv.addClass('note-toolbar-setting-whatsnew-view');

		const markdownEl = contentDiv.createDiv();
		markdownEl.addClass('markdown-preview-view', 'note-toolbar-setting-whatsnew-content', 'is-readable-line-width');

		const ctaEl = contentDiv.createDiv();
		ctaEl.addClass('is-readable-line-width');

		ctaEl.createDiv({ cls: 'note-toolbar-setting-link' }).append(
			createDiv({ cls: 'note-toolbar-setting-link-text' }, el => 
				el.append( iconTextFr('book-text', t('setting.whats-new.label-release-notes')), createSpan({ cls: 'note-toolbar-setting-link-description', text: t('setting.whats-new.label-release-notes-description') }) )
			),
			createDiv().createEl('a', { cls: 'note-toolbar-setting-link-button', text: t('setting.whats-new.button-read'), href: URLS.GH_RELEASES, attr: { 'aria-label': t('setting.whats-new.button-read-tooltip') } })
		);

		ctaEl.createDiv({ cls: 'note-toolbar-setting-link' }).append(
			createDiv({ cls: 'note-toolbar-setting-link-text' }, el => 
				el.append( iconTextFr('signpost', t('setting.whats-new.label-roadmap')), createSpan({ cls: 'note-toolbar-setting-link-description', text: t('setting.whats-new.label-roadmap-description') }) )
			),
			createDiv().createEl('a', { cls: 'note-toolbar-setting-link-button', text: t('setting.whats-new.button-read'), href: `${URLS.GH_USER_GUIDE}/Roadmap`, attr: { 'aria-label': t('setting.whats-new.button-read-tooltip') } })
		);

		// new Setting(ctaEl)
		// 	.setName(iconTextFr('party-popper', t('setting.whats-new.label-show-whatsnew')))
		// 	.setDesc(t('setting.whats-new.label-show-whatsnew-description'))
		// 	.addToggle((toggle: ToggleComponent) => {
		// 		toggle
		// 			.setValue(this.ntb.settings.showWhatsNew)
		// 			.onChange(async (value: boolean) => {
		// 				this.ntb.settings.showWhatsNew = value;
		// 				await this.ntb.settingsManager.save();
		// 			});
		// 	});

		// get the content
		const language = (typeof i18next.language === 'string' && i18next.language.trim()) || 'en';
		const releaseMd = getRelease(WHATSNEW_VERSION, language);
		const releaseText = releaseMd ?? t('setting.help.error-failed-to-load', { path: 'Help/Releases', lang: language, name: WHATSNEW_VERSION });
		markdownEl.empty();

		const rootPath = this.ntb.app.vault.getRoot().path;
		const component = new Component();
		await MarkdownRenderer.render(this.ntb.app, releaseText, markdownEl, rootPath, component);

    }

    async onClose() {
    }

}