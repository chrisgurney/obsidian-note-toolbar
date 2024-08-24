import { App, ButtonComponent, Menu, Modal, Platform, Setting, TFile, TFolder, debounce, getIcon, normalizePath, setIcon, setTooltip } from 'obsidian';
import { arraymove, debugLog, getElementPosition, hasVars, removeComponentVisibility, addComponentVisibility, moveElement, getUUID } from 'Utils/Utils';
import { emptyMessageFr, learnMoreFr, createToolbarPreviewFr } from "../Utils/SettingsUIUtils";
import NoteToolbarPlugin from 'main';
import { DEFAULT_STYLE_OPTIONS, ItemType, MOBILE_STYLE_OPTIONS, POSITION_OPTIONS, PositionType, DEFAULT_STYLE_DISCLAIMERS, ToolbarItemSettings, ToolbarSettings, MOBILE_STYLE_DISCLAIMERS, LINK_OPTIONS, ComponentType } from 'Settings/NoteToolbarSettings';
import { NoteToolbarSettingTab } from 'Settings/UI/NoteToolbarSettingTab';
import { DeleteModal } from 'Settings/UI/Modals/DeleteModal';
import { CommandSuggester } from 'Settings/UI/Suggesters/CommandSuggester';
import { IconSuggestModal } from 'Settings/UI/Modals/IconSuggestModal';
import { FileSuggester } from 'Settings/UI/Suggesters/FileSuggester';
import Sortable from 'sortablejs';
import { ToolbarSuggester } from 'Settings/UI/Suggesters/ToolbarSuggester';

enum ItemFormComponent {
	Delete = 'delete',
	Icon = 'icon',
	Label = 'label',
	Link = 'link',
	Tooltip = 'tooltip',
}

