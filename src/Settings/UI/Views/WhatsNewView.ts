import NoteToolbarPlugin from 'main';
import { ButtonComponent, Component, ItemView, MarkdownRenderer, Setting, WorkspaceLeaf } from 'obsidian';
import { URL_RELEASES, t, URL_USER_GUIDE, VIEW_TYPE_WHATS_NEW, WHATSNEW_VERSION, URL_RELEASE_NOTES } from 'Settings/NoteToolbarSettings';
import { iconTextFr } from '../Utils/SettingsUIUtils';
import { debugLog } from 'Utils/Utils';

type Release = { 
	tag_name: string; 
	body: string;
};

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

        const contentDiv = this.contentEl.createDiv();
        contentDiv.addClass('note-toolbar-setting-whatsnew-view');

		const markdownEl = contentDiv.createDiv();
		markdownEl.addClass('markdown-preview-view', 'note-toolbar-setting-whatsnew-content', 'is-readable-line-width');

		const language = i18next.language || 'en';
		let releaseText = '';
		try {
			const release = await this.getReleaseNote(WHATSNEW_VERSION, language);
			if (release) {
				releaseText = release.body;
			}
			else {
				releaseText = t('setting.whats-new.error-failed-to-load', { baseUrl: URL_RELEASE_NOTES, langauge: language, version: WHATSNEW_VERSION });
			}
		}
		catch (error) {
			releaseText = t('setting.whats-new.error-failed-to-load', { baseUrl: URL_RELEASE_NOTES, langauge: language, version: WHATSNEW_VERSION });
			releaseText += `>[!error]-\n> \`${error as string}\`\n`;
		}

		const rootPath = this.plugin.app.vault.getRoot().path;
		MarkdownRenderer.render(this.plugin.app, releaseText, markdownEl, rootPath, new Component());

		const releaseEl = contentDiv.createDiv();
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
						window.open(URL_RELEASES, '_blank');
					});
			});

		const roadmapEl = contentDiv.createDiv();
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
						window.open(URL_USER_GUIDE + 'Roadmap', '_blank');
					});
			});

    }

    async onClose() {
    }

	/**
	 * Fetches the release note for a specific release.
	 *
	 * @param version The tag name of the release to get the release note for.
	 * @returns Release or null.
	 */
	async getReleaseNote(version: string, language: string = 'en'): Promise<Release | null> {
		let url = `${URL_RELEASE_NOTES}/${language}/${version}.md`;
		let res = await fetch(url);
	
		if (!res.ok && language !== 'en') {
			url = `${URL_RELEASE_NOTES}/en/${version}.md`;
			res = await fetch(url);
		}
	
		if (!res.ok) return null;
	
		const body = await res.text();
		return { tag_name: version, body };
	}

}