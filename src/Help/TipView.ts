import TipItems from "Help/tips.json";
import { Component, ItemView, MarkdownRenderer, Platform, setIcon, setTooltip, ViewStateResult, WorkspaceLeaf } from "obsidian";
import { t, URL_TIPS, VIEW_TYPE_TIP } from "Settings/NoteToolbarSettings";
import NoteToolbarPlugin from "main";
import { renderGalleryItems } from "Help/Gallery/GalleryView";

interface TipViewState {
    id: string;
}

type TipType = {
    color: string;
    description: Record<string, string>;
    icon: string;
    id: string;
    title: Record<string, string>;
};

export class TipView extends ItemView {

    state: TipViewState;

    constructor(readonly plugin: NoteToolbarPlugin, readonly leaf: WorkspaceLeaf) {
        super(leaf);
    }

    async display(): Promise<void> {

        if (!this.state) return; // state is not ready yet

        const tip = TipItems.find(tip => tip.id.includes(this.state.id));
        if (!tip) return; // no matching tip

        const language = (typeof i18next.language === 'string' && i18next.language.trim()) || 'en';

        const contentDiv = this.contentEl.createDiv();
        contentDiv.addClass('note-toolbar-setting-help-view');

        const bannerEl = contentDiv.createDiv();
        bannerEl.addClass('note-toolbar-setting-view-banner', 'is-readable-line-width');
        if (tip.color) bannerEl.style.backgroundImage = createLinearGradient(tip.color as LinearGradientType);
        const bannerIconEl = bannerEl.createDiv();
        setIcon(bannerIconEl, tip.icon);
        const bannerTitleEl = bannerEl.createDiv();
        MarkdownRenderer.render(this.plugin.app, `# ${(tip as TipType).title[language]}`, bannerTitleEl, '/', this.plugin);
        const bannerDescEl = bannerEl.createDiv();
        MarkdownRenderer.render(this.plugin.app, `${(tip as TipType).description[language]}`, bannerDescEl, '/', this.plugin);

        const contentEl = contentDiv.createDiv();
        contentEl.addClass('markdown-preview-view', 'note-toolbar-setting-whatsnew-content', 'is-readable-line-width');
		this.renderSkeleton(contentEl);

        // fetch and display the content
        let tipText = '';
        try {
            const tipMd = await this.getTip(tip.id, language);
            if (tipMd) {
				tipText = tipMd;
            }
            else {
                tipText = t('setting.help.error-failed-to-load', { baseUrl: URL_TIPS, lang: language, name: tip.id });
            }
        }
        catch (error) {
            tipText = t('setting.help.error-failed-to-load', { baseUrl: URL_TIPS, lang: language, name: tip.id });
            tipText += `\n>[!error]-\n> \`${error as string}\`\n`;
        }
        finally {
            contentEl.empty();
        }

        const rootPath = this.plugin.app.vault.getRoot().path;
        MarkdownRenderer.render(this.plugin.app, tipText, contentEl, rootPath, new Component());

        this.renderTipVideos(contentEl);
        this.renderGalleryCallouts(contentEl, tip.color as ColorType);

    }

    getViewType(): string {
        return VIEW_TYPE_TIP;
    }

    getDisplayText(): string {
        const tip = TipItems.find(tip => tip.id.includes(this.state?.id));
        const language = (typeof i18next.language === 'string' && i18next.language.trim()) || 'en';
        return `${t('plugin.note-toolbar')} • ${(tip as TipType)?.title[language] ?? t('setting.help.title')}`;
    }

    getIcon(): string {
        return 'circle-help';
    }

    async onOpen() {
        await this.display();
    }

    async onClose() {
    }

    /**
     * https://liamca.in/Obsidian/API+FAQ/views/persisting+your+view+state
     * https://github.com/Vinzent03/obsidian-git/blob/3fbd59365085c3084d0b4f654db382b086367f23/src/ui/diff/diffView.ts#L49
     */ 
    getState(): Record<string, unknown> {
        return this.state as unknown as Record<string, unknown>;
    }

    /**
     * https://liamca.in/Obsidian/API+FAQ/views/persisting+your+view+state
     * https://github.com/Vinzent03/obsidian-git/blob/3fbd59365085c3084d0b4f654db382b086367f23/src/ui/diff/diffView.ts#L49
     */
    async setState(state: TipViewState, result: ViewStateResult): Promise<void> {
        this.state = state;
        await this.display();
    }

    /**
     * Fetches the provided tip.
     *
     * @param filename The name of the Tip file to fetch, without the extension.
     * @returns Body of the Tip, or null.
     */
    async getTip(filename: string, language: string = 'en'): Promise<string | null> {
        let url = `${URL_TIPS}/${language}/${filename}.md`;
        let res = await fetch(url);
    
        if (!res.ok && language !== 'en') {
            url = `${URL_TIPS}/en/${filename}.md`;
            res = await fetch(url);
        }
    
        if (!res.ok) return null;
    
        const body = await res.text();
        return body;
    }

