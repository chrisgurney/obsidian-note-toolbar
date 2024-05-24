import { App, ButtonComponent, Menu, Modal, Platform, Setting, TFile, debounce, normalizePath, setIcon } from 'obsidian';
import { arraymove, debugLog, emptyMessageFr, getPosition, hasVars, removeComponentVisibility, addComponentVisibility, learnMoreFr, moveElement } from 'src/Utils/Utils';
import NoteToolbarPlugin from 'src/main';
import { DEFAULT_STYLE_OPTIONS, LinkType, MOBILE_STYLE_OPTIONS, POSITION_OPTIONS, PlatformType, PositionType, DEFAULT_STYLE_DISCLAIMERS, ToolbarItemSettings, ToolbarSettings, MOBILE_STYLE_DISCLAIMERS } from './NoteToolbarSettings';
import { NoteToolbarSettingTab } from './NoteToolbarSettingTab';
import { DeleteModal } from './DeleteModal';
import { CommandSuggester } from './Suggesters/CommandSuggester';
import { IconSuggestModal } from './IconSuggestModal';
import { FileSuggester } from './Suggesters/FileSuggester';
import Sortable from 'sortablejs';

export default class ToolbarSettingsModal extends Modal {

	public plugin: NoteToolbarPlugin;
	public toolbar: ToolbarSettings;
	private parent: NoteToolbarSettingTab | null;
	private itemListOpen: boolean = true; 

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
	public display(focusId?: string, scrollToClass?: string) {

		debugLog("‼️ REDRAWING MODAL");

		this.modalEl.addClass("note-toolbar-setting-modal-container");

		this.contentEl.empty();

		let settingsDiv = createDiv();
		settingsDiv.className = "vertical-tab-content note-toolbar-setting-modal";

		this.displayNameSetting(settingsDiv);
		this.displayItemList(settingsDiv);
		this.displayPositionSetting(settingsDiv);
		this.displayStyleSetting(settingsDiv);
		this.displayDeleteButton(settingsDiv);

		this.contentEl.appendChild(settingsDiv);

		// if provided, focus on the given element
		if (focusId) {
			let focusEl = this.contentEl.querySelector(focusId) as HTMLElement;
			focusEl?.focus();
			setTimeout(() => { 
				let scrollToEl = scrollToClass ? focusEl.closest(scrollToClass) as HTMLElement : undefined;
				scrollToEl?.scrollIntoView(true);
			}, Platform.isMobile ? 100 : 0); // delay on mobile for the on-screen keyboard
		}
		else {
			// scroll to the position when the modal was last open
			this.rememberLastPosition(this.contentEl.children[0] as HTMLElement);
		}

		// listen for clicks outside the list area, to collapse form that might be open
		this.plugin.registerDomEvent(settingsDiv, 'click', (e) => {

			debugLog("modal listener: ", e.target);

			// if el clicked was row, note row index
			let rowClicked = (e.target as HTMLElement).closest('.note-toolbar-setting-items-container-row');
			let itemIndex = rowClicked ? rowClicked.getAttribute('data-index') : undefined;

			// collapse all items except row
			let listItems = settingsDiv.querySelectorAll('.note-toolbar-sortablejs-list > .note-toolbar-setting-items-container-row');
			listItems.forEach((row, index) => {
				if (index.toString() !== itemIndex) {
					let itemPreview = row.querySelector('.note-toolbar-setting-item-preview-container');
					let itemForm = row.querySelector('.note-toolbar-setting-item');
					itemPreview?.setAttribute('data-active', 'true');
					itemForm?.setAttribute('data-active', 'false');
				}
			});

		});

	}

