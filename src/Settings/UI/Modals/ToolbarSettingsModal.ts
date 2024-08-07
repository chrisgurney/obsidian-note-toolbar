import { App, ButtonComponent, Menu, Modal, Platform, Setting, TFile, TFolder, debounce, getIcon, normalizePath, setIcon, setTooltip } from 'obsidian';
import { arraymove, debugLog, getElementPosition, hasVars, removeComponentVisibility, addComponentVisibility, moveElement, getUUID } from 'Utils/Utils';
import { emptyMessageFr, learnMoreFr, createToolbarPreviewFr } from "Utils/SettingsUIUtils";
import NoteToolbarPlugin from 'main';
import { DEFAULT_STYLE_OPTIONS, ItemType, MOBILE_STYLE_OPTIONS, POSITION_OPTIONS, PositionType, DEFAULT_STYLE_DISCLAIMERS, ToolbarItemSettings, ToolbarSettings, MOBILE_STYLE_DISCLAIMERS, LINK_OPTIONS, ComponentType } from 'Settings/NoteToolbarSettings';
import { NoteToolbarSettingTab } from 'Settings/UI/NoteToolbarSettingTab';
import { DeleteModal } from 'Settings/UI/Modals/DeleteModal';
import { CommandSuggester } from 'Settings/UI/Suggesters/CommandSuggester';
import { IconSuggestModal } from 'Settings/UI/Modals/IconSuggestModal';
import { FileSuggester } from 'Settings/UI/Suggesters/FileSuggester';
import Sortable from 'sortablejs';
import { ToolbarSuggester } from 'Settings/UI/Suggesters/ToolbarSuggester';

export default class ToolbarSettingsModal extends Modal {

