import NoteToolbarPlugin from 'main';
import { ButtonComponent, ItemView, MarkdownRenderer, Scope, setIcon, Setting, setTooltip, WorkspaceLeaf } from 'obsidian';
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
        contentDiv.addClass('note-toolbar-setting-whatsnew-view');

		let markdownEl = contentDiv.createDiv();
		markdownEl.addClass('markdown-preview-view', 'note-toolbar-setting-whatsnew-content', 'is-readable-line-width');

		const lang: string = i18next.language || 'en';

		const headingEl = markdownEl.createDiv();
		headingEl.addClass('note-toolbar-gallery-view-heading');
		
		const title = (gallery as Gallery).title[lang] || gallery.title['en'];
		MarkdownRenderer.render(this.plugin.app, `# ${title}`, headingEl, '/', this.plugin);

		const searchSetting = new Setting(headingEl)
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

		const overviewEl = markdownEl.createDiv();
		overviewEl.addClass('note-toolbar-gallery-view-plugin-overview');
		const overview = (gallery as Gallery).overview[lang] || gallery.overview['en'];
		MarkdownRenderer.render(this.plugin.app, overview, overviewEl, '/', this.plugin);

		const pluginNoteEl = markdownEl.createDiv();
		pluginNoteEl.addClass('note-toolbar-gallery-view-plugin-note');
		setIcon(pluginNoteEl.createSpan(), 'puzzle');
		const pluginNoteText = (gallery as Gallery).pluginNote[lang] || (gallery as Gallery).pluginNote['en'];
		MarkdownRenderer.render(this.plugin.app, pluginNoteText, pluginNoteEl, '/', this.plugin);

		(gallery as Gallery).categories.forEach(category => {

			const catNameEl = markdownEl.createEl('div');
			catNameEl.addClass('note-toolbar-gallery-view-cat-title');
			const catName = category.name[lang] || category.name['en'];
			MarkdownRenderer.render(this.plugin.app, `## ${catName}`, catNameEl, '/', this.plugin);

			const catDescEl = markdownEl.createEl('div');
			catDescEl.addClass('note-toolbar-gallery-view-cat-description');
			const catDescText = category.description[lang] || category.description['en'];
			MarkdownRenderer.render(this.plugin.app, catDescText, catDescEl, '/', this.plugin);

			const galleryItemContainerEl = markdownEl.createDiv();
			galleryItemContainerEl.addClass('note-toolbar-gallery-view-items-container');
			renderGalleryItems(this.plugin, galleryItemContainerEl, category.itemIds);

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
			const galleryItemEl = (evt.target as HTMLElement).closest('.note-toolbar-gallery-view-item');
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
 * @param itemIds list of string IDs as defined in `src/Gallery/items.json`
 */
export function renderGalleryItems(plugin: NoteToolbarPlugin, containerEl: HTMLDivElement, itemIds: string[]) {

	const galleryItems: ToolbarItemSettings[] = plugin.gallery.getItems();

	const itemsEl = containerEl.createDiv();
	itemsEl.addClass('note-toolbar-gallery-items-container');
	itemsEl.setAttribute('data-ignore-swipe', 'true');

	itemIds.forEach(itemId => {

		const galleryItem = galleryItems.find(item => item.uuid.includes(itemId));
		if (galleryItem) {

			const itemEl = itemsEl.createEl('button');
			itemEl.id = galleryItem.uuid;
			itemEl.addClass('note-toolbar-gallery-view-item');
			itemEl.setAttribute('data-ignore-swipe', 'true');
			setTooltip(itemEl, t('gallery.tooltip-add-item', { name: galleryItem.tooltip }));

			itemEl.createEl('h3').setText(galleryItem.tooltip);
			if (galleryItem.description) {
				const itemDescEl = itemEl.createEl('p');
				itemDescEl.addClass('note-toolbar-gallery-view-item-description');
				MarkdownRenderer.render(plugin.app, galleryItem.description, itemDescEl, '/', plugin);
			}

			let pluginNames = getPluginNames(plugin, galleryItem);
			if (pluginNames) {
				const pluginEl = itemEl.createEl('p');
				pluginEl.addClass('note-toolbar-gallery-view-item-plugins');
				setIcon(pluginEl.createSpan(), 'puzzle');
				pluginEl.createSpan().setText(pluginNames);
			}

			const iconEl = itemEl.createDiv();
			iconEl.addClass('note-toolbar-gallery-view-item-icon');
			setIcon(iconEl, galleryItem.icon);

		}

	});

}