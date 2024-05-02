import { App, ButtonComponent, Menu, Modal, Setting, TFile, debounce, normalizePath, setIcon } from 'obsidian';
import { arraymove, debugLog, emptyMessageFr, getPosition, hasVars, removeComponentVisibility, addComponentVisibility } from 'src/Utils/Utils';
import NoteToolbarPlugin from 'src/main';
import { DEFAULT_STYLE_OPTIONS, LinkType, MOBILE_STYLE_OPTIONS, POSITION_OPTIONS, PlatformType, PositionType, ToolbarItemSettings, ToolbarSettings } from './NoteToolbarSettings';
import { NoteToolbarSettingTab } from './NoteToolbarSettingTab';
import { DeleteModal } from './DeleteModal';
import { CommandSuggester } from './Suggesters/CommandSuggester';
import { IconSuggestModal } from './IconSuggestModal';
import { FileSuggester } from './Suggesters/FileSuggester';

export default class ToolbarSettingsModal extends Modal {

	public plugin: NoteToolbarPlugin;
	public toolbar: ToolbarSettings;
	private parent: NoteToolbarSettingTab | null;

	/**
	 * Displays a new edit toolbar modal, for the given toolbar.
	 * @param app reference to the app
	 * @param plugin reference to the plugin
	 * @param parent NoteToolbarSettingTab if coming from settings UI; null if coming from editor 
	 * @param toolbar ToolbarSettings to edit
	 */
	constructor(app: App, plugin: NoteToolbarPlugin, parent: NoteToolbarSettingTab | null = null, toolbar: ToolbarSettings) {
		super(app);
		this.parent = parent;
		this.plugin = plugin;
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
		this.parent ? this.parent.display() : undefined;
	}

	/*************************************************************************
	 * SETTINGS DISPLAY
	 *************************************************************************/

	/**
	 * Displays the toolbar item's settings.
	 */
	public display(focusOnLastItem: boolean = false) {

		this.modalEl.addClass("note-toolbar-setting-modal-container");

		this.contentEl.empty();

		let settingsDiv = this.containerEl.createDiv();
		settingsDiv.className = "vertical-tab-content note-toolbar-setting-modal";

		this.displayNameSetting(settingsDiv);
		this.displayItemList(settingsDiv);
		this.displayPositionSetting(settingsDiv);
		this.displayStyleSetting(settingsDiv);
		this.displayDeleteButton(settingsDiv);

		this.contentEl.appendChild(settingsDiv);

		if (focusOnLastItem) {
			// set focus on last item in the list, if the label is empty
			let inputToFocus = this.contentEl.querySelector('#note-toolbar-setting-item-field-' + (this.toolbar.items.length - 1) + ' input[type="text"]') as HTMLInputElement;
			if (inputToFocus?.value.length === 0) {
				inputToFocus.focus();
			}
		}

		// scroll to the position when the modal was last open
		this.rememberLastPosition(this.contentEl.children[0] as HTMLElement);

	}

