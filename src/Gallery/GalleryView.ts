import gallery from 'Gallery/gallery.json';
import NoteToolbarPlugin from 'main';
import { Component, ItemView, MarkdownRenderer, Scope, setIcon, Setting, setTooltip, WorkspaceLeaf } from 'obsidian';
import { t, ToolbarItemSettings, VIEW_TYPE_GALLERY } from 'Settings/NoteToolbarSettings';
import ItemSuggester from 'Settings/UI/Suggesters/ItemSuggester';
import { iconTextFr } from 'Settings/UI/Utils/SettingsUIUtils';
import { URLS } from "Utils/Urls";

interface Category {
	name: { [key: string]: string };
	description: { [key: string]: string };
	itemIds: string[];
}

interface Gallery {
	title: { [key: string]: string };
	overview: { [key: string]: string };
	pluginNote: { [key: string]: string };
	categories: Category[];
}

const cssColors: string[] = [
    'var(--color-red)',
    'var(--color-orange)',
    'var(--color-yellow)',
    'var(--color-green)',
    'var(--color-cyan)',
    'var(--color-blue)',
    'var(--color-purple)',
    'var(--color-pink)',
];

export default class GalleryView extends ItemView {

    constructor(
		private ntb: NoteToolbarPlugin, 
		leaf: WorkspaceLeaf
	) {
        super(leaf);
    }

    getViewType(): string {
        return VIEW_TYPE_GALLERY;
    }

    getDisplayText(): string {
        return t('gallery.title');
    }

    getIcon(): string {
        return 'layout-grid';
    }

    async onOpen() {

		this.ntb.settingsUtils.addCloseToPhoneNav(this);
		activeDocument.body.toggleClass('ntb-remove-view-header', false);

        const contentDiv = this.contentEl.createDiv();
        contentDiv.addClass('note-toolbar-setting-gallery-view');

		const markdownEl = contentDiv.createDiv();
		markdownEl.addClass('markdown-preview-view', 'note-toolbar-setting-gallery-content', 'is-readable-line-width');

		const language = (typeof i18next.language === 'string' && i18next.language.trim()) || 'en';

		const bannerEl = markdownEl.createDiv();
		bannerEl.addClass('note-toolbar-setting-view-banner', 'is-readable-line-width');
		const bannerIconEl = bannerEl.createDiv();
		setIcon(bannerIconEl, 'layout-grid');
		const title = (gallery as Gallery).title[language] || gallery.title['en'];
		const bannerTitleEl = bannerEl.createDiv();
		const bannerTitleComponent = new Component();
		await MarkdownRenderer.render(this.ntb.app, `# ${title}`, bannerTitleEl, '/', bannerTitleComponent);

		const overviewEl = markdownEl.createDiv();
		overviewEl.addClass('note-toolbar-gallery-view-plugin-overview');
		const overview = (gallery as Gallery).overview[language] || gallery.overview['en'];
		const overviewComponent = new Component();
		await MarkdownRenderer.render(this.ntb.app, overview, overviewEl, '/', overviewComponent);

		const pluginNoteEl = markdownEl.createDiv();
		pluginNoteEl.addClass('note-toolbar-gallery-view-note');
		setIcon(pluginNoteEl.createSpan(), 'puzzle');
		const pluginNoteText = (gallery as Gallery).pluginNote[language] || (gallery as Gallery).pluginNote['en'];
		const pluginNoteComponent = new Component();
		await MarkdownRenderer.render(this.ntb.app, pluginNoteText, pluginNoteEl, '/', pluginNoteComponent);

		const searchSetting = new Setting(markdownEl)
			.setClass('note-toolbar-setting-item-full-width-phone')
			.setClass('note-toolbar-gallery-view-search')
			.addSearch((cb) => {
				new ItemSuggester(this.ntb, undefined, cb.inputEl, (galleryItem) => {
					void this.ntb.gallery.addItemWithPrompt(galleryItem).then(() => {
						cb.inputEl.value = '';
					});
				});
				cb.setPlaceholder(t('setting.item-suggest-modal.placeholder'))
					.onChange((itemText) => {
						cb.inputEl.value = itemText;
					});
			});

		// focus on search when cmd/ctrl-f pressed 
		this.scope = new Scope(this.app.scope);
		this.scope.register(['Mod'], 'F', (evt) => {
			evt.preventDefault();
			searchSetting.controlEl.querySelector('input')?.focus();
			return false;
		});

		let sortedCategories: Category[] = [] as Category[];
		sortedCategories = (gallery as Gallery).categories.sort((a, b) => {
			const nameA = (a.name[language] || a.name['en']).toLowerCase();
			const nameB = (b.name[language] || b.name['en']).toLowerCase();
			return nameA.localeCompare(nameB);
		});
		
		for (const [i, category] of sortedCategories.entries()) {

			const cssColor = cssColors[i % cssColors.length];
			
			const catNameEl = markdownEl.createDiv();
			catNameEl.addClass('note-toolbar-gallery-view-cat-title');
			const catName = category.name[language] || category.name['en'];
			const catComponent = new Component();
			await MarkdownRenderer.render(this.ntb.app, `## ${catName}`, catNameEl, '/', catComponent);

			const catDescEl = markdownEl.createDiv();
			catDescEl.addClass('note-toolbar-gallery-view-cat-description');
			const catDescText = category.description[language] || category.description['en'];
			const catDescComponent = new Component();
			await MarkdownRenderer.render(this.ntb.app, catDescText, catDescEl, '/', catDescComponent);

			const galleryItemContainerEl = markdownEl.createDiv();
			galleryItemContainerEl.addClass('note-toolbar-gallery-card-items');
			renderGalleryItems(this.ntb, galleryItemContainerEl, category.itemIds, cssColor);

		};

		const ctaEl = markdownEl.createDiv();
        ctaEl.createDiv({ cls: ['note-toolbar-setting-link', 'is-readable-line-width'] }).append(
            createDiv({ cls: 'note-toolbar-setting-link-text' }, el => 
                el.append( iconTextFr('pen-box', t('setting.help.label-feedback')), createSpan({ cls: 'note-toolbar-setting-link-description', text: t('setting.help.label-feedback-description') }) )
            ),
            createDiv().createEl('a', { cls: 'note-toolbar-setting-link-button', text: t('setting.help.label-feedback'), href: URLS.GH_USER_GUIDE + '/Feedback', attr: { 'aria-label': t('setting.help.button-open-github') } })
        );

		// on clicking an item, prompt for toolbar and add it
		this.ntb.registerDomEvent(markdownEl, 'click', async (evt) => {
			const galleryItemEl = (evt.target as HTMLElement).closest('.note-toolbar-card-item');
			if (galleryItemEl && galleryItemEl.id) {
				const galleryItem = this.ntb.gallery.getItemById(galleryItemEl.id);
				if (galleryItem) await this.ntb.gallery.addItemWithPrompt(galleryItem);
			}
		});

    }

