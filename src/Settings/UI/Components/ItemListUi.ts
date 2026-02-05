import NoteToolbarPlugin from "main";
import { getIcon, Platform, setIcon, Setting, setTooltip } from "obsidian";
import { DEFAULT_ITEM_SETTINGS, ItemType, SettingFieldItemMap, t, ToolbarItemSettings, ToolbarSettings } from "Settings/NoteToolbarSettings";
import Sortable from "sortablejs";
import { arraymove, getUUID, moveElement } from "Utils/Utils";
import { importFromModal } from "../Modals/ImportModal";
import ItemModal from "../Modals/ItemModal";
import ToolbarSettingsModal, { SettingsAttr } from "../Modals/ToolbarSettingsModal";
import { createToolbarPreviewFr, emptyMessageFr, handleKeyClick, iconTextFr, learnMoreFr, openItemSuggestModal, updateItemComponentStatus } from "../Utils/SettingsUIUtils";


const enum ItemFormComponent {
    Actions = 'actions',
    Delete = 'delete',
    Icon = 'icon',
    Label = 'label',
    Link = 'link',
    Tooltip = 'tooltip',
}

export default class ItemListUi {

    private itemListIdCounter: number = 0;
    private itemListOpen: boolean = true;

    constructor(
        private ntb: NoteToolbarPlugin,
        private parent: ToolbarSettingsModal,
        private toolbar: ToolbarSettings,
    ) {}

    
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
                            this.parent.display();
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
            const emptyMsgEl = this.parent.containerEl.createEl('div', 
                { text: emptyMessageFr(this.ntb, t('setting.items.label-empty-no-items') + '\u00A0') });
            emptyMsgEl.addClass('note-toolbar-setting-empty-message');

            const galleryLinkEl = emptyMsgEl.createEl('a', { href: '#', text: t('setting.item-suggest-modal.link-search') });
            galleryLinkEl.addClass('note-toolbar-setting-focussable-link');
            this.ntb.registerDomEvent(galleryLinkEl, 'click', (event) => openItemSuggestModal(this.ntb, this.toolbar, 'New', this.parent));
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

                let itemForm = this.parent.itemUi.generateItemForm(toolbarItem);
                itemForm.setAttribute(SettingsAttr.Active, 'false');
                itemContainer.appendChild(itemForm);

                this.itemListIdCounter++;
                
                itemsSortableContainer.appendChild(itemContainer);

                // check if item previews are valid (non-empty + valid), and highlight if not
                const itemPreviewEl = itemPreviewContainer.querySelector('.note-toolbar-setting-item-preview') as HTMLElement;
                if (itemPreviewEl) {
                    updateItemComponentStatus(
                        this.ntb,
                        this.parent,
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
                btn.setIcon('move-horizontal')
                    .setTooltip(t('setting.items.button-add-spreader-tooltip'))
                    .onClick(async () => this.addItemHandler(ItemType.Spreader, itemsSortableContainer));
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
                    .onClick(async () => openItemSuggestModal(this.ntb, this.toolbar, 'New', this.parent));
                btn.buttonEl.setText(iconTextFr('zoom-in', t('setting.items.button-find-item')));
            })
            .addButton((btn) => {
                btn.setTooltip(t('setting.items.button-new-item-tooltip'))
                    .setCta()
                    .onClick(async () => this.addItemHandler(ItemType.Command, itemsSortableContainer));
                btn.buttonEl.setText(iconTextFr('plus', t('setting.items.button-new-item')));
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
                            this.parent.display(newItem.uuid);
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
                    const itemModal = new ItemModal(this.ntb, this.toolbar, toolbarItem, this.parent);
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
                    case ItemType.Spreader:
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
                this.parent.scrollToPosition(focusSelector, 'note-toolbar-setting-item');
            }

        }

    }

    /*************************************************************************
     * SETTINGS DISPLAY HANDLERS
     *************************************************************************/

    /**
     * Adds a new empty item to the given container (and settings).
     * @param itemContainer optional HTMLElement to add the new item to.
     */
    async addItemHandler(itemType: ItemType, itemContainer?: HTMLElement) {

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

        // show the modal on phones and return
        if (Platform.isPhone) {
            const itemModal = new ItemModal(this.ntb, this.toolbar, newToolbarItem, this.parent);
            itemModal.open();
            return;
        }

        // add preview and form to the list
        if (itemContainer) {

            let newItemContainer = createDiv();
            newItemContainer.setAttribute(SettingsAttr.ItemUuid, newToolbarItem.uuid);
            newItemContainer.addClass("note-toolbar-setting-items-container-row");
    
            let newItemPreview = this.generateItemPreview(newToolbarItem, this.itemListIdCounter.toString());
            newItemPreview.setAttribute(SettingsAttr.Active, 'false');
            newItemContainer.appendChild(newItemPreview);
    
            let newItemForm = this.parent.itemUi.generateItemForm(newToolbarItem);
            newItemForm.setAttribute(SettingsAttr.Active, 'true');
            newItemContainer.appendChild(newItemForm);
    
            this.itemListIdCounter++;
            
            itemContainer.appendChild(newItemContainer);
    
            // set focus in the form
            let focusField = newItemForm?.querySelector('.note-toolbar-setting-item-icon .setting-item-control .clickable-icon') as HTMLElement;
            if (focusField) {
                focusField.focus();
                // scroll to the form
                this.parent.scrollToPosition('.note-toolbar-setting-item-icon .setting-item-control .clickable-icon', 'note-toolbar-setting-item');
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
        this.parent.display();
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

	/*************************************************************************
	 * UTILITIES
	 *************************************************************************/

	getIndexByUuid(uuid: string): number {
		const list = this.getItemListEls();
		return Array.prototype.findIndex.call(list, (el: Element) => el.getAttribute(SettingsAttr.ItemUuid) === uuid);
	}

	getItemListEls(): NodeListOf<HTMLElement> {
		return this.parent.contentEl.querySelectorAll('.note-toolbar-sortablejs-list > div[' + SettingsAttr.ItemUuid + ']');
	}

	getItemRowEl(uuid: string): HTMLElement {
		return this.parent.contentEl.querySelector('.note-toolbar-sortablejs-list > div[' + SettingsAttr.ItemUuid + '="' + uuid + '"]') as HTMLElement;
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
            case ItemType.Spreader:
				setTooltip(itemPreview, t('setting.items.option-edit-item-type-tooltip', { itemType: toolbarItem.linkAttr.type }));
				itemPreviewContent.setText(toolbarItem.linkAttr.type === ItemType.Break ? t('setting.item.option-break') : toolbarItem.linkAttr.type === ItemType.Separator ? t('setting.item.option-separator') : t('setting.item.option-spreader'));
				itemPreview.append(itemPreviewContent);
				break;
			case ItemType.Group: {
				const groupToolbar = this.ntb.settingsManager.getToolbar(toolbarItem.link);
				setTooltip(itemPreview, 
					t('setting.items.option-edit-item-group-tooltip', { toolbar: groupToolbar ? groupToolbar.name : '', context: groupToolbar ? '' : 'none' }));
				itemPreviewContent.appendChild(groupToolbar ? createToolbarPreviewFr(this.ntb, groupToolbar) : emptyMessageFr(this.ntb, t('setting.item.option-item-group-error-invalid')));
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

}