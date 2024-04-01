import { ButtonComponent, Modal, Setting, TFile, debounce, normalizePath, setIcon } from 'obsidian';
import { arraymove, debugLog, emptyMessageFr, hasVars } from 'src/Utils/Utils';
import NoteToolbarPlugin from 'src/main';
import { DEFAULT_STYLE_OPTIONS, LinkType, MOBILE_STYLE_OPTIONS, ToolbarItemSettings, ToolbarSettings } from './NoteToolbarSettings';
import { NoteToolbarSettingTab } from './NoteToolbarSettingTab';
import { DeleteModal } from './DeleteModal';
import { CommandSuggester } from './Suggesters/CommandSuggester';
import { IconModal } from './IconModal';

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
		this.displayItemList(settingsDiv);
		this.displayStyleSetting(settingsDiv);
		this.displayDeleteButton(settingsDiv);

		this.contentEl.appendChild(settingsDiv);

		// set focus on last item in the list, if the label is empty
		let inputToFocus = this.contentEl.querySelector('#note-toolbar-setting-item-field-' + (this.toolbar.items.length - 1) + ' input[type="text"]') as HTMLInputElement;
		if (inputToFocus?.value.length === 0) {
			inputToFocus.focus();
		}

		// scroll to the position when the modal was last open
		this.rememberLastPosition(this.contentEl.children[0] as HTMLElement);

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

		let itemLinkFields: {
			command: Setting;
			file: Setting;
			uri: Setting;
		}[] = [];

		this.toolbar.items.forEach(
			(toolbarItem, index) => {
				let itemDiv = this.containerEl.createEl("div");
				itemDiv.className = "note-toolbar-setting-item";
				let itemTopContainer = this.containerEl.createEl("div");
				itemTopContainer.className = "note-toolbar-setting-item-top-container";

				//
				// Item name and tooltip
				//

				let textFieldsContainer = this.containerEl.createEl("div");
				textFieldsContainer.id = "note-toolbar-setting-item-field-" + index;
				textFieldsContainer.className = "note-toolbar-setting-item-fields";

				const s1a = new Setting(textFieldsContainer)
					.setClass("note-toolbar-setting-item-icon")
					.addExtraButton((cb) => {
						cb.setIcon(toolbarItem.icon ? toolbarItem.icon : "lucide-plus-square")
							.setTooltip("Select icon")
							.onClick(async () => {
								const modal = new IconModal(this, toolbarItem);
								modal.open();
							})});

				const s1b = new Setting(textFieldsContainer)
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

				//
				// Item link
				//

				let linkContainerDiv = this.containerEl.createEl("div");
				linkContainerDiv.className = "note-toolbar-setting-item-link-container";

				let linkTypeDiv = this.containerEl.createEl("div");

				const s1t = new Setting(linkTypeDiv)
					.addDropdown((dropdown) =>
						dropdown
							.addOptions({command: "Command", file: "File", uri: "URI"})
							.setValue(toolbarItem.linkAttr.type)
							.onChange(async (value) => {
								toolbarItem.linkAttr.type = value as LinkType;
								switch (value) {
									case "command":
										toolbarItem.link = "";
										itemLinkFields[index].command.settingEl.setAttribute("data-active", "true");
										itemLinkFields[index].file.settingEl.setAttribute("data-active", "false");
										itemLinkFields[index].uri.settingEl.setAttribute("data-active", "false");
										break;
									case "file":
										itemLinkFields[index].command.settingEl.setAttribute("data-active", "false");
										itemLinkFields[index].file.settingEl.setAttribute("data-active", "true");
										itemLinkFields[index].uri.settingEl.setAttribute("data-active", "false");
										break;
									case "uri":
										itemLinkFields[index].command.settingEl.setAttribute("data-active", "false");
										itemLinkFields[index].file.settingEl.setAttribute("data-active", "false");
										itemLinkFields[index].uri.settingEl.setAttribute("data-active", "true");
										break;
								}
								await this.plugin.saveSettings();
								this.display();
							})
					);

				let linkFieldDiv = this.containerEl.createEl("div");
				linkFieldDiv.className = "note-toolbar-setting-item-link-container";

				let linkCommandFieldDiv = this.containerEl.createDiv();
				let linkFileFieldDiv = this.containerEl.createDiv();
				let linkUriFieldDiv = this.containerEl.createDiv();

				itemLinkFields.push({
					//
					// command
					//
					command: new Setting(linkCommandFieldDiv)
						.setClass("note-toolbar-setting-item-field-link")
						.addSearch((cb) => {
							new CommandSuggester(this.app, this.plugin, cb.inputEl);
							cb.setPlaceholder("Command")
								.setValue(toolbarItem.link)
								.onChange(debounce(async (command) => {
									toolbarItem.link = command;
									toolbarItem.linkAttr.type = 'command';
									toolbarItem.linkAttr.commandId = cb.inputEl?.getAttribute("data-command-id") ?? "";
									await this.plugin.saveSettings();
								}, 250))}),
					//
					// file
					//
					file: new Setting(linkFileFieldDiv)
						.setClass("note-toolbar-setting-item-field-link")
						.addText(text => text
							.setPlaceholder("File with extension")
							.setValue(toolbarItem.link)
							.onChange(
								debounce(async (value) => {
									toolbarItem.linkAttr.type = 'file';
									const file = this.app.vault.getAbstractFileByPath(value);
									if (!(file instanceof TFile)) {
										if (document.getElementById("note-toolbar-item-link-note-error") === null) {
											let errorDiv = this.containerEl.createEl("div", { 
												text: "This file does not exist. Missing a file extension?", 
												attr: { id: "note-toolbar-item-link-note-error" }, cls: "note-toolbar-setting-error-message" });
												linkContainerDiv.insertAdjacentElement('afterend', errorDiv);
												itemLinkFields[index].file.settingEl.children[1].addClass("note-toolbar-setting-error");
										}
									}
									else {
										toolbarItem.link = normalizePath(value);
										toolbarItem.linkAttr.commandId = '';
										document.getElementById("note-toolbar-item-link-note-error")?.remove();
										itemLinkFields[index].file.settingEl.children[1].removeClass("note-toolbar-setting-error");	
										await this.plugin.saveSettings();
									}
								}, 750))),
					//
					// URI
					//
					uri: new Setting(linkUriFieldDiv)
						.setClass("note-toolbar-setting-item-field-link")
						.addText(text => text
							.setPlaceholder("Website or URI")
							.setValue(toolbarItem.link)
							.onChange(
								debounce(async (value) => {
									toolbarItem.link = value;
									toolbarItem.linkAttr.type = 'uri';
									toolbarItem.linkAttr.hasVars = hasVars(value);
									toolbarItem.linkAttr.commandId = '';
									this.toolbar.updated = new Date().toISOString();
									await this.plugin.saveSettings();
								}, 750))),

				});

				linkFieldDiv.append(itemLinkFields[index].command.settingEl);
				linkFieldDiv.append(itemLinkFields[index].file.settingEl);
				linkFieldDiv.append(itemLinkFields[index].uri.settingEl);

				// set visibility based on the type
				itemLinkFields[index].command.settingEl.setAttribute("data-active", 
					toolbarItem.linkAttr.type === "command" ? "true" : "false");
				itemLinkFields[index].file.settingEl.setAttribute("data-active", 
					toolbarItem.linkAttr.type === "file" ? "true" : "false");
				itemLinkFields[index].uri.settingEl.setAttribute("data-active", 
					toolbarItem.linkAttr.type === "uri" ? "true" : "false");

				linkContainerDiv.append(linkTypeDiv);
				linkContainerDiv.append(linkFieldDiv);

				//
				// Item list controls
				// 

				let itemControlsDiv = this.containerEl.createEl("div");
				itemControlsDiv.className = "note-toolbar-setting-item-controls";
				const s1d = new Setting(itemControlsDiv)
					.addExtraButton((cb) => {
						cb.setIcon("up-chevron-glyph")
							.setTooltip("Move up")
							.onClick(async () => this.listMoveHandler(null, this.toolbar.items, index, "up"));
						cb.extraSettingsEl.setAttribute("tabindex", "0");
						this.plugin.registerDomEvent(
							cb.extraSettingsEl, 'keydown', (e) => this.listMoveHandler(e, this.toolbar.items, index, "up"));
					})
					.addExtraButton((cb) => {
						cb.setIcon("down-chevron-glyph")
							.setTooltip("Move down")
							.onClick(async () => this.listMoveHandler(null, this.toolbar.items, index, "down"));
						cb.extraSettingsEl.setAttribute("tabindex", "0");
						this.plugin.registerDomEvent(
							cb.extraSettingsEl, 'keydown', (e) => this.listMoveHandler(e, this.toolbar.items, index, "down"));
					})
					.addExtraButton((cb) => {
						cb.setIcon("cross")
							.setTooltip("Delete")
							.onClick(async () => this.listMoveHandler(null, this.toolbar.items, index, "delete"));
						cb.extraSettingsEl.setAttribute("tabindex", "0");
						this.plugin.registerDomEvent(
							cb.extraSettingsEl, 'keydown', (e) => this.listMoveHandler(e, this.toolbar.items, index, "delete"));
					});

				let itemFieldsControlsContainer = this.containerEl.createEl("div");
				itemFieldsControlsContainer.className = "note-toolbar-setting-item-fields-and-controls";
				itemFieldsControlsContainer.appendChild(textFieldsContainer);
				itemFieldsControlsContainer.appendChild(itemControlsDiv);

				itemTopContainer.appendChild(itemFieldsControlsContainer);
				itemTopContainer.appendChild(linkContainerDiv);

				itemDiv.appendChild(itemTopContainer);

				//
				// Toggles
				// 

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

		//
		// Add new item button
		//

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
							icon: "",
							link: "",
							linkAttr: {
								commandId: "",
								hasVars: false,
								type: this.toolbar.items.last()?.linkAttr.type ?? "uri"
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
								.onClick(async () => this.listMoveHandler(null, this.toolbar.defaultStyles, index, "delete"));
							cb.extraSettingsEl.setAttribute("tabindex", "0");
							this.plugin.registerDomEvent(
								cb.extraSettingsEl, 'keydown', (e) => this.listMoveHandler(e, this.toolbar.defaultStyles, index, "delete"));
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
					.setValue("")
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
								.onClick(async () => this.listMoveHandler(null, this.toolbar.mobileStyles, index, "delete"));
							cb.extraSettingsEl.setAttribute("tabindex", "0");
							this.plugin.registerDomEvent(
								cb.extraSettingsEl, 'keydown', (e) => this.listMoveHandler(e, this.toolbar.mobileStyles, index, "delete"));
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
	 * Handles moving items within a list, and deletion, based on click or keyboard event.
	 * @param keyEvent KeyboardEvent, if the keyboard is triggering this handler.
	 * @param itemArray Array that we're operating on.
	 * @param index Number of the item in the list we're moving/deleting.
	 * @param action Direction of the move, or "delete".
	 */
	async listMoveHandler(
		keyEvent: KeyboardEvent | null, 
		itemArray: ToolbarItemSettings[] | string[], 
		index: number, 
		action: "up" | "down" | "delete"
	): Promise<void> {
		if (keyEvent) {
			switch (keyEvent.key) {
				case "ArrowUp":
					action = "up";
					break;
				case "ArrowDown":
					action = "down";
					break;
				case "Enter":
				case " ":
					break;
				default:
					return;
			}
		}
		switch (action) {
			case "up":
				arraymove(itemArray, index, index - 1);
				this.toolbar.updated = new Date().toISOString();
				keyEvent?.preventDefault();		
				break;
			case "down":
				arraymove(itemArray, index, index + 1);
				this.toolbar.updated = new Date().toISOString();
				keyEvent?.preventDefault();
				break;
			case "delete":
				itemArray.splice(index, 1);
				this.toolbar.updated = new Date().toISOString();
				keyEvent?.preventDefault();
				break;
		}
		await this.plugin.saveSettings();
		this.display();
	}

	private lastScrollPosition: number;
	/**
	 * Remembers the scrolling position of the user and jumps to it on display.
	 * @author Taitava (Shell Commands plugin)
	 * @link https://github.com/Taitava/obsidian-shellcommands/blob/8d030a23540d587a85bd0dfe2e08c8e6b6b955ab/src/settings/SC_MainSettingsTab.ts#L701 
	*/
    private rememberLastPosition(containerEl: HTMLElement) {

		debugLog("rememberLastPosition:", containerEl);

        // go to the last position
		containerEl.scrollTo({
			top: this.lastScrollPosition,
			behavior: "auto",
		});

        // listen to changes
        this.plugin.registerDomEvent(containerEl, 'scroll', (event) => {
            this.lastScrollPosition = containerEl.scrollTop;
		});

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