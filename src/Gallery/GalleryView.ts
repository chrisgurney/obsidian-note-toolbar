import NoteToolbarPlugin from 'main';
import { ItemView, MarkdownRenderer, setIcon, setTooltip, WorkspaceLeaf } from 'obsidian';
import gallery from 'Gallery/gallery.json';
import { t, VIEW_TYPE_GALLERY } from 'Settings/NoteToolbarSettings';
import { getPluginNames, handleKeyClick } from 'Settings/UI/Utils/SettingsUIUtils';
import { debugLog } from 'Utils/Utils';

interface Category {
	name: { [key: string]: string };
	description: { [key: string]: string };
	itemIds: string[];
}

interface Gallery {
	title: { [key: string]: string };
	overview: { [key: string]: string };
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
        return "Note Toolbar Gallery";
    }

    getIcon(): string {
        return 'images';
    }

    async onOpen() {
        let contentDiv = this.contentEl.createDiv();
        contentDiv.addClass('note-toolbar-setting-whatsnew-view');

		let markdownEl = contentDiv.createDiv();
		markdownEl.addClass('markdown-preview-view', 'note-toolbar-setting-whatsnew-content', 'is-readable-line-width');

		const lang: string = i18next.language || 'en';
		const galleryItems = this.plugin.gallery.getItems();

		const title = (gallery as Gallery).title[lang] || gallery.title['en'];
		const overview = (gallery as Gallery).overview[lang] || gallery.overview['en'];
		MarkdownRenderer.render(this.plugin.app, `# ${title}`, markdownEl, '/', this.plugin);
		MarkdownRenderer.render(this.plugin.app, overview, markdownEl, '/', this.plugin);

		(gallery as Gallery).categories.forEach(category => {

			const catName = category.name[lang] || category.name['en'];
			const catDesc = category.description[lang] || category.description['en'];
			MarkdownRenderer.render(this.plugin.app, `## ${catName}`, markdownEl, '/', this.plugin);
			MarkdownRenderer.render(this.plugin.app, catDesc, markdownEl, '/', this.plugin);

			const itemsEl = markdownEl.createDiv();
			itemsEl.addClass('note-toolbar-gallery-view-items-container');

			category.itemIds.forEach(itemId => {
				const galleryItem = galleryItems.find(item => item.uuid.includes(itemId));
				if (galleryItem) {
					const itemEl = itemsEl.createDiv();
					itemEl.addClass('note-toolbar-gallery-view-item');
					setTooltip(itemEl, "Click/Tap to add to a toolbar");

					itemEl.createEl('h3').setText(galleryItem.tooltip);
					if (galleryItem.description) {
						const itemDescEl = itemEl.createEl('p');
						itemDescEl.addClass('note-toolbar-gallery-view-item-description');
						MarkdownRenderer.render(this.plugin.app, galleryItem.description, itemDescEl, '/', this.plugin);
					}

					let pluginNames = getPluginNames(galleryItem);
					if (pluginNames) {
						const pluginEl = itemEl.createEl('p');
						pluginEl.setText(t('gallery.label-plugin', { plugin: pluginNames }));
					}

					const iconEl = itemEl.createDiv();
					iconEl.addClass('note-toolbar-gallery-view-item-icon');
					setIcon(iconEl, galleryItem.icon);

					this.plugin.registerDomEvent(itemEl, 'click', (evt) => {
						debugLog('asdf');
					});
					handleKeyClick(this.plugin, itemEl);
				}

			});

		});

    }

    async onClose() {
    }

}