	/**
	 * Displays the Name setting.
	 * @param settingsDiv HTMLElement to add the setting to.
	 */
	displayNameSetting(settingsDiv: HTMLElement) {

		let toolbarNameDiv = this.containerEl.createDiv();
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
			", and for the ",
			itemsDescription.createEl("a", {
				href: "https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Variables",
				text: "variables",
			}),
			" supported."
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
				let itemDiv = this.containerEl.createDiv();
				itemDiv.className = "note-toolbar-setting-item";
				let itemTopContainer = this.containerEl.createDiv();
				itemTopContainer.className = "note-toolbar-setting-item-top-container";

				//
				// Item icon, name, and tooltip
				//

				let textFieldsContainer = this.containerEl.createDiv();
				textFieldsContainer.id = "note-toolbar-setting-item-field-" + index;
				textFieldsContainer.className = "note-toolbar-setting-item-fields";

				const s1a = new Setting(textFieldsContainer)
					.setClass("note-toolbar-setting-item-icon")
					.addExtraButton((cb) => {
						cb.setIcon(toolbarItem.icon ? toolbarItem.icon : "lucide-plus-square")
							.setTooltip("Select icon (optional)")
							.onClick(async () => {
								const modal = new IconSuggestModal(this.plugin, toolbarItem, cb.extraSettingsEl);
								modal.open();
							});
						cb.extraSettingsEl.setAttribute("data-note-toolbar-no-icon", !toolbarItem.icon ? "true" : "false");
						cb.extraSettingsEl.setAttribute("tabindex", "0");
						this.plugin.registerDomEvent(
							cb.extraSettingsEl, 'keydown', (e) => {
								switch (e.key) {
									case "Enter":
									case " ":
										const modal = new IconSuggestModal(this.plugin, toolbarItem, cb.extraSettingsEl);
										modal.open();
										e.preventDefault();									
								}
							});
					});

				const s1b = new Setting(textFieldsContainer)
					.setClass("note-toolbar-setting-item-field")
					.addText(text => text
						.setPlaceholder('Label (optional, if icon set)')
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

				let linkContainer = this.containerEl.createDiv();
				linkContainer.className = "note-toolbar-setting-item-link-container";

				let linkTypeDiv = this.containerEl.createDiv();

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

				let linkFieldDiv = this.containerEl.createDiv();
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
							new CommandSuggester(this.app, cb.inputEl);
							cb.setPlaceholder("Search for command")
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
						.addSearch((cb) => {
							new FileSuggester(this.app, cb.inputEl);
							cb.setPlaceholder("Search for file")
								.setValue(toolbarItem.link)
								.onChange(debounce(async (value) => {
									toolbarItem.linkAttr.type = 'file';
									const file = this.app.vault.getAbstractFileByPath(value);
									if (!(file instanceof TFile)) {
										if (document.getElementById("note-toolbar-item-link-note-error") === null) {
											let errorDiv = this.containerEl.createEl("div", { 
												text: "This file does not exist.", 
												attr: { id: "note-toolbar-item-link-note-error" }, cls: "note-toolbar-setting-error-message" });
												linkContainer.insertAdjacentElement('afterend', errorDiv);
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
								}, 750))
						}),
					//
					// URI
					//
					uri: new Setting(linkUriFieldDiv)
						.setClass("note-toolbar-setting-item-field-link")
						.addText(text => text
							.setPlaceholder("Website, URI, or note title")
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

				linkContainer.append(linkTypeDiv);
				linkContainer.append(linkFieldDiv);

				//
				// Item list controls
				// 

				let itemControlsContainer = this.containerEl.createDiv();
				itemControlsContainer.className = "note-toolbar-setting-item-controls";
				const s1d = new Setting(itemControlsContainer)
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
						cb.setIcon("trash")
							.setTooltip("Delete")
							.onClick(async () => this.listMoveHandler(null, this.toolbar.items, index, "delete"));
						cb.extraSettingsEl.setAttribute("tabindex", "0");
						this.plugin.registerDomEvent(
							cb.extraSettingsEl, 'keydown', (e) => this.listMoveHandler(e, this.toolbar.items, index, "delete"));
					});

				let itemFieldsContainer = this.containerEl.createDiv();
				itemFieldsContainer.className = "note-toolbar-setting-item-fields";
				itemFieldsContainer.appendChild(textFieldsContainer);
				
				itemTopContainer.appendChild(itemFieldsContainer);
				itemTopContainer.appendChild(linkContainer);
				itemDiv.appendChild(itemTopContainer);

				//
				// Visibility
				// 

				let visibilityControlsContainer = this.containerEl.createDiv();
				visibilityControlsContainer.className = "note-toolbar-setting-item-visibility-container";

				const visButtons = new Setting(visibilityControlsContainer)
					.setClass("note-toolbar-setting-item-visibility")
					.addButton((cb) => {
						let btnIcon = cb.buttonEl.createSpan();
						setIcon(btnIcon, 'monitor');
						let state = this.getPlatformStateLabel(toolbarItem.visibility.desktop);
						if (state) {
							let btnLabel = cb.buttonEl.createSpan();
							btnLabel.setText(state);
						}
						cb.setTooltip(state ? 'Change desktop visibility' : 'Showing on desktop')
							.onClick(async () => {
								// create the setting if it doesn't exist or was removed
								toolbarItem.visibility.desktop ??= { allViews: { components: [] } };
								let visibilityMenu = this.getItemVisibilityMenu(toolbarItem.visibility.desktop, 'desktop');
								visibilityMenu.showAtPosition(getPosition(cb.buttonEl));
							});
					})
					// TODO: implement tablet settings
					.addButton((cb) => {
						let btnIcon = cb.buttonEl.createSpan();
						setIcon(btnIcon, 'smartphone');
						let state = this.getPlatformStateLabel(toolbarItem.visibility.mobile);
						if (state) {
							let btnLabel = cb.buttonEl.createSpan();
							btnLabel.setText(state);
						}
						cb.setTooltip(state ? 'Change mobile visibility' : 'Showing on mobile')
							.onClick(async () => {
								// create the setting if it doesn't exist or was removed
								toolbarItem.visibility.mobile ??= { allViews: { components: [] } };
								let visibilityMenu = this.getItemVisibilityMenu(toolbarItem.visibility.mobile, 'mobile');
								visibilityMenu.showAtPosition(getPosition(cb.buttonEl));
							});
					});

				let itemVisilityAndControlsContainer = this.containerEl.createDiv();
				itemVisilityAndControlsContainer.className = "note-toolbar-setting-item-visibility-and-controls";
				itemVisilityAndControlsContainer.appendChild(visibilityControlsContainer);
				itemVisilityAndControlsContainer.appendChild(itemControlsContainer);

				itemDiv.appendChild(itemVisilityAndControlsContainer);

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
							visibility: {
								desktop: { allViews: { components: ['icon', 'label'] } },
								mobile: { allViews: { components: ['icon', 'label'] } },
								tablet: { allViews: { components: ['icon', 'label'] } },
							},
						});
						this.toolbar.updated = new Date().toISOString();
						await this.plugin.saveSettings();
						this.display(true);
					});
			});

	}

	/**
	 * Displays the Position setting.
	 * @param settingsDiv HTMLElement to add the settings to.
	 */
	displayPositionSetting(settingsDiv: HTMLElement) {

		new Setting(settingsDiv)
			.setName('Position')
			.setHeading()
			.setDesc('Where to position this toolbar.');

		new Setting(settingsDiv)
			.setName('Desktop')
			.addDropdown((dropdown) =>
				dropdown
					.addOptions(
						POSITION_OPTIONS.desktop.reduce((acc, option) => {
							return { ...acc, ...option };
						}, {}))
					.setValue(this.toolbar.position.desktop?.allViews?.position ?? 'props')
					.onChange(async (val: PositionType) => {
						this.toolbar.position.desktop = { allViews: { position: val } };
						this.toolbar.updated = new Date().toISOString();
						await this.plugin.saveSettings();
						this.display();
					})
				);

		new Setting(settingsDiv)
			.setName('Mobile')
			.addDropdown((dropdown) =>
				dropdown
					.addOptions(
						POSITION_OPTIONS.mobile.reduce((acc, option) => {
							return { ...acc, ...option };
						}, {}))
					.setValue(this.toolbar.position.mobile?.allViews?.position ?? 'props')
					.onChange(async (val: PositionType) => {
						this.toolbar.position.mobile = { allViews: { position: val } };
						this.toolbar.position.tablet = { allViews: { position: val } };
						this.toolbar.updated = new Date().toISOString();
						await this.plugin.saveSettings();
						this.display();
					})
				);

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
			"Sticky does not apply in Reading mode. See the ",
			stylingDescription.createEl("a", {
				href: "https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Styling-toolbars",
				text: "documentation",
			}),
			" about the list of supported styles."
		);

		new Setting(settingsDiv)
			.setName("Styles")
			.setDesc(stylingDescription)
			.setHeading();

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
						.setTooltip("Use in Callout or CSS: " + style)
						.addExtraButton((cb) => {
							cb.setIcon("cross")
								.setTooltip("Remove")
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
			.setDesc("Applies to all platforms unless overridden.")
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
						.setTooltip("Use in Callout or CSS: " + style)
						.addExtraButton((cb) => {
							cb.setIcon("cross")
								.setTooltip("Remove")
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
			.setHeading()
			.setDesc("This action cannot be undone.")
			.setClass("note-toolbar-setting-spaced")
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
		action: 'up' | 'down' | 'delete' | undefined = undefined
	): Promise<void> {
		if (keyEvent) {
			switch (keyEvent.key) {
				case 'ArrowUp':
					keyEvent.preventDefault();
					action = 'up';
					break;
				case 'ArrowDown':
					keyEvent.preventDefault();
					action = 'down';
					break;
				case 'Delete':
				case 'Backspace':
					keyEvent.preventDefault();
					action = 'delete';
					break;
				case 'Enter':
				case ' ':
					keyEvent.preventDefault();
					break;
				default:
					return;
			}
		}
		switch (action) {
			case 'up':
				arraymove(itemArray, index, index - 1);
				this.toolbar.updated = new Date().toISOString();
				break;
			case 'down':
				arraymove(itemArray, index, index + 1);
				this.toolbar.updated = new Date().toISOString();
				break;
			case 'delete':
				itemArray.splice(index, 1);
				this.toolbar.updated = new Date().toISOString();
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
	 * Returns the visibility menu to display, for the given platform.
	 * @param platform visibility to check for component visibility
	 * @param platformLabel string to show in the menu 
	 * @returns Menu
	 */
	getItemVisibilityMenu(platform: any, platformLabel: string): Menu {

		let isComponentVisible = {
			icon: (platform && platform.allViews) ? platform.allViews.components.includes('icon') : false,
			label: (platform && platform.allViews) ? platform.allViews.components.includes('label') : false,
		};

		let menu = new Menu();
		menu.addItem((menuItem) => {
			menuItem
				.setTitle(isComponentVisible.icon ? 
					'Icon shows on ' + platformLabel : 'Icon hidden on ' + platformLabel)
				.setIcon("image")
				.setChecked(isComponentVisible.icon)
				.onClick(async (menuEvent) => {
					if (isComponentVisible.icon) {
						removeComponentVisibility(platform, 'icon');
						isComponentVisible.icon = false;
					}
					else {
						addComponentVisibility(platform, 'icon');
						isComponentVisible.icon = true;
					}
					this.toolbar.updated = new Date().toISOString();
					await this.plugin.saveSettings();
					this.display();
				});
		});
		menu.addItem((menuItem) => {
			menuItem
				.setTitle(isComponentVisible.label ? 
					'Label shows on ' + platformLabel : 'Label hidden on ' + platformLabel)
				.setIcon("whole-word")
				.setChecked(isComponentVisible.label)
				.onClick(async (menuEvent) => {
					if (isComponentVisible.label) {
						removeComponentVisibility(platform, 'label');
						isComponentVisible.label = false;
					}
					else {
						addComponentVisibility(platform, 'label');
						isComponentVisible.label = true;
					}
					this.toolbar.updated = new Date().toISOString();
					await this.plugin.saveSettings();
					this.display();
				});
		});

		return menu;

	}

	/**
	 * Gets the current state of visibility for a given platform.
	 * @param platform visibility to check
	 */
	getPlatformStateLabel(platform: any): string {

		if (platform && platform.allViews) {
			let dkComponents = platform.allViews?.components;
			if (dkComponents) {
				if (dkComponents.length === 2) {
					return '';
				} else if (dkComponents.length === 1) {
					return dkComponents[0];
				} else {
					return 'hidden';
				}
			}
		}
		return 'hidden';

	}

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