	/**
	 * Displays the Name setting.
	 * @param settingsDiv HTMLElement to add the setting to.
	 */
	displayNameSetting(settingsDiv: HTMLElement) {

		let toolbarNameDiv = createDiv();
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

		let itemsContainer = createDiv();
		itemsContainer.addClass('note-toolbar-setting-items-container');
		itemsContainer.setAttribute('data-active', this.itemListOpen.toString());

		//
		// Heading + expand/collapse button
		//

		let itemsSetting = new Setting(itemsContainer)
			.setName("Items")
			.setHeading()
			.setDesc(learnMoreFr(
				"Items in the toolbar, in order from left to right.", 
				"https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Creating-toolbar-items"));
		
		if (this.toolbar.items.length > 0) {
			itemsSetting
				.addExtraButton((cb) => {
					cb.setIcon('right-triangle')
					.setTooltip("Collapse all items")
					.onClick(async () => {
						let itemsContainer = settingsDiv.querySelector('.note-toolbar-setting-items-container');
						if (itemsContainer) {
							this.itemListOpen = !this.itemListOpen;
							itemsContainer.setAttribute('data-active', this.itemListOpen.toString());
							let heading = itemsContainer.querySelector('.setting-item-heading .setting-item-name');
							this.itemListOpen ? heading?.setText("Items") : heading?.setText("Items (" + this.toolbar.items.length + ")");
							cb.setTooltip(this.itemListOpen ? "Collapse all items" : "Expand all items");
						}
					})
					.extraSettingsEl.tabIndex = 0;
					this.plugin.registerDomEvent(
						cb.extraSettingsEl, 'keydown', (e) => {
							switch (e.key) {
								case "Enter":
								case " ":
									e.preventDefault();
									cb.extraSettingsEl.click();
							}
						});
				});
		}

		//
		// Item list
		//

		let itemsListContainer = createDiv();
		itemsListContainer.addClass('note-toolbar-setting-items-list-container');
		let itemsSortableContainer = createDiv();
		itemsSortableContainer.addClass('note-toolbar-sortablejs-list');

		this.toolbar.items.forEach((toolbarItem, index) => {

			//
			// generate the item preview
			// 

			// TODO: handle empty state; or don't allow in the first place?
			let itemPreviewContainer = createDiv();
			itemPreviewContainer.className = "note-toolbar-setting-item-preview-container";
			let itemPreview = createDiv();
			itemPreview.className = "note-toolbar-setting-item-preview";
			itemPreview.tabIndex = 0;
			setIcon(itemPreview, toolbarItem.icon ? toolbarItem.icon : 'note-toolbar-empty');
			let itemPreviewLabel = createSpan();
			toolbarItem.label ? itemPreviewLabel.setText(toolbarItem.label) : itemPreviewLabel.setText(toolbarItem.tooltip);
			toolbarItem.label ? undefined : itemPreviewLabel.addClass("note-toolbar-setting-item-preview-tooltip");
			itemPreviewContainer.appendChild(itemPreview).appendChild(itemPreviewLabel);

			//
			// add the drag-and-drop handle
			//

			let itemHandleDiv = createDiv();
			itemHandleDiv.addClass("note-toolbar-setting-item-controls");
			new Setting(itemHandleDiv)
				.addExtraButton((cb) => {
					cb.setIcon("menu")
						.setTooltip("Drag to rearrange")
						.extraSettingsEl.addClass('sortable-handle');
					cb.extraSettingsEl.tabIndex = 0;
					// TODO: register keyboard handler
					this.plugin.registerDomEvent(
						cb.extraSettingsEl,	'keydown', (e) => { debugLog('TODO'); });
				});
			itemPreviewContainer.append(itemHandleDiv);

			//
			// create the list
			//

			let itemContainer = createDiv();
			itemContainer.addClass("note-toolbar-setting-items-container-row");
			itemContainer.setAttribute("data-index", index.toString());
			itemContainer.appendChild(itemPreviewContainer);
			let itemForm = this.getItemForm(itemsSortableContainer, toolbarItem, index);
			itemForm.setAttribute('data-active', 'false');
			itemContainer.appendChild(itemForm);
			
			itemsSortableContainer.appendChild(itemContainer);
			
			// 
			// listen for clicks within the list to expand the items
			//

			this.plugin.registerDomEvent(
				itemPreview, 'keydown', (e) => {
					switch (e.key) {
						case "Enter":
						case " ":
							e.preventDefault();
							this.toggleItemView(itemContainer, 'form');
					}
				});
			this.plugin.registerDomEvent(
				itemPreview, 'click', (e) => {
					// TODO: check if span or svg to put focus in relevant field?
					debugLog("clicked on: ", e.target);
					this.toggleItemView(itemContainer, 'form');
				});

		});

		//
		// make the list drag-and-droppable
		//

		var sortable = Sortable.create(itemsSortableContainer, {
			chosenClass: 'sortable-chosen',
			ghostClass: 'sortable-ghost',
			handle: '.sortable-handle',
			onChange: (item) => navigator.vibrate(50),
			onChoose: (item) => navigator.vibrate(50),
			onSort: async (item) => {
				debugLog("sortable: index: ", item.oldIndex, " -> ", item.newIndex);
				if (item.oldIndex !== undefined && item.newIndex !== undefined) {
					moveElement(this.toolbar.items, item.oldIndex, item.newIndex);
					await this.plugin.saveSettings();
				}
			}
		});

		itemsListContainer.appendChild(itemsSortableContainer);

		//
		// "Add toolbar item" button
		//

		new Setting(itemsListContainer)
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
						this.display(
							'#note-toolbar-setting-item-field-' + (this.toolbar.items.length - 1) + ' input[type="text"]',
							'.note-toolbar-setting-item');
					});
			});

		itemsContainer.appendChild(itemsListContainer);
		settingsDiv.appendChild(itemsContainer);

	}

	/**
	 * Toggles the item to the provided state, or toggles it if no state is provided.
	 * @param itemContainer 
	 * @param state 
	 */
	private toggleItemView(itemContainer: HTMLDivElement, state?: 'preview' | 'form') {

		debugLog("toggleItemView", itemContainer);
		let itemPreviewContainer = itemContainer.querySelector(".note-toolbar-setting-item-preview-container");
		let itemForm = itemContainer.querySelector(".note-toolbar-setting-item");
		let previewState: string;
		let formState: string;

		if (state) {
			switch (state) {
				case 'form':
					previewState = 'false';
					formState = 'true';
					break;
				case 'preview':
					previewState = 'true';
					formState = 'false';
					break;
			}
		}
		else {
			previewState = itemPreviewContainer?.getAttribute('data-active') === 'true' ? 'false' : 'true';
			formState = itemForm?.getAttribute('data-active') === 'true' ? 'false' : 'true';
		}

		itemForm?.setAttribute('data-active', formState);
		itemPreviewContainer?.setAttribute('data-active', previewState);

		// move focus to form / field
		if (formState === 'true') {	
			let focusField = itemForm?.querySelector(".note-toolbar-setting-item-icon .setting-item-control .clickable-icon") as HTMLElement;
			debugLog("toggleItemView focusField: ", focusField);
			focusField ? focusField.focus() : undefined;
		}

	}

	/**
	 * Returns the form to edit a given toolbar item.
	 * @param toolbarItem item to return the form for
	 * @param index index of the item in the toolbar item list
	 * @returns the form element as a div
	 */
	getItemForm(toolbarItemList: HTMLDivElement, toolbarItem: ToolbarItemSettings, index: number): HTMLDivElement {

		let itemDiv = createDiv();
		itemDiv.className = "note-toolbar-setting-item";
		let itemTopContainer = createDiv();
		itemTopContainer.className = "note-toolbar-setting-item-top-container";

		//
		// Item icon, name, and tooltip
		//

		let textFieldsContainer = createDiv();
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

		let linkContainer = createDiv();
		linkContainer.className = "note-toolbar-setting-item-link-container";

		let linkSelector = createDiv();
		const s1t = new Setting(linkSelector)
			.addDropdown((dropdown) =>
				dropdown
					.addOptions({command: "Command", file: "File", uri: "URI"})
					.setValue(toolbarItem.linkAttr.type)
					.onChange(async (value) => {
						let itemRow = toolbarItemList.querySelector('.note-toolbar-setting-items-container-row[data-index="' + index + '"]');
						let itemLinkFieldDiv = itemRow?.querySelector('.note-toolbar-setting-item-link-field') as HTMLDivElement;
						if (itemLinkFieldDiv) {
							toolbarItem.linkAttr.type = value as LinkType;
							itemLinkFieldDiv.empty();
							switch (value) {
								case 'command':
									this.getLinkSetting('command', itemLinkFieldDiv, toolbarItem, '');
									break;
								case 'file':
									this.getLinkSetting('file', itemLinkFieldDiv, toolbarItem, toolbarItem.link);
									break;
								case 'uri':
									this.getLinkSetting('uri', itemLinkFieldDiv, toolbarItem, toolbarItem.link);
									break;
							}
							await this.plugin.saveSettings();
						}
					})
			);

		let linkField = createDiv();
		linkField.className = "note-toolbar-setting-item-link-field";
		this.getLinkSetting(toolbarItem.linkAttr.type, linkField, toolbarItem, toolbarItem.link);

		let linkFieldHelp = createEl("div");
		linkFieldHelp.addClass("note-toolbar-setting-field-help");
		linkFieldHelp.appendChild(
			learnMoreFr(
				"Tip: Use note properties in URIs.",
				"https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Variables")
		)

		linkContainer.append(linkSelector);
		linkContainer.append(linkField);

		//
		// Item list controls
		// 

		let itemControlsContainer = createDiv();
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
			});

		const c1e = new Setting(itemControlsContainer)
			.setClass("note-toolbar-setting-item-delete")
			.addExtraButton((cb) => {
				cb.setIcon("minus-circle")
					.setTooltip("Delete")
					.onClick(async () => this.listMoveHandler(null, this.toolbar.items, index, "delete"));
				cb.extraSettingsEl.setAttribute("tabindex", "0");
				this.plugin.registerDomEvent(
					cb.extraSettingsEl, 'keydown', (e) => this.listMoveHandler(e, this.toolbar.items, index, "delete"));
			});

		let itemFieldsContainer = createDiv();
		itemFieldsContainer.className = "note-toolbar-setting-item-fields";
		itemFieldsContainer.appendChild(textFieldsContainer);
		
		itemTopContainer.appendChild(itemFieldsContainer);
		itemTopContainer.appendChild(linkContainer);
		itemDiv.appendChild(itemTopContainer);

		//
		// Visibility
		// 

		let visibilityControlsContainer = createDiv();
		visibilityControlsContainer.className = "note-toolbar-setting-item-visibility-container";

		const visButtons = new Setting(visibilityControlsContainer)
			.setClass("note-toolbar-setting-item-visibility")
			.addButton((cb) => {
				let btnIcon = cb.buttonEl.createSpan();
				setIcon(btnIcon, 'monitor');
				let [state, tooltip] = this.getPlatformStateLabel(toolbarItem.visibility.desktop, 'desktop');
				if (state) {
					let btnLabel = cb.buttonEl.createSpan();
					btnLabel.setText(state);
				}
				cb.setTooltip(tooltip)
					.onClick(async () => {
						// create the setting if it doesn't exist or was removed
						toolbarItem.visibility.desktop ??= { allViews: { components: [] } };
						let visibilityMenu = this.getItemVisibilityMenu(toolbarItem.visibility.desktop, 'desktop');
						visibilityMenu.showAtPosition(getPosition(cb.buttonEl));
					});
			})
			.addButton((cb) => {
				let btnIcon = cb.buttonEl.createSpan();
				setIcon(btnIcon, 'tablet-smartphone');
				let [state, tooltip] = this.getPlatformStateLabel(toolbarItem.visibility.mobile, 'mobile');
				if (state) {
					let btnLabel = cb.buttonEl.createSpan();
					btnLabel.setText(state);
				}
				cb.setTooltip(tooltip)
					.onClick(async () => {
						// create the setting if it doesn't exist or was removed
						toolbarItem.visibility.mobile ??= { allViews: { components: [] } };
						let visibilityMenu = this.getItemVisibilityMenu(toolbarItem.visibility.mobile, 'mobile');
						visibilityMenu.showAtPosition(getPosition(cb.buttonEl));
					});
			});

		let itemVisilityAndControlsContainer = createDiv();
		itemVisilityAndControlsContainer.className = "note-toolbar-setting-item-visibility-and-controls";
		itemVisilityAndControlsContainer.appendChild(visibilityControlsContainer);
		itemVisilityAndControlsContainer.appendChild(itemControlsContainer);

		itemDiv.appendChild(itemVisilityAndControlsContainer);

		return itemDiv;

	}

	getLinkSetting(
		type: 'command' | 'file' | 'uri', 
		fieldDiv: HTMLDivElement, 
		toolbarItem: ToolbarItemSettings, 
		value: string) 
	{

		debugLog("getLinkSetting");
		switch(type) {
			case 'command': 
				new Setting(fieldDiv)
					.setClass("note-toolbar-setting-item-field-link")
					.addSearch((cb) => {
						new CommandSuggester(this.app, cb.inputEl);
						cb.setPlaceholder("Search for command")
							.setValue(value)
							.onChange(debounce(async (command) => {
								toolbarItem.link = command;
								toolbarItem.linkAttr.type = 'command';
								toolbarItem.linkAttr.commandId = cb.inputEl?.getAttribute("data-command-id") ?? "";
								await this.plugin.saveSettings();
							}, 250))});
				break;
			case 'file':
				new Setting(fieldDiv)
					.setClass("note-toolbar-setting-item-field-link")
					.addSearch((cb) => {
						new FileSuggester(this.app, cb.inputEl);
						cb.setPlaceholder("Search for file")
							.setValue(value)
							.onChange(debounce(async (value) => {
								toolbarItem.linkAttr.type = 'file';
								const file = this.app.vault.getAbstractFileByPath(value);
								if (!(file instanceof TFile)) {
									if (document.getElementById("note-toolbar-item-link-note-error") === null) {
										let errorDiv = this.containerEl.createEl("div", { 
											text: "This file does not exist.", 
											attr: { id: "note-toolbar-item-link-note-error" }, cls: "note-toolbar-setting-error-message" });
											// FIXME: can we get/provide this setting's parent container here?
											// linkContainer.insertAdjacentElement('afterend', errorDiv);
											// FIXME: can this be changed back into this settingEl?
											// itemLinkFields[index].file.settingEl.children[1].addClass("note-toolbar-setting-error");
									}
								}
								else {
									toolbarItem.link = normalizePath(value);
									toolbarItem.linkAttr.commandId = '';
									document.getElementById("note-toolbar-item-link-note-error")?.remove();
									// FIXME: can this be changed back into this settingEl?
									// itemLinkFields[index].file.settingEl.children[1].removeClass("note-toolbar-setting-error");	
									await this.plugin.saveSettings();
								}									
							}, 750))
					});
				break;
			case 'uri': 
				new Setting(fieldDiv)
					.setClass("note-toolbar-setting-item-field-link")
					.addText(text => text
						.setPlaceholder("Website, URI, or note title")
						.setValue(value)
						.onChange(
							debounce(async (value) => {
								toolbarItem.link = value;
								toolbarItem.linkAttr.type = 'uri';
								toolbarItem.linkAttr.hasVars = hasVars(value);
								toolbarItem.linkAttr.commandId = '';
								this.toolbar.updated = new Date().toISOString();
								await this.plugin.saveSettings();
							}, 750))
						);
						// FIXME: what was this for?
						// .inputEl.insertAdjacentElement('afterend', fieldDiv));
				break;		
		}

	}

	/**
	 * Displays the Position setting.
	 * @param settingsDiv HTMLElement to add the settings to.
	 */
	displayPositionSetting(settingsDiv: HTMLElement) {

		new Setting(settingsDiv)
			.setName('Position')
			.setDesc(learnMoreFr(
				"Where to position this toolbar.", 
				"https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Positioning-toolbars"))
			.setHeading();

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
			.setDesc(this.toolbar.position.mobile?.allViews?.position === 'hidden' ? 
				learnMoreFr(
					"Tip: Access toolbars from the navigation bar.",
					"https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Navigation-bar")
				: ''
			)
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

		new Setting(settingsDiv)
			.setName("Styles")
			.setDesc(learnMoreFr(
				"List of styles to apply to the toolbar.",
				"https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Styling-toolbars"
			))
			.setHeading();

		//
		// Default
		//

		let defaultStyleDiv = createDiv();
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
					let styleDisclaimer = this.getValueForKey(DEFAULT_STYLE_DISCLAIMERS, style);
					new Setting(defaultStyleDiv)
						.setName(this.getValueForKey(DEFAULT_STYLE_OPTIONS, style))
						.setTooltip((styleDisclaimer ? styleDisclaimer + ' ' : '') + 'Use in Callout or CSS: ' + style)
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
						DEFAULT_STYLE_OPTIONS
							.filter((option) => {
								return !this.toolbar.defaultStyles.includes(Object.keys(option)[0]);
							})
							.reduce((acc, option) => {
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

		const defaultDesc = document.createDocumentFragment();
		defaultDesc.append("Applies to all platforms unless overridden.");
		defaultDesc.append(this.getStyleDisclaimersFr(DEFAULT_STYLE_DISCLAIMERS, this.toolbar.defaultStyles));

		new Setting(settingsDiv)
			.setName("Default")
			.setDesc(defaultDesc)
			.setClass("note-toolbar-setting-item-styles")
			.settingEl.append(defaultStyleDiv);

		//
		// Mobile
		//

		let mobileStyleDiv = createDiv();
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
					let styleDisclaimer = this.getValueForKey(MOBILE_STYLE_DISCLAIMERS, style);
					new Setting(mobileStyleDiv)
						.setName(this.getValueForKey(MOBILE_STYLE_OPTIONS, style))
						.setTooltip((styleDisclaimer ? styleDisclaimer + ' ' : '') + 'Use in Callout or CSS: ' + style)
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
						MOBILE_STYLE_OPTIONS
							.filter((option) => {
								return !this.toolbar.mobileStyles.includes(Object.keys(option)[0]);
							})
							.reduce((acc, option) => {
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

		const mobileDesc = document.createDocumentFragment();
		mobileDesc.append("Override default styles.");
		mobileDesc.append(this.getStyleDisclaimersFr(MOBILE_STYLE_DISCLAIMERS, this.toolbar.mobileStyles));

		new Setting(settingsDiv)
			.setName("Mobile")
			.setDesc(mobileDesc)
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
	 * @returns a single word (hidden, visible, or the component name), and a sentence for the tooltip
	 */
	getPlatformStateLabel(platform: any, platformLabel: string): [string, string] {

		if (platform && platform.allViews) {
			let dkComponents = platform.allViews?.components;
			if (dkComponents) {
				if (dkComponents.length === 2) {
					return ['', 'visible on ' + platformLabel];
				} else if (dkComponents.length === 1) {
					return [dkComponents[0], dkComponents[0] + ' visible on ' + platformLabel];
				} else {
					return ['hidden', 'hidden on ' + platformLabel];
				}
			}
		}
		return ['hidden', 'hidden on ' + platformLabel];

	}

	/**
	 * Returns a fragment containing any applicable style disclaimers to show, for the provided styles.
	 * @param disclaimers List of disclaimers, corresponds with DEFAULT and MOBILE _STYLE_DISCLAIMERS
	 * @param stylesToCheck styles that have been applied by the user, to check for applicable disclaimers
	 * @returns DocumentFragment with disclaimers to show in settings UI
	 */
	getStyleDisclaimersFr(disclaimers: {[key: string]: string}[], stylesToCheck: string[]): DocumentFragment {
		let disclaimersFr = document.createDocumentFragment();
		stylesToCheck.forEach(style => {
			disclaimers.find(disclaimer => style in disclaimer)
				? disclaimersFr.append( disclaimersFr.createEl("br"), "* ", this.getValueForKey(disclaimers, style) )
				: undefined;
		});
		return disclaimersFr;
	}

	/**
	 * Returns the value for the provided key from the provided dictionary.
	 * @param dict key-value dictionary
	 * @param key string key
	 * @returns value from the dictionary
	 */
	getValueForKey(dict: {[key: string]: string}[], key: string): string {
		const option = dict.find(option => key in option);
		return option ? Object.values(option)[0] : '';
	}

}