	public plugin: NoteToolbarPlugin;
	public toolbar: ToolbarSettings;
	private parent: NoteToolbarSettingTab | null;
	private itemListOpen: boolean = true; 
	private itemListIdCounter: number = 0;

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
	public display() {

		debugLog("🟡 REDRAWING MODAL 🟡");

		this.modalEl.addClass("note-toolbar-setting-modal-container");

		this.contentEl.empty();

		let settingsDiv = createDiv();
		settingsDiv.className = "vertical-tab-content note-toolbar-setting-modal";

		this.displayNameSetting(settingsDiv);
		this.displayItemList(settingsDiv);
		this.displayPositionSetting(settingsDiv);
		this.displayStyleSetting(settingsDiv);
		this.displayUsageSetting(settingsDiv);
		this.displayDeleteButton(settingsDiv);

		this.contentEl.appendChild(settingsDiv);

		// scroll to the position when the modal was last open
		this.rememberLastPosition(this.contentEl.children[0] as HTMLElement);

		// listen for clicks outside the list area, to collapse form that might be open
		this.plugin.registerDomEvent(this.modalEl, 'click', (e) => {
			let rowClicked = (e.target as HTMLElement).closest('.note-toolbar-setting-items-container-row');
			this.collapseItemForms(settingsDiv, rowClicked);
		});

		// listen for focus changes, to collapse form that might be open
		this.plugin.registerDomEvent(settingsDiv, 'focusin', (e) => {
			let rowClicked = (e.target as HTMLElement).closest('.note-toolbar-setting-items-container-row');
			this.collapseItemForms(settingsDiv, rowClicked);
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
			.addText(cb => cb
				.setPlaceholder('Name')
				.setValue(this.toolbar.name)
				.onChange(debounce(async (value) => {
					// check for existing toolbar with this name
					let existingToolbar = this.plugin.settingsManager.getToolbarByName(value);
					if (existingToolbar && existingToolbar !== this.toolbar) {
						this.setFieldError(cb.inputEl, "A toolbar already exists with this name.");
					}
					else {
						this.removeFieldError(cb.inputEl);
						this.toolbar.name = value;
						this.toolbar.updated = new Date().toISOString();
						this.plugin.settings.toolbars.sort((a, b) => a.name.localeCompare(b.name));
						await this.plugin.settingsManager.save();
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
				"Add items to the toolbar, in order.",
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

		if (this.toolbar.items.length === 0) {

			// display empty state
			let emptyMsg = this.containerEl.createEl("div", 
				{ text: emptyMessageFr("No toolbar items.") });
			emptyMsg.className = "note-toolbar-setting-empty-message";
			itemsSortableContainer.append(emptyMsg);

		}
		else {

			// generate the preview + form for each item
			this.toolbar.items.forEach((toolbarItem, index) => {

				let itemContainer = createDiv();
				itemContainer.setAttribute('data-row-id', this.itemListIdCounter.toString());
				itemContainer.addClass("note-toolbar-setting-items-container-row");

				let itemPreview = this.generateItemPreview(toolbarItem, this.itemListIdCounter.toString());
				itemContainer.appendChild(itemPreview);

				let itemForm = this.generateItemForm(toolbarItem, this.itemListIdCounter.toString());
				itemForm.setAttribute('data-active', 'false');
				itemContainer.appendChild(itemForm);

				this.itemListIdCounter++;
				
				itemsSortableContainer.appendChild(itemContainer);

			});

		}

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
					await this.plugin.settingsManager.save();
				}
			}
		});

		itemsListContainer.appendChild(itemsSortableContainer);

		//
		// Add item buttons
		//

		let itemsListButtonContainer = createDiv();
		itemsListButtonContainer.addClasses(['setting-item', 'note-toolbar-setting-items-button-container']);

		let formattingButtons = createSpan();
		new Setting(formattingButtons)
			.addExtraButton((btn) => {
				let icon = getIcon('note-toolbar-separator');
				btn.extraSettingsEl.empty(); // remove existing gear icon
				icon? btn.extraSettingsEl.appendChild(icon) : undefined;
				btn.setTooltip("Add a separator to the toolbar")
					.onClick(async () => this.addItemHandler(itemsSortableContainer, ItemType.Separator));
			})
			.addExtraButton((btn) => {
				btn.setIcon('lucide-corner-down-left')
					.setTooltip("Add a line break to the toolbar")
					.onClick(async () => this.addItemHandler(itemsSortableContainer, ItemType.Break));
			});
		itemsListButtonContainer.appendChild(formattingButtons);

		new Setting(itemsListButtonContainer)
			.addButton((btn) => {
				btn.setTooltip("Add a new item to the toolbar")
					.setButtonText("+ Add toolbar item")
					.setCta()
					.onClick(async () => this.addItemHandler(itemsSortableContainer, ItemType.Command));
			});

		itemsListContainer.appendChild(itemsListButtonContainer);
		itemsContainer.appendChild(itemsListContainer);
		settingsDiv.appendChild(itemsContainer);

	}

	/**
	 * Collapses all item forms except for one that might have been expanded.
	 * @param settingsDiv HTMLElement to settings are within.
	 * @param rowClicked Optional Element that was clicked/expanded.
	 */
	collapseItemForms(settingsDiv: HTMLDivElement, rowClicked: Element | null) {

		// collapse all items except row
		let listItems = settingsDiv.querySelectorAll('.note-toolbar-sortablejs-list > div');
		listItems.forEach((row, index) => {
			if (row !== rowClicked) {
				let itemPreview = row.querySelector('.note-toolbar-setting-item-preview-container');
				let itemForm = row.querySelector('.note-toolbar-setting-item');
				itemPreview?.setAttribute('data-active', 'true');
				itemForm?.setAttribute('data-active', 'false');
			}
		});

	}

	/**
	 * Toggles the item to the provided state, or toggles it if no state is provided.
	 * @param itemContainer 
	 * @param state 
	 */
	private toggleItemView(itemPreviewContainer: HTMLDivElement, state?: 'preview' | 'form', focusOn?: 'icon' | 'label' | 'tooltip') {

		let itemForm = itemPreviewContainer.nextElementSibling;
		debugLog("toggleItemView", itemPreviewContainer, itemForm);
		
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
			let focusSelector = "#note-toolbar-item-field-icon .clickable-icon";
			if (focusOn) {
				switch (focusOn) {
					case 'label': 
						focusSelector = "#note-toolbar-item-field-label input";
						break;
					case 'tooltip': 
						focusSelector = "#note-toolbar-item-field-tooltip input";
						break;
					case 'icon':
					default:
						// default case, focus on first field (icon)
						break;
				}
			}
			let focusField = itemForm?.querySelector(focusSelector) as HTMLElement;
			debugLog("toggleItemView focusField: ", focusField);

			// set focus in the form
			if (focusField) {
				focusField.focus();
				// scroll to the form
				this.scrollToPosition(focusSelector, 'note-toolbar-setting-item');
			}

		}

	}

	/**
	 * Returns the preview for a given toolbar item.
	 */
	generateItemPreview(toolbarItem: ToolbarItemSettings, rowId: string): HTMLDivElement {

		let itemPreviewContainer = createDiv();
		itemPreviewContainer.className = "note-toolbar-setting-item-preview-container";
		let itemPreview = createDiv();
		itemPreview.className = "note-toolbar-setting-item-preview";
		itemPreview.tabIndex = 0;

		//
		// set preview icon and text
		//

		let itemPreviewContent = createSpan();
		
		switch(toolbarItem.linkAttr.type) {
			case ItemType.Break:
			case ItemType.Separator:
				setTooltip(itemPreview, 'Edit ' + toolbarItem.linkAttr.type);
				itemPreviewContent.setText(toolbarItem.linkAttr.type);
				itemPreview.setAttribute('data-item-type', toolbarItem.linkAttr.type);
				itemPreview.append(itemPreviewContent);
				break;
			case ItemType.Group:
				setTooltip(itemPreview, 'Edit item group');
				let groupToolbar = this.plugin.settingsManager.getToolbarById(toolbarItem.link);
				groupToolbar ? itemPreviewContent.appendChild(createToolbarPreviewFr(groupToolbar.items)) : undefined;
				break;
			case ItemType.Command:
			case ItemType.File:
			case ItemType.Menu:
			case ItemType.Uri:
				setTooltip(itemPreview, 'Edit toolbar item');
				let itemPreviewIcon = createSpan();
				setIcon(itemPreviewIcon, toolbarItem.icon ? toolbarItem.icon : 'note-toolbar-none');
				itemPreviewContent.id = 'note-toolbar-item-preview-label';
				if (toolbarItem.label) {
					itemPreviewContent.setText(toolbarItem.label);
				}
				else if (toolbarItem.tooltip) {
					itemPreviewContent.setText(toolbarItem.tooltip);
					itemPreviewContent.addClass("note-toolbar-setting-item-preview-tooltip");
				}
				else {
					itemPreviewContent.setText('No label set');
					itemPreviewContent.addClass("note-toolbar-setting-item-preview-empty");
				}
				itemPreview.appendChild(itemPreviewIcon);
				break;
		}

		// add an icon to indicate each line is editable on mobile (as there's no hover state available)
		if (Platform.isMobile) {
			if (![ItemType.Break, ItemType.Separator].includes(toolbarItem.linkAttr.type)) {
				let itemPreviewLabelEditIcon = createDiv();
				itemPreviewLabelEditIcon.addClass("note-toolbar-setting-item-preview-edit-mobile");
				let itemPreviewEditIcon = createSpan();
				setIcon(itemPreviewEditIcon, 'lucide-pencil');
				itemPreviewLabelEditIcon.appendChild(itemPreviewContent);
				itemPreviewLabelEditIcon.appendChild(itemPreviewEditIcon);
				itemPreview.appendChild(itemPreviewLabelEditIcon);
			}
		}
		else {
			itemPreview.appendChild(itemPreviewContent);
		}

		itemPreviewContainer.appendChild(itemPreview);

		//
		// add the preview drag-and-drop handle
		//

		let itemHandleDiv = createDiv();
		itemHandleDiv.addClass("note-toolbar-setting-item-controls");
		new Setting(itemHandleDiv)
			.addExtraButton((cb) => {
				cb.setIcon('grip-horizontal')
					.setTooltip("Drag to rearrange")
					.extraSettingsEl.addClass('sortable-handle');
				cb.extraSettingsEl.setAttribute('data-row-id', rowId);
				cb.extraSettingsEl.tabIndex = 0;
				this.plugin.registerDomEvent(
					cb.extraSettingsEl,	'keydown', (e) => {
						let currentEl = e.target as HTMLElement;
						let rowId = currentEl.getAttribute('data-row-id');
						rowId ? this.listMoveHandlerById(e, this.toolbar.items, rowId) : undefined;
					} );
			});
		itemPreviewContainer.append(itemHandleDiv);

		// 
		// listen for clicks within the list to expand the items
		//

		this.plugin.registerDomEvent(
			itemPreview, 'keydown', (e) => {
				switch (e.key) {
					case "Enter":
					case " ":
						e.preventDefault();
						this.toggleItemView(itemPreviewContainer, 'form');
				}
			});
		this.plugin.registerDomEvent(
			itemPreview, 'click', (e) => {
				const target = e.target as Element;
				debugLog("clicked on: ", e.target);
				let focusOn: 'icon' | 'label' | 'tooltip' = 'label';
				if (target instanceof SVGElement || target?.closest('svg') || !!target.querySelector(':scope > svg')) {
					focusOn = 'icon';
				}
				else if (target instanceof HTMLSpanElement) {
					if (target.classList.contains("note-toolbar-setting-item-preview-tooltip")) {
						focusOn = 'tooltip';
					}
				}
				this.toggleItemView(itemPreviewContainer, 'form', focusOn);
			});

		return itemPreviewContainer;

	}

	/**
	 * Returns the form to edit a given toolbar item.
	 * @param toolbarItem item to return the form for
	 * @param rowId row ID of the item in the toolbar item list
	 * @returns the form element as a div
	 */
	generateItemForm(toolbarItem: ToolbarItemSettings, rowId: string): HTMLDivElement {

		let itemDiv = createDiv();
		itemDiv.className = "note-toolbar-setting-item";
		let itemTopContainer = createDiv();
		itemTopContainer.className = "note-toolbar-setting-item-top-container";

		let textFieldsContainer = createDiv();
		textFieldsContainer.id = "note-toolbar-setting-item-field-id-" + rowId;
		textFieldsContainer.className = "note-toolbar-setting-item-fields";

		if (![ItemType.Break, ItemType.Separator].includes(toolbarItem.linkAttr.type)) {

			//
			// Item icon, name, and tooltip
			//

			let iconField = new Setting(textFieldsContainer)
				.setClass("note-toolbar-setting-item-icon")
				.addExtraButton((cb) => {
					cb.setIcon(toolbarItem.icon ? toolbarItem.icon : "lucide-plus-square")
						.setTooltip("Select icon (optional)")
						.onClick(async () => {
							let itemRow = this.getItemRowElById(rowId);
							const modal = new IconSuggestModal(this.plugin, toolbarItem, itemRow);
							modal.open();
						});
					cb.extraSettingsEl.setAttribute("data-note-toolbar-no-icon", !toolbarItem.icon ? "true" : "false");
					cb.extraSettingsEl.setAttribute("tabindex", "0");
					this.plugin.registerDomEvent(
						cb.extraSettingsEl, 'keydown', (e) => {
							switch (e.key) {
								case "Enter":
								case " ":
									e.preventDefault();
									let itemRow = this.getItemRowElById(rowId);			
									const modal = new IconSuggestModal(this.plugin, toolbarItem, itemRow);
									modal.open();
							}
						});
				});
			iconField.settingEl.id = 'note-toolbar-item-field-icon';

			let labelField = new Setting(textFieldsContainer)
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
							await this.plugin.settingsManager.save();
							this.updatePreview('text', toolbarItem, rowId);
						}, 750)));
			labelField.settingEl.id = 'note-toolbar-item-field-label';

