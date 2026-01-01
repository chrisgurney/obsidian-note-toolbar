import NoteToolbarPlugin from 'main';
import { App, ButtonComponent, Modal, Notice, Platform, Setting, SettingGroup, ToggleComponent, debounce, getIcon, setIcon, setTooltip } from 'obsidian';
import { COMMAND_PREFIX_TBAR, DEFAULT_ITEM_SETTINGS, ItemType, POSITION_OPTIONS, PositionType, SETTINGS_DISCLAIMERS, SettingFieldItemMap, TOOLBAR_COMMAND_POSITION_OPTIONS, ToolbarItemSettings, ToolbarSettings, t } from 'Settings/NoteToolbarSettings';
import { confirmWithModal } from 'Settings/UI/Modals/ConfirmModal';
import NoteToolbarSettingTab from 'Settings/UI/NoteToolbarSettingTab';
import Sortable from 'sortablejs';
import { arraymove, getUUID, moveElement } from 'Utils/Utils';
import ItemSuggester from '../Suggesters/ItemSuggester';
import ToolbarItemUi from '../ToolbarItemUi';
import ToolbarStyleUi from '../ToolbarStyleUi';
import { createOnboardingMessageEl, createToolbarPreviewFr, displayHelpSection, emptyMessageFr, getDisclaimersFr, getToolbarUsageFr, getToolbarUsageText, handleKeyClick, iconTextFr, learnMoreFr, openItemSuggestModal, removeFieldError, setFieldError, showWhatsNewIfNeeded, updateItemComponentStatus } from "../Utils/SettingsUIUtils";
import { importFromModal } from './ImportModal';
import ItemModal from './ItemModal';

const enum ItemFormComponent {
	Actions = 'actions',
	Delete = 'delete',
	Icon = 'icon',
	Label = 'label',
	Link = 'link',
	Tooltip = 'tooltip',
}

export const enum SettingsAttr {
	Active = 'data-active',
	ItemUuid = 'data-item-uuid',
	PreviewType = 'data-item-type',
}

export default class ToolbarSettingsModal extends Modal {

	public ntb: NoteToolbarPlugin;
	public toolbar: ToolbarSettings;
	private parent: NoteToolbarSettingTab | null;

	private hasDesktopFabPosition: boolean = false;
	private hasMobileFabPosition: boolean = false;
	private itemListIdCounter: number = 0;
	private itemListOpen: boolean = true; 
	private toolbarItemUi: ToolbarItemUi;

	/**
	 * Displays a new edit toolbar modal, for the given toolbar.
	 * @param app reference to the app
	 * @param ntb reference to the plugin
	 * @param parent NoteToolbarSettingTab if coming from settings UI; null if coming from editor 
	 * @param toolbar ToolbarSettings to edit
	 */
	constructor(app: App, ntb: NoteToolbarPlugin, parent: NoteToolbarSettingTab | null = null, toolbar: ToolbarSettings) {
		super(app);
		this.parent = parent;
		this.ntb = ntb;
		this.toolbar = toolbar;
		this.toolbarItemUi = new ToolbarItemUi(this.ntb, this, toolbar);
	}

