import { renderGalleryItems } from "Gallery/GalleryView";
import TipItems from "Help/tips.json";
import NoteToolbarPlugin from "main";
import { Component, ItemView, MarkdownRenderer, setIcon, setTooltip, ViewStateResult, WorkspaceLeaf } from "obsidian";
import { t, VIEW_TYPE_GALLERY, VIEW_TYPE_TIP } from "Settings/NoteToolbarSettings";
import { getTip } from "./HelpContent";

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

export default class TipView extends ItemView {

    state!: TipViewState;

    constructor(readonly ntb: NoteToolbarPlugin, readonly leaf: WorkspaceLeaf) {
        super(leaf);
    }

    async display(): Promise<void> {

        if (!this.state) return; // state is not ready yet

        const tip = TipItems.find(tip => tip.id.includes(this.state.id)) as TipType;
        if (!tip) return; // no matching tip
        
        this.ntb.settingsUtils.addCloseToPhoneNav(this);

        const language = (typeof i18next.language === 'string' && i18next.language.trim()) || 'en';
        
        const contentDiv = this.contentEl.createDiv();
        contentDiv.addClass('note-toolbar-setting-help-view');

        const bannerEl = contentDiv.createDiv();
        bannerEl.addClass('note-toolbar-setting-view-banner', 'is-readable-line-width');
        if (tip.color) bannerEl.style.backgroundImage = createLinearGradient(tip.color as LinearGradientType);
        const bannerIconEl = bannerEl.createDiv();
        setIcon(bannerIconEl, tip.icon);
        const bannerTitleEl = bannerEl.createDiv();
        const bannerTitleComponent = new Component();
        await MarkdownRenderer.render(this.ntb.app, `# ${tip.title[language] ?? tip.title['en']}`, bannerTitleEl, '/', bannerTitleComponent);
        const bannerDescEl = bannerEl.createDiv();
        const bannerDescComponent = new Component();
        await MarkdownRenderer.render(this.ntb.app, `${tip.description[language] ?? tip.description['en']}`, bannerDescEl, '/', bannerDescComponent);

        const contentEl = contentDiv.createDiv();
        contentEl.addClass('markdown-preview-view', 'note-toolbar-setting-tip-content', 'is-readable-line-width');

        // get the content
        const tipMd = getTip(tip.id, language);
        const tipText = tipMd ?? t('setting.help.error-failed-to-load', { path: 'Help/Tips', lang: language, name: tip.id });
        contentEl.empty();

        const rootPath = this.ntb.app.vault.getRoot().path;
        const component = new Component();
        await MarkdownRenderer.render(this.ntb.app, tipText, contentEl, rootPath, component);

        this.renderTipVideos(contentEl);
        this.renderGalleryCallouts(contentEl, tip.color as ColorType);

    }

    getViewType(): string {
        return VIEW_TYPE_TIP;
    }

    getDisplayText(): string {
        const tip = TipItems.find(tip => tip.id.includes(this.state?.id));
        const language = (typeof i18next.language === 'string' && i18next.language.trim()) || 'en';
        const title = (tip as TipType)?.title?.[language];
        // on the initial call Tip is undefined, so we use a generic fallback
        return title ? t('plugin.note-toolbar') + ' • ' + title : t('setting.help.title');
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
    async setState(state: TipViewState, _result: ViewStateResult): Promise<void> {
        this.state = state;
        await this.display();
    }

    /**
     * Renders any `note-toolbar-gallery` callouts in the tip content, replacing a list of Gallery IDs with item cards.
     * @param contentEl HTMLDivElement to render Gallery items in.
     */
    renderGalleryCallouts(contentEl: HTMLDivElement, color: ColorType) {
        const callouts = contentEl.querySelectorAll<HTMLDivElement>('.callout[data-callout="note-toolbar-gallery"]');
        callouts.forEach((calloutEl: HTMLDivElement) => {
            const items: string[] = [];
            calloutEl.querySelectorAll('li').forEach(li => {
                const id = li.textContent?.trim();
                if (id) items.push(id);
            });
            calloutEl.textContent = '';
            calloutEl.className = '';
            const itemWrapperEl = calloutEl.createDiv();
            itemWrapperEl.addClass('note-toolbar-gallery-card-items-no-border');
            renderGalleryItems(this.ntb, itemWrapperEl, items, TIP_COLORS[color]);
        });

		this.ntb.registerDomEvent(contentEl, 'click', async (evt) => {
			const galleryItemEl = (evt.target as HTMLElement).closest('.note-toolbar-card-item');
			if (galleryItemEl && galleryItemEl.id) {
                const galleryItem = this.ntb.gallery.getItemById(galleryItemEl.id);
				if (galleryItem) await this.ntb.gallery.addItemWithPrompt(galleryItem);
			}
		});
    }

    /**
     * Renders any `note-toolbar-video` callouts in the tip content, replacing the URL with HTML controls to play the video.
     * @param contentEl HTMLDivElement to render videos in.
     */
    renderTipVideos(contentEl: HTMLDivElement) {
        const callouts = contentEl.querySelectorAll<HTMLDivElement>('.callout[data-callout="note-toolbar-video"]');
        callouts.forEach((calloutEl: HTMLDivElement) => {
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

            const overlayEl = wrapperEl.createDiv({ cls: 'note-toolbar-setting-help-video-overlay' });
            const playButtonEl = overlayEl.createEl('button', { cls: 'note-toolbar-setting-help-video-play' });
            setIcon(playButtonEl, 'play');
            playButtonEl.hide();

            overlayEl.onclick = () => {
                if (videoEl.paused) {
                    void videoEl.play().then(() => {
                        playButtonEl.remove();
                        videoEl.setAttribute('controls', '');
                    });
                } else {
                    videoEl.pause();
                }
            };

            videoEl.addEventListener('loadedmetadata', () => {
                playButtonEl.hide();
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
 * @param ntb NoteToolbarPlugin
 * @param containerEl HTMLDivElement container to render items into.
 * @param tipIds list of string IDs as defined in `tips.json`
 */
export function renderTipItems(ntb: NoteToolbarPlugin, containerEl: HTMLDivElement, tipIds: string[]) {

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
            
            const tipTitle = tip.title?.[language] || tip.title['en'];
            const tipDesc = tip.description?.[language] || tip.description['en'] || '';

            itemEl.createDiv('note-toolbar-card-item-title').setText(tipTitle);
            if (tipDesc) itemEl.createDiv('note-toolbar-card-item-description').setText(tipDesc);

            const iconEl = itemEl.createDiv();
            iconEl.addClass('note-toolbar-card-item-icon');
            setIcon(iconEl, tip.icon);

        }

    });

    ntb.registerDomEvent(containerEl, 'click', async (event) => { 
        const tipEl = (event.target as HTMLElement).closest('.note-toolbar-card-item');
        if (tipEl) {
            if (tipEl.id === 'gallery') {
                await ntb.app.workspace.getLeaf(true).setViewState({ type: VIEW_TYPE_GALLERY, active: true });
            }
            else {
                await ntb.app.workspace.getLeaf(true).setViewState({ type: VIEW_TYPE_TIP, active: true, state: { id: tipEl.id } });
            }
        }
    });

}