enum SettingsAttr {
	Active = 'data-active',
	ItemUuid = 'data-item-uuid',
	PreviewType = 'data-item-type',
}

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

	/**
	 * Closes an expanded form if it's open, otherwise closes the modal. 
	 */
	onEscapeKey() {
		let focussedElement = activeDocument.activeElement;
		if (focussedElement instanceof HTMLElement) {
			let settingForm = focussedElement.closest('.note-toolbar-setting-item');
			if (settingForm) {
				let settingsDiv = this.modalEl.querySelector('.note-toolbar-setting-modal') as HTMLDivElement;
				settingsDiv ? this.collapseItemForms(settingsDiv, null) : undefined;
				return;
			}
		}
		this.close();
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
		itemsContainer.setAttribute(SettingsAttr.Active, this.itemListOpen.toString());

		//
		// Heading + expand/collapse button
		//

		let itemsSetting = new Setting(itemsContainer)
			.setName("Items")
			.setClass('note-toolbar-setting-items-header')
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
							itemsContainer.setAttribute(SettingsAttr.Active, this.itemListOpen.toString());
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
				itemContainer.setAttribute(SettingsAttr.ItemUuid, toolbarItem.uuid);
				itemContainer.addClass("note-toolbar-setting-items-container-row");

				let itemPreview = this.generateItemPreview(toolbarItem, this.itemListIdCounter.toString());
				itemContainer.appendChild(itemPreview);

				let itemForm = this.generateItemForm(toolbarItem);
				itemForm.setAttribute(SettingsAttr.Active, 'false');
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
				itemPreview?.setAttribute(SettingsAttr.Active, 'true');
				itemForm?.setAttribute(SettingsAttr.Active, 'false');
			}
		});

	}

	/**
	 * Toggles the item to the provided state, or toggles it if no state is provided.
	 * @param itemContainer 
	 * @param state 
	 */
	private toggleItemView(itemPreviewContainer: HTMLDivElement, state: 'preview' | 'form', focusOn?: ItemFormComponent) {

		let itemForm = itemPreviewContainer.nextElementSibling;
		let itemType = itemPreviewContainer.querySelector('.note-toolbar-setting-item-preview')?.getAttribute('data-item-type');
		debugLog("toggleItemView", itemPreviewContainer, itemForm, focusOn);
		
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
			previewState = itemPreviewContainer?.getAttribute(SettingsAttr.Active) === 'true' ? 'false' : 'true';
			formState = itemForm?.getAttribute(SettingsAttr.Active) === 'true' ? 'false' : 'true';
		}

		itemForm?.setAttribute(SettingsAttr.Active, formState);
		itemPreviewContainer?.setAttribute(SettingsAttr.Active, previewState);

		// move focus to form / field
		if (formState === 'true') {	
			let focusSelector = "";
			if (itemType) {
				switch (itemType) {
					case ItemType.Break:
					case ItemType.Separator:
						focusOn = ItemFormComponent.Delete;
						break;
					case ItemType.Group:
						focusOn = ItemFormComponent.Link;
						break;
					default:
						focusOn = ItemFormComponent.Icon;
						break;
				}
			}
			switch (focusOn) {
				case ItemFormComponent.Delete:
					focusSelector = ".note-toolbar-setting-item-delete .clickable-icon";
					break;
				case ItemFormComponent.Icon:
					focusSelector = "#note-toolbar-item-field-icon .clickable-icon";
					break;
				case ItemFormComponent.Label: 
					focusSelector = "#note-toolbar-item-field-label input";
					break;
				case ItemFormComponent.Link:
					focusSelector = ".note-toolbar-setting-item-field-link input";
					break;
				case ItemFormComponent.Tooltip:
					focusSelector = "#note-toolbar-item-field-tooltip input";
					break;
			}
			let focusField = itemForm?.querySelector(focusSelector) as HTMLElement;

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

		//
		// create the preview
		//

		let itemPreviewContainer = createDiv();
		itemPreviewContainer.className = "note-toolbar-setting-item-preview-container";
		let itemPreview = createDiv();
		itemPreview.className = "note-toolbar-setting-item-preview";
		itemPreview.setAttribute('role', 'button');
		itemPreview.tabIndex = 0;
		itemPreviewContainer.appendChild(itemPreview);

		this.renderPreview(toolbarItem, itemPreviewContainer);

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
				cb.extraSettingsEl.setAttribute(SettingsAttr.ItemUuid, toolbarItem.uuid);
				cb.extraSettingsEl.tabIndex = 0;
				this.plugin.registerDomEvent(
					cb.extraSettingsEl,	'keydown', (e) => {
						this.listMoveHandlerById(e, this.toolbar.items, toolbarItem.uuid);
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
				const currentTarget = e.currentTarget as Element;
				debugLog("clicked on: ", currentTarget, target);
				let focusOn: ItemFormComponent = ItemFormComponent.Label;
				if (currentTarget.querySelector('.note-toolbar-setting-tbar-preview')) {
					focusOn = ItemFormComponent.Link;
				}
				else if (target instanceof SVGElement || target?.closest('svg') || !!target.querySelector(':scope > svg')) {
					focusOn = ItemFormComponent.Icon;
				}
				else if (target instanceof HTMLSpanElement) {
					if (target.classList.contains("note-toolbar-setting-item-preview-tooltip")) {
						focusOn = ItemFormComponent.Tooltip;
					}
				}
				this.toggleItemView(itemPreviewContainer, 'form', focusOn);
			});

		return itemPreviewContainer;

	}

	/**
	 * Returns the form to edit a given toolbar item.
	 * @param toolbarItem item to return the form for
	 * @returns the form element as a div
	 */
	generateItemForm(toolbarItem: ToolbarItemSettings): HTMLDivElement {

		let itemDiv = createDiv();
		itemDiv.className = "note-toolbar-setting-item";
		let itemTopContainer = createDiv();
		itemTopContainer.className = "note-toolbar-setting-item-top-container";

		let textFieldsContainer = createDiv();
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
							let itemRow = this.getItemRowEl(toolbarItem.uuid);
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
									let itemRow = this.getItemRowEl(toolbarItem.uuid);
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
							this.renderPreview(toolbarItem);
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
							this.renderPreview(toolbarItem);
						}, 750)));
			tooltipField.settingEl.id = 'note-toolbar-item-field-tooltip';
			
			//
			// Item link type selector
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
							let itemRow = this.getItemRowEl(toolbarItem.uuid);
							let itemLinkFieldDiv = itemRow?.querySelector('.note-toolbar-setting-item-link-field') as HTMLDivElement;
							if (itemLinkFieldDiv) {
								toolbarItem.linkAttr.type = value as ItemType;
								itemLinkFieldDiv.empty();
								toolbarItem.link = '';
								this.getLinkSettingForType(toolbarItem.linkAttr.type, itemLinkFieldDiv, toolbarItem);
								await this.plugin.settingsManager.save();
								this.renderPreview(toolbarItem);
								// for case where icon/label/tooltip fields are not used, disable them
								const disableFields = toolbarItem.linkAttr.type === ItemType.Group;
								iconField.setDisabled(disableFields);
								debugLog(iconField.controlEl);
								(iconField.controlEl.firstChild as Element | null)?.setAttribute("tabindex", disableFields ? "-1" : "0");
								labelField.setDisabled(disableFields);
								tooltipField.setDisabled(disableFields);
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

			// for case where icon/label/tooltip fields are not used, disable them
			const disableFields = toolbarItem.linkAttr.type === ItemType.Group;
			iconField.setDisabled(disableFields);
			(iconField.controlEl.firstChild as Element | null)?.setAttribute("tabindex", disableFields ? "-1" : "0");
			labelField.setDisabled(disableFields);
			tooltipField.setDisabled(disableFields);

		}

		//
		// delete button
		// 

		let itemControlsContainer = createDiv();
		itemControlsContainer.className = "note-toolbar-setting-item-controls";
		this.getDeleteButton(itemControlsContainer, toolbarItem);

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
				let [state, tooltip] = this.getPlatformStateLabel(toolbarItem.visibility.desktop, 'desktop');
				setIcon(cb.buttonEl, 'monitor');
				this.updateItemVisButton(cb, state, tooltip);
				cb.setTooltip(tooltip)
					.onClick(async () => {
						// create the setting if it doesn't exist or was removed
						toolbarItem.visibility.desktop ??= { allViews: { components: [] } };
						// toggle (instead of menu) for breaks + separators
						if ([ItemType.Break, ItemType.Group, ItemType.Separator].includes(toolbarItem.linkAttr.type)) {
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
							this.updateItemVisButton(cb, state, tooltip);

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
				let [state, tooltip] = this.getPlatformStateLabel(toolbarItem.visibility.mobile, 'mobile');
				setIcon(cb.buttonEl, 'tablet-smartphone');
				this.updateItemVisButton(cb, state, tooltip);
				cb.setTooltip(tooltip)
					.onClick(async () => {
						// create the setting if it doesn't exist or was removed
						toolbarItem.visibility.mobile ??= { allViews: { components: [] } };
						// toggle (instead of menu) for breaks + separators
						if ([ItemType.Break, ItemType.Group, ItemType.Separator].includes(toolbarItem.linkAttr.type)) {
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
							this.updateItemVisButton(cb, state, tooltip);

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
				cb.extraSettingsEl.setAttribute(SettingsAttr.ItemUuid, toolbarItem.uuid);
				cb.extraSettingsEl.tabIndex = 0;
				this.plugin.registerDomEvent(
					cb.extraSettingsEl,	'keydown', (e) => {
						this.listMoveHandlerById(e, this.toolbar.items, toolbarItem.uuid);
					} );
			});

		let itemVisilityAndControlsContainer = createDiv();
		itemVisilityAndControlsContainer.className = "note-toolbar-setting-item-visibility-and-controls";
		itemVisilityAndControlsContainer.setAttribute(SettingsAttr.PreviewType, toolbarItem.linkAttr.type);
		itemVisilityAndControlsContainer.appendChild(itemControlsContainer);
		itemVisilityAndControlsContainer.appendChild(visibilityControlsContainer);

		itemDiv.appendChild(itemVisilityAndControlsContainer);

		return itemDiv;

	}

	/**
	 * Updates the appearance of the provided item form visibility button.
	 * @param button ButtonComponent for the visibility button
	 * @param label string label to add to the button (i.e., the visibility state, or none)
	 * @param tooltip string tooltip to add to the button (i.e., the visibility state, or none)
	 */
	private updateItemVisButton(button: ButtonComponent, label: string, tooltip: string): void {
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

	/**
	 * Generates the item delete button.
	 * @param el HTMLElement to put the delete button in.
	 */
	getDeleteButton(el: HTMLElement, toolbarItem: ToolbarItemSettings) {

		new Setting(el)
			.setClass("note-toolbar-setting-item-delete")
			.addExtraButton((cb) => {
				cb.setIcon("minus-circle")
					.setTooltip("Delete")
					.onClick(async () => {
						this.listMoveHandlerById(null, this.toolbar.items, toolbarItem.uuid, 'delete');
					});
				cb.extraSettingsEl.setAttribute("tabindex", "0");
				cb.extraSettingsEl.setAttribute(SettingsAttr.ItemUuid, toolbarItem.uuid);
				this.plugin.registerDomEvent(
					cb.extraSettingsEl, 'keydown', (e) => {
						this.listMoveHandlerById(e, this.toolbar.items, toolbarItem.uuid, 'delete');
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

		switch(type) {
			case ItemType.Command: 
				new Setting(fieldDiv)
					.setClass("note-toolbar-setting-item-field-link")
					.addSearch((cb) => {
						new CommandSuggester(this.app, cb.inputEl);
						cb.setPlaceholder("Search for command")
							.setValue(value)
							.onChange(debounce(async (command) => {
								toolbarItem.link = command;
								toolbarItem.linkAttr.type = ItemType.Command;
								toolbarItem.linkAttr.commandId = cb.inputEl?.getAttribute("data-command-id") ?? "";
								// TODO: check for vars in labels & tooltips
								toolbarItem.linkAttr.hasVars = false;
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
									// TODO: check for vars in labels & tooltips
									toolbarItem.linkAttr.hasVars = false;
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
									toolbarItem.linkAttr.commandId = '';
									// TODO: check for vars in labels & tooltips
									toolbarItem.linkAttr.hasVars = false;
									await this.plugin.settingsManager.save();
									this.renderPreview(toolbarItem);
								}
								else {
									this.setFieldError(cb.inputEl.parentElement, "Toolbar does not exist");
								}
								// update help text with toolbar preview or default if none selected
								let groupPreviewFr = groupToolbar 
									? createToolbarPreviewFr(groupToolbar, undefined, true) 
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
									toolbarItem.linkAttr.commandId = '';
									// TODO: check for vars in labels & tooltips
									toolbarItem.linkAttr.hasVars = false;
									await this.plugin.settingsManager.save();
									this.renderPreview(toolbarItem);
								}
								else {
									this.setFieldError(cb.inputEl.parentElement, "Toolbar does not exist");
								}
								// update help text with toolbar preview or default if none selected
								let menuPreviewFr = menuToolbar 
									? createToolbarPreviewFr(menuToolbar, undefined, true)
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
				this.getLinkSetting(ItemType.Command, fieldDiv, toolbarItem, toolbarItem.link);
				break;
			case ItemType.File:
				this.getLinkSetting(ItemType.File, fieldDiv, toolbarItem, toolbarItem.link);
				break;
			case ItemType.Group:
			case ItemType.Menu:
				let menuGroupToolbar = this.plugin.settingsManager.getToolbarById(toolbarItem.link);
				let fieldHelp = document.createDocumentFragment();
				menuGroupToolbar
					? fieldHelp.append(createToolbarPreviewFr(menuGroupToolbar, undefined, true))
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
				{ text: emptyMessageFr("No mobile styles set. Using default styles.") });
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
		newItemContainer.setAttribute(SettingsAttr.ItemUuid, newToolbarItem.uuid);
		newItemContainer.addClass("note-toolbar-setting-items-container-row");

		let newItemPreview = this.generateItemPreview(newToolbarItem, this.itemListIdCounter.toString());
		newItemPreview.setAttribute(SettingsAttr.Active, 'false');
		newItemContainer.appendChild(newItemPreview);

		let newItemForm = this.generateItemForm(newToolbarItem);
		newItemForm.setAttribute(SettingsAttr.Active, 'true');
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
	 * @param itemUuid ID of the item in the list we're moving/deleting.
	 * @param action Direction of the move, or "delete".
	 */
	async listMoveHandlerById(
		keyEvent: KeyboardEvent | null, 
		itemArray: ToolbarItemSettings[] | string[],
		itemUuid: string,
		action?: 'up' | 'down' | 'delete'
	): Promise<void> {	
		let itemIndex = this.getIndexByUuid(itemUuid);
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
					this.updateItemVisButton(button, state, tooltip);
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
					this.updateItemVisButton(button, state, tooltip);
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

	/**
	 * Renders/Re-renders the preview for the given item in the item list.
	 * @param toolbarItem ToolbarItemSettings to display preview for
	 * @param itemPreviewContainer HTMLElement container to show the preview in, if we've just created it; leave empty to use existing.
	 */
	renderPreview(toolbarItem: ToolbarItemSettings, itemPreviewContainer?: HTMLElement) {

		itemPreviewContainer = itemPreviewContainer ? itemPreviewContainer : this.getItemRowEl(toolbarItem.uuid);
		let itemPreview = itemPreviewContainer.querySelector('.note-toolbar-setting-item-preview') as HTMLElement;
		itemPreview?.empty();
		let itemPreviewContent = createSpan();
		itemPreview.setAttribute(SettingsAttr.PreviewType, toolbarItem.linkAttr.type);
		switch(toolbarItem.linkAttr.type) {
			case ItemType.Break:
			case ItemType.Separator:
				setTooltip(itemPreview, 'Edit ' + toolbarItem.linkAttr.type);
				itemPreviewContent.setText(toolbarItem.linkAttr.type);
				itemPreview.append(itemPreviewContent);
				break;
			case ItemType.Group:
				let groupToolbar = this.plugin.settingsManager.getToolbarById(toolbarItem.link);
				setTooltip(itemPreview, 'Edit item group' + (groupToolbar ? ' (' + groupToolbar.name + ')' : ''));
				groupToolbar ? itemPreviewContent.appendChild(createToolbarPreviewFr(groupToolbar)) : undefined;
				break;
			default:
				setTooltip(itemPreview, 'Edit toolbar item');
				let itemPreviewIcon = createSpan();
				itemPreviewIcon.addClass('note-toolbar-setting-item-preview-icon');
				setIcon(itemPreviewIcon, toolbarItem.icon ? toolbarItem.icon : 'note-toolbar-none');
				itemPreviewContent.addClass('note-toolbar-setting-item-preview-label');
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
				itemPreviewEditIcon.addClass("note-toolbar-setting-item-preview-edit-mobile-icon");
				setIcon(itemPreviewEditIcon, 'lucide-pencil');
				itemPreviewLabelEditIcon.appendChild(itemPreviewContent);
				itemPreviewLabelEditIcon.appendChild(itemPreviewEditIcon);
				itemPreview.appendChild(itemPreviewLabelEditIcon);
			}
		}
		else {
			itemPreview.appendChild(itemPreviewContent);
		}

	}

	getIndexByUuid(uuid: string): number {
		const list = this.getItemListEls();
		return Array.prototype.findIndex.call(list, (el: Element) => el.getAttribute(SettingsAttr.ItemUuid) === uuid);
	}	

	getItemListEls(): NodeListOf<HTMLElement> {
		return this.contentEl.querySelectorAll('.note-toolbar-sortablejs-list > div[' + SettingsAttr.ItemUuid + ']');
	}

	getItemRowEl(uuid: string): HTMLElement {
		return this.contentEl.querySelector('.note-toolbar-sortablejs-list > div[' + SettingsAttr.ItemUuid + '="' + uuid + '"]') as HTMLElement;
	}

}