import NoteToolbarPlugin from 'main';
import { ButtonComponent, ItemView, MarkdownRenderer, Platform, Scope, setIcon, Setting, setTooltip, WorkspaceLeaf } from 'obsidian';
import gallery from 'Gallery/gallery.json';
import { EMPTY_TOOLBAR_ID, ItemType, t, ToolbarItemSettings, ToolbarSettings, URL_FEEDBACK_FORM, VIEW_TYPE_GALLERY } from 'Settings/NoteToolbarSettings';
import { getPluginNames, iconTextFr } from 'Settings/UI/Utils/SettingsUIUtils';
import { debugLog } from 'Utils/Utils';
import { ToolbarSuggestModal } from 'Settings/UI/Modals/ToolbarSuggestModal';
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
		const galleryItems = this.plugin.gallery.getItems();

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
					this.addItem(galleryItem);
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

			const itemsEl = markdownEl.createDiv();
			itemsEl.addClass('note-toolbar-gallery-view-items-container');

			category.itemIds.forEach(itemId => {
				const galleryItem = galleryItems.find(item => item.uuid.includes(itemId));
				if (galleryItem) {

					const itemEl = itemsEl.createEl('button');
					itemEl.id = galleryItem.uuid;
					itemEl.addClass('note-toolbar-gallery-view-item');
					setTooltip(itemEl, t('gallery.tooltip-add-item', { name: galleryItem.tooltip }));

					itemEl.createEl('h3').setText(galleryItem.tooltip);
					if (galleryItem.description) {
						const itemDescEl = itemEl.createEl('p');
						itemDescEl.addClass('note-toolbar-gallery-view-item-description');
						MarkdownRenderer.render(this.plugin.app, galleryItem.description, itemDescEl, '/', this.plugin);
					}

					let pluginNames = getPluginNames(galleryItem);
					if (pluginNames) {
						const pluginEl = itemEl.createEl('p');
						pluginEl.addClass('note-toolbar-gallery-view-item-plugins');
						setIcon(pluginEl.createSpan(), 'puzzle');
						pluginEl.createSpan().setText(pluginNames);
					}

					const iconEl = itemEl.createDiv();
					iconEl.addClass('note-toolbar-gallery-view-item-icon');
					setIcon(iconEl, galleryItem.icon);

					// add indicator on mobile, since there's no tooltips
					if (Platform.isMobile) {
						const mobileAddEl = itemEl.createSpan();
						mobileAddEl.addClass('note-toolbar-gallery-view-item-add');
						setIcon(mobileAddEl, 'circle-plus');
					}
				}

			});

		});

		const feedbackEl = markdownEl.createDiv();
		feedbackEl.addClass('note-toolbar-setting-whatsnew-cta', 'is-readable-line-width');
		new Setting(feedbackEl)
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
		this.plugin.registerDomEvent(markdownEl, 'click', (evt) => {
			const galleryItemEl = (evt.target as HTMLElement).closest('.note-toolbar-gallery-view-item');
			if (galleryItemEl && galleryItemEl.id) {
				const galleryItem = this.plugin.gallery.getItems().find(item => item.uuid.includes(galleryItemEl.id));
				if (galleryItem) this.addItem(galleryItem);
			}
		});

		// prevent touch events that open the sidebar on mobile, when scrolling through items
		if (Platform.isPhone) this.plugin.registerDomEvent(this.plugin.app.workspace.containerEl, 'touchstart', (evt) => {
			const target = evt.target as HTMLElement;
			if (target?.closest('.note-toolbar-gallery-view-items-container')) {
				evt.stopImmediatePropagation();
			}
		});

    }

	/**
	 * Adds the provided Gallery item, after prompting for the toolbar to add it to.
	 * @param galleryItem Gallery item to add
	 */
	addItem(galleryItem: ToolbarItemSettings): void {
		const toolbarModal = new ToolbarSuggestModal(this.plugin, true, false, true, async (selectedToolbar: ToolbarSettings) => {
			if (selectedToolbar && galleryItem) {
				if (selectedToolbar.uuid === EMPTY_TOOLBAR_ID) {
					selectedToolbar = await this.plugin.settingsManager.newToolbar(t('setting.toolbars.new-tbar-name'));
				}
				let newItem = await this.plugin.settingsManager.duplicateToolbarItem(selectedToolbar, galleryItem);
				if (newItem.linkAttr.type === ItemType.Plugin) {
					const pluginType = await this.plugin.settingsManager.resolvePluginType(newItem);
					if (!pluginType) return;
				}
				selectedToolbar.updated = new Date().toISOString();
				await this.plugin.settingsManager.save();
				this.plugin.commands.openToolbarSettingsForId(selectedToolbar.uuid, newItem.uuid);
			}
		});
		toolbarModal.open();
	}

    async onClose() {
    }

}