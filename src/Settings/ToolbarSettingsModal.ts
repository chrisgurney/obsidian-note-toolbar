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
		this.displayToolbarSettings();
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
		this.parent.display();
	}

	public displayToolbarSettings() {

		this.modalEl.addClass("note-toolbar-setting-modal-container");

		this.contentEl.empty();

		let settingsDiv = this.containerEl.createEl("div");
		settingsDiv.className = "vertical-tab-content note-toolbar-setting-modal";

		//
		// Toolbar name
		// 

		const nameDescription = document.createDocumentFragment();
		nameDescription.append(
			"Give this toolbar a unique name.",
			nameDescription.createEl("br"),
			"If a `notetoolbar` property is set to use this toolbar, it will take precedence over any folder toolbars."
		);

		let toolbarNameDiv = this.containerEl.createEl("div");
		new Setting(toolbarNameDiv)
			.setName("Name")
			.setDesc(nameDescription)
			.addText(text => text
				.setPlaceholder('Name')
				.setValue(this.toolbar.name)
				.onChange(async (value) => {
					// check for existing toolbar with this name
					let existingToolbar = this.plugin.get_toolbar_settings(value);
					if (existingToolbar && existingToolbar !== this.toolbar) {
						toolbarNameDiv.createEl("div", { 
							text: "A toolbar already exists with this name", 
							attr: { id: "note-toolbar-name-error" }, cls: "note-toolbar-setting-error-message" });
						toolbarNameDiv.addClass("note-toolbar-setting-error");
					}
					else {
						document.getElementById("note-toolbar-name-error")?.remove();
						toolbarNameDiv.removeClass("note-toolbar-setting-error");
						this.toolbar.name = value;
						this.toolbar.updated = new Date().toISOString();
						// console.log(this.toolbar);
						await this.plugin.save_settings();	
					}
			}));
		settingsDiv.append(toolbarNameDiv);

		//
		// Item list
		// 

		// TODO: refactor to use variation of heading_fragment()
		let itemListHeading = createEl("div");
		itemListHeading.className = "note-toolbar-setting-items-header";
		let itemListTitle = createEl("div", { text: "Items" });
		itemListTitle.className = "setting-item-info";
		let itemListDesc = createEl("div", { text: "Items that appear in the toolbar, in order." });
		itemListDesc.className = "setting-item-description";
		itemListHeading.append(itemListTitle);
		itemListHeading.append(itemListDesc);
		settingsDiv.append(itemListHeading);

		let lastItemIndex = 0;
		this.toolbar.items.forEach(
			(toolbarItem, index) => {
				lastItemIndex = index;
				let itemDiv = this.containerEl.createEl("div");
				itemDiv.className = "note-toolbar-setting-item";
				let row1Container = this.containerEl.createEl("div");
				row1Container.style.display = "flex";
				row1Container.style.flexFlow = "wrap-reverse";
				row1Container.style.justifyContent = "space-between";

				let textFieldsContainer = this.containerEl.createEl("div");
				textFieldsContainer.id = "note-toolbar-setting-item-field-" + index;
				textFieldsContainer.style.display = "flex";
				textFieldsContainer.style.flexWrap = "wrap";
				const s1a = new Setting(textFieldsContainer)
					.setClass("note-toolbar-setting-item-field")
					.addText(text => text
						.setPlaceholder('Item label')
						.setValue(toolbarItem.label)
						.onChange(async (value) => {
							toolbarItem.label = value;
							this.toolbar.updated = new Date().toISOString();
							await this.plugin.save_settings();
					}));
				const s1c = new Setting(textFieldsContainer)
					.setClass("note-toolbar-setting-item-field")
					.addText(text => text
						.setPlaceholder('Tooltip (optional)')
						.setValue(toolbarItem.tooltip)
						.onChange(async (value) => {
							toolbarItem.tooltip = value;
							this.toolbar.updated = new Date().toISOString();
							await this.plugin.save_settings();
					}));

				let textFieldsUrlDiv = this.containerEl.createEl("div");
				textFieldsUrlDiv.style.display = "flex";
				textFieldsUrlDiv.style.flexWrap = "wrap";
				textFieldsUrlDiv.style.flexGrow = "1";
				const s1b = new Setting(textFieldsUrlDiv)
					.setClass("note-toolbar-setting-item-field-url")
					.addText(text => text
						.setPlaceholder('URL')
						.setValue(toolbarItem.url)
						.onChange(async (value) => {
							toolbarItem.url = value;
							this.toolbar.updated = new Date().toISOString();
							await this.plugin.save_settings();
					}));

				let itemControlsDiv = this.containerEl.createEl("div");
				itemControlsDiv.style.marginLeft = "auto";
				itemControlsDiv.className = "note-toolbar-setting-item-controls";
				const s1d = new Setting(itemControlsDiv)
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
								this.displayToolbarSettings();
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
								this.displayToolbarSettings();
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
								this.displayToolbarSettings();
							});
					});

				textFieldsContainer.appendChild(textFieldsUrlDiv);
				row1Container.appendChild(textFieldsContainer);
				row1Container.appendChild(itemControlsDiv);

				itemDiv.appendChild(row1Container);

				let togglesDiv = this.containerEl.createEl("div");
				togglesDiv.style.display = "flex";
				togglesDiv.style.justifyContent = "flex-end";
				togglesDiv.style.flexWrap = "wrap";
				const s2 = new Setting(togglesDiv)
					.setClass("note-toolbar-setting-item-toggle")
					.setName("Hide on mobile")
					.addToggle((toggle) => {
						toggle
							.setTooltip(('If enabled, this item will not appear on mobile'))
							.setValue(toolbarItem.hide_on_mobile)
							.onChange((hideOnMobile) => {
								toolbarItem.hide_on_mobile = hideOnMobile;
								this.toolbar.updated = new Date().toISOString();
								this.plugin.save_settings();
							});
					});
				const s3 = new Setting(togglesDiv)
					.setClass("note-toolbar-setting-item-toggle")
					.setName("Hide on desktop")
					.addToggle((toggle) => {
						toggle
							.setTooltip(('If enabled, this item will not appear on desktop'))
							.setValue(toolbarItem.hide_on_desktop)
							.onChange((hideOnDesktop) => {
								toolbarItem.hide_on_desktop = hideOnDesktop;
								this.toolbar.updated = new Date().toISOString();
								this.plugin.save_settings();
							});
					});
				itemDiv.appendChild(togglesDiv);
				settingsDiv.appendChild(itemDiv);
			});

		new Setting(settingsDiv)
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
						this.displayToolbarSettings();
					});
			});

		//
		// Delete toolbar
		// 

		new Setting(settingsDiv)
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

		this.contentEl.appendChild(settingsDiv);

		// set focus on last thing in the list, if the label is empty
		let inputToFocus = this.contentEl.querySelector('#note-toolbar-setting-item-field-' + lastItemIndex + ' input[type="text"]') as HTMLInputElement;
		if (inputToFocus?.value.length === 0) {
			inputToFocus.focus();
		}

	}

}