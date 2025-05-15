import { Component, ItemView, MarkdownRenderer, Platform, setIcon, setTooltip, ViewStateResult, WorkspaceLeaf } from "obsidian";
import { t, URL_TIPS, VIEW_TYPE_TIP } from "Settings/NoteToolbarSettings";
import NoteToolbarPlugin from "main";
import { renderGalleryItems } from "Help/Gallery/GalleryView";

interface TipViewState {
    id: string;
}

const TIPS = [
    {
        color: 'red',
        description: 'Create your first toolbar.',
        galleryItems: ['copy', 'paste', 'undo', 'redo'],
        icon: 'rocket',
        id: 'getting-started',
        title: 'Getting Started',
    },
    {
        color: 'green',
        description: 'Make the most of Obsidian on your phone.',
        icon: 'smartphone',
        id: 'mobile-tips',
        title: 'Mobile Tips',
    }
];

export class TipView extends ItemView {

    state: TipViewState;

    constructor(readonly plugin: NoteToolbarPlugin, readonly leaf: WorkspaceLeaf) {
        super(leaf);
    }

    async display(): Promise<void> {

        if (!this.state) return; // state is not ready yet

        const tip = TIPS.find(tip => tip.id.includes(this.state.id));
        if (!tip) return; // no matching tip

        const contentDiv = this.contentEl.createDiv();
        contentDiv.addClass('note-toolbar-setting-help-view');

        const bannerEl = contentDiv.createDiv();
        bannerEl.addClass('note-toolbar-setting-tips-view-banner', 'is-readable-line-width');
        if (tip.color) bannerEl.style.backgroundImage = createRadialGradient(tip.color);
        const bannerIconEl = bannerEl.createDiv();
        setIcon(bannerIconEl, tip.icon);
        const bannerTitleEl = bannerEl.createDiv();
        MarkdownRenderer.render(this.plugin.app, `# ${tip.title}`, bannerTitleEl, '/', this.plugin);

        const contentEl = contentDiv.createDiv();
        contentEl.addClass('markdown-preview-view', 'note-toolbar-setting-whatsnew-content', 'is-readable-line-width');
		this.renderSkeleton(contentEl);

        // fetch and display the content
        const language = i18next.language || 'en';
        let tipText = '';
        try {
            const tipMd = await this.getTip(tip.id, language);
            if (tipMd) {
				tipText = tipMd;
            }
            else {
                tipText = t('setting.tips.error-failed-to-load', { baseUrl: URL_TIPS, langauge: language, name: tip.id });
            }
        }
        catch (error) {
            tipText = t('setting.tips.error-failed-to-load', { baseUrl: URL_TIPS, langauge: language, name: tip.id });
            tipText += `\n>[!error]-\n> \`${error as string}\`\n`;
        }
        finally {
            contentEl.empty();
        }

        const rootPath = this.plugin.app.vault.getRoot().path;
        MarkdownRenderer.render(this.plugin.app, tipText, contentEl, rootPath, new Component());

        if (tip.galleryItems && tip.galleryItems?.length > 0) {
            const itemNoteEl = contentEl.createDiv();
            itemNoteEl.addClass('note-toolbar-gallery-view-note');
            setIcon(itemNoteEl.createSpan(), Platform.isDesktop ? 'mouse-pointer-click' : 'pointer');
            MarkdownRenderer.render(this.plugin.app, "Click or tap to add any of these to a toolbar:", itemNoteEl, '/', this.plugin);
            renderGalleryItems(this.plugin, contentEl, tip.galleryItems);
        }

    }

    getViewType(): string {
        return VIEW_TYPE_TIP;
    }

    getDisplayText(): string {
        const tip = TIPS.find(tip => tip.id.includes(this.state?.id));
        return tip?.title ?? "Note Toolbar Help";
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

export type GradientType = keyof typeof TIP_GRADIENTS;

type GradientMap = Record<string, string[]>;

export const TIP_GRADIENTS: GradientMap = {
    red: ['hsl(350, 80%, 40%)', 'hsl(0, 85%, 30%)', 'hsl(5, 90%, 25%)'],
    blue: ['hsl(210, 80%, 35%)', 'hsl(220, 85%, 25%)', 'hsl(230, 90%, 20%)'],
    green: ['hsl(140, 50%, 35%)', 'hsl(145, 55%, 30%)', 'hsl(150, 60%, 25%)'],
    purple: ['hsl(270, 60%, 35%)', 'hsl(275, 65%, 30%)', 'hsl(280, 70%, 25%)'],
    teal: ['hsl(180, 60%, 30%)', 'hsl(185, 65%, 25%)', 'hsl(190, 70%, 20%)'],
    orange: ['hsl(30, 80%, 40%)', 'hsl(25, 85%, 30%)', 'hsl(20, 90%, 25%)'],
    gray: ['hsl(0, 0%, 35%)', 'hsl(0, 0%, 25%)', 'hsl(0, 0%, 15%)']
};

const positions = ['20% 80%', '80% 20%', '50% 50%'];

const createRadialGradient = (name: GradientType): string => {
    const colors = TIP_GRADIENTS[name];
    return colors.map((color, i) =>
        `radial-gradient(at ${positions[i % positions.length]}, ${color}, transparent 70%)`
    ).join(', ');
};

/**
 * Renders the provided list of tip items in a scrollable container.
 * @param plugin NoteToolbarPlugin
 * @param containerEl HTMLDivElement container to render items into.
 * @param tipIds list of string IDs as defined in `tips.json`
 */
export function renderTipItems(plugin: NoteToolbarPlugin, containerEl: HTMLDivElement, tipIds: string[]) {

    // TODO: read this in from a file and then...
    // const tips: Tip[] = plugin.tips.getTips();

    const itemsEl = containerEl.createDiv();
    itemsEl.addClass('note-toolbar-card-items');
    itemsEl.setAttribute('data-ignore-swipe', 'true');

    tipIds.forEach(itemId => {

        const tip = TIPS.find(item => item.id.includes(itemId));
        if (tip) {

            const itemEl = itemsEl.createEl('button');
            itemEl.id = tip.id;
            itemEl.addClass('note-toolbar-card-item');
            itemEl.setAttribute('data-ignore-swipe', 'true');
            setTooltip(itemEl, "View this tip");

            itemEl.createEl('h3').setText(tip.title);
            if (tip.description) {
                const itemDescEl = itemEl.createEl('p');
                itemDescEl.addClass('note-toolbar-card-item-description');
                MarkdownRenderer.render(plugin.app, tip.description, itemDescEl, '/', plugin);
            }

            const iconEl = itemEl.createDiv();
            iconEl.addClass('note-toolbar-card-item-icon');
            setIcon(iconEl, tip.icon);

        }

    });

    plugin.registerDomEvent(containerEl, 'click', (event) => { 
        const tipEl = (event.target as HTMLElement).closest('.note-toolbar-card-item');
        if (tipEl) plugin.app.workspace.getLeaf(false).setViewState({ type: VIEW_TYPE_TIP, state: { id: tipEl.id }, active: true });
    });

}