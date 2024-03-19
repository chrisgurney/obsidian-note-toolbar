import { App, ButtonComponent, Modal, Setting } from 'obsidian';
import { arraymove, emptyMessageFr } from 'src/Utils/Utils';
import NoteToolbarPlugin from 'src/main';
import { DEFAULT_STYLE_OPTIONS, MOBILE_STYLE_OPTIONS, ToolbarSettings } from './NoteToolbarSettings';
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
		this.display();
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
		this.parent.display();
	}

	/*************************************************************************
	 * SETTINGS DISPLAY
	 *************************************************************************/

	/**
	 * 
	 */
	public display() {

		this.modalEl.addClass("note-toolbar-setting-modal-container");

		this.contentEl.empty();

		let settingsDiv = this.containerEl.createEl("div");
		settingsDiv.className = "vertical-tab-content note-toolbar-setting-modal";

		this.displayNameSetting(settingsDiv);
		this.displayItemList(settingsDiv);
		this.displayStyleSetting(settingsDiv);
		this.displayDeleteButton(settingsDiv);

		this.contentEl.appendChild(settingsDiv);

		// set focus on last item in the list, if the label is empty
		let inputToFocus = this.contentEl.querySelector('#note-toolbar-setting-item-field-' + (this.toolbar.items.length - 1) + ' input[type="text"]') as HTMLInputElement;
		if (inputToFocus?.value.length === 0) {
			inputToFocus.focus();
		}

	}

	/**
	 * 
	 * @param settingsDiv HTMLElement to add the settings to.
	 */
	displayNameSetting(settingsDiv: HTMLElement) {

		const nameDescription = document.createDocumentFragment();
		nameDescription.append(
			"Give this toolbar a unique name.",
			nameDescription.createEl("br"),
			(this.plugin.settings.toolbarProp ? 
				"If a '" + this.plugin.settings.toolbarProp + "' property is set to use this toolbar, it will take precedence over any folder toolbars." : "")
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
					let existingToolbar = this.plugin.getToolbarSettings(value);
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
						await this.plugin.saveSettings();	
					}
			}));
		settingsDiv.append(toolbarNameDiv);

	}

	/**
	 * 
	 * @param settingsDiv HTMLElement to add the settings to.
	 */
	displayItemList(settingsDiv: HTMLElement) {

		const itemsDescription = document.createDocumentFragment();
		itemsDescription.append(
			"Items that appear in the toolbar, in order.",
			itemsDescription.createEl("br"),
			"See the ",
			itemsDescription.createEl("a", {
				href: "https://github.com/chrisgurney/obsidian-note-toolbar",
				text: "documentation",
			}),
			" about variables supported in URLs."
		);

		new Setting(settingsDiv)
			.setName("Items")
			.setDesc(itemsDescription)
			.setClass("note-toolbar-setting-no-controls");

		this.toolbar.items.forEach(
			(toolbarItem, index) => {
				let itemDiv = this.containerEl.createEl("div");
				itemDiv.className = "note-toolbar-setting-item";
				let row1Container = this.containerEl.createEl("div");
				row1Container.style.display = "flex";
				row1Container.style.flexFlow = "wrap-reverse";
				row1Container.style.justifyContent = "space-between";

				let textFieldsContainer = this.containerEl.createEl("div");
				textFieldsContainer.id = "note-toolbar-setting-item-field-" + index;
				textFieldsContainer.className = "note-toolbar-setting-item-fields";
				const s1a = new Setting(textFieldsContainer)
					.setClass("note-toolbar-setting-item-field")
					.addText(text => text
						.setPlaceholder('Item label')
						.setValue(toolbarItem.label)
						.onChange(async (value) => {
							toolbarItem.label = value;
							this.toolbar.updated = new Date().toISOString();
							await this.plugin.saveSettings();
					}));
				const s1c = new Setting(textFieldsContainer)
					.setClass("note-toolbar-setting-item-field")
					.addText(text => text
						.setPlaceholder('Tooltip (optional)')
						.setValue(toolbarItem.tooltip)
						.onChange(async (value) => {
							toolbarItem.tooltip = value;
							this.toolbar.updated = new Date().toISOString();
							await this.plugin.saveSettings();
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
							await this.plugin.saveSettings();
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
								this.plugin.saveSettings();
								this.display();
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
								this.plugin.saveSettings();
								this.display();
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
								this.plugin.saveSettings();
								this.display();
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
					.setName("Hide on: mobile")
					.addToggle((toggle) => {
						toggle
							.setTooltip(('If enabled, this item will not appear on mobile'))
							.setValue(toolbarItem.hideOnMobile)
							.onChange((hideOnMobile) => {
								toolbarItem.hideOnMobile = hideOnMobile;
								this.toolbar.updated = new Date().toISOString();
								this.plugin.saveSettings();
							});
					});
				const s3 = new Setting(togglesDiv)
					.setClass("note-toolbar-setting-item-toggle")
					.setName("desktop")
					.addToggle((toggle) => {
						toggle
							.setTooltip(('If enabled, this item will not appear on desktop'))
							.setValue(toolbarItem.hideOnDesktop)
							.onChange((hideOnDesktop) => {
								toolbarItem.hideOnDesktop = hideOnDesktop;
								this.toolbar.updated = new Date().toISOString();
								this.plugin.saveSettings();
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
							hideOnDesktop: false,
							hideOnMobile: false
						});
						this.toolbar.updated = new Date().toISOString();
						this.plugin.saveSettings();
						this.display();
					});
			});

	}

	/**
	 * 
	 * @param settingsDiv HTMLElement to add the settings to.
	 */
	displayStyleSetting(settingsDiv: HTMLElement) {

		const stylingDescription = document.createDocumentFragment();
		stylingDescription.append(
			"List of styles to apply to the toolbar (default: border even sticky).",
			stylingDescription.createEl("br"),
			"See the ",
			stylingDescription.createEl("a", {
				href: "https://github.com/chrisgurney/obsidian-note-toolbar",
				text: "documentation",
			}),
			" about the list of supported styles."
		);

		new Setting(settingsDiv)
			.setName("Styles")
			.setDesc(stylingDescription)
			.setClass("note-toolbar-setting-no-controls");

		//
		// Default
		//

		let defaultStyleDiv = this.containerEl.createDiv();
		defaultStyleDiv.className = "note-toolbar-setting-item-style";

		this.toolbar.defaultStyles.forEach(
			(style, index) => {
				new Setting(defaultStyleDiv)
					.setName(this.getValueForKey(DEFAULT_STYLE_OPTIONS, style))
					.addExtraButton((cb) => {
						cb.setIcon("cross")
							.setTooltip("Delete")
							.onClick(() => {
								this.toolbar.defaultStyles.splice(
									index,
									1
								);
								this.toolbar.updated = new Date().toISOString();
								this.plugin.saveSettings();
								this.display();
							});
					});
		});

		new Setting(defaultStyleDiv)
			.addDropdown((dropdown) =>
				dropdown
					.addOptions(
						DEFAULT_STYLE_OPTIONS.reduce((acc, option) => {
							return { ...acc, ...option };
						}, {}))
					.setValue(this.toolbar.defaultStyles.join(", ") || "")
					.onChange((val) => {
						if (this.toolbar.defaultStyles.includes(val)) {
							this.toolbar.defaultStyles =
								this.toolbar.defaultStyles.filter((i) => i !== val);
						} 
						else {
							this.toolbar.defaultStyles.push(val);
						}
						this.plugin.saveSettings();
						this.display();
					})
		);

		new Setting(settingsDiv)
			.setName("Default")
			.setClass("note-toolbar-setting-item-styles")
			.settingEl.append(defaultStyleDiv);

		//
		// Mobile
		//

		let mobileStyleDiv = this.containerEl.createDiv();
		mobileStyleDiv.className = "note-toolbar-setting-item-style";

		if (this.toolbar.mobileStyles.length == 0) {
			mobileStyleDiv
				.createEl("div", { text: emptyMessageFr("No mobile styles set.") })
				.className = "note-toolbar-setting-empty-message";
		}
		else {

			this.toolbar.mobileStyles.forEach(
				(style, index) => {
					new Setting(mobileStyleDiv)
						.setName(this.getValueForKey(MOBILE_STYLE_OPTIONS, style))
						.addExtraButton((cb) => {
							cb.setIcon("cross")
								.setTooltip("Delete")
								.onClick(() => {
									this.toolbar.mobileStyles.splice(
										index,
										1
									);
									this.toolbar.updated = new Date().toISOString();
									this.plugin.saveSettings();
									this.display();
								});
						});
			});

		}

		new Setting(mobileStyleDiv)
			.addDropdown((dropdown) =>
				dropdown
					.addOptions(
						MOBILE_STYLE_OPTIONS.reduce((acc, option) => {
							return {...acc, ...option};
						}, {}))
					.setValue(this.toolbar.mobileStyles.join(", ") || "")
					.onChange((val) => {
						if (this.toolbar.mobileStyles.includes(val)) {
							this.toolbar.mobileStyles =
								this.toolbar.mobileStyles.filter((i) => i !== val);
						} 
						else {
							this.toolbar.mobileStyles.push(val);
						}
						this.plugin.saveSettings();
						this.display();
					})
		);

		new Setting(settingsDiv)
			.setName("Mobile")
			.setDesc("Overrides default styles")
			.setClass("note-toolbar-setting-item-styles")
			.settingEl.append(mobileStyleDiv);

	}

	/**
	 * 
	 * @param settingsDiv HTMLElement to add the settings to.
	 */
	displayDeleteButton(settingsDiv: HTMLElement) {

		new Setting(settingsDiv)
			.setName("Delete this toolbar")
			.setDesc("This action cannot be undone.")
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

	}

	/*************************************************************************
	 * UTILITIES
	 *************************************************************************/

	getValueForKey(styleDict: {[key: string]: string}[], key: string): string {
		const option = styleDict.find(option => key in option);
		return option ? Object.values(option)[0] : 'INVALID OPTION';
	}

}