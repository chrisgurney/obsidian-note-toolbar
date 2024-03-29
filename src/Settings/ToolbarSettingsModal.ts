import { ButtonComponent, Modal, Setting, debounce } from 'obsidian';
import { arraymove, debugLog, emptyMessageFr, hasVars, isValidUri } from 'src/Utils/Utils';
import NoteToolbarPlugin from 'src/main';
import { DEFAULT_STYLE_OPTIONS, MOBILE_STYLE_OPTIONS, ToolbarSettings } from './NoteToolbarSettings';
import { NoteToolbarSettingTab } from './NoteToolbarSettingTab';
import { DeleteModal } from './DeleteModal';
import { CommandSuggester } from './Suggesters/CommandSuggester';

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

	/**
	 * Displays the toolbar item's settings within the modal window.
	 */
	onOpen() {
		this.display();
	}

	/**
	 * Removes modal window and refreshes the parent settings window.
	 */
	onClose() {
		const { contentEl } = this;
		contentEl.empty();
		this.parent.display();
	}

	/*************************************************************************
	 * SETTINGS DISPLAY
	 *************************************************************************/

	/**
	 * Displays the toolbar item's settings.
	 */
	public display() {

		this.modalEl.addClass("note-toolbar-setting-modal-container");

		this.contentEl.empty();

		let settingsDiv = this.containerEl.createEl("div");
		settingsDiv.className = "vertical-tab-content note-toolbar-setting-modal";

		this.displayNameSetting(settingsDiv);

		if (false) {
			const ts = new Setting(settingsDiv)
			.setClass("note-toolbar-setting-item-field")
			.addSearch((cb) => {
				new CommandSuggester(this.app, this.plugin, cb.inputEl);
				cb.setPlaceholder("Command")
					.setValue(cb.inputEl.value)
					.onChange(debounce(async (command) => {
						debugLog(cb.inputEl);
						document.getElementById("test-command-link")?.setText(command);
						document.getElementById("test-command-link")?.setAttribute("data-command-id", cb.inputEl?.getAttribute("data-command-id") ?? "");
						// TODO:
						// this.toolbar.link = COMMAND_NAME;
						// this.toolbar.command = COMMAND_ID;
						// await this.plugin.saveSettings();
					}, 250));
			});
		
			let commandTestContainer = this.containerEl.createDiv();
			let commandTestLink = this.containerEl.createEl("a");
			commandTestLink.id = "test-command-link";
			commandTestContainer.append(commandTestLink);
			settingsDiv.append(commandTestContainer);

			// TODO: incorporate into click handler
			commandTestLink.onclick = (e) => {
				let clickedEl = e.currentTarget as HTMLLinkElement;
				let commandId = clickedEl.getAttribute("data-command-id");
				if (commandId) {
					this.app.commands.executeCommandById(commandId);
				}
			};
		}

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
	 * Displays the Name setting.
	 * @param settingsDiv HTMLElement to add the setting to.
	 */
	displayNameSetting(settingsDiv: HTMLElement) {

		let toolbarNameDiv = this.containerEl.createEl("div");
		new Setting(toolbarNameDiv)
			.setName("Name")
			.setDesc("Give this toolbar a unique name.")
			.addText(text => text
				.setPlaceholder('Name')
				.setValue(this.toolbar.name)
				.onChange(debounce(async (value) => {
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
						this.plugin.settings.toolbars.sort((a, b) => a.name.localeCompare(b.name));
						await this.plugin.saveSettings();
					}
				}, 750)));
		settingsDiv.append(toolbarNameDiv);

	}

	/**
	 * Displays the list of toolbar items for editing.
	 * @param settingsDiv HTMLElement to add the settings to.
	 */
	displayItemList(settingsDiv: HTMLElement) {

		const itemsDescription = document.createDocumentFragment();
		itemsDescription.append(
			"Items that appear in the toolbar, in order.",
			itemsDescription.createEl("br"),
			"See the documentation for ",
			itemsDescription.createEl("a", {
				href: "https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Examples",
				text: "examples",
			}),
			", and for details about ",
			itemsDescription.createEl("a", {
				href: "https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Creating-toolbars#url-or-note",
				text: "variables",
			}),
			" supported in links."
		);

		new Setting(settingsDiv)
			.setName("Items")
			.setDesc(itemsDescription)
			.setClass("note-toolbar-setting-no-controls");

		this.toolbar.items.forEach(
			(toolbarItem, index) => {
				let itemDiv = this.containerEl.createEl("div");
				itemDiv.className = "note-toolbar-setting-item";
				let itemTopContainer = this.containerEl.createEl("div");
				itemTopContainer.className = "note-toolbar-setting-item-top-container";

				let textFieldsContainer = this.containerEl.createEl("div");
				textFieldsContainer.id = "note-toolbar-setting-item-field-" + index;
				textFieldsContainer.className = "note-toolbar-setting-item-fields";
				const s1a = new Setting(textFieldsContainer)
					.setClass("note-toolbar-setting-item-field")
					.addText(text => text
						.setPlaceholder('Item label')
						.setValue(toolbarItem.label)
						.onChange(
							debounce(async (value) => {
								toolbarItem.label = value;
								// TODO: if the label contains vars, set the flag to always rerender this toolbar
								// however, if vars are removed, make sure there aren't any other label vars, and only then unset the flag
								this.toolbar.updated = new Date().toISOString();
								await this.plugin.saveSettings();
							}, 750)));
				const s1c = new Setting(textFieldsContainer)
					.setClass("note-toolbar-setting-item-field")
					.addText(text => text
						.setPlaceholder('Tooltip (optional)')
						.setValue(toolbarItem.tooltip)
						.onChange(
							debounce(async (value) => {
								toolbarItem.tooltip = value;
								this.toolbar.updated = new Date().toISOString();
								await this.plugin.saveSettings();
							}, 750)));

				let textFieldsUrlDiv = this.containerEl.createEl("div");
				textFieldsUrlDiv.className = "note-toolbar-setting-item-url-container";
				const s1b = new Setting(textFieldsUrlDiv)
					.setClass("note-toolbar-setting-item-field-url")
					.addText(text => text
						.setPlaceholder('URL or note')
						.setValue(toolbarItem.url)
						.onChange(
							debounce(async (value) => {
								toolbarItem.url = value;
								toolbarItem.urlAttr.isUri = isValidUri(value);
								toolbarItem.urlAttr.hasVars = hasVars(value);
								this.toolbar.updated = new Date().toISOString();
								await this.plugin.saveSettings();
							}, 750)));

				let itemControlsDiv = this.containerEl.createEl("div");
				itemControlsDiv.className = "note-toolbar-setting-item-controls";
				const s1d = new Setting(itemControlsDiv)
					.addExtraButton((cb) => {
						cb.setIcon("up-chevron-glyph")
							.setTooltip("Move up")
							.onClick(async () => this.listMoveHandler(null, index, "up"));
						cb.extraSettingsEl.setAttribute("tabindex", "0");
						this.plugin.registerDomEvent(
							cb.extraSettingsEl, 'keydown', (e) => this.listMoveHandler(e, index, "up"));
					})
					.addExtraButton((cb) => {
						cb.setIcon("down-chevron-glyph")
							.setTooltip("Move down")
							.onClick(async () => this.listMoveHandler(null, index, "down"));
						cb.extraSettingsEl.setAttribute("tabindex", "0");
						this.plugin.registerDomEvent(
							cb.extraSettingsEl, 'keydown', (e) => this.listMoveHandler(e, index, "down"));
					})
					.addExtraButton((cb) => {
						cb.setIcon("cross")
							.setTooltip("Delete")
							.onClick(async () => this.listMoveHandler(null, index, "delete"));
						cb.extraSettingsEl.setAttribute("tabindex", "0");
						this.plugin.registerDomEvent(
							cb.extraSettingsEl, 'keydown', (e) => this.listMoveHandler(e, index, "delete"));
					});

				let itemFieldsControlsContainer = this.containerEl.createEl("div");
				itemFieldsControlsContainer.className = "note-toolbar-setting-item-fields-and-controls";
				itemFieldsControlsContainer.appendChild(textFieldsContainer);
				itemFieldsControlsContainer.appendChild(itemControlsDiv);

				itemTopContainer.appendChild(itemFieldsControlsContainer);
				itemTopContainer.appendChild(textFieldsUrlDiv);

				itemDiv.appendChild(itemTopContainer);

				let togglesContainer = this.containerEl.createEl("div");
				togglesContainer.className = "note-toolbar-setting-item-toggles-container";
				const s2 = new Setting(togglesContainer)
					.setClass("note-toolbar-setting-item-toggle")
					.setName("Hide on: mobile")
					.addToggle((toggle) => {
						toggle
							.setTooltip(('If enabled, this item will not appear on mobile'))
							.setValue(toolbarItem.hideOnMobile)
							.onChange(async (hideOnMobile) => {
								toolbarItem.hideOnMobile = hideOnMobile;
								this.toolbar.updated = new Date().toISOString();
								await this.plugin.saveSettings();
							});
					});
				const s3 = new Setting(togglesContainer)
					.setClass("note-toolbar-setting-item-toggle")
					.setName("desktop")
					.addToggle((toggle) => {
						toggle
							.setTooltip(('If enabled, this item will not appear on desktop'))
							.setValue(toolbarItem.hideOnDesktop)
							.onChange(async (hideOnDesktop) => {
								toolbarItem.hideOnDesktop = hideOnDesktop;
								this.toolbar.updated = new Date().toISOString();
								await this.plugin.saveSettings();
							});
					});
				itemDiv.appendChild(togglesContainer);
				settingsDiv.appendChild(itemDiv);
			});

		new Setting(settingsDiv)
			.setClass("note-toolbar-setting-button")
			.addButton((button: ButtonComponent) => {
				button
					.setTooltip("Add a new item to the toolbar")
					.setButtonText("+ Add toolbar item")
					.setCta()
					.onClick(async () => {
						this.toolbar.items.push({
							label: "",
							url: "",
							urlAttr: {
								hasVars: false,
								isUri: false
							},
							tooltip: "",
							hideOnDesktop: false,
							hideOnMobile: false
						});
						this.toolbar.updated = new Date().toISOString();
						await this.plugin.saveSettings();
						this.display();
					});
			});

	}

	/**
	 * Displays the Style settings.
	 * @param settingsDiv HTMLElement to add the settings to.
	 */
	displayStyleSetting(settingsDiv: HTMLElement) {

		const stylingDescription = document.createDocumentFragment();
		stylingDescription.append(
			"List of styles to apply to the toolbar (default: border even sticky).",
			stylingDescription.createEl("br"),
			"See the ",
			stylingDescription.createEl("a", {
				href: "https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Creating-toolbars#styles",
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

		if (this.toolbar.defaultStyles.length == 0) {
			let emptyMsg = this.containerEl.createEl("div", 
				{ text: emptyMessageFr("No default styles set.") });
			emptyMsg.className = "note-toolbar-setting-empty-message";
			defaultStyleDiv.append(emptyMsg);
		}
		else {

			this.toolbar.defaultStyles.forEach(
				(style, index) => {
					new Setting(defaultStyleDiv)
						.setName(this.getValueForKey(DEFAULT_STYLE_OPTIONS, style))
						.addExtraButton((cb) => {
							cb.setIcon("cross")
								.setTooltip("Delete")
								.onClick(async () => {
									this.toolbar.defaultStyles.splice(
										index,
										1
									);
									this.toolbar.updated = new Date().toISOString();
									await this.plugin.saveSettings();
									this.display();
								});
						});
			});

		}

		new Setting(defaultStyleDiv)
			.addDropdown((dropdown) =>
				dropdown
					.addOptions(
						DEFAULT_STYLE_OPTIONS.reduce((acc, option) => {
							return { ...acc, ...option };
						}, {}))
					.setValue(this.toolbar.defaultStyles.join(", ") || "")
					.onChange(async (val) => {
						if (this.toolbar.defaultStyles.includes(val)) {
							this.toolbar.defaultStyles =
								this.toolbar.defaultStyles.filter((i) => i !== val);
						} 
						else {
							this.toolbar.defaultStyles.push(val);
						}
						await this.plugin.saveSettings();
						this.display();
					})
		);

		new Setting(settingsDiv)
			.setName("Default")
			.setDesc("Applies to all unless overridden.")
			.setClass("note-toolbar-setting-item-styles")
			.settingEl.append(defaultStyleDiv);

		//
		// Mobile
		//

		let mobileStyleDiv = this.containerEl.createDiv();
		mobileStyleDiv.className = "note-toolbar-setting-item-style";

		if (this.toolbar.mobileStyles.length == 0) {
			let emptyMsg = this.containerEl.createEl("div", 
				{ text: emptyMessageFr("No mobile styles set.") });
			emptyMsg.className = "note-toolbar-setting-empty-message";
			mobileStyleDiv.append(emptyMsg);
		}
		else {

			this.toolbar.mobileStyles.forEach(
				(style, index) => {
					new Setting(mobileStyleDiv)
						.setName(this.getValueForKey(MOBILE_STYLE_OPTIONS, style))
						.addExtraButton((cb) => {
							cb.setIcon("cross")
								.setTooltip("Delete")
								.onClick(async () => {
									this.toolbar.mobileStyles.splice(
										index,
										1
									);
									this.toolbar.updated = new Date().toISOString();
									await this.plugin.saveSettings();
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
					.onChange(async (val) => {
						if (this.toolbar.mobileStyles.includes(val)) {
							this.toolbar.mobileStyles =
								this.toolbar.mobileStyles.filter((i) => i !== val);
						} 
						else {
							this.toolbar.mobileStyles.push(val);
						}
						await this.plugin.saveSettings();
						this.display();
					})
		);

		new Setting(settingsDiv)
			.setName("Mobile")
			.setDesc("Override default styles.")
			.setClass("note-toolbar-setting-item-styles")
			.settingEl.append(mobileStyleDiv);

	}

	/**
	 * Displays the Delete button.
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
	 * SETTINGS DISPLAY HANDLERS
	 *************************************************************************/

	/**
	 * Handles moving items up and down the list, and deletion, based on click or keyboard event.
	 * @param keyEvent KeyboardEvent, if the keyboard is triggering this handler.
	 * @param index Number of the item in the list we're moving/deleting.
	 * @param direction Direction of the move, or "delete".
	 */
	async listMoveHandler(keyEvent: KeyboardEvent | null, index: number, direction: "up" | "down" | "delete"): Promise<void> {
		if (keyEvent) {
			switch (keyEvent.key) {
				case "ArrowUp":
					direction = "up";
					break;
				case "ArrowDown":
					direction = "down";
					break;
				case "Enter":
					break;
				default:
					return;
			}
		}
		switch (direction) {
			case "up":
				arraymove(this.toolbar.items, index, index - 1);
				this.toolbar.updated = new Date().toISOString();				
				break;
			case "down":
				arraymove(this.toolbar.items, index, index + 1);
				this.toolbar.updated = new Date().toISOString();
				break;
			case "delete":
				this.toolbar.items.splice(index, 1);
				this.toolbar.updated = new Date().toISOString();
				break;
		}
		await this.plugin.saveSettings();
		this.display();
	}

	/*************************************************************************
	 * UTILITIES
	 *************************************************************************/

	/**
	 * Returns the value for the provided key from the provided dictionary.
	 * @param dict key-value dictionary
	 * @param key string key
	 * @returns value from the dictionary
	 */
	getValueForKey(dict: {[key: string]: string}[], key: string): string {
		const option = dict.find(option => key in option);
		return option ? Object.values(option)[0] : 'INVALID OPTION';
	}

}