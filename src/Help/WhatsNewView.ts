import NoteToolbarPlugin from 'main';
import { ButtonComponent, Component, ItemView, MarkdownRenderer, requestUrl, Setting, WorkspaceLeaf } from 'obsidian';
import { URL_RELEASES, t, URL_USER_GUIDE, VIEW_TYPE_WHATS_NEW, WHATSNEW_VERSION, URL_RELEASE_NOTES } from 'Settings/NoteToolbarSettings';
import { iconTextFr } from '../Settings/UI/Utils/SettingsUIUtils';

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
		this.renderSkeleton(markdownEl);

		const ctaEl = contentDiv.createDiv();
		ctaEl.addClass('note-toolbar-setting-view-cta', 'is-readable-line-width');

		new Setting(ctaEl)
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

		new Setting(ctaEl)
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

		// fetch and display the content
		const language = (typeof i18next.language === 'string' && i18next.language.trim()) || 'en';
		let releaseText = '';
		try {
			const release = await this.getReleaseNote(WHATSNEW_VERSION, language);
			if (release) {
				releaseText = release.body;
			}
			else {
				releaseText = t('setting.whats-new.error-failed-to-load', { baseUrl: URL_RELEASE_NOTES, lang: language, version: WHATSNEW_VERSION });
			}
		}
		catch (error) {
			releaseText = t('setting.whats-new.error-failed-to-load', { baseUrl: URL_RELEASE_NOTES, lang: language, version: WHATSNEW_VERSION });
			releaseText += `\n>[!error]-\n> \`${error as string}\`\n`;
		}
		finally {
			markdownEl.empty();
		}

		const rootPath = this.plugin.app.vault.getRoot().path;
		const component = new Component();
		MarkdownRenderer.render(this.plugin.app, releaseText, markdownEl, rootPath, component);

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
		let res = await requestUrl(url);
	
		if ((!res || res.status !== 200) && language !== 'en') {
			url = `${URL_RELEASE_NOTES}/en/${version}.md`;
			res = await requestUrl(url);
		}
	
		if (!res || res.status !== 200) return null;

		return { tag_name: version, body: res.text };
	}

	/**
	 * Renders a skeleton to show while the content is being fetched.
	 * @param el HTMLDivElement to render the skeleton in.
	 */
	renderSkeleton(el: HTMLDivElement) {
		const heights = ['2em', '1.5em', '1em', '1em', '1em', '1em'];
		const widths = ['30%', '70%', '80%', '90%', '80%', '90%'];
	
		const placeholderTextEl = el.createEl('p');
		placeholderTextEl.setText(t('setting.whats-new.placehoder-loading'));
		placeholderTextEl.setAttr('style', 'color: var(--text-muted)');

		for (let i = 0; i < heights.length; i++) {
			const lineEl = el.createEl('p');
			const lineStyle = `height: ${heights[i]};${widths[i] ? ` width: ${widths[i]};` : ''} margin-bottom: 0.5em;`;
			lineEl.addClass('note-toolbar-setting-remote-skeleton');
			lineEl.setAttr('style', lineStyle);
		}
	}

}