    async onClose() {
    }

}

/**
 * Renders the provided list of items in the Gallery into a scrollable container.
 * @param ntb NoteToolbarPlugin
 * @param containerEl HTMLDivElement container to render items into.
 * @param itemIds list of string IDs as defined in `src/Gallery/gallery-items.json`
 * @param cssColor optional color to use in cards 
 */
export function renderGalleryItems(ntb: NoteToolbarPlugin, containerEl: HTMLDivElement, itemIds: string[], cssColor?: string) {

	const galleryItems: ToolbarItemSettings[] = ntb.gallery.getItems();

	const itemsEl = containerEl.createDiv();
	itemsEl.addClass('note-toolbar-card-items');
	itemsEl.setAttribute('data-ignore-swipe', 'true');

	itemIds.forEach(itemId => {

		const galleryItem = galleryItems.find(item => item.uuid.includes(itemId));
		if (galleryItem) {

			const itemEl = itemsEl.createEl('button');
			itemEl.id = galleryItem.uuid;
			itemEl.addClass('note-toolbar-card-item');
			itemEl.setAttribute('data-ignore-swipe', 'true');
			setTooltip(itemEl, t('gallery.tooltip-add-item', { name: galleryItem.tooltip }));

			const plusEl = itemEl.createDiv('note-toolbar-card-item-plus');
			setIcon(plusEl, 'circle-plus');

			itemEl.createDiv('note-toolbar-card-item-title').setText(galleryItem.tooltip);
			if (galleryItem.description) {
				itemEl.createDiv('note-toolbar-card-item-description').setText(galleryItem.description);
			}

			const pluginNames = ntb.settingsUtils.getPluginNames(galleryItem);
			if (pluginNames) {
				const pluginEl = itemEl.createDiv('note-toolbar-card-item-plugins');
				setIcon(pluginEl.createSpan(), 'puzzle');
				pluginEl.createDiv().setText(pluginNames);
			}

			const iconEl = itemEl.createDiv('note-toolbar-card-item-icon');
			if (cssColor) iconEl.style.color = cssColor;
			setIcon(iconEl, galleryItem.icon);

		}

	});

}