	/**
	 * Displays the toolbar item's settings within the modal window.
	 */
	onOpen() {
		this.ntb.adapters.updateAdapters();
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
	public display(focusItemId?: string) {

		this.ntb.debug("🟡 REDRAWING MODAL 🟡");

		this.contentEl.empty();
		this.modalEl.addClass('note-toolbar-setting-ui');
		this.modalEl.addClass('note-toolbar-setting-modal-container');
		this.modalEl.addClass('note-toolbar-setting-modal-phone-top-inset-fix');

		// update status of installed plugins so we can display errors if needed
		this.ntb.adapters.checkPlugins();

		let settingsDiv = createDiv();
		settingsDiv.className = "vertical-tab-content note-toolbar-setting-modal";

		// show warning message about properties being changed
		const onboardingId = 'new-toolbar-mapping';
		if (!this.ntb.settings.onboarding[onboardingId]) {
			let messageEl = createOnboardingMessageEl(this.ntb, 
				onboardingId, 
				t('onboarding.new-toolbar-mapping-title'),
				t('onboarding.new-toolbar-mapping-content', { property: this.ntb.settings.toolbarProp }));
			settingsDiv.append(messageEl);
		}

		this.displayNameSetting(settingsDiv);
		this.displayItemList(settingsDiv);
		this.displayPositionSetting(settingsDiv);
		let toolbarStyle = new ToolbarStyleUi(this.ntb, this, this.toolbar);
		toolbarStyle.displayStyleSetting(settingsDiv);
		this.displayCommandButton(settingsDiv);
		this.displayDeleteButton(settingsDiv);

		displayHelpSection(this.ntb, settingsDiv, true, () => {
			this.close();
			if (this.parent) {
				// @ts-ignore
				this.ntb.app.setting.close();
			}
		});

		this.contentEl.appendChild(settingsDiv);

		// listen for clicks outside the list area, to collapse form that might be open
		this.ntb.registerDomEvent(this.modalEl, 'click', (e) => {
			let rowClicked = (e.target as HTMLElement).closest('.note-toolbar-setting-items-container-row');
			this.collapseItemForms(settingsDiv, rowClicked);
		});

		// listen for focus changes, to collapse form that might be open
		this.ntb.registerDomEvent(settingsDiv, 'focusin', (e) => {
			let rowClicked = (e.target as HTMLElement).closest('.note-toolbar-setting-items-container-row');
			this.collapseItemForms(settingsDiv, rowClicked);
		});

		if (focusItemId) {
			const selector = `.note-toolbar-sortablejs-list > div[${SettingsAttr.ItemUuid}="${focusItemId}"] > .note-toolbar-setting-item-preview-container > .note-toolbar-setting-item-preview`;
			let focusEl = this.containerEl.querySelector(selector) as HTMLElement;
			focusEl?.focus();
		}

		// scroll to the position when the modal was last open
		this.rememberLastPosition(this.contentEl.children[0] as HTMLElement);

		// show the What's New view once, if the user hasn't seen it yet
		showWhatsNewIfNeeded(this.ntb);

	}

	/**
	 * Displays the Name setting.
	 * @param settingsDiv HTMLElement to add the setting to.
	 */
	displayNameSetting(settingsDiv: HTMLElement) {

		const toolbarNameSetting = new Setting(settingsDiv)
			.setName(t('setting.name.name'))
			.setDesc(t('setting.name.description'))
			.addText(cb => cb
				.setPlaceholder('Name')
				.setValue(this.toolbar.name)
				.onChange(debounce(async (value) => {
					// check for existing toolbar with this name
					let existingToolbar = this.ntb.settingsManager.getToolbarByName(value);
					if (existingToolbar && existingToolbar !== this.toolbar) {
						setFieldError(this.ntb, this, cb.inputEl, 'beforeend', t('setting.name.error-toolbar-already-exists'));
					}
					else {
						removeFieldError(cb.inputEl, 'beforeend');
						this.toolbar.name = value;
						this.toolbar.updated = new Date().toISOString();
						this.ntb.settings.toolbars.sort((a, b) => a.name.localeCompare(b.name));
						await this.ntb.settingsManager.save();
						this.setTitle(this.toolbar.name
							? t('setting.title-edit-toolbar', { toolbar: this.toolbar.name }) 
							: t('setting.title-edit-toolbar_none'));
					}
				}, 750)));

		// allow keyboard navigation down to first toolbar item
		this.ntb.registerDomEvent(
			toolbarNameSetting.controlEl, 'keydown', (e) => {
				switch (e.key) {
					case 'ArrowDown': {
						const selector = '.note-toolbar-setting-items-container .note-toolbar-setting-item-preview';
						const itemEls = this.containerEl.querySelectorAll<HTMLElement>(selector);
						if (itemEls.length > 0) itemEls[0].focus();
						e.preventDefault();
						break;
					}
				}
			}
		)

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

		const itemsSetting = new Setting(itemsContainer)
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
						this.ntb, 
						this.toolbar
					).then(async (importedToolbar: ToolbarSettings) => {
						if (importedToolbar) {
							await this.ntb.settingsManager.save();
							this.display();
						}
					});
				});
				handleKeyClick(this.ntb, cb.extraSettingsEl);
			});

		if (this.toolbar.items.length > 8) {
			this.ntb.registerDomEvent(itemsSetting.infoEl, 'click', (event) => {
				// ignore the "Learn more" link
				if (!(event.target instanceof HTMLElement && 
					event.target.matches('a.note-toolbar-setting-focussable-link'))) {
					this.handleItemListToggle(settingsDiv);
				}
			});
			itemsSetting
				.addExtraButton((cb) => {
					cb.setIcon('right-triangle')
					.setTooltip(t('setting.button-expand-collapse-tooltip'))
					.onClick(async () => {
						this.handleItemListToggle(settingsDiv);
					});
					cb.extraSettingsEl.addClass('note-toolbar-setting-item-expand');
					handleKeyClick(this.ntb, cb.extraSettingsEl);
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
			const emptyMsgEl = this.containerEl.createEl('div', 
				{ text: emptyMessageFr(t('setting.items.label-empty-no-items') + '\u00A0') });
			emptyMsgEl.addClass('note-toolbar-setting-empty-message');

			const galleryLinkEl = emptyMsgEl.createEl('a', { href: '#', text: t('setting.item-suggest-modal.link-search') });
            galleryLinkEl.addClass('note-toolbar-setting-focussable-link');
			this.ntb.registerDomEvent(galleryLinkEl, 'click', (event) => openItemSuggestModal(this.ntb, this.toolbar, 'Default', this));
			handleKeyClick(this.ntb, galleryLinkEl);

			itemsSortableContainer.append(emptyMsgEl);

		}
		else {

			// generate the preview + form for each item
			this.toolbar.items.forEach((toolbarItem, index) => {

				let itemContainer = createDiv();
				itemContainer.setAttribute(SettingsAttr.ItemUuid, toolbarItem.uuid);
				itemContainer.addClass("note-toolbar-setting-items-container-row");

				let itemPreviewContainer = this.generateItemPreview(toolbarItem, this.itemListIdCounter.toString());
				itemContainer.appendChild(itemPreviewContainer);

				let itemForm = this.toolbarItemUi.generateItemForm(toolbarItem);
				itemForm.setAttribute(SettingsAttr.Active, 'false');
				itemContainer.appendChild(itemForm);

				this.itemListIdCounter++;
				
				itemsSortableContainer.appendChild(itemContainer);

				// check if item previews are valid (non-empty + valid), and highlight if not
				const itemPreviewEl = itemPreviewContainer.querySelector('.note-toolbar-setting-item-preview') as HTMLElement;
				if (itemPreviewEl) {
					updateItemComponentStatus(
						this.ntb,
						this,
						(toolbarItem.linkAttr.type === ItemType.Command) ? toolbarItem.linkAttr.commandId : toolbarItem.link, 
						SettingFieldItemMap[toolbarItem.linkAttr.type], 
						itemPreviewEl,
						toolbarItem);
				}
			});

			// support up/down arrow keys
			this.ntb.registerDomEvent(
				itemsSortableContainer, 'keydown', (keyEvent) => {
					if (!['ArrowUp', 'ArrowDown'].contains(keyEvent.key)) return;
					const currentFocussed = activeDocument.activeElement as HTMLElement;
					if (currentFocussed) {
						const itemSelector = 
							currentFocussed.hasClass('sortable-handle') ? '.note-toolbar-setting-item-preview-container .sortable-handle' : '.note-toolbar-setting-item-preview';
						const itemEls = Array.from(itemsSortableContainer.querySelectorAll<HTMLElement>(itemSelector));
						const currentIndex = itemEls.indexOf(currentFocussed);
						if (currentIndex === -1) return; // if focus is not on the item preview
						switch (keyEvent.key) {
							case 'ArrowUp':
								if (currentIndex > 0) {
									itemEls[currentIndex - 1].focus();
									keyEvent.preventDefault();
								}
								break;
							case 'ArrowDown':
								if (currentIndex < itemEls.length - 1) {
									itemEls[currentIndex + 1].focus();
									keyEvent.preventDefault();
								}
								break;
						}
					}
				}
			);


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
				this.ntb.debug("sortable: index: ", item.oldIndex, " -> ", item.newIndex);
				if (item.oldIndex !== undefined && item.newIndex !== undefined) {
					moveElement(this.toolbar.items, item.oldIndex, item.newIndex);
					await this.ntb.settingsManager.save();
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
					.onClick(async () => this.addItemHandler(ItemType.Separator, itemsSortableContainer));
				handleKeyClick(this.ntb, btn.extraSettingsEl);
			})
			.addExtraButton((btn) => {
				btn.setIcon('lucide-corner-down-left')
					.setTooltip(t('setting.items.button-add-break-tooltip'))
					.onClick(async () => this.addItemHandler(ItemType.Break, itemsSortableContainer));
				handleKeyClick(this.ntb, btn.extraSettingsEl);
			});
		itemsListButtonContainer.appendChild(formattingButtons);

		new Setting(itemsListButtonContainer)
			.setClass('note-toolbar-setting-no-border')
			.addButton((btn) => {
				btn.setTooltip(t('setting.items.button-find-item-tooltip'))
					.onClick(async () => openItemSuggestModal(this.ntb, this.toolbar, 'Default', this));
				btn.buttonEl.setText(iconTextFr('zoom-in', t('setting.items.button-find-item')));
			})
			.addButton((btn) => {
				btn.setTooltip(t('setting.items.button-new-item-tooltip'))
					.setCta()
					.onClick(async () => {
						if (Platform.isPhone) {
							let newToolbarItem = await this.addItemHandler(ItemType.Command);
							const itemModal = new ItemModal(this.ntb, this.toolbar, newToolbarItem, this);
							itemModal.open();
						}
						else await this.addItemHandler(ItemType.Command, itemsSortableContainer);
					});
				btn.buttonEl.setText(iconTextFr('plus', t('setting.items.button-new-item')));
			});

		itemsListContainer.appendChild(itemsListButtonContainer);
		itemsContainer.appendChild(itemsListContainer);
		settingsDiv.appendChild(itemsContainer);

	}

	/**
	 * Toggles the item list in the items container.
	 * @param settingsDiv settings HTMLElement
	 */
	handleItemListToggle(settingsDiv: HTMLElement) {
		let itemsContainer = settingsDiv.querySelector('.note-toolbar-setting-items-container');
		if (itemsContainer) {
			this.itemListOpen = !this.itemListOpen;
			itemsContainer.setAttribute(SettingsAttr.Active, this.itemListOpen.toString());
			let heading = itemsContainer.querySelector('.setting-item-heading .setting-item-name');
			this.itemListOpen ? heading?.setText(t('setting.items.name')) : heading?.setText(t('setting.items.name-with-count', { count: this.toolbar.items.length }));
		}
	}

	/**
	 * Collapses all item forms except for one that might have been expanded.
	 * @param settingsDiv HTMLElement to settings are within.
	 * @param activeRow Optional Element that was clicked/expanded.
	 * @param closeAll true if all forms should be closed; false if the active one should be left open
	 */
	collapseItemForms(settingsDiv: HTMLDivElement, activeRow: Element | null, closeAll: boolean = false) {

		// collapse all items except row
		const listItems = settingsDiv.querySelectorAll('.note-toolbar-sortablejs-list > div');
		listItems.forEach((row) => {
			const itemPreviewContainer = row.querySelector('.note-toolbar-setting-item-preview-container') as HTMLElement;
			const itemPreviewError = row.querySelector('.note-toolbar-setting-field-error') as HTMLDivElement;
			if (closeAll || row !== activeRow) {
				const itemForm = row.querySelector('.note-toolbar-setting-item');
				itemPreviewContainer?.setAttribute(SettingsAttr.Active, 'true');
				itemPreviewError?.setAttribute(SettingsAttr.Active, 'true');
				itemForm?.setAttribute(SettingsAttr.Active, 'false');
			}
			if (closeAll && row === activeRow) {
				const itemPreview = itemPreviewContainer.querySelector('.note-toolbar-setting-item-preview') as HTMLElement;
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

		const itemRow = itemPreviewContainer.closest('.note-toolbar-setting-items-container-row');
		if (!itemRow) return;

		const itemForm = itemRow.querySelector('.note-toolbar-setting-item') as HTMLDivElement;
		const itemPreviewError = itemRow.querySelector('.note-toolbar-setting-field-error') as HTMLDivElement;
		const itemType = itemPreviewContainer.querySelector('.note-toolbar-setting-item-preview')?.getAttribute('data-item-type');
		// this.plugin.debug("toggleItemView", itemPreviewContainer, itemForm, itemType, focusOn);
		
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
		itemPreviewError?.setAttribute(SettingsAttr.Active, previewState);

		// move focus to form / field
		if (formState === 'true') {	
			let focusSelector = "";
			if (itemType) {
				// figure out focus element for keyboard and special UI types
				switch (itemType) {
					case ItemType.Break:
					case ItemType.Separator:
						focusOn = Platform.isPhone ? ItemFormComponent.Actions : ItemFormComponent.Delete;
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
				case ItemFormComponent.Actions:
					focusSelector = ".note-toolbar-setting-item-actions button";
					break;
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
				this.ntb.registerDomEvent(
					cb.extraSettingsEl,	'keydown', (e) => {
						this.listMoveHandlerById(e, this.toolbar.items, toolbarItem.uuid);
					} );
			});
		itemPreviewContainer.append(itemHandleDiv);

		// 
		// listen for clicks within the list to expand the items
		//

		this.ntb.registerDomEvent(
			itemPreview, 'keydown', async (e: KeyboardEvent) => {
				switch (e.key) {
					case "d": {
						const modifierPressed = (Platform.isWin || Platform.isLinux) ? e?.ctrlKey : e?.metaKey;
						if (modifierPressed) {        
							const index = this.toolbar.items.indexOf(toolbarItem);
							const itemIndex = index >= 0 ? index + 1 : undefined;
							const newItem = await this.ntb.settingsManager.duplicateToolbarItem(this.toolbar, toolbarItem, itemIndex);
							this.ntb.settingsManager.save();
							this.display(newItem.uuid);
						}
						break;
					}
					case "Enter":
					case " ":
						e.preventDefault();
						this.toggleItemView(itemPreviewContainer, 'form');
				}
			});
		this.ntb.registerDomEvent(
			itemPreview, 'click', (e) => {
				if (Platform.isPhone) {
					const itemModal = new ItemModal(this.ntb, this.toolbar, toolbarItem, this);
					itemModal.open();
				}
				else {
					const target = e.target as Element;
					const currentTarget = e.currentTarget as Element;
					// this.plugin.debug("clicked on: ", currentTarget, target);
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
				}
			});

		return itemPreviewContainer;

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

		const positionGroup = new SettingGroup(settingsDiv);
		positionGroup.addClass('note-toolbar-setting-position-group');

		// 	.setDesc(learnMoreFr(t('setting.position.description'), 'Positioning-toolbars'))

		const initialDesktopPosition = this.toolbar.position.desktop?.allViews?.position ?? PositionType.Props;
		const initialMobilePosition = this.toolbar.position.mobile?.allViews?.position ?? PositionType.Props;

		positionGroup.addSetting((desktopPosSetting) => {

			this.hasMobileFabPosition = [PositionType.FabLeft, PositionType.FabRight].contains(initialMobilePosition);
			this.hasDesktopFabPosition = [PositionType.FabLeft, PositionType.FabRight].contains(initialDesktopPosition);

			desktopPosSetting
				.setName(t('setting.option-platform-desktop'))
				.addDropdown((dropdown) =>
					dropdown
						.addOptions(
							POSITION_OPTIONS.desktop.reduce((acc, option) => {
								return { ...acc, ...option };
							}, {}))
						.setValue(initialDesktopPosition)
						.onChange(async (val: PositionType) => {
							this.toolbar.position.desktop = { allViews: { position: val } };
							this.toolbar.updated = new Date().toISOString();
							this.hasDesktopFabPosition = [PositionType.FabLeft, PositionType.FabRight].contains(val);
							// toggle display of the default item setting
							let defaultItemSettingEl = this.containerEl.querySelector('#note-toolbar-default-item');
							if (!this.hasMobileFabPosition) {
								defaultItemSettingEl?.setAttribute('data-active', this.hasDesktopFabPosition.toString());
							}
							// update disclaimers
							desktopPosSetting.descEl.empty();
							const isNativeMenusEnabled: boolean = !!this.ntb.app.vault.getConfig('nativeMenus');
							if (this.hasDesktopFabPosition && isNativeMenusEnabled) {
								desktopPosSetting.descEl.append(getDisclaimersFr(SETTINGS_DISCLAIMERS, ['nativeMenus']));
							}
							await this.ntb.settingsManager.save();
							this.display();
						})
					);

			const isNativeMenusEnabled: boolean = !!this.ntb.app.vault.getConfig('nativeMenus');
			if (this.hasDesktopFabPosition && isNativeMenusEnabled) {
				desktopPosSetting.descEl.append(getDisclaimersFr(SETTINGS_DISCLAIMERS, ['nativeMenus']));
			}

		});

		positionGroup.addSetting((mobilePosSetting) => {
			mobilePosSetting
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
						.setValue(initialMobilePosition)
						.onChange(async (val: PositionType) => {
							this.toolbar.position.mobile = { allViews: { position: val } };
							this.toolbar.position.tablet = { allViews: { position: val } };
							this.toolbar.updated = new Date().toISOString();
							this.hasMobileFabPosition = [PositionType.FabLeft, PositionType.FabRight].contains(val);
							// toggle display of the default item setting
							let defaultItemSettingEl = this.containerEl.querySelector('#note-toolbar-default-item');
							if (!this.hasDesktopFabPosition) {
								defaultItemSettingEl?.setAttribute('data-active', this.hasMobileFabPosition.toString());
							}
							await this.ntb.settingsManager.save();
							this.display();
						})
					);
		});

		positionGroup.addSetting((defaultItemSetting) => {

			const initialDefaultItem = this.ntb.settingsManager.getToolbarItemById(this.toolbar.defaultItem);

			defaultItemSetting
				.setName(t('setting.position.option-defaultitem'))
				.setDesc(t('setting.position.option-defaultitem-description'))
				.setClass('note-toolbar-setting-item-full-width-phone')
				.addSearch((cb) => {
					new ItemSuggester(this.ntb, this.toolbar, cb.inputEl, async (item) => {
						removeFieldError(cb.inputEl, 'beforeend');
						cb.inputEl.value = item.label || item.tooltip;
						this.toolbar.defaultItem = item.uuid;
						await this.ntb.settingsManager.save();
					});
					cb.setPlaceholder(t('setting.position.option-defaultitem-placeholder'))
						.setValue(initialDefaultItem ? (initialDefaultItem.label || initialDefaultItem.tooltip) : '')
						.onChange(debounce(async (itemText) => {
							if (itemText) {
								cb.inputEl.value = itemText;
								setFieldError(this.ntb, this, cb.inputEl, 'beforeend', t('setting.position.option-defaultitem-error-invalid'));
							}
							else {
								removeFieldError(cb.inputEl, 'beforeend');
								this.toolbar.defaultItem = null;
								await this.ntb.settingsManager.save();
							}
						}, 250));
				});
			defaultItemSetting.settingEl.id = 'note-toolbar-default-item';
			defaultItemSetting.settingEl.setAttribute('data-active', 
				(this.hasMobileFabPosition || this.hasDesktopFabPosition) ? 'true' : 'false');

			// fallback if item is invalid
			if (this.toolbar.defaultItem && !initialDefaultItem) {
				this.toolbar.defaultItem = null;
			}

		});

	}

	/**
	 * Displays option to add a command for this toolbar.
	 * @param settingsDiv HTMLElement to add the setting to.
	 */
	displayCommandButton(settingsDiv: HTMLElement) {

		const SUB_OPTIONS_ID = 'command-options-group';

		new Setting(settingsDiv)
			.setName(t('setting.open-command.name'))
			.setHeading()
			.setDesc(learnMoreFr(t('setting.open-command.description'), 'Quick-Tools'))
			.addToggle((toggle: ToggleComponent) => {
				toggle
					.setValue(this.toolbar.hasCommand)
					.onChange(async (value) => {
						this.toolbar.hasCommand = value;
						// toggle display of the position setting
						const commandGroupEl = this.contentEl.querySelector(`#${SUB_OPTIONS_ID}`);
						commandGroupEl?.setAttribute('data-active', value.toString());
						// add or remove the command
						if (value) {
							this.ntb.addCommand({ 
								id: COMMAND_PREFIX_TBAR + this.toolbar.uuid, 
								name: t('command.name-open-toolbar', {toolbar: this.toolbar.name}), 
								icon: this.ntb.settings.icon, 
								callback: async () => {
									this.ntb.commands.openQuickTools(this.toolbar.uuid);
								}
							});
							new Notice(t(
								'setting.open-command.notice-command-added', 
								{ command: t('command.name-open-toolbar', {toolbar: this.toolbar.name}) }
							)).containerEl.addClass('mod-success');
						}
						else {
							this.ntb.removeCommand(COMMAND_PREFIX_TBAR + this.toolbar.uuid);
							new Notice(t(
								'setting.open-command.notice-command-removed', 
								{ command: t('command.name-open-toolbar', {toolbar: this.toolbar.name}) }
							)).containerEl.addClass('mod-success');
						}
						// save the setting
						await this.ntb.settingsManager.save();
						this.display();
					});
			});

		// command options: hot key + position
		const commandOptionsGroupEl = settingsDiv.createDiv('note-toolbar-setting-group-container');
		commandOptionsGroupEl.id = SUB_OPTIONS_ID;
		commandOptionsGroupEl.setAttribute('data-active', (this.toolbar.hasCommand ?? false).toString());
		const commandOptionsGroup = new SettingGroup(commandOptionsGroupEl);

		const toolbarCommand = this.ntb.commands.getCommandFor(this.toolbar);
		if (toolbarCommand) {
			const hotkey = this.ntb.hotkeys.getHotkeyText(toolbarCommand);
			commandOptionsGroup.addSetting((commandHotkeySetting) => {
				const commandNameFr = document.createDocumentFragment();
				commandNameFr.createEl('code', { text: toolbarCommand.name });
				commandHotkeySetting
					.setName(commandNameFr)
					.setDesc(t('setting.open-command.option-hotkey-description'))
					.addButton((button) => {
						button
							.setButtonText(hotkey ?? "Set hotkey")
							.onClick(async () => {
								this.close();
								await this.ntb.commands.openSettings('hotkeys');
							});
						});
			});
		}
		
		commandOptionsGroup.addSetting((commandPositionSetting) => {
			const initialCommandPosition = this.toolbar.commandPosition || PositionType.Floating;
			commandPositionSetting
				.setName(t('setting.open-command.option-position'))
				.setDesc(t('setting.open-command.option-position-description'))
				.addDropdown((dropdown) => {
					dropdown
						.addOptions(TOOLBAR_COMMAND_POSITION_OPTIONS)
						.setValue(initialCommandPosition)
						.onChange(async (value: PositionType) => {
							this.toolbar.commandPosition = value;
							await this.ntb.settingsManager.save();
						});
					});
		});

	}

	/**
	 * Displays the Delete button.
	 * @param settingsDiv HTMLElement to add the settings to.
	 */
	displayDeleteButton(settingsDiv: HTMLElement) {

		let usageDescFr = getToolbarUsageFr(this.ntb, this.toolbar, this);

		new Setting(settingsDiv)
			.setName(t('setting.delete-toolbar.name'))
			.setHeading()
			.setDesc(usageDescFr)
			.setClass("note-toolbar-setting-top-spacing")
			.setClass("note-toolbar-setting-bottom-spacing")
			.addButton((button: ButtonComponent) => {
				button
					.setClass("mod-warning")
					.setTooltip(t('setting.delete-toolbar.button-delete-tooltip'))
					.setButtonText(t('setting.delete-toolbar.button-delete'))
					.setCta()
					.onClick(() => {
						let usageStats = getToolbarUsageText(this.ntb, this.toolbar);
						let usageText = usageStats 
							? t('setting.usage.description') + '\n' + usageStats 
							: t('setting.usage.description_none');
						confirmWithModal(
							this.ntb.app,
							{ 
								title: t('setting.delete-toolbar.title', { toolbar: this.toolbar.name }),
								questionLabel: t('setting.delete-toolbar.label-delete-confirm'),
								notes: usageText + '\n\n' + t('setting.delete-toolbar.label-usage-note', { propertyName: this.ntb.settings.toolbarProp, toolbarName: this.toolbar.name }),
								approveLabel: t('setting.delete-toolbar.button-delete-confirm'),
								denyLabel: t('setting.button-cancel'),
								warning: true
							}
						).then((isConfirmed: boolean) => {
							if (isConfirmed) {
								this.ntb.settingsManager.deleteToolbar(this.toolbar.uuid);
								this.ntb.settingsManager.save().then(() => {
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
	 * @param itemContainer optional HTMLElement to add the new item to.
	 */
	async addItemHandler(itemType: ItemType, itemContainer?: HTMLElement): Promise<ToolbarItemSettings> {

		// removes the item list empty state message before we add anything to it
		if (itemContainer && (this.toolbar.items.length === 0)) {
			itemContainer.empty();
		}

		// create the new item, with the given type
		let newToolbarItem: ToolbarItemSettings = {
			...DEFAULT_ITEM_SETTINGS,
			uuid: getUUID(),
			linkAttr: { ...DEFAULT_ITEM_SETTINGS.linkAttr, type: itemType },
		}
		this.toolbar.items.push(newToolbarItem);
		this.toolbar.updated = new Date().toISOString();
		await this.ntb.settingsManager.save();

		// add preview and form to the list
		if (itemContainer) {

			let newItemContainer = createDiv();
			newItemContainer.setAttribute(SettingsAttr.ItemUuid, newToolbarItem.uuid);
			newItemContainer.addClass("note-toolbar-setting-items-container-row");
	
			let newItemPreview = this.generateItemPreview(newToolbarItem, this.itemListIdCounter.toString());
			newItemPreview.setAttribute(SettingsAttr.Active, 'false');
			newItemContainer.appendChild(newItemPreview);
	
			let newItemForm = this.toolbarItemUi.generateItemForm(newToolbarItem);
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

		return newToolbarItem;
		
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
		const modifierPressed = (Platform.isWin || Platform.isLinux) ? keyEvent?.ctrlKey : keyEvent?.metaKey;
		if (keyEvent) {
			switch (keyEvent.key) {
				case 'ArrowUp':
					if (!modifierPressed) return;
					keyEvent.preventDefault();
					action = 'up';
					break;
				case 'ArrowDown':
					if (!modifierPressed) return;
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
		await this.ntb.settingsManager.save();
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
		this.ntb.debug("listMoveHandlerById: moving index:", itemIndex);
		await this.listMoveHandler(keyEvent, itemArray, itemIndex, action);
	}

	private lastScrollPosition: number;
	/**
	 * Remembers the scrolling position of the user and jumps to it on display.
	 * @author Taitava (Shell Commands plugin)
	 * @link https://github.com/Taitava/obsidian-shellcommands/blob/8d030a23540d587a85bd0dfe2e08c8e6b6b955ab/src/settings/SC_MainSettingsTab.ts#L701 
	*/
    private rememberLastPosition(containerEl: HTMLElement) {

		// this.ntb.debug("rememberLastPosition:", containerEl);

        // go to the last position
		containerEl.scrollTo({
			top: this.lastScrollPosition,
			behavior: "auto",
		});

        // listen to changes
        this.ntb.registerDomEvent(containerEl, 'scroll', (event) => {
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
			case ItemType.Group: {
				const groupToolbar = this.ntb.settingsManager.getToolbar(toolbarItem.link);
				setTooltip(itemPreview, 
					t('setting.items.option-edit-item-group-tooltip', { toolbar: groupToolbar ? groupToolbar.name : '', context: groupToolbar ? '' : 'none' }));
				itemPreviewContent.appendChild(groupToolbar ? createToolbarPreviewFr(this.ntb, groupToolbar) : emptyMessageFr(t('setting.item.option-item-group-error-invalid')));
				break;
			}
			default: {
				setTooltip(itemPreview, t('setting.items.option-edit-item-tooltip'));
				let itemPreviewIcon = createSpan();
				itemPreviewIcon.addClass('note-toolbar-setting-item-preview-icon');
				toolbarItem.icon ? setIcon(itemPreviewIcon, toolbarItem.icon) : undefined;
				itemPreview.appendChild(itemPreviewIcon);
				itemPreviewContent.addClass('note-toolbar-setting-item-preview-label');
				if (toolbarItem.label) {
					itemPreviewContent.setText(toolbarItem.label);
					if (this.ntb.vars.hasVars(toolbarItem.label)) {
						itemPreviewContent.addClass('note-toolbar-setting-item-preview-code');
					}
				}
				else if (toolbarItem.tooltip) {
					itemPreviewContent.setText(toolbarItem.tooltip);
					itemPreviewContent.addClass("note-toolbar-setting-item-preview-tooltip");
					if (this.ntb.vars.hasVars(toolbarItem.tooltip)) {
						itemPreviewContent.addClass('note-toolbar-setting-item-preview-code');
					}
				}
				else {
					itemPreviewContent.setText(t('setting.items.option-item-empty-label'));
					itemPreviewContent.addClass("note-toolbar-setting-item-preview-empty");
				}
				break;
			}
		}

		// FIXME: figure out how to add back in, with error for each preview item (which needs flex-wrap:wrap)
		// add an icon to indicate each line is editable on mobile (as there's no hover state available)
		// if (Platform.isMobile) {
		// 	if (![ItemType.Break, ItemType.Separator].includes(toolbarItem.linkAttr.type)) {
		// 		let itemPreviewLabelEditIcon = createDiv();
		// 		itemPreviewLabelEditIcon.addClass("note-toolbar-setting-item-preview-edit-mobile");
		// 		let itemPreviewEditIcon = createSpan();
		// 		itemPreviewEditIcon.addClass("note-toolbar-setting-icon-button-cta");
		// 		setIcon(itemPreviewEditIcon, 'lucide-pencil');
		// 		itemPreviewLabelEditIcon.appendChild(itemPreviewContent);
		// 		itemPreviewLabelEditIcon.appendChild(itemPreviewEditIcon);
		// 		itemPreview.appendChild(itemPreviewLabelEditIcon);
		// 	}
		// }

		// show hotkey
		if (!Platform.isPhone) {
			const itemCommand = this.ntb.commands.getCommandFor(toolbarItem);
			if (itemCommand) {
				const itemHotkeyEl = this.ntb.hotkeys.getHotkeyEl(itemCommand);
				if (itemHotkeyEl) {
					itemPreviewContent.appendChild(itemHotkeyEl);
				}
				else {
					let commandIconEl = itemPreviewContent.createSpan();
					commandIconEl.addClass('note-toolbar-setting-command-indicator');
					setIcon(commandIconEl, 'terminal');
					setTooltip(commandIconEl, t('setting.use-item-command.tooltip-command-indicator', { command: itemCommand.name, interpolation: { escapeValue: false } }));
				}
			}
		}
		
		itemPreview.appendChild(itemPreviewContent);

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