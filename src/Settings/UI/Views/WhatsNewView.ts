import NoteToolbarPlugin from 'main';
import { ButtonComponent, ItemView, MarkdownRenderer, Setting, WorkspaceLeaf } from 'obsidian';
import { t, tdocs, VIEW_TYPE_WHATS_NEW } from 'Settings/NoteToolbarSettings';
import { iconTextFr } from '../Utils/SettingsUIUtils';

export class WhatsNewView extends ItemView {

    plugin: NoteToolbarPlugin;

    constructor(plugin: NoteToolbarPlugin, leaf: WorkspaceLeaf) {
        super(leaf);
        this.plugin = plugin;
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
        
        let contentDiv = this.contentEl.createDiv();
        contentDiv.addClass('note-toolbar-setting-whatsnew-view');

		let markdownEl = contentDiv.createDiv();
		markdownEl.addClass('markdown-preview-view', 'note-toolbar-setting-whatsnew-content', 'is-readable-line-width');

		let releaseEl = contentDiv.createDiv();
		releaseEl.addClass('note-toolbar-setting-whatsnew-cta', 'is-readable-line-width');
		new Setting(releaseEl)
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

		let roadmapEl = contentDiv.createDiv();
		roadmapEl.addClass('note-toolbar-setting-whatsnew-cta', 'is-readable-line-width');
		new Setting(roadmapEl)
			.setName(iconTextFr('signpost', t('setting.whats-new.label-roadmap')))
			.setDesc(t('setting.whats-new.label-roadmap-description'))
			.addButton((button: ButtonComponent) => {
				button
					.setButtonText(t('setting.whats-new.button-read'))
					.setTooltip(t('setting.whats-new.button-read-tooltip'))
					.setCta()
					.onClick(() => {
						window.open('https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Roadmap', '_blank');
					});
			});

		MarkdownRenderer.render(this.plugin.app, tdocs('whats-new'), markdownEl, '/', this.plugin);
    }

    async onClose() {
    }

}