			let tooltipField = new Setting(textFieldsContainer)
				.setClass("note-toolbar-setting-item-field")
				.addText(text => text
					.setPlaceholder('Tooltip (optional)')
					.setValue(toolbarItem.tooltip)
					.onChange(
						debounce(async (value) => {
							toolbarItem.tooltip = value;
							this.toolbar.updated = new Date().toISOString();
							await this.plugin.settingsManager.save();
							this.updatePreview('text', toolbarItem, rowId);
						}, 750)));
			tooltipField.settingEl.id = 'note-toolbar-item-field-tooltip';
			
			//
			// Item link
			//

			let linkContainer = createDiv();
			linkContainer.className = "note-toolbar-setting-item-link-container";

			let linkSelector = createDiv();
			const s1t = new Setting(linkSelector)
				.addDropdown((dropdown) =>
					dropdown
						.addOptions(LINK_OPTIONS)
						.setValue(toolbarItem.linkAttr.type)
						.onChange(async (value) => {
							let itemRow = this.getItemRowElById(rowId);
							let itemLinkFieldDiv = itemRow?.querySelector('.note-toolbar-setting-item-link-field') as HTMLDivElement;
							if (itemLinkFieldDiv) {
								toolbarItem.linkAttr.type = value as ItemType;
								itemLinkFieldDiv.empty();
								this.getLinkSettingForType(toolbarItem.linkAttr.type, itemLinkFieldDiv, toolbarItem);
								await this.plugin.settingsManager.save();
							}
						})
				);

			let linkField = createDiv();
			linkField.className = "note-toolbar-setting-item-link-field";
			this.getLinkSettingForType(toolbarItem.linkAttr.type, linkField, toolbarItem);
			linkContainer.append(linkSelector);
			linkContainer.append(linkField);

			let itemFieldsContainer = createDiv();
			itemFieldsContainer.className = "note-toolbar-setting-item-fields";
			itemFieldsContainer.appendChild(textFieldsContainer);
			
			itemTopContainer.appendChild(itemFieldsContainer);
			itemTopContainer.appendChild(linkContainer);
			itemDiv.appendChild(itemTopContainer);

		}

		//
		// delete button
		// 

		let itemControlsContainer = createDiv();
		itemControlsContainer.className = "note-toolbar-setting-item-controls";
		this.getDeleteButton(itemControlsContainer);

		// we'll just show these types after the delete button, to keep the UI minimal
		if ([ItemType.Break, ItemType.Separator].includes(toolbarItem.linkAttr.type)) {
			let type = toolbarItem.linkAttr.type;
			let separatorTitle = createSpan();
			separatorTitle.setText(type.charAt(0).toUpperCase() + type.slice(1));
			itemControlsContainer.append(separatorTitle);
		}

		//
		// visibility controls
		// 

		let visibilityControlsContainer = createDiv();
		visibilityControlsContainer.className = "note-toolbar-setting-item-visibility-container";

		const visButtons = new Setting(visibilityControlsContainer)
			.setClass("note-toolbar-setting-item-visibility")
			.addButton((cb) => {
				setIcon(cb.buttonEl, 'monitor');
				let [state, tooltip] = this.getPlatformStateLabel(toolbarItem.visibility.desktop, 'desktop');
				state ? cb.buttonEl.createSpan().setText(state) : undefined;
				cb.setTooltip(tooltip)
					.onClick(async () => {
						// create the setting if it doesn't exist or was removed
						toolbarItem.visibility.desktop ??= { allViews: { components: [] } };
						// toggle (instead of menu) for breaks + separators
						if ([ItemType.Break, ItemType.Separator].includes(toolbarItem.linkAttr.type)) {
							let platform = toolbarItem.visibility.desktop;

							let isComponentVisible = {
								icon: (platform && platform.allViews) ? platform.allViews.components.includes(ComponentType.Icon) : false,
								label: (platform && platform.allViews) ? platform.allViews.components.includes(ComponentType.Label) : false,
							};
							if (isComponentVisible.icon && isComponentVisible.label) {
								removeComponentVisibility(platform, ComponentType.Icon);
								removeComponentVisibility(platform, ComponentType.Label);
								isComponentVisible.icon = false;
								isComponentVisible.label = false;
							}
							else {
								addComponentVisibility(platform, ComponentType.Icon);
								addComponentVisibility(platform, ComponentType.Label);
								isComponentVisible.icon = true;
								isComponentVisible.label = true;						
							}
							let [state, tooltip] = this.getPlatformStateLabel(platform, 'desktop');
							updateButton(cb, state, tooltip);

							this.toolbar.updated = new Date().toISOString();
							await this.plugin.settingsManager.save();
						}
						else {
							let visibilityMenu = this.getItemVisibilityMenu(toolbarItem.visibility.desktop, 'desktop', cb);
							visibilityMenu.showAtPosition(getElementPosition(cb.buttonEl));	
						}
					});
			})
			.addButton((cb) => {
				setIcon(cb.buttonEl, 'tablet-smartphone');
				let [state, tooltip] = this.getPlatformStateLabel(toolbarItem.visibility.mobile, 'mobile');
				state ? cb.buttonEl.createSpan().setText(state) : undefined;
				cb.setTooltip(tooltip)
					.onClick(async () => {
						// create the setting if it doesn't exist or was removed
						toolbarItem.visibility.mobile ??= { allViews: { components: [] } };
						// toggle (instead of menu) for breaks + separators
						if ([ItemType.Break, ItemType.Separator].includes(toolbarItem.linkAttr.type)) {
							let platform = toolbarItem.visibility.mobile;

							let isComponentVisible = {
								icon: (platform && platform.allViews) ? platform.allViews.components.includes(ComponentType.Icon) : false,
								label: (platform && platform.allViews) ? platform.allViews.components.includes(ComponentType.Label) : false,
							};
							if (isComponentVisible.icon && isComponentVisible.label) {
								removeComponentVisibility(platform, ComponentType.Icon);
								removeComponentVisibility(platform, ComponentType.Label);
								isComponentVisible.icon = false;
								isComponentVisible.label = false;
							}
							else {
								addComponentVisibility(platform, ComponentType.Icon);
								addComponentVisibility(platform, ComponentType.Label);
								isComponentVisible.icon = true;
								isComponentVisible.label = true;						
							}
							let [state, tooltip] = this.getPlatformStateLabel(platform, 'mobile');
							updateButton(cb, state, tooltip);

							this.toolbar.updated = new Date().toISOString();
							await this.plugin.settingsManager.save();
						}
						else {
							let visibilityMenu = this.getItemVisibilityMenu(toolbarItem.visibility.mobile, 'mobile', cb);
							visibilityMenu.showAtPosition(getElementPosition(cb.buttonEl));
						}
					});
			})
			.addExtraButton((cb) => {
				cb.setIcon('grip-horizontal')
					.setTooltip("Drag to rearrange")
					.extraSettingsEl.addClass('sortable-handle');
				cb.extraSettingsEl.setAttribute('data-row-id', this.itemListIdCounter.toString());
				cb.extraSettingsEl.tabIndex = 0;
				this.plugin.registerDomEvent(
					cb.extraSettingsEl,	'keydown', (e) => {
						let currentEl = e.target as HTMLElement;
						let rowId = currentEl.getAttribute('data-row-id');
						rowId ? this.listMoveHandlerById(e, this.toolbar.items, rowId) : undefined;
					} );
			});

		let itemVisilityAndControlsContainer = createDiv();
		itemVisilityAndControlsContainer.className = "note-toolbar-setting-item-visibility-and-controls";
		([ItemType.Break, ItemType.Separator].includes(toolbarItem.linkAttr.type)) 
			? itemVisilityAndControlsContainer.setAttribute('data-item-type', toolbarItem.linkAttr.type) : undefined;
		itemVisilityAndControlsContainer.appendChild(itemControlsContainer);
		itemVisilityAndControlsContainer.appendChild(visibilityControlsContainer);

		itemDiv.appendChild(itemVisilityAndControlsContainer);

		return itemDiv;

		function updateButton(button: ButtonComponent, label: string, tooltip: string): void {
			const children = Array.from(button.buttonEl.childNodes);
			const labelNode = children.find(node => node.nodeType === Node.TEXT_NODE);
		
			if (label) {
				if (labelNode) {
					labelNode.textContent = label;
				} else {
					button.buttonEl.appendChild(document.createTextNode(label));
				}
			} 
			else if (labelNode) {
				button.buttonEl.removeChild(labelNode);
			}
			button.setTooltip(tooltip);
		}

	}

	/**
	 * Generates the item delete button.
	 * @param el HTMLElement to put the delete button in.
	 */
	getDeleteButton(el: HTMLElement) {

		new Setting(el)
			.setClass("note-toolbar-setting-item-delete")
			.addExtraButton((cb) => {
				cb.setIcon("minus-circle")
					.setTooltip("Delete")
					.onClick(async () => {
						let rowId = cb.extraSettingsEl.getAttribute('data-row-id');
						rowId ? this.listMoveHandlerById(null, this.toolbar.items, rowId, 'delete') : undefined;
					});
				cb.extraSettingsEl.setAttribute("tabindex", "0");
				cb.extraSettingsEl.setAttribute('data-row-id', this.itemListIdCounter.toString());
				this.plugin.registerDomEvent(
					cb.extraSettingsEl, 'keydown', (e) => {
						let currentEl = e.target as HTMLElement;
						let rowId = currentEl.getAttribute('data-row-id');
						rowId ? this.listMoveHandlerById(e, this.toolbar.items, rowId, 'delete') : undefined;
					});
			});

	}

	getLinkSetting(
		type: ItemType, 
		fieldDiv: HTMLDivElement, 
		toolbarItem: ToolbarItemSettings, 
		value: string,
		helpTextFr?: DocumentFragment)
	{

		let fieldHelp = undefined;
		if (helpTextFr) {
			fieldHelp = createDiv();
			fieldHelp.addClass("note-toolbar-setting-field-help");
			fieldHelp.append(helpTextFr);
		}

		debugLog("getLinkSetting");
		switch(type) {
			case ItemType.Command: 
				new Setting(fieldDiv)
					.setClass("note-toolbar-setting-item-field-link")
					.addSearch((cb) => {
						new CommandSuggester(this.app, cb.inputEl);
						cb.setPlaceholder("Search for command")
							.setValue(toolbarItem.link)
							.onChange(debounce(async (command) => {
								toolbarItem.link = command;
								toolbarItem.linkAttr.type = ItemType.Command;
								toolbarItem.linkAttr.commandId = cb.inputEl?.getAttribute("data-command-id") ?? "";
								await this.plugin.settingsManager.save();
							}, 250))});
				break;
			case ItemType.File:
				new Setting(fieldDiv)
					.setClass("note-toolbar-setting-item-field-link")
					.addSearch((cb) => {
						new FileSuggester(this.app, cb.inputEl);
						cb.setPlaceholder("Search for file or folder")
							.setValue(value)
							.onChange(debounce(async (value) => {
								toolbarItem.linkAttr.type = ItemType.File;
								const file = this.app.vault.getAbstractFileByPath(value);
								if (!(file instanceof TFile) && !(file instanceof TFolder)) {
									this.setFieldError(cb.inputEl.parentElement, "This file or folder does not exist.");
								}
								else {
									toolbarItem.link = normalizePath(value);
									toolbarItem.linkAttr.commandId = '';
									this.removeFieldError(cb.inputEl.parentElement);
									await this.plugin.settingsManager.save();
								}					
							}, 750))
					});
				break;
			case ItemType.Group:
				const groupSetting = new Setting(fieldDiv)
					.setClass("note-toolbar-setting-item-field-link")
					.addSearch((cb) => {
						new ToolbarSuggester(this.app, this.plugin, cb.inputEl);
						cb.setPlaceholder("Toolbar")
							.setValue(this.plugin.settingsManager.getToolbarName(toolbarItem.link))
							.onChange(debounce(async (name) => {
								let groupToolbar = this.plugin.settingsManager.getToolbarByName(name);
								if (groupToolbar) {
									this.removeFieldError(cb.inputEl.parentElement);
									toolbarItem.link = groupToolbar.uuid;
									await this.plugin.settingsManager.save();
									debugLog('🟡', fieldDiv);
									// TODO: this.updatePreview('toolbar', toolbarItem, rowId);
								}
								else {
									this.setFieldError(cb.inputEl.parentElement, "Toolbar does not exist");
								}
								// update help text with toolbar preview or default if none selected
								let groupPreviewFr = groupToolbar 
									? createToolbarPreviewFr(groupToolbar.items) 
									: learnMoreFr(
										"Select a toolbar to insert into this one.",
										"https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Creating-toolbar-items");
								this.setFieldHelp(groupSetting.controlEl, groupPreviewFr);
							}, 250));
					});
				fieldHelp ? groupSetting.controlEl.insertAdjacentElement('beforeend', fieldHelp) : undefined;
				break;
			case ItemType.Menu:
				const menuSetting = new Setting(fieldDiv)
					.setClass("note-toolbar-setting-item-field-link")
					.addSearch((cb) => {
						new ToolbarSuggester(this.app, this.plugin, cb.inputEl);
						cb.setPlaceholder("Toolbar")
							.setValue(this.plugin.settingsManager.getToolbarName(toolbarItem.link))
							.onChange(debounce(async (name) => {
								// TODO? return an ID from the suggester vs. the name
								let menuToolbar = this.plugin.settingsManager.getToolbarByName(name);
								if (menuToolbar) {
									this.removeFieldError(cb.inputEl.parentElement);
									toolbarItem.link = menuToolbar.uuid;
									await this.plugin.settingsManager.save();
								}
								else {
									this.setFieldError(cb.inputEl.parentElement, "Toolbar does not exist");
								}
								// update help text with toolbar preview or default if none selected
								let menuPreviewFr = menuToolbar 
									? createToolbarPreviewFr(menuToolbar.items) 
									: learnMoreFr(
										"Select a toolbar to open as a menu.",
										"https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Creating-toolbar-items");
								this.setFieldHelp(menuSetting.controlEl, menuPreviewFr);
							}, 250));
					});
				fieldHelp ? menuSetting.controlEl.insertAdjacentElement('beforeend', fieldHelp) : undefined;
				break;
			case ItemType.Uri: 
				const uriSetting = new Setting(fieldDiv)
					.setClass("note-toolbar-setting-item-field-link")
					.addText(text => text
						.setPlaceholder("Website, URI, or note title")
						.setValue(value)
						.onChange(
							debounce(async (value) => {
								toolbarItem.link = value;
								toolbarItem.linkAttr.type = ItemType.Uri;
								toolbarItem.linkAttr.hasVars = hasVars(value);
								toolbarItem.linkAttr.commandId = '';
								this.toolbar.updated = new Date().toISOString();
								await this.plugin.settingsManager.save();
							}, 750))
						);
				fieldHelp ? uriSetting.controlEl.insertAdjacentElement('beforeend', fieldHelp) : undefined;
				break;
		}

	}

	getLinkSettingForType(
		type: ItemType, 
		fieldDiv: HTMLDivElement, 
		toolbarItem: ToolbarItemSettings
	) {
		switch (type) {
			case ItemType.Command:
				this.getLinkSetting(ItemType.Command, fieldDiv, toolbarItem, '');
				break;
			case ItemType.File:
				this.getLinkSetting(ItemType.File, fieldDiv, toolbarItem, toolbarItem.link);
				break;
			case ItemType.Group:
			case ItemType.Menu:
				let menuGroupToolbar = this.plugin.settingsManager.getToolbarById(toolbarItem.uuid);
				let previewFr = menuGroupToolbar ? createToolbarPreviewFr(menuGroupToolbar.items) : undefined;
				let fieldHelp = document.createDocumentFragment();
				previewFr 
					? fieldHelp.append(previewFr)
					: fieldHelp.append(
						learnMoreFr(
							type === ItemType.Group ? "Select a toolbar to insert into this one." : "Select a toolbar to open as a menu.",
							"https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Creating-toolbar-items")
					);
				this.getLinkSetting(type, fieldDiv, toolbarItem, toolbarItem.link, fieldHelp);
				break;
			case ItemType.Uri:
				this.getLinkSetting(ItemType.Uri, fieldDiv, toolbarItem, toolbarItem.link, 
					learnMoreFr(
						"Tip: Use note properties in URIs.",
						"https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Variables")
				);
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
						await this.plugin.settingsManager.save();
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
						await this.plugin.settingsManager.save();
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
						await this.plugin.settingsManager.save();
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
						await this.plugin.settingsManager.save();
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


		new Setting(settingsDiv)
			.setDesc(learnMoreFr(
				"Customize even more with the Style Settings plugin.", 
				"https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Style-Settings-plugin-support")
			);

	}

	/**
	 * Displays the Usage setting section.
	 * @param settingsDiv HTMLElement to add the setting to.
	 */
	displayUsageSetting(settingsDiv: HTMLElement) {

		let usageDescFr = document.createDocumentFragment();
		let descLinkFr = usageDescFr.createEl('a', {href: '#', text: "Search for property usage"});
		let [ mappingCount, itemCount ] = this.getToolbarSettingsUsage(this.toolbar.uuid);

		usageDescFr.append(
			`This toolbar is used in ${mappingCount} mapping(s) and ${itemCount} toolbar item(s).`,
			usageDescFr.createEl("br"),
			descLinkFr
		);

		this.plugin.registerDomEvent(descLinkFr, 'click', event => {
			this.close();
			// @ts-ignore
			this.app.setting.close();
			window.open(this.getToolbarPropSearchUri(this.toolbar.name));
		});

		let usageSetting = new Setting(settingsDiv)
			.setName("Usage")
			.setDesc(usageDescFr)
			.setHeading();
		
		// let iconEl = createSpan();
		// setIcon(iconEl, 'line-chart');
		// usageSetting.nameEl.insertAdjacentElement('afterbegin', iconEl);

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
	 * Adds a new empty item to the given container (and settings).
	 * @param itemContainer HTMLElement to add the new item to.
	 */
	async addItemHandler(itemContainer: HTMLElement, itemType: ItemType) {

		// removes the empty state message before we add anything to the list
		if (this.toolbar.items.length === 0) {
			itemContainer.empty();
		}

		let newToolbarItem: ToolbarItemSettings =
			{
				uuid: getUUID(),
				label: "",
				icon: "",
				link: "",
				linkAttr: {
					commandId: "",
					hasVars: false,
					type: itemType
				},
				tooltip: "",
				visibility: {
					desktop: { allViews: { components: [ComponentType.Icon, ComponentType.Label] } },
					mobile: { allViews: { components: [ComponentType.Icon, ComponentType.Label] } },
					tablet: { allViews: { components: [ComponentType.Icon, ComponentType.Label] } },
				},
			};
		this.toolbar.items.push(newToolbarItem);
		this.toolbar.updated = new Date().toISOString();
		await this.plugin.settingsManager.save();

		//
		// add preview and form to the list
		//

		let newItemContainer = createDiv();
		newItemContainer.setAttribute('data-row-id', this.itemListIdCounter.toString());
		newItemContainer.addClass("note-toolbar-setting-items-container-row");

		let newItemPreview = this.generateItemPreview(newToolbarItem, this.itemListIdCounter.toString());
		newItemPreview.setAttribute('data-active', 'false');
		newItemContainer.appendChild(newItemPreview);

		let newItemForm = this.generateItemForm(newToolbarItem, this.itemListIdCounter.toString());
		newItemForm.setAttribute('data-active', 'true');
		newItemContainer.appendChild(newItemForm);

		this.itemListIdCounter++;
		
		itemContainer.appendChild(newItemContainer);

		// set focus in the form
		let focusField = newItemForm?.querySelector('.note-toolbar-setting-item-icon .setting-item-control .clickable-icon') as HTMLElement;
		if (focusField) {
			focusField.focus();
			// scroll to the form
			this.scrollToPosition('.note-toolbar-setting-item-icon .setting-item-control .clickable-icon', 'note-toolbar-setting-item');
		}

	}

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
		action?: 'up' | 'down' | 'delete'
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
		await this.plugin.settingsManager.save();
		this.display();
	}

	/**
	 * Handles moving items within a list, and deletion, based on click or keyboard event, given the ID of the row.
	 * @param keyEvent KeyboardEvent, if the keyboard is triggering this handler.
	 * @param itemArray Array that we're operating on.
	 * @param rowId ID of the item in the list we're moving/deleting.
	 * @param action Direction of the move, or "delete".
	 */
	async listMoveHandlerById(
		keyEvent: KeyboardEvent | null, 
		itemArray: ToolbarItemSettings[] | string[],
		rowId: string,
		action?: 'up' | 'down' | 'delete'
	): Promise<void> {	
		let itemIndex = this.getIndexByRowId(rowId);
		debugLog("listMoveHandlerById: moving index:", itemIndex);
		await this.listMoveHandler(keyEvent, itemArray, itemIndex, action);
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

	/**
	 * Scrolls to the element, or element with container class provided.
	 * @param selectors Looks for the element that matches these selectors.
	 * @param scrollToClass Looks for this containing class and scrolls to it if provided.
	 */
	private scrollToPosition(selectors: string, scrollToClass?: string) {
		let focusEl = this.contentEl.querySelector(selectors) as HTMLElement;
		focusEl?.focus();
		setTimeout(() => { 
			let scrollToEl = scrollToClass ? focusEl.closest(scrollToClass) as HTMLElement : undefined;
			scrollToEl?.scrollIntoView(true);
		}, Platform.isMobile ? 100 : 0); // delay on mobile for the on-screen keyboard
	}

	/*************************************************************************
	 * UTILITIES
	 *************************************************************************/

	/**
	 * Returns a URI that opens a search of the toolbar name in the toolbar property across all notes.
	 * @param toolbarName name of the toolbar to look for.
	 * @returns string 'obsidian://' URI.
	 */
	getToolbarPropSearchUri(toolbarName: string): string {
		let searchUri = 'obsidian://search?vault=' + this.app.vault.getName() + '&query=[' + this.plugin.settings.toolbarProp + ': ' + toolbarName + ']';
		return encodeURI(searchUri);
	}

	/**
	 * Search through settings to find out where this toolbar is referenced.
	 * @param id UUID of the toolbar to check usage for.
	 * @returns mappingCount and itemCount
	 */
	getToolbarSettingsUsage(id: string): [number, number] {
		let mappingCount = this.plugin.settings.folderMappings.filter(mapping => mapping.toolbar === id).length;
		let itemCount = this.plugin.settings.toolbars.reduce((count, toolbar) => {
			return count + toolbar.items.filter(item => item.link === id && item.linkAttr.type === ItemType.Menu).length;
		}, 0);
		return [mappingCount, itemCount];
	}

	/**
	 * Returns the visibility menu to display, for the given platform.
	 * @param platform visibility to check for component visibility
	 * @param platformLabel string to show in the menu 
	 * @returns Menu
	 */
	getItemVisibilityMenu(platform: any, platformLabel: string, button: ButtonComponent): Menu {

		let isComponentVisible = {
			icon: (platform && platform.allViews) ? platform.allViews.components.includes(ComponentType.Icon) : false,
			label: (platform && platform.allViews) ? platform.allViews.components.includes(ComponentType.Label) : false,
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
						removeComponentVisibility(platform, ComponentType.Icon);
						isComponentVisible.icon = false;
					}
					else {
						addComponentVisibility(platform, ComponentType.Icon);
						isComponentVisible.icon = true;
					}
					this.toolbar.updated = new Date().toISOString();
					await this.plugin.settingsManager.save();
					let [state, tooltip] = this.getPlatformStateLabel(platform, platformLabel);
					let oldState = button.buttonEl.querySelector('span');
					oldState ? button.buttonEl.removeChild(oldState) : undefined;
					state ? button.buttonEl.createSpan().setText(state) : undefined;
					button.setTooltip(tooltip);
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
						removeComponentVisibility(platform, ComponentType.Label);
						isComponentVisible.label = false;
					}
					else {
						addComponentVisibility(platform, ComponentType.Label);
						isComponentVisible.label = true;
					}
					this.toolbar.updated = new Date().toISOString();
					await this.plugin.settingsManager.save();
					let [state, tooltip] = this.getPlatformStateLabel(platform, platformLabel);
					let oldState = button.buttonEl.querySelector('span');
					oldState ? button.buttonEl.removeChild(oldState) : undefined;
					state ? button.buttonEl.createSpan().setText(state) : undefined;
					button.setTooltip(tooltip);
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

	/**
	 * Updates the given element with an error border and text.
	 * @param fieldEl HTMLElement to update
	 * @param errorText Error text to display
	 */
	setFieldError(fieldEl: HTMLElement | null, errorText: string) {
		if (fieldEl) {
			let fieldContainerEl = fieldEl.closest('.setting-item-control');
			if (fieldContainerEl?.querySelector('.note-toolbar-setting-field-error') === null) {
				let errorDiv = createEl('div', { 
					text: errorText, 
					cls: 'note-toolbar-setting-field-error' });
				fieldEl.insertAdjacentElement('afterend', errorDiv);
				fieldEl.addClass('note-toolbar-setting-error');
			}
		}
	}

	/**
	 * Updates the given element with the given help text.
	 * @param fieldEl HTMLElement to update
	 * @param helpFr DocumentFragment of the help text
	 */
	setFieldHelp(fieldEl: HTMLElement, helpFr: DocumentFragment) {
		let helpTextFr = document.createDocumentFragment();
		helpTextFr.append(helpFr);
		let fieldHelp = createDiv();
		fieldHelp.addClass('note-toolbar-setting-field-help');
		fieldHelp.append(helpTextFr);
		let existingHelp = fieldEl.querySelector('.note-toolbar-setting-field-help');
		existingHelp?.remove();
		fieldHelp ? fieldEl.insertAdjacentElement('beforeend', fieldHelp) : undefined;
	}

	/**
	 * Removes the error on the field.
	 * @param fieldEl HTMLElement to update
	 */
	removeFieldError(fieldEl: HTMLElement | null) {
		if (fieldEl) {
			let fieldContainerEl = fieldEl.closest('.setting-item-control');
			fieldContainerEl?.querySelector('.note-toolbar-setting-field-error')?.remove();
			fieldEl?.removeClass('note-toolbar-setting-error');
		}
	}

	updatePreview(previewType: 'text' | 'toolbar', toolbarItem: ToolbarItemSettings, rowId: string) {
		let itemPreviewContainer = this.getItemRowElById(rowId);
		let itemPreviewEl = itemPreviewContainer.querySelector('#note-toolbar-item-preview-label');
		switch (previewType) {
			case 'text':
				if (toolbarItem.label) {
					itemPreviewEl?.removeClass('note-toolbar-setting-item-preview-tooltip');
					itemPreviewEl?.removeClass('note-toolbar-setting-item-preview-empty');
					itemPreviewEl?.setText(toolbarItem.label);
				}
				else if (toolbarItem.tooltip) {
					itemPreviewEl?.addClass("note-toolbar-setting-item-preview-tooltip");
					itemPreviewEl?.removeClass('note-toolbar-setting-item-preview-empty');
					itemPreviewEl?.setText(toolbarItem.tooltip);
				}
				else {
					itemPreviewEl?.addClass("note-toolbar-setting-item-preview-empty");
					itemPreviewEl?.removeClass('note-toolbar-setting-item-preview-tooltip');
					itemPreviewEl?.setText('No label set');
				}
				break;
			case 'toolbar':
				let previewToolbar = this.plugin.settingsManager.getToolbarById(toolbarItem.link);
				previewToolbar 
					? itemPreviewEl?.appendChild(createToolbarPreviewFr(previewToolbar.items)) 
					: itemPreviewEl?.empty();
				// TODO: remove the old toolbar preview?
				// TODO: if it's empty, empty it out
				break;
		}
	}

	getIndexByRowId(rowId: string): number {
		const list = this.getItemListEls();
		// TODO: use the item's UUID instead
		return Array.prototype.findIndex.call(list, (el: Element) => el.getAttribute('data-row-id') === rowId);
	}

	getItemListEls(): NodeListOf<HTMLElement> {
		// TODO: use the item's UUID instead
		return this.contentEl.querySelectorAll('.note-toolbar-sortablejs-list > div[data-row-id]');
	}

	getItemRowElById(rowId: string): HTMLElement {
		// TODO: use the item's UUID instead
		return this.contentEl.querySelector('.note-toolbar-sortablejs-list > div[data-row-id="' + rowId + '"]') as HTMLElement;
	}

}