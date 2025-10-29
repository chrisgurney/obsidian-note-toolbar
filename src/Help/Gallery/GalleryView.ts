import NoteToolbarPlugin from 'main';
import { ButtonComponent, Component, ItemView, MarkdownRenderer, Scope, setIcon, Setting, setTooltip, WorkspaceLeaf } from 'obsidian';
import gallery from 'Help/Gallery/gallery.json';
import { t, ToolbarItemSettings, URL_FEEDBACK_FORM, VIEW_TYPE_GALLERY } from 'Settings/NoteToolbarSettings';
import { getPluginNames, iconTextFr } from 'Settings/UI/Utils/SettingsUIUtils';
import { ItemSuggester } from 'Settings/UI/Suggesters/ItemSuggester';

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

export class GalleryView extends ItemView {

    plugin: NoteToolbarPlugin;

    constructor(plugin: NoteToolbarPlugin, leaf: WorkspaceLeaf) {
        super(leaf);
        this.plugin = plugin;
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

        let contentDiv = this.contentEl.createDiv();
        contentDiv.addClass('note-toolbar-setting-gallery-view');

		let markdownEl = contentDiv.createDiv();
		markdownEl.addClass('markdown-preview-view', 'note-toolbar-setting-gallery-content', 'is-readable-line-width');

		const language = (typeof i18next.language === 'string' && i18next.language.trim()) || 'en';

		const bannerEl = markdownEl.createDiv();
		bannerEl.addClass('note-toolbar-setting-view-banner', 'is-readable-line-width');
		const bannerIconEl = bannerEl.createDiv();
		setIcon(bannerIconEl, 'layout-grid');
		const title = (gallery as Gallery).title[language] || gallery.title['en'];
		const bannerTitleEl = bannerEl.createDiv();
		const bannerTitleComponent = new Component();
		MarkdownRenderer.render(this.plugin.app, `# ${title}`, bannerTitleEl, '/', bannerTitleComponent);

		const overviewEl = markdownEl.createDiv();
		overviewEl.addClass('note-toolbar-gallery-view-plugin-overview');
		const overview = (gallery as Gallery).overview[language] || gallery.overview['en'];
		const overviewComponent = new Component();
		MarkdownRenderer.render(this.plugin.app, overview, overviewEl, '/', overviewComponent);

		const pluginNoteEl = markdownEl.createDiv();
		pluginNoteEl.addClass('note-toolbar-gallery-view-note');
		setIcon(pluginNoteEl.createSpan(), 'puzzle');
		const pluginNoteText = (gallery as Gallery).pluginNote[language] || (gallery as Gallery).pluginNote['en'];
		const pluginNoteComponent = new Component();
		MarkdownRenderer.render(this.plugin.app, pluginNoteText, pluginNoteEl, '/', pluginNoteComponent);

		const searchSetting = new Setting(markdownEl)
			.setClass('note-toolbar-setting-item-full-width-phone')
			.setClass('note-toolbar-setting-no-border')
			.setClass('note-toolbar-gallery-view-search')
			.addSearch((cb) => {
				new ItemSuggester(this.app, this.plugin, undefined, cb.inputEl, async (galleryItem) => {
					this.plugin.gallery.addItem(galleryItem);
					cb.inputEl.value = '';
				});
				cb.setPlaceholder(t('setting.item-suggest-modal.placeholder'))
					.onChange(async (itemText) => {
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

		(gallery as Gallery).categories.forEach((category, i) => {

			const cssColor = cssColors[i % cssColors.length];
			
			const catNameEl = markdownEl.createEl('div');
			catNameEl.addClass('note-toolbar-gallery-view-cat-title');
			const catName = category.name[language] || category.name['en'];
			const catComponent = new Component();
			MarkdownRenderer.render(this.plugin.app, `## ${catName}`, catNameEl, '/', catComponent);

			const catDescEl = markdownEl.createEl('div');
			catDescEl.addClass('note-toolbar-gallery-view-cat-description');
			const catDescText = category.description[language] || category.description['en'];
			const catDescComponent = new Component();
			MarkdownRenderer.render(this.plugin.app, catDescText, catDescEl, '/', catDescComponent);

			const galleryItemContainerEl = markdownEl.createDiv();
			galleryItemContainerEl.addClass('note-toolbar-gallery-card-items');
			renderGalleryItems(this.plugin, galleryItemContainerEl, category.itemIds, cssColor);

		});

		const ctaEl = markdownEl.createDiv();
		ctaEl.addClass('note-toolbar-setting-view-cta', 'is-readable-line-width');
		new Setting(ctaEl)
			.setName(iconTextFr('pen-box', t('setting.help.label-feedback')))
			.setDesc(t('setting.help.label-feedback-description'))
			.addButton((button: ButtonComponent) => {
				button
					.setButtonText(t('setting.help.label-feedback'))
					.setTooltip(t('setting.help.button-open-google'))
					.setCta()
					.onClick(() => {
						window.open(URL_FEEDBACK_FORM, '_blank');
					});
			});

		// on clicking an item, prompt for toolbar and add it
		this.plugin.registerDomEvent(markdownEl, 'click', async (evt) => {
			const galleryItemEl = (evt.target as HTMLElement).closest('.note-toolbar-card-item');
			if (galleryItemEl && galleryItemEl.id) {
				const galleryItem = this.plugin.gallery.getItems().find(item => item.uuid.includes(galleryItemEl.id));
				if (galleryItem) await this.plugin.gallery.addItem(galleryItem);
			}
		});

    }

    async onClose() {
    }

}

/**
 * Renders the provided list of items in the Gallery into a scrollable container.
 * @param plugin NoteToolbarPlugin
 * @param containerEl HTMLDivElement container to render items into.
 * @param itemIds list of string IDs as defined in `src/Gallery/gallery-items.json`
 * @param cssColor optional color to use in cards 
 */
export function renderGalleryItems(plugin: NoteToolbarPlugin, containerEl: HTMLDivElement, itemIds: string[], cssColor?: string) {

	const galleryItems: ToolbarItemSettings[] = plugin.gallery.getItems();

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

			let pluginNames = getPluginNames(plugin, galleryItem);
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