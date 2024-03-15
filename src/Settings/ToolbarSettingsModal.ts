import { App, ButtonComponent, Modal, Setting } from 'obsidian';
import { arraymove } from 'src/Utils/Utils';
import NoteToolbarPlugin from 'src/main';
import { ToolbarSettings } from './NoteToolbarSettings';
import { NoteToolbarSettingTab } from './NoteToolbarSettingTab';
import { DeleteModal } from './DeleteModal';

export default class ToolbarSettingsModal extends Modal {

	public plugin: NoteToolbarPlugin;
	public toolbar: ToolbarSettings;
	private parent: NoteToolbarSettingTab;

	constructor(parent: NoteToolbarSettingTab, toolbar: ToolbarSettings) {
		super(parent.plugin.app);
		this.parent = parent;
		this.plugin = parent.plugin;
		this.toolbar = toolbar;
	}

	onOpen() {
		// const { contentEl } = this;
		this.display_toolbar_settings();
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
		this.parent.display();
	}

	public display_toolbar_settings() {

		this.modalEl.addClass("note-toolbar-setting-modal-container");

		this.contentEl.empty();

		let settings_div = this.containerEl.createEl("div");
		settings_div.className = "vertical-tab-content note-toolbar-setting-modal";

		const name_description = document.createDocumentFragment();
		name_description.append(
			"Give this toolbar a unique name.",
			name_description.createEl("br"),
			"If a `notetoolbar` property is set to use this toolbar, it will take precedence over any folder toolbars."
		);

		let toolbar_name_div = this.containerEl.createEl("div");
		new Setting(toolbar_name_div)
			.setName("Name")
			.setDesc(name_description)
			.addText(text => text
				.setPlaceholder('Name')
				.setValue(this.toolbar.name)
				.onChange(async (value) => {
					// check for existing toolbar with this name
					let existing_toolbar = this.plugin.get_toolbar_from_settings(value);
					if (existing_toolbar && existing_toolbar !== this.toolbar) {
						toolbar_name_div.createEl("div", { 
							text: "A toolbar already exists with this name", 
							attr: { id: "note-toolbar-name-error" }, cls: "note-toolbar-setting-error-message" });
						toolbar_name_div.addClass("note-toolbar-setting-error");
					}
					else {
						document.getElementById("note-toolbar-name-error")?.remove();
						toolbar_name_div.removeClass("note-toolbar-setting-error");
						this.toolbar.name = value;
						this.toolbar.updated = new Date().toISOString();
						// console.log(this.toolbar);
						await this.plugin.save_settings();	
					}
			}));
		settings_div.append(toolbar_name_div);

		// TODO: refactor to use variation of heading_fragment()
		let item_list_heading = createEl("div");
		item_list_heading.className = "note-toolbar-setting-items-header";
		let item_list_title = createEl("div", { text: "Items" });
		item_list_title.className = "setting-item-info";
		let item_list_description = createEl("div", { text: "Items that appear in the toolbar, in order." });
		item_list_description.className = "setting-item-description";
		item_list_heading.append(item_list_title);
		item_list_heading.append(item_list_description);
		settings_div.append(item_list_heading);

		let last_item_index = 0;
		this.toolbar.items.forEach(
			(toolbar_item, index) => {
				last_item_index = index;
				let item_div = this.containerEl.createEl("div");
				item_div.className = "note-toolbar-setting-item";
				let row1_container = this.containerEl.createEl("div");
				row1_container.style.display = "flex";
				row1_container.style.flexFlow = "wrap-reverse";
				row1_container.style.justifyContent = "space-between";

				let text_fields_container = this.containerEl.createEl("div");
				text_fields_container.id = "note-toolbar-setting-item-field-" + index;
				text_fields_container.style.display = "flex";
				text_fields_container.style.flexWrap = "wrap";
				const s1a = new Setting(text_fields_container)
					.setClass("note-toolbar-setting-item-field")
					.addText(text => text
						.setPlaceholder('Item label')
						.setValue(toolbar_item.label)
						.onChange(async (value) => {
							toolbar_item.label = value;
							this.toolbar.updated = new Date().toISOString();
							await this.plugin.save_settings();
					}));
				const s1c = new Setting(text_fields_container)
					.setClass("note-toolbar-setting-item-field")
					.addText(text => text
						.setPlaceholder('Tooltip (optional)')
						.setValue(toolbar_item.tooltip)
						.onChange(async (value) => {
							toolbar_item.tooltip = value;
							this.toolbar.updated = new Date().toISOString();
							await this.plugin.save_settings();
					}));

				let text_fields_url_div = this.containerEl.createEl("div");
				text_fields_url_div.style.display = "flex";
				text_fields_url_div.style.flexWrap = "wrap";
				text_fields_url_div.style.flexGrow = "1";
				const s1b = new Setting(text_fields_url_div)
					.setClass("note-toolbar-setting-item-field-url")
					.addText(text => text
						.setPlaceholder('URL')
						.setValue(toolbar_item.url)
						.onChange(async (value) => {
							toolbar_item.url = value;
							this.toolbar.updated = new Date().toISOString();
							await this.plugin.save_settings();
					}));

				let item_controls_div = this.containerEl.createEl("div");
				item_controls_div.style.marginLeft = "auto";
				item_controls_div.className = "note-toolbar-setting-item-controls";
				const s1d = new Setting(item_controls_div)
					.addExtraButton((cb) => {
						cb.setIcon("up-chevron-glyph")
							.setTooltip("Move up")
							.onClick(() => {
								arraymove(
									this.toolbar.items,
									index,
									index - 1
								);
								this.toolbar.updated = new Date().toISOString();
								this.plugin.save_settings();
								this.display_toolbar_settings();
							});
					})
					.addExtraButton((cb) => {
						cb.setIcon("down-chevron-glyph")
							.setTooltip("Move down")
							.onClick(() => {
								arraymove(
									this.toolbar.items,
									index,
									index + 1
								);
								this.toolbar.updated = new Date().toISOString();
								this.plugin.save_settings();
								this.display_toolbar_settings();
							});
					})
					.addExtraButton((cb) => {
						cb.setIcon("cross")
							.setTooltip("Delete")
							.onClick(() => {
								this.toolbar.items.splice(
									index,
									1
								);
								this.toolbar.updated = new Date().toISOString();
								this.plugin.save_settings();
								this.display_toolbar_settings();
							});
					});

				text_fields_container.appendChild(text_fields_url_div);
				row1_container.appendChild(text_fields_container);
				row1_container.appendChild(item_controls_div);

				item_div.appendChild(row1_container);

				let toggles_div = this.containerEl.createEl("div");
				toggles_div.style.display = "flex";
				toggles_div.style.justifyContent = "flex-end";
				toggles_div.style.flexWrap = "wrap";
				const s2 = new Setting(toggles_div)
					.setClass("note-toolbar-setting-item-toggle")
					.setName("Hide on mobile")
					.addToggle((toggle) => {
						toggle
							.setTooltip(('If enabled, this item will not appear on mobile'))
							.setValue(toolbar_item.hide_on_mobile)
							.onChange((hide_on_mobile) => {
								toolbar_item.hide_on_mobile = hide_on_mobile;
								this.toolbar.updated = new Date().toISOString();
								this.plugin.save_settings();
							});
					});
				const s3 = new Setting(toggles_div)
					.setClass("note-toolbar-setting-item-toggle")
					.setName("Hide on desktop")
					.addToggle((toggle) => {
						toggle
							.setTooltip(('If enabled, this item will not appear on desktop'))
							.setValue(toolbar_item.hide_on_desktop)
							.onChange((hide_on_desktop) => {
								toolbar_item.hide_on_desktop = hide_on_desktop;
								this.toolbar.updated = new Date().toISOString();
								this.plugin.save_settings();
							});
					});
				item_div.appendChild(toggles_div);
				settings_div.appendChild(item_div);
			});

		new Setting(settings_div)
			.setClass("note-toolbar-setting-button")
			.addButton((button: ButtonComponent) => {
				button
					.setTooltip("Add a new item to the toolbar")
					.setButtonText("+ Add toolbar item")
					.setCta()
					.onClick(() => {
						this.toolbar.items.push({
							label: "",
							url: "",
							tooltip: "",
							hide_on_desktop: false,
							hide_on_mobile: false
						});
						this.toolbar.updated = new Date().toISOString();
						this.plugin.save_settings();
						this.display_toolbar_settings();
					});
			});

		new Setting(settings_div)
			.setName("Delete this toolbar")
			.setDesc("This action cannot be undone")
			.setClass("note-toolbar-setting-item-delete-button")
			.addButton((button: ButtonComponent) => {
				button
					.setClass("mod-warning")
					.setTooltip("Delete this toolbar")
					.setButtonText("Delete...")
					.setCta()
					.onClick(() => {
						const modal = new DeleteModal(this);
						modal.open();
					});
			});

		this.contentEl.appendChild(settings_div);

		// set focus on last thing in the list, if the label is empty
		let input_to_focus = this.contentEl.querySelector('#note-toolbar-setting-item-field-' + last_item_index + ' input[type="text"]') as HTMLInputElement;
		if (input_to_focus?.value.length === 0) {
			input_to_focus.focus();
		}

	}

}