    /**
     * Renders any `note-toolbar-gallery` callouts in the tip content, replacing a list of Gallery IDs with item cards.
     * @param contentEl HTMLDivElement to render Gallery items in.
     */
    renderGalleryCallouts(contentEl: HTMLDivElement, color: ColorType) {
        const callouts = contentEl.querySelectorAll('.callout[data-callout="note-toolbar-gallery"]');
        callouts.forEach(async (calloutEl: HTMLDivElement) => {
            const items: string[] = [];
            calloutEl.querySelectorAll('li').forEach(li => {
                const id = li.textContent?.trim();
                if (id) items.push(id);
            });
            calloutEl.textContent = '';
            calloutEl.className = '';
            renderGalleryItems(this.plugin, calloutEl, items, TIP_COLORS[color]);
        });

		this.plugin.registerDomEvent(contentEl, 'click', async (evt) => {
			const galleryItemEl = (evt.target as HTMLElement).closest('.note-toolbar-card-item');
			if (galleryItemEl && galleryItemEl.id) {
				const galleryItem = this.plugin.gallery.getItems().find(item => item.uuid.includes(galleryItemEl.id));
				if (galleryItem) await this.plugin.gallery.addItem(galleryItem);
			}
		});
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

    /**
     * Renders any `note-toolbar-video` callouts in the tip content, replacing the URL with HTML controls to play the video.
     * @param contentEl HTMLDivElement to render videos in.
     */
    renderTipVideos(contentEl: HTMLDivElement) {
        const callouts = contentEl.querySelectorAll('.callout[data-callout="note-toolbar-video"]');
        callouts.forEach(async (calloutEl: HTMLDivElement) => {
            const url = calloutEl.querySelector('.callout-content')?.textContent?.trim();
            if (!url) return;

            calloutEl.className = '';
            calloutEl.textContent = '';

            const wrapperEl = calloutEl.createDiv('note-toolbar-setting-help-video');
            const videoEl = wrapperEl.createEl('video');
            videoEl.setAttrs({ 
                playsinline: '',
                preload: 'metadata', 
                src: url 
            });

            const overlayEl = wrapperEl.createEl('div', 'note-toolbar-setting-help-video-overlay');
            const playButtonEl = overlayEl.createEl('button', 'note-toolbar-setting-help-video-play');
            setIcon(playButtonEl, 'play');
            playButtonEl.style.display = 'none';

            overlayEl.onclick = () => {
                if (videoEl.paused) {
                    videoEl.play();
                    playButtonEl.remove();
                    videoEl.setAttribute('controls', '');
                } else {
                    videoEl.pause();
                }
            };

            videoEl.addEventListener('loadedmetadata', () => {
                playButtonEl.style.display = '';
            });

        });
    }

}

export type ColorType = keyof typeof TIP_COLORS;
export type LinearGradientType = keyof typeof TIP_GRADIENTS;

export const TIP_COLORS = {
    red: 'var(--color-red)',
    orange: 'var(--color-orange)',
    yellow: 'var(--color-yellow)',
    green: 'var(--color-green)',
    cyan: 'var(--color-cyan)',
    blue: 'var(--color-blue)',
    purple: 'var(--color-purple)',
    ping: 'var(--color-pink)',
}

export const TIP_GRADIENTS = {
    red: 'linear-gradient(45deg, var(--color-red) 50%, var(--color-orange) 100%)',
    orange: 'linear-gradient(45deg, var(--color-orange) 50%, var(--color-yellow) 100%)',
    yellow: 'linear-gradient(45deg, var(--color-yellow) 50%, var(--color-green) 100%)',
    green: 'linear-gradient(45deg, var(--color-green) 50%, var(--color-cyan) 100%)',
    cyan: 'linear-gradient(45deg, var(--color-cyan) 50%, var(--color-blue) 100%)',
    blue: 'linear-gradient(45deg, var(--color-blue) 50%, var(--color-purple) 100%)',
    purple: 'linear-gradient(45deg, var(--color-purple) 50%, var(--color-pink) 100%)',
    pink: 'linear-gradient(45deg, var(--color-pink) 50%, var(--color-red) 100%)',
}

const createLinearGradient = (name: LinearGradientType): string => {
    return `${TIP_GRADIENTS[name]}, linear-gradient(0deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.2) 100%)`;
}

/**
 * Renders the provided list of tip items in a scrollable container.
 * @param plugin NoteToolbarPlugin
 * @param containerEl HTMLDivElement container to render items into.
 * @param tipIds list of string IDs as defined in `tips.json`
 */
export function renderTipItems(plugin: NoteToolbarPlugin, containerEl: HTMLDivElement, tipIds: string[]) {

    const language = (typeof i18next.language === 'string' && i18next.language.trim()) || 'en';

    const itemsEl = containerEl.createDiv();
    itemsEl.addClass('note-toolbar-card-items');
    itemsEl.setAttribute('data-ignore-swipe', 'true');

    tipIds.forEach(itemId => {

        const tip = TipItems.find(item => item.id.includes(itemId)) as TipType;
        if (tip) {

            const itemEl = itemsEl.createEl('button');
            itemEl.id = tip.id;
            itemEl.addClass('note-toolbar-card-item');
            if (tip.color && tip.color in TIP_GRADIENTS) itemEl.style.background = createLinearGradient(tip.color as LinearGradientType);
            itemEl.setAttribute('data-ignore-swipe', 'true');
            setTooltip(itemEl, tip.id === 'gallery' ? t('setting.button-gallery-tooltip') : t('setting.help.tooltip-view-tip'));
            
            const itemTitleEl = itemEl.createDiv('note-toolbar-card-item-title').setText(tip.title[language]);
            if (tip.description) {
                itemEl.createDiv('note-toolbar-card-item-description').setText(tip.description[language]);
            }

            const iconEl = itemEl.createDiv();
            iconEl.addClass('note-toolbar-card-item-icon');
            setIcon(iconEl, tip.icon);

        }

    });

    plugin.registerDomEvent(containerEl, 'click', (event) => { 
        const tipEl = (event.target as HTMLElement).closest('.note-toolbar-card-item');
        if (tipEl) {
            if (tipEl.id === 'gallery') {
                window.open('obsidian://note-toolbar?gallery', '_blank');
            }
            else {
                window.open(`obsidian://note-toolbar?tip=${tipEl.id}`, '_blank');
            }
        }
    });

}