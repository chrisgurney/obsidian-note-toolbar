import { App, ButtonComponent, Command, DropdownComponent, Menu, MenuItem, Modal, Notice, Platform, Setting, TFile, TFolder, debounce, getIcon, normalizePath, setIcon, setTooltip } from 'obsidian';
import { arraymove, debugLog, getElementPosition, removeComponentVisibility, addComponentVisibility, moveElement, getUUID, importArgs, getCommandIdByName, getCommandNameById } from 'Utils/Utils';
import { emptyMessageFr, learnMoreFr, createToolbarPreviewFr, displayHelpSection, showWhatsNewIfNeeded, pluginLinkFr } from "../Utils/SettingsUIUtils";
import NoteToolbarPlugin from 'main';
import { DEFAULT_STYLE_OPTIONS, ItemType, MOBILE_STYLE_OPTIONS, POSITION_OPTIONS, PositionType, DEFAULT_STYLE_DISCLAIMERS, ToolbarItemSettings, ToolbarSettings, MOBILE_STYLE_DISCLAIMERS, LINK_OPTIONS, ComponentType, t, DEFAULT_ITEM_VISIBILITY_SETTINGS, COMMAND_DOES_NOT_EXIST, ScriptConfig, SettingType, SettingFieldItemMap } from 'Settings/NoteToolbarSettings';
import { NoteToolbarSettingTab } from 'Settings/UI/NoteToolbarSettingTab';
import { confirmWithModal } from 'Settings/UI/Modals/ConfirmModal';
import { CommandSuggester } from 'Settings/UI/Suggesters/CommandSuggester';
import { IconSuggestModal } from 'Settings/UI/Modals/IconSuggestModal';
import { FileSuggester } from 'Settings/UI/Suggesters/FileSuggester';
import Sortable from 'sortablejs';
import { ToolbarSuggester } from 'Settings/UI/Suggesters/ToolbarSuggester';
import { importFromModal } from './ImportModal';
import { Adapter } from 'Adapters/Adapter';

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
				let rowEscaped = focussedElement.closest('.note-toolbar-setting-items-container-row');
				let settingsDiv = this.modalEl.querySelector('.note-toolbar-setting-modal') as HTMLDivElement;
				settingsDiv ? this.collapseItemForms(settingsDiv, rowEscaped, true) : undefined;
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
	public display(focusSelector?: string) {

		debugLog("🟡 REDRAWING MODAL 🟡");

		this.modalEl.addClass("note-toolbar-setting-modal-container");

		this.contentEl.empty();

		// update status of installed plugins so we can display errors if needed
		this.plugin.checkPlugins();

		let settingsDiv = createDiv();
		settingsDiv.className = "vertical-tab-content note-toolbar-setting-modal";

		this.displayNameSetting(settingsDiv);
		this.displayItemList(settingsDiv);
		this.displayPositionSetting(settingsDiv);
		this.displayStyleSetting(settingsDiv);
		this.displayUsageSetting(settingsDiv);
		this.displayDeleteButton(settingsDiv);

		displayHelpSection(this.plugin, settingsDiv, true, () => {
			this.close();
			if (this.parent) {
				// @ts-ignore
				this.plugin.app.setting.close();
			}
		});

		this.contentEl.appendChild(settingsDiv);

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

		if (focusSelector) {
			let focusEl = this.containerEl.querySelector(focusSelector) as HTMLElement;
			focusEl?.focus();
		}

		// scroll to the position when the modal was last open
		this.rememberLastPosition(this.contentEl.children[0] as HTMLElement);

		// show the What's New view once, if the user hasn't seen it yet
		showWhatsNewIfNeeded(this.plugin);

	}

	/**
	 * Displays the Name setting.
	 * @param settingsDiv HTMLElement to add the setting to.
	 */
	displayNameSetting(settingsDiv: HTMLElement) {

		let toolbarNameDiv = createDiv();
		new Setting(toolbarNameDiv)
			.setName(t('setting.name.name'))
			.setDesc(t('setting.name.description'))
			.addText(cb => cb
				.setPlaceholder('Name')
				.setValue(this.toolbar.name)
				.onChange(debounce(async (value) => {
					// check for existing toolbar with this name
					let existingToolbar = this.plugin.settingsManager.getToolbarByName(value);
					if (existingToolbar && existingToolbar !== this.toolbar) {
						this.setFieldError(cb.inputEl, t('setting.name.error-toolbar-already-exists'));
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
			.setName(t('setting.items.name'))
			.setClass('note-toolbar-setting-items-header')
			.setHeading()
			.setDesc(learnMoreFr(t('setting.items.description'), 'Creating-toolbar-items'));
		
		itemsSetting
			.addExtraButton((cb) => {
				cb.setIcon('import')
				.setTooltip(t('import.button-import-into-tooltip'))
				.onClick(async () => {
					importFromModal(
						this.plugin, 
						this.toolbar
					).then(async (importedToolbar: ToolbarSettings) => {
						if (importedToolbar) {
							await this.plugin.settingsManager.save();
							this.display();
						}
					});
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

		if (this.toolbar.items.length > 8) {
			itemsSetting
				.addExtraButton((cb) => {
					cb.setIcon('right-triangle')
					.setTooltip(t('setting.button-collapse-tooltip'))
					.onClick(async () => {
						let itemsContainer = settingsDiv.querySelector('.note-toolbar-setting-items-container');
						if (itemsContainer) {
							this.itemListOpen = !this.itemListOpen;
							itemsContainer.setAttribute(SettingsAttr.Active, this.itemListOpen.toString());
							let heading = itemsContainer.querySelector('.setting-item-heading .setting-item-name');
							this.itemListOpen ? heading?.setText(t('setting.items.name')) : heading?.setText(t('setting.items.name-with-count', { count: this.toolbar.items.length }));
							cb.setTooltip(this.itemListOpen ? t('setting.button-collapse-tooltip') : t('setting.button-expand-tooltip'));
						}
					})
					.extraSettingsEl.tabIndex = 0;
					cb.extraSettingsEl.addClass('note-toolbar-setting-item-expand');
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
				{ text: emptyMessageFr(t('setting.items.label-empty-no-items')) });
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

		let sortable = Sortable.create(itemsSortableContainer, {
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
				icon ? btn.extraSettingsEl.appendChild(icon) : undefined;
				btn.setTooltip(t('setting.items.button-add-separator-tooltip'))
					.onClick(async () => this.addItemHandler(itemsSortableContainer, ItemType.Separator));
			})
			.addExtraButton((btn) => {
				btn.setIcon('lucide-corner-down-left')
					.setTooltip(t('setting.items.button-add-break-tooltip'))
					.onClick(async () => this.addItemHandler(itemsSortableContainer, ItemType.Break));
			});
		itemsListButtonContainer.appendChild(formattingButtons);

		new Setting(itemsListButtonContainer)
			.addButton((btn) => {
				btn.setTooltip(t('setting.items.button-new-item-tooltip'))
					.setButtonText(t('setting.items.button-new-item'))
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
	 * @param activeRow Optional Element that was clicked/expanded.
	 * @param closeAll true if all forms should be closed; false if the active one should be left open
	 */
	collapseItemForms(settingsDiv: HTMLDivElement, activeRow: Element | null, closeAll: boolean = false) {

		// collapse all items except row
		let listItems = settingsDiv.querySelectorAll('.note-toolbar-sortablejs-list > div');
		listItems.forEach((row) => {
			let itemPreviewContainer = row.querySelector('.note-toolbar-setting-item-preview-container') as HTMLElement;
			if (closeAll || row !== activeRow) {
				let itemForm = row.querySelector('.note-toolbar-setting-item');
				itemPreviewContainer?.setAttribute(SettingsAttr.Active, 'true');
				itemForm?.setAttribute(SettingsAttr.Active, 'false');
			}
			if (closeAll && row === activeRow) {
				let itemPreview = itemPreviewContainer.querySelector('.note-toolbar-setting-item-preview') as HTMLElement;
				itemPreview.focus();
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
		// debugLog("toggleItemView", itemPreviewContainer, itemForm, itemType, focusOn);
		
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
				// figure out focus element for keyboard and special UI types
				switch (itemType) {
					case ItemType.Break:
					case ItemType.Separator:
						focusOn = ItemFormComponent.Delete;
						break;
					case ItemType.Group:
						focusOn = ItemFormComponent.Link;
						break;
					default:
						focusOn = focusOn ? focusOn : ItemFormComponent.Icon;
						break;
				}
			}
			switch (focusOn) {
				case ItemFormComponent.Delete:
					focusSelector = ".note-toolbar-setting-item-delete button";
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
					.setTooltip(t('setting.button-drag-tooltip'))
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
			itemPreview, 'keydown', (e: KeyboardEvent) => {
				switch (e.key) {
					case "d":
						const modifierPressed = (Platform.isWin || Platform.isLinux) ? e?.ctrlKey : e?.metaKey;
						if (modifierPressed) {
							const newItemUuid = this.plugin.settingsManager.duplicateToolbarItem(this.toolbar, toolbarItem, true);
							this.plugin.settingsManager.save();
							this.display(`.note-toolbar-sortablejs-list > div[${SettingsAttr.ItemUuid}="${newItemUuid}"] > .note-toolbar-setting-item-preview-container > .note-toolbar-setting-item-preview`);
						}
						break;
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
				// debugLog("clicked on: ", currentTarget, target);
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
						.setTooltip(t('setting.item.button-icon-tooltip'))
						.onClick(async () => {
							let itemRow = this.getItemRowEl(toolbarItem.uuid);
							const modal = new IconSuggestModal(this.plugin, (icon) => {
								toolbarItem.icon = (icon === t('setting.icon-suggester.option-no-icon') ? "" : icon);
								this.plugin.settingsManager.save();
								this.updateItemIcon(itemRow, icon)
							});
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
									const modal = new IconSuggestModal(this.plugin, (icon) => {
										toolbarItem.icon = (icon === t('setting.icon-suggester.option-no-icon') ? "" : icon);
										this.plugin.settingsManager.save();
										this.updateItemIcon(itemRow, icon)
									});
									modal.open();
							}
						});
				});
			iconField.settingEl.id = 'note-toolbar-item-field-icon';

			let labelField = new Setting(textFieldsContainer)
				.setClass("note-toolbar-setting-item-field")
				.addText(text => {
					text
					.setPlaceholder(t('setting.item.option-label-placeholder'))
					.setValue(toolbarItem.label)
					.onChange(
						debounce(async (value) => {
							let isValid = this.updateItemComponentStatus(value, SettingType.Text, text.inputEl.parentElement);
							toolbarItem.label = value;
							// TODO: if the label contains vars, set the flag to always rerender this toolbar
							// however, if vars are removed, make sure there aren't any other label vars, and only then unset the flag
							this.toolbar.updated = new Date().toISOString();
							await this.plugin.settingsManager.save();
							this.renderPreview(toolbarItem);
						}, 750));
					this.updateItemComponentStatus(toolbarItem.label, SettingType.Text, text.inputEl.parentElement);
				});	
			labelField.settingEl.id = 'note-toolbar-item-field-label';

			let tooltipField = new Setting(textFieldsContainer)
				.setClass("note-toolbar-setting-item-field")
				.addText(text => {
					text
					.setPlaceholder(t('setting.item.option-tooltip-placeholder'))
					.setValue(toolbarItem.tooltip)
					.onChange(
						debounce(async (value) => {
							let isValid = this.updateItemComponentStatus(value, SettingType.Text, text.inputEl.parentElement);
							toolbarItem.tooltip = value;
							this.toolbar.updated = new Date().toISOString();
							await this.plugin.settingsManager.save();
							this.renderPreview(toolbarItem);
						}, 750));
					this.updateItemComponentStatus(toolbarItem.tooltip, SettingType.Text, text.inputEl.parentElement);
				});
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
						.addOptions(
							// show enabled plugins and all other options
							Object.fromEntries(
								Object.entries(LINK_OPTIONS).filter(
									([key]) => this.plugin.hasPlugin[key] || 
									![ItemType.Dataview as string, ItemType.JsEngine as string, ItemType.Templater as string].includes(key)
								)
							)
						)
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

		//
		// duplicate button
		//

		new Setting(itemControlsContainer)
			.setClass('note-toolbar-setting-item-visibility-and-controls')
			.addButton((button: ButtonComponent) => {
				button
					.setIcon('copy-plus')
					.setTooltip(t('setting.item.button-duplicate-tooltip'))
					.onClick(async () => {
						const newItemUuid = this.plugin.settingsManager.duplicateToolbarItem(this.toolbar, toolbarItem, true);
						await this.plugin.settingsManager.save();
						this.display(`.note-toolbar-sortablejs-list > div[${SettingsAttr.ItemUuid}="${newItemUuid}"] > .note-toolbar-setting-item-preview-container > .note-toolbar-setting-item-preview`);
					});
		})

		//
		// separators + breaks: show these types after the buttons, to keep the UI minimal
		//

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
				let [state, tooltip] = this.getPlatformStateLabel(toolbarItem.visibility.desktop, t('setting.item.option-visibility-platform-desktop'));
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
							let [state, tooltip] = this.getPlatformStateLabel(platform, t('setting.item.option-visibility-platform-desktop'));
							this.updateItemVisButton(cb, state, tooltip);

							this.toolbar.updated = new Date().toISOString();
							await this.plugin.settingsManager.save();
						}
						else {
							let visibilityMenu = this.getItemVisibilityMenu(toolbarItem.visibility.desktop, t('setting.item.option-visibility-platform-desktop'), cb);
							visibilityMenu.showAtPosition(getElementPosition(cb.buttonEl));	
						}
					});
			})
			.addButton((cb) => {
				let [state, tooltip] = this.getPlatformStateLabel(toolbarItem.visibility.mobile, t('setting.item.option-visibility-platform-mobile'));
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
							let [state, tooltip] = this.getPlatformStateLabel(platform, t('setting.item.option-visibility-platform-mobile'));
							this.updateItemVisButton(cb, state, tooltip);

							this.toolbar.updated = new Date().toISOString();
							await this.plugin.settingsManager.save();
						}
						else {
							let visibilityMenu = this.getItemVisibilityMenu(toolbarItem.visibility.mobile, t('setting.item.option-visibility-platform-mobile'), cb);
							visibilityMenu.showAtPosition(getElementPosition(cb.buttonEl));
						}
					});
			})
			.addExtraButton((cb) => {
				cb.setIcon('grip-horizontal')
					.setTooltip(t('setting.button-drag-tooltip'))
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
	 * Updates the icon for the preview and form
	 * @param settingEl 
	 * @param selectedIcon 
	 */
	private updateItemIcon(settingEl: HTMLElement, selectedIcon: string) {
		// update item form
		let formEl = settingEl.querySelector('.note-toolbar-setting-item-icon .clickable-icon') as HTMLElement;
		formEl ? setIcon(formEl, selectedIcon === t('setting.icon-suggester.option-no-icon') ? 'lucide-plus-square' : selectedIcon) : undefined;
		formEl.setAttribute('data-note-toolbar-no-icon', selectedIcon === t('setting.icon-suggester.option-no-icon') ? 'true' : 'false');
		// update item preview
		let previewIconEl = settingEl.querySelector('.note-toolbar-setting-item-preview-icon') as HTMLElement;
		(previewIconEl && selectedIcon) ? setIcon(previewIconEl, selectedIcon) : undefined;
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
			.addButton((cb) => {
				cb.setIcon("minus-circle")
					.setTooltip(t('setting.button-delete-tooltip'))
					.onClick(async () => {
						this.listMoveHandlerById(null, this.toolbar.items, toolbarItem.uuid, 'delete');
					});
				cb.buttonEl.setAttribute(SettingsAttr.ItemUuid, toolbarItem.uuid);
			});

	}

	getLinkSetting(
		type: ItemType, 
		fieldDiv: HTMLDivElement, 
		toolbarItem: ToolbarItemSettings,
		helpTextFr?: DocumentFragment)
	{

		switch(type) {
			case ItemType.Command: 
				new Setting(fieldDiv)
					.setClass("note-toolbar-setting-item-field-link")
					.addSearch((cb) => {
						new CommandSuggester(this.app, cb.inputEl, async (command) => {
							this.updateItemComponentStatus(command.id, SettingType.Command, cb.inputEl.parentElement);
							cb.inputEl.value = command.name;
							toolbarItem.link = command.name;
							toolbarItem.linkAttr.commandId = command.id;
							toolbarItem.linkAttr.type = type;
							await this.plugin.settingsManager.save();
							this.renderPreview(toolbarItem);
						});
						cb.setPlaceholder(t('setting.item.option-command-placeholder'))
							.setValue(toolbarItem.link)
							.onChange(debounce(async (commandName) => {
								const commandId = commandName ? getCommandIdByName(this.plugin, commandName) : '';
								const isValid = this.updateItemComponentStatus(commandId, SettingType.Command, cb.inputEl.parentElement);
								toolbarItem.link = isValid && commandName ? commandName : '';
								toolbarItem.linkAttr.commandId = isValid && commandId ? commandId : '';
								toolbarItem.linkAttr.type = type;
								await this.plugin.settingsManager.save();
								this.renderPreview(toolbarItem);
							}, 500));
						this.updateItemComponentStatus(toolbarItem.linkAttr.commandId, SettingType.Command, cb.inputEl.parentElement);
					});	
				break;
			case ItemType.Dataview:
			case ItemType.JsEngine:
			case ItemType.Templater:
				if (this.plugin.settings.scriptingEnabled) {
					let adapter = this.plugin.getAdapterForItemType(type);
					if (adapter) {
						const functionOptions = {
							'': 'Select a function...',
							...Array.from(adapter?.getFunctions().entries()).reduce((acc, [name, func]) => {
								acc[name] = func.label;
								return acc;
							}, {} as Record<string, string>)
						}
						let selectedFunction = toolbarItem.scriptConfig?.pluginFunction || '';
						selectedFunction = (selectedFunction && adapter?.getFunctions().has(selectedFunction)) ? selectedFunction : '';
						const scriptSetting = new Setting(fieldDiv)
							.setClass("note-toolbar-setting-item-field-link")
							.addDropdown((dropdown: DropdownComponent) => {
								dropdown
									.addOptions(functionOptions)
									.setValue(selectedFunction)
									.onChange(async (value) => {
										// remove existing subfields
										let itemLinkSubfieldDiv = fieldDiv.querySelector('.note-toolbar-setting-item-link-subfield') as HTMLDivElement;
										itemLinkSubfieldDiv?.remove();
										// create the setting if it doesn't exist or was removed
										toolbarItem.scriptConfig ??= { pluginFunction: value };
										toolbarItem.scriptConfig.pluginFunction = value;
										this.toolbar.updated = new Date().toISOString();
										await this.plugin.settingsManager.save();
										if (adapter) {
											let subfieldsDiv = createDiv();
											subfieldsDiv.addClass('note-toolbar-setting-item-link-subfield');
											this.getScriptSubfields(adapter, toolbarItem, subfieldsDiv);
											fieldDiv.append(subfieldsDiv);
											const selectedFunction = adapter.getFunctions().get(value);
											if (selectedFunction?.description) {
												if (typeof selectedFunction.description === 'string') {
													let scriptHelpFr = document.createDocumentFragment();
													scriptHelpFr.appendText(selectedFunction.description);
													this.setFieldHelp(scriptSetting.controlEl, scriptHelpFr);
												}
												else {
													this.setFieldHelp(scriptSetting.controlEl, selectedFunction.description);
												}
											}
										}
										this.renderPreview(toolbarItem); // to make sure error state is refreshed
									});
								});
						this.setFieldHelp(scriptSetting.controlEl, helpTextFr);
						toolbarItem.scriptConfig ??= { pluginFunction: '' };
						let subfieldsDiv = createDiv();
						subfieldsDiv.addClass('note-toolbar-setting-item-link-subfield');
						this.getScriptSubfields(adapter, toolbarItem, subfieldsDiv);
						fieldDiv.append(subfieldsDiv);
					}
					else {
						fieldDiv.removeClass('note-toolbar-setting-item-link-field');
						fieldDiv.addClass('note-toolbar-setting-plugin-error');
						fieldDiv.setText("Toggle the Scripting setting after installing and enabling plugin: ");
						let pluginLinkFr = document.createDocumentFragment();
						let pluginLink = pluginLinkFr.createEl('a', { 
							href: `obsidian://show-plugin?id=${type}`, 
							text: LINK_OPTIONS[type]
						});
						pluginLink.addClass('note-toolbar-setting-focussable-link');
						fieldDiv.append(pluginLink);
					}
				}
				else {
					fieldDiv.removeClass('note-toolbar-setting-item-link-field');
					fieldDiv.addClass('note-toolbar-setting-plugin-error');
					fieldDiv.setText("Enable Scripting in Note Toolbar settings to use this item.");
				}
				break;
			case ItemType.File:
				new Setting(fieldDiv)
					.setClass("note-toolbar-setting-item-field-link")
					.addSearch((cb) => {
						new FileSuggester(this.app, cb.inputEl);
						cb.setPlaceholder(t('setting.item.option-file-placeholder'))
							.setValue(toolbarItem.link)
							.onChange(debounce(async (value) => {
								let isValid = this.updateItemComponentStatus(value, SettingType.File, cb.inputEl.parentElement);
								toolbarItem.link = isValid ? normalizePath(value) : '';
								toolbarItem.linkAttr.commandId = '';
								toolbarItem.linkAttr.type = type;
								await this.plugin.settingsManager.save();
								this.renderPreview(toolbarItem);
							}, 500));
						this.updateItemComponentStatus(toolbarItem.link, SettingType.File, cb.inputEl.parentElement);
					});
				break;
			case ItemType.Group:
				const groupSetting = new Setting(fieldDiv)
					.setClass("note-toolbar-setting-item-field-link")
					.addSearch((cb) => {
						new ToolbarSuggester(this.app, this.plugin, cb.inputEl);
						cb.setPlaceholder(t('setting.item.option-item-group-placeholder'))
							.setValue(this.plugin.settingsManager.getToolbarName(toolbarItem.link))
							.onChange(debounce(async (name) => {
								let isValid = this.updateItemComponentStatus(name, SettingType.Toolbar, cb.inputEl.parentElement);
								let groupToolbar = isValid ? this.plugin.settingsManager.getToolbarByName(name) : undefined;
								toolbarItem.link = groupToolbar ? groupToolbar.uuid : '';
								toolbarItem.linkAttr.commandId = '';
								toolbarItem.linkAttr.type = type;
								await this.plugin.settingsManager.save();
								this.renderPreview(toolbarItem);
								// update help text with toolbar preview or default if none selected
								let groupPreviewFr = groupToolbar 
									? createToolbarPreviewFr(this.plugin, groupToolbar, undefined, true) 
									: learnMoreFr(t('setting.item.option-item-group-help'), 'Creating-toolbar-items');
								this.setFieldHelp(groupSetting.controlEl, groupPreviewFr);
							}, 500));
						this.updateItemComponentStatus(toolbarItem.link, SettingType.Toolbar, cb.inputEl.parentElement);
					});
				this.setFieldHelp(groupSetting.controlEl, helpTextFr);
				break;
			case ItemType.Menu:
				const menuSetting = new Setting(fieldDiv)
					.setClass("note-toolbar-setting-item-field-link")
					.addSearch((cb) => {
						new ToolbarSuggester(this.app, this.plugin, cb.inputEl);
						const defaultValue = this.plugin.settingsManager.getToolbarName(toolbarItem.link);
						cb.setPlaceholder(t('setting.item.option-item-menu-placeholder'))
							.setValue(defaultValue ? defaultValue : toolbarItem.link)
							.onChange(debounce(async (name) => {
								this.updateItemComponentStatus(name, SettingType.Toolbar, cb.inputEl.parentElement);
								// TODO? return an ID from the suggester vs. the name
								let menuToolbar = this.plugin.settingsManager.getToolbarByName(name);
								toolbarItem.link = menuToolbar ? menuToolbar.uuid : '';
								toolbarItem.linkAttr.commandId = '';
								toolbarItem.linkAttr.type = type;
								await this.plugin.settingsManager.save();
								this.renderPreview(toolbarItem);
								// update help text with toolbar preview or default if none selected
								let menuPreviewFr = menuToolbar 
									? createToolbarPreviewFr(this.plugin, menuToolbar, undefined, true)
									: learnMoreFr(t('setting.item.option-item-menu-help'), 'Creating-toolbar-items');
								this.setFieldHelp(menuSetting.controlEl, menuPreviewFr);
							}, 500));
						this.updateItemComponentStatus(toolbarItem.link, SettingType.Toolbar, cb.inputEl.parentElement);
					});
				this.setFieldHelp(menuSetting.controlEl, helpTextFr);
				break;
			case ItemType.Uri: 
				const uriSetting = new Setting(fieldDiv)
					.setClass("note-toolbar-setting-item-field-link")
					.addText(cb => {
						cb.setPlaceholder(t('setting.item.option-uri-placehoder'))
							.setValue(toolbarItem.link)
							.onChange(
								debounce(async (value) => {
									this.updateItemComponentStatus(value, SettingType.Text, cb.inputEl.parentElement);
									toolbarItem.link = value;
									toolbarItem.linkAttr.commandId = '';
									toolbarItem.linkAttr.type = type;
									this.toolbar.updated = new Date().toISOString();
									await this.plugin.settingsManager.save();
									this.renderPreview(toolbarItem);
								}, 500));
						this.updateItemComponentStatus(toolbarItem.link, SettingType.Text, cb.inputEl.parentElement);
					});
				this.setFieldHelp(uriSetting.controlEl, helpTextFr);
				break;
		}

	}

	getScriptSubfields(
		adapter: Adapter,
		toolbarItem: ToolbarItemSettings,
		fieldDiv: HTMLDivElement)
	{
		if (toolbarItem.scriptConfig) {
			const config = toolbarItem.scriptConfig;
			const selectedFunction = adapter.getFunctions().get(toolbarItem.scriptConfig.pluginFunction);
			selectedFunction?.parameters.forEach(param => {
				let initialValue = config[param.parameter as keyof ScriptConfig];
				let setting;
				switch (param.type) {
					case SettingType.Command:
						setting = new Setting(fieldDiv)
							.setClass("note-toolbar-setting-item-field-link")
							.addSearch((cb) => {
								new CommandSuggester(this.app, cb.inputEl, async (command) => {
									this.updateItemComponentStatus(command.id, param.type, cb.inputEl.parentElement);
									config[param.parameter as keyof ScriptConfig] = command.id;
									cb.inputEl.value = command.name;
									await this.plugin.settingsManager.save();
								});
								cb.setPlaceholder(param.label)
									.setValue(initialValue ? (getCommandNameById(this.plugin, initialValue) || '') : '')
									.onChange(debounce(async (commandName) => {
										const commandId = commandName ? getCommandIdByName(this.plugin, commandName) : '';
										const isValid = this.updateItemComponentStatus(commandId, param.type, cb.inputEl.parentElement);
										config[param.parameter as keyof ScriptConfig] = isValid && commandId ? commandId : '';
										await this.plugin.settingsManager.save();
										this.renderPreview(toolbarItem); // to make sure error state is refreshed
									}, 500));
								this.updateItemComponentStatus(initialValue ? initialValue : '', param.type, cb.inputEl.parentElement);
							});
						break;
					case SettingType.File:
						setting = new Setting(fieldDiv)
							.setClass("note-toolbar-setting-item-field-link")
							.addSearch((cb) => {
								let fileSuggesterFolder: string | undefined = undefined;
								let fileSuggesterExt: string | undefined = '.js';
								if (toolbarItem.linkAttr.type === ItemType.Templater) {
									fileSuggesterFolder = this.plugin.tpAdapter?.getSetting('templates_folder');
									fileSuggesterExt = undefined;
								}
								new FileSuggester(this.app, cb.inputEl, true, fileSuggesterExt, fileSuggesterFolder);
								cb.setPlaceholder(param.label)
									.setValue(initialValue ? initialValue : '')
									.onChange(debounce(async (value) => {
										let isValid = this.updateItemComponentStatus(value, param.type, cb.inputEl.parentElement);
										config[param.parameter as keyof ScriptConfig] = isValid ? normalizePath(value) : '';
										this.toolbar.updated = new Date().toISOString();
										await this.plugin.settingsManager.save();
										this.renderPreview(toolbarItem); // to make sure error state is refreshed
									}, 500));
								this.updateItemComponentStatus(initialValue ? initialValue : '', param.type, cb.inputEl.parentElement);
							});
						break;
					case SettingType.Text:
						setting = new Setting(fieldDiv)
							.setClass("note-toolbar-setting-item-field-link")
							.addText(cb => {
								cb.setPlaceholder(param.label)
									.setValue(initialValue ? initialValue : '')
									.onChange(
										debounce(async (value: string) => {
											let isValid = this.updateItemComponentStatus(value, param.type, cb.inputEl.parentElement);
											config[param.parameter as keyof ScriptConfig] = isValid ? value : '';
											this.toolbar.updated = new Date().toISOString();
											await this.plugin.settingsManager.save();
											this.renderPreview(toolbarItem); // to make sure error state is refreshed
										}, 500));
								this.updateItemComponentStatus(initialValue ? initialValue : '', param.type, cb.inputEl.parentElement);
							});
						// fieldHelp ? textSetting.controlEl.insertAdjacentElement('beforeend', fieldHelp) : undefined;
						break;
					case SettingType.Args:
					case SettingType.TextArea:
						setting = new Setting(fieldDiv)
							.setClass("note-toolbar-setting-item-field-link")
							.addTextArea(cb => {
								cb.setPlaceholder(param.label)
									.setValue(initialValue ? initialValue : '')
									.onChange(
										debounce(async (value: string) => {
											let isValid = this.updateItemComponentStatus(value, param.type, cb.inputEl.parentElement);
											config[param.parameter as keyof ScriptConfig] = isValid ? value : '';
											this.toolbar.updated = new Date().toISOString();
											await this.plugin.settingsManager.save();
											this.renderPreview(toolbarItem); // to make sure error state is refreshed
										}, 500));
								this.updateItemComponentStatus(initialValue ? initialValue : '', param.type, cb.inputEl.parentElement);					
							});
						break;
				}
				if (setting && param.description) {
					const fieldHelp = createDiv();
					fieldHelp.setText(param.description);
					fieldHelp.addClass('note-toolbar-setting-field-help');
					setting.controlEl.insertAdjacentElement('beforeend', fieldHelp);
				}
			});

		}
	}

	getLinkSettingForType(
		type: ItemType, 
		fieldDiv: HTMLDivElement, 
		toolbarItem: ToolbarItemSettings
	) {
		switch (type) {
			case ItemType.Command:
				this.getLinkSetting(type, fieldDiv, toolbarItem);
				break;
			case ItemType.Dataview:
				this.getLinkSetting(type, fieldDiv, toolbarItem, learnMoreFr("Select how you want to use Dataview.", 'Dataview'));
				break;
			case ItemType.File:
				this.getLinkSetting(type, fieldDiv, toolbarItem);
				break;
			case ItemType.JsEngine:
				this.getLinkSetting(type, fieldDiv, toolbarItem, learnMoreFr("Select how you want to use this.", 'JS-Engine'));
				break;
			case ItemType.Group:
			case ItemType.Menu:
				let menuGroupToolbar = this.plugin.settingsManager.getToolbarById(toolbarItem.link);
				let fieldHelp = document.createDocumentFragment();
				menuGroupToolbar
					? fieldHelp.append(createToolbarPreviewFr(this.plugin, menuGroupToolbar, undefined, true))
					: fieldHelp.append(
						learnMoreFr(
							type === ItemType.Group ? t('setting.item.option-item-group-help') : t('setting.item.option-item-menu-help'),
							'Creating-toolbar-items')
					);
				this.getLinkSetting(type, fieldDiv, toolbarItem, fieldHelp);
				break;
			case ItemType.Templater:
				this.getLinkSetting(type, fieldDiv, toolbarItem, learnMoreFr("Select how you want to use Templater.", 'Templater'));
				break;
			case ItemType.Uri:
				this.getLinkSetting(type, fieldDiv, toolbarItem, learnMoreFr(t('setting.item.option-uri-help'), 'Variables'));
				break;
		}
	}

	/**
	 * Updates the UI state of the given component if the value is invalid.
	 * @param itemValue string value to check
	 * @param fieldType SettingFieldType to check against
	 * @param componentEl HTMLElement to update
	 * @param toolbarItem ToolbarItemSettings for the item if needed to provide more context
	 * @returns true if the item is valid; false otherwise
	 */
	updateItemComponentStatus(
		itemValue: string, 
		fieldType: SettingType, 
		componentEl: HTMLElement | null, 
		toolbarItem?: ToolbarItemSettings): boolean 
	{

		enum Status {
			Empty = 'empty',
			Invalid = 'invalid',
			Valid = 'valid'
		}

		var status: Status = Status.Valid;
		var statusMessage: string = '';
		var statusLink: HTMLAnchorElement | undefined = undefined;
		var isValid = true;

		if (itemValue) {
			switch(fieldType) {
				case SettingType.Args:
					const parsedArgs = importArgs(itemValue);
					if (!parsedArgs) {
						status = Status.Invalid;
						statusMessage = "Invalid argument format.";
					}
					break;
				case SettingType.Command:
					if (!(itemValue in this.app.commands.commands)) {
						status = Status.Invalid;
						if (itemValue === COMMAND_DOES_NOT_EXIST) {
							statusMessage = t('setting.item.option-command-error-does-not-exist');
						}
						else {
							statusMessage = t('setting.item.option-command-error-not-available-search');
							let pluginLinkFragment = pluginLinkFr(itemValue);
							let pluginLink = pluginLinkFragment?.querySelector('a');
							if (pluginLink) {
								statusMessage = t('setting.item.option-command-error-not-available-install');
								pluginLink.addClass('note-toolbar-setting-focussable-link');
								statusLink = pluginLink;
							}
						}
					}
					break;
				case SettingType.File:
					const file = this.app.vault.getAbstractFileByPath(itemValue);
					if (!(file instanceof TFile) && !(file instanceof TFolder)) {
						status = Status.Invalid;
						statusMessage = t('setting.item.option-file-error-does-not-exist');
					}
					break;
				case SettingType.Text:
					// if (this.plugin.hasVars(itemValue)) {
					// 	debugLog('VALIDATING TEXT', itemValue);
					// 	const activeFile = this.app.workspace.getActiveFile();
					// 	this.plugin.replaceVars(itemValue, activeFile).then((resolvedText) => {
							
					// 	});
					// }
					break;
				case SettingType.Toolbar:
					let toolbar = this.plugin.settingsManager.getToolbarByName(itemValue);
					if (!toolbar) {
						// toolbars are stored by IDs for previews
						toolbar = this.plugin.settingsManager.getToolbarById(itemValue);
						if (!toolbar) {
							status = Status.Invalid;
							statusMessage = t('setting.item.option-item-menu-error-does-not-exist');
						}
					}
					break;
			}
		}
		// empty fields and script items (which don't have values)
		else {
			switch (fieldType) {
				case SettingType.Script:
					if (toolbarItem && toolbarItem.scriptConfig) {
						// validate what the selected function for the adapter for this item requires
						let adapter = this.plugin.getAdapterForItemType(toolbarItem.linkAttr.type);
						if (adapter) {
							let selectedFunction = toolbarItem.scriptConfig?.pluginFunction || '';
							const params = adapter?.getFunctions().get(selectedFunction)?.parameters;
							params?.forEach((param, index) => {
								// TODO? error if required parameter is empty?
								const value = toolbarItem.scriptConfig?.[param.parameter] ?? null;
								if (value) {
									const subfieldValid = this.updateItemComponentStatus(value, param.type, componentEl);
									status = subfieldValid ? Status.Valid : Status.Invalid;
								}
							});
						}
						else {
							status = Status.Invalid;
							statusMessage = "Plugin not installed and enabled.";
						}
					}
					break;
				default:
					status = Status.Empty;
					statusMessage = '';
					break;
			}
		}

		this.removeFieldError(componentEl);
		switch (status) {
			case Status.Empty:
				// TODO? flag for whether empty should show as an error or not
				isValid = false;
				break;
			case Status.Invalid:
				this.setFieldError(componentEl, statusMessage, statusLink);
				isValid = false;
				break;
		}

		return isValid;

	}

	/**
	 * Displays the Position setting.
	 * @param settingsDiv HTMLElement to add the settings to.
	 */
	displayPositionSetting(settingsDiv: HTMLElement) {

		new Setting(settingsDiv)
			.setName(t('setting.position.name'))
			.setDesc(learnMoreFr(t('setting.position.description'), 'Positioning-toolbars'))
			.setHeading();

		new Setting(settingsDiv)
			.setName(t('setting.option-platform-desktop'))
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
			.setName(t('setting.option-platform-mobile'))
			.setDesc(this.toolbar.position.mobile?.allViews?.position === 'hidden'
				? learnMoreFr(t('setting.position.option-mobile-help'), 'Navigation-bar')
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
			.setName(t('setting.styles.name'))
			.setDesc(learnMoreFr(t('setting.styles.description'), 'Styling-toolbars'))
			.setHeading();

		//
		// Default
		//

		let defaultStyleDiv = createDiv();
		defaultStyleDiv.className = "note-toolbar-setting-item-style";

		if (this.toolbar.defaultStyles.length == 0) {
			let emptyMsg = this.containerEl.createEl("div", 
				{ text: emptyMessageFr(t('setting.styles.option-default-empty')) });
			emptyMsg.className = "note-toolbar-setting-empty-message";
			defaultStyleDiv.append(emptyMsg);
		}
		else {

			this.toolbar.defaultStyles.forEach(
				(style, index) => {
					let styleDisclaimer = this.getValueForKey(DEFAULT_STYLE_DISCLAIMERS, style);
					new Setting(defaultStyleDiv)
						.setName(this.getValueForKey(DEFAULT_STYLE_OPTIONS, style))
						.setTooltip((styleDisclaimer ? styleDisclaimer + ' ' : '') + t('setting.styles.style-tooltip-use-class', { class: style }))
						.addExtraButton((cb) => {
							cb.setIcon("cross")
								.setTooltip(t('setting.styles.style-remove-tooltip'))
								.onClick(async () => this.listMoveHandler(null, this.toolbar.defaultStyles, index, "delete"));
							cb.extraSettingsEl.setAttribute("tabindex", "0");
							this.plugin.registerDomEvent(
								cb.extraSettingsEl, 'keydown', (e) => this.listMoveHandler(e, this.toolbar.defaultStyles, index, "delete"));
						});
			});

		}

		const excludeFromDefault: string[] = this.getExcludedDefaultStyles();
		const defaultStyleOptions = [{ placeholder: t('setting.styles.option-placeholder') }, ...DEFAULT_STYLE_OPTIONS]
			.filter((option) => {
				const key = Object.keys(option)[0];
				return !this.toolbar.defaultStyles.includes(key) && !excludeFromDefault.includes(key);
			})
			.reduce((acc, option) => ({ ...acc, ...option }), {});

		new Setting(defaultStyleDiv)
			.addDropdown((dropdown) =>
				dropdown
					.addOptions(defaultStyleOptions)
					.setValue('placeholder')
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
		defaultDesc.append(t('setting.styles.option-default-description'));
		defaultDesc.append(this.getStyleDisclaimersFr(DEFAULT_STYLE_DISCLAIMERS, this.toolbar.defaultStyles));

		new Setting(settingsDiv)
			.setName(t('setting.styles.option-default-name'))
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
				{ text: emptyMessageFr(t('setting.styles.option-mobile-empty')) });
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

		const excludeFromMobile: string[] = this.getExcludedMobileStyles();
		const mobileStyleOptions = [{ placeholder: t('setting.styles.option-placeholder') }, ...MOBILE_STYLE_OPTIONS]
			.filter((option) => {
				const key = Object.keys(option)[0];
				return !this.toolbar.mobileStyles.includes(key) && !excludeFromMobile.includes(key);
			})
			.reduce((acc, option) => ({ ...acc, ...option }), {});

		new Setting(mobileStyleDiv)
			.addDropdown((dropdown) =>
				dropdown
					.addOptions(mobileStyleOptions)
					.setValue('placeholder')
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
		mobileDesc.append(t('setting.styles.option-mobile-description'));
		mobileDesc.append(this.getStyleDisclaimersFr(MOBILE_STYLE_DISCLAIMERS, this.toolbar.mobileStyles));

		new Setting(settingsDiv)
			.setName(t('setting.styles.option-mobile-name'))
			.setDesc(mobileDesc)
			.setClass("note-toolbar-setting-item-styles")
			.settingEl.append(mobileStyleDiv);

		new Setting(settingsDiv)
			.setName(t('setting.styles.option-custom-name'))
			.setDesc(learnMoreFr(t('setting.styles.option-custom-description'), 'Custom-styling'))
			.setClass('note-toolbar-setting-item-full-width')
			.addText(text => text
				.setPlaceholder(t('setting.styles.option-custom-empty'))
				.setValue(this.toolbar.customClasses)
				.onChange(debounce(async (value) => {
					this.toolbar.customClasses = value.trim();
					await this.plugin.settingsManager.save();
				}, 750)));

		new Setting(settingsDiv)
			.setDesc(learnMoreFr(t('setting.styles.help'), 'Style-Settings-plugin-support'));

	}

	/**
	 * Figures out list of default styles not to show, based on toolbar position and other styles set.
	 * @returns list of styles to exclude
	 */
	getExcludedDefaultStyles(): string[] {
		const excludedStyles: string[] = [];

		if (this.toolbar.position.desktop?.allViews?.position !== PositionType.Props) excludedStyles.push('sticky');
		if (this.toolbar.position.desktop?.allViews?.position !== PositionType.Top) excludedStyles.push('wide');

		const { defaultStyles } = this.toolbar;
		if (defaultStyles.includes('left')) excludedStyles.push('right', 'center');
		if (defaultStyles.includes('right')) excludedStyles.push('left', 'center');
		if (defaultStyles.includes('center')) excludedStyles.push('left', 'right');
		if (defaultStyles.includes('between')) excludedStyles.push('even');
		if (defaultStyles.includes('even')) excludedStyles.push('between');

		return excludedStyles;
	}

	/**
	 * Figures out list of mobile styles not to show, based on toolbar position and other styles set.
	 * @returns list of styles to exclude
	 */
	getExcludedMobileStyles(): string[] {
		const excludedStyles: string[] = [];
		
		if (this.toolbar.position.mobile?.allViews?.position !== PositionType.Top) excludedStyles.push('mnwd', 'mwd');
		if (this.toolbar.position.mobile?.allViews?.position !== PositionType.Props) excludedStyles.push('mstcky', 'mnstcky');

		const { mobileStyles } = this.toolbar;
		if (mobileStyles.includes('mlft')) excludedStyles.push('mrght', 'mctr');
		if (mobileStyles.includes('mrght')) excludedStyles.push('mlft', 'mctr');
		if (mobileStyles.includes('mctr')) excludedStyles.push('mlft', 'mrght');
		if (mobileStyles.includes('mbtwn')) excludedStyles.push('mevn');
		if (mobileStyles.includes('mevn')) excludedStyles.push('mbtwn');
		if (mobileStyles.includes('mnwd')) excludedStyles.push('mwd');
		if (mobileStyles.includes('mwd')) excludedStyles.push('mnwd');

		const { defaultStyles } = this.toolbar;
		if (defaultStyles.includes('border')) excludedStyles.push('mbrder');
		if (!defaultStyles.includes('border')) excludedStyles.push('mnbrder');
		if (defaultStyles.includes('button')) excludedStyles.push('mbtn');
		if (defaultStyles.includes('wide')) excludedStyles.push('mwd');

		return excludedStyles;
	}

	/**
	 * Displays the Usage setting section.
	 * @param settingsDiv HTMLElement to add the setting to.
	 */
	displayUsageSetting(settingsDiv: HTMLElement) {

		let usageDescFr = document.createDocumentFragment();
		let descLinkFr = usageDescFr.createEl('a', {href: '#', text: t('setting.usage.description-search')});
		let [ mappingCount, itemCount ] = this.getToolbarSettingsUsage(this.toolbar.uuid);

		usageDescFr.append(
			t('setting.usage.description', { mappingCount: mappingCount, itemCount: itemCount }),
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
			.setName(t('setting.usage.name'))
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
			.setName(t('setting.delete-toolbar.name'))
			.setHeading()
			.setDesc(t('setting.delete-toolbar.description'))
			.setClass("note-toolbar-setting-top-spacing")
			.setClass("note-toolbar-setting-bottom-spacing")
			.addButton((button: ButtonComponent) => {
				button
					.setClass("mod-warning")
					.setTooltip(t('setting.delete-toolbar.button-delete-tooltip'))
					.setButtonText(t('setting.delete-toolbar.button-delete'))
					.setCta()
					.onClick(() => {
						confirmWithModal(
							this.plugin.app, 
							{ 
								title: t('setting.delete-toolbar.title', { toolbar: this.toolbar.name }),
								questionLabel: t('setting.delete-toolbar.label-delete-confirm'),
								approveLabel: t('setting.delete-toolbar.button-delete-confirm'),
								denyLabel: t('setting.button-cancel'),
								warning: true
							}
						).then((isConfirmed: boolean) => {
							if (isConfirmed) {
								this.plugin.settingsManager.deleteToolbar(this.toolbar.uuid);
								this.plugin.settingsManager.save().then(() => {
									this.close()
								});
							}
						});
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
				visibility: {...DEFAULT_ITEM_VISIBILITY_SETTINGS},
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

		// debugLog("rememberLastPosition:", containerEl);

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
		menu.addItem((menuItem: MenuItem) => {
			menuItem
				.setTitle(isComponentVisible.icon 
					? t('setting.item.option-visibility-component-visible-platform', { component: t('setting.item.option-component-icon'), platform: platformLabel })
					: t('setting.item.option-visibility-component-hidden-platform', { component: t('setting.item.option-component-icon'), platform: platformLabel }))
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
		menu.addItem((menuItem: MenuItem) => {
			menuItem
				.setTitle(isComponentVisible.label 
					? t('setting.item.option-visibility-component-visible-platform', { component: t('setting.item.option-component-label'), platform: platformLabel })
					: t('setting.item.option-visibility-component-hidden-platform', { component: t('setting.item.option-component-label'), platform: platformLabel }))
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
					return ['', t('setting.item.option-visibility-visible-platform', { platform: platformLabel })];
				} else if (dkComponents.length === 1) {
					return [
						(dkComponents[0] === ComponentType.Icon) ? t('setting.item.option-component-icon') : (dkComponents[0] === ComponentType.Label) ? t('setting.item.option-component-label') : dkComponents[0],
						t('setting.item.option-visibility-component-visible-platform', { component: dkComponents[0], platform: platformLabel })];
				} else {
					return [t('setting.item.option-visibility-hidden'), t('setting.item.option-visibility-hidden-platform', { platform: platformLabel })];
				}
			}
		}
		return [t('setting.item.option-visibility-hidden'), t('setting.item.option-visibility-hidden-platform', { platform: platformLabel })];

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
	 * @param errorText Optional error text to display
	 * @param errorLink Optional link to display after error text
	 */
	setFieldError(fieldEl: HTMLElement | null, errorText?: string, errorLink?: HTMLAnchorElement) {
		if (fieldEl) {
			let fieldContainerEl = fieldEl.closest('.setting-item-control');
			if (!fieldContainerEl) {
				fieldContainerEl = fieldEl.closest('.note-toolbar-setting-item-preview');
				errorText = ''; // no need to show errorText for item previews
			}
			if (fieldContainerEl?.querySelector('.note-toolbar-setting-field-error') === null) {
				if (errorText) {
					let errorDiv = createEl('div', { 
						text: errorText, 
						cls: 'note-toolbar-setting-field-error' });
					if (errorLink) {
						// as it's not easy to listen for plugins being enabled,
						// user will have to click a refresh link to dismiss the error
						this.plugin.registerDomEvent(errorLink, 'click', event => {
							let refreshLink = document.createDocumentFragment().createEl('a', { text: t('setting.item.option-command-error-refresh'), href: '#' } );
							let refreshIcon = refreshLink.createSpan();
							setIcon(refreshIcon, 'refresh-cw');
							let oldLink = event.currentTarget as HTMLElement;
							oldLink?.replaceWith(refreshLink);
							this.plugin.registerDomEvent(refreshLink, 'click', event => {
								this.display();
							});
						});
						errorDiv.append(' ', errorLink);
					}
					fieldContainerEl.insertAdjacentElement('beforeend', errorDiv);
				}
				fieldEl.addClass('note-toolbar-setting-error');
			}
		}
	}

	/**
	 * Updates the given element with the given help text.
	 * @param fieldEl HTMLElement to update
	 * @param helpFr DocumentFragment of the help text
	 */
	setFieldHelp(fieldEl: HTMLElement, helpFr?: DocumentFragment) {
		if (!helpFr) return;
		let existingHelp = fieldEl.querySelector('.note-toolbar-setting-field-help');
		existingHelp?.remove();
		let fieldHelp = createDiv();
		fieldHelp.addClass('note-toolbar-setting-field-help');
		fieldHelp.append(helpFr);
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
				setTooltip(itemPreview, t('setting.items.option-edit-item-type-tooltip', { itemType: toolbarItem.linkAttr.type }));
				itemPreviewContent.setText(t('setting.item.option-break'));
				itemPreview.append(itemPreviewContent);
				break;
			case ItemType.Separator:
				setTooltip(itemPreview, t('setting.items.option-edit-item-type-tooltip', { itemType: toolbarItem.linkAttr.type }));
				itemPreviewContent.setText(t('setting.item.option-separator'));
				itemPreview.append(itemPreviewContent);
				break;
			case ItemType.Group:
				let groupToolbar = this.plugin.settingsManager.getToolbarById(toolbarItem.link);
				setTooltip(itemPreview, 
					t('setting.items.option-edit-item-group-tooltip', { toolbar: groupToolbar ? groupToolbar.name : '', context: groupToolbar ? '' : 'none' }));
				itemPreviewContent.appendChild(groupToolbar ? createToolbarPreviewFr(this.plugin, groupToolbar) : emptyMessageFr(t('setting.item.option-item-group-error-invalid')));
				break;
			default:
				setTooltip(itemPreview, t('setting.items.option-edit-item-tooltip'));
				let itemPreviewIcon = createSpan();
				itemPreviewIcon.addClass('note-toolbar-setting-item-preview-icon');
				toolbarItem.icon ? setIcon(itemPreviewIcon, toolbarItem.icon) : undefined;
				itemPreview.appendChild(itemPreviewIcon);
				itemPreviewContent.addClass('note-toolbar-setting-item-preview-label');
				if (toolbarItem.label) {
					itemPreviewContent.setText(toolbarItem.label);
					if (this.plugin.hasVars(toolbarItem.label)) {
						itemPreviewContent.addClass('note-toolbar-setting-item-preview-code');
					}
				}
				else if (toolbarItem.tooltip) {
					itemPreviewContent.setText(toolbarItem.tooltip);
					itemPreviewContent.addClass("note-toolbar-setting-item-preview-tooltip");
					if (this.plugin.hasVars(toolbarItem.tooltip)) {
						itemPreviewContent.addClass('note-toolbar-setting-item-preview-code');
					}
				}
				else {
					itemPreviewContent.setText(t('setting.items.option-item-empty-label'));
					itemPreviewContent.addClass("note-toolbar-setting-item-preview-empty");
				}
				break;
		}

		// add an icon to indicate each line is editable on mobile (as there's no hover state available)
		if (Platform.isMobile) {
			if (![ItemType.Break, ItemType.Separator].includes(toolbarItem.linkAttr.type)) {
				let itemPreviewLabelEditIcon = createDiv();
				itemPreviewLabelEditIcon.addClass("note-toolbar-setting-item-preview-edit-mobile");
				let itemPreviewEditIcon = createSpan();
				itemPreviewEditIcon.addClass("note-toolbar-setting-icon-button-cta");
				setIcon(itemPreviewEditIcon, 'lucide-pencil');
				itemPreviewLabelEditIcon.appendChild(itemPreviewContent);
				itemPreviewLabelEditIcon.appendChild(itemPreviewEditIcon);
				itemPreview.appendChild(itemPreviewLabelEditIcon);
			}
		}
		else {
			itemPreview.appendChild(itemPreviewContent);
		}

		// check if item previews are valid (non-empty + valid), and highlight if not
		this.updateItemComponentStatus(
			(toolbarItem.linkAttr.type === ItemType.Command) ? toolbarItem.linkAttr.commandId : toolbarItem.link, 
			SettingFieldItemMap[toolbarItem.linkAttr.type], 
			itemPreview,
			toolbarItem);

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