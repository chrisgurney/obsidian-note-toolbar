import { Adapter } from "Adapters/Adapter";
import NoteToolbarPlugin from "main";
import { ButtonComponent, debounce, DropdownComponent, Menu, MenuItem, normalizePath, Notice, PaneType, Platform, setIcon, Setting, SettingGroup } from "obsidian";
import { ComponentType, ItemType, LINK_OPTIONS, ScriptConfig, SETTINGS_DISCLAIMERS, SettingType, t, TARGET_OPTIONS, ToolbarItemSettings, ToolbarSettings } from "Settings/NoteToolbarSettings";
import { addComponentVisibility, getElementPosition, removeComponentVisibility } from "Utils/Utils";
import IconSuggestModal from "./Modals/IconSuggestModal";
import ItemModal from "./Modals/ItemModal";
import ToolbarSettingsModal, { SettingsAttr } from "./Modals/ToolbarSettingsModal";
import CommandSuggester from "./Suggesters/CommandSuggester";
import FileSuggester from "./Suggesters/FileSuggester";
import ToolbarSuggester from "./Suggesters/ToolbarSuggester";
import { copyToolbarItem, createToolbarPreviewFr, getDisclaimersFr, handleKeyClick, learnMoreFr, setFieldHelp, updateItemComponentStatus, updateItemIcon } from "./Utils/SettingsUIUtils";

export default class ToolbarItemUi {

    constructor(
        private ntb: NoteToolbarPlugin, 
        private parent: ToolbarSettingsModal | ItemModal, 
        private toolbar: ToolbarSettings
    ) {}

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
                            let itemRow = this.parent.getItemRowEl(toolbarItem.uuid);
                            const modal = new IconSuggestModal(this.ntb, toolbarItem.icon, true, async (icon) => {
                                toolbarItem.icon = (icon === t('setting.icon-suggester.option-no-icon') ? "" : icon);
                                this.ntb.settingsManager.save();
                                updateItemIcon(this.parent, itemRow, icon);
                                if (toolbarItem.hasCommand) await this.ntb.commands.updateItemCommand(toolbarItem, false);
                            });
                            modal.open();
                        });
                    cb.extraSettingsEl.setAttribute("data-note-toolbar-no-icon", !toolbarItem.icon ? "true" : "false");
                    cb.extraSettingsEl.setAttribute("tabindex", "0");
                    this.ntb.registerDomEvent(
                        cb.extraSettingsEl, 'keydown', (e) => {
                            switch (e.key) {
                                case "Enter":
                                case " ": {
                                    const modifierPressed = (Platform.isWin || Platform.isLinux) ? e?.ctrlKey : e?.metaKey;
                                    if (!modifierPressed) {
                                        e.preventDefault();
                                        let itemRow = this.parent.getItemRowEl(toolbarItem.uuid);
                                        const modal = new IconSuggestModal(this.ntb, toolbarItem.icon, true, (icon) => {
                                            toolbarItem.icon = (icon === t('setting.icon-suggester.option-no-icon') ? "" : icon);
                                            this.ntb.settingsManager.save();
                                            updateItemIcon(this.parent, itemRow, icon);
                                        });
                                        modal.open();
                                    }
                                }
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
                            let isValid = updateItemComponentStatus(this.ntb, this.parent, value, SettingType.Text, text.inputEl.parentElement);
                            toolbarItem.label = value;
                            // TODO: if the label contains vars, set the flag to always rerender this toolbar
                            // however, if vars are removed, make sure there aren't any other label vars, and only then unset the flag
                            this.toolbar.updated = new Date().toISOString();
                            await this.ntb.settingsManager.save();
                            if (toolbarItem.hasCommand) await this.ntb.commands.updateItemCommand(toolbarItem);
                            this.renderPreview(toolbarItem);
                        }, 750));
                    updateItemComponentStatus(this.ntb, this.parent, toolbarItem.label, SettingType.Text, text.inputEl.parentElement);
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
                            let isValid = updateItemComponentStatus(this.ntb, this.parent, value, SettingType.Text, text.inputEl.parentElement);
                            toolbarItem.tooltip = value;
                            this.toolbar.updated = new Date().toISOString();
                            await this.ntb.settingsManager.save();
                            if (toolbarItem.hasCommand) await this.ntb.commands.updateItemCommand(toolbarItem);
                            this.renderPreview(toolbarItem);
                        }, 750));
                    updateItemComponentStatus(this.ntb, this.parent, toolbarItem.tooltip, SettingType.Text, text.inputEl.parentElement);
                });
            tooltipField.settingEl.id = 'note-toolbar-item-field-tooltip';
            
            //
            // Item link type selector
            //

            let linkContainer = createDiv();
            linkContainer.className = "note-toolbar-setting-item-link-container";

            let linkSelector = createDiv();
            new Setting(linkSelector)
                .addDropdown((dropdown) =>
                    dropdown
                        .addOptions(
                            // show enabled plugins and all other options
                            Object.fromEntries(
                                Object.entries(LINK_OPTIONS).filter(
                                    ([key]) => this.ntb.adapters.hasPlugin(key) || 
                                    ![ItemType.Dataview as string, ItemType.JsEngine as string, ItemType.Templater as string].includes(key)
                                )
                            )
                        )
                        .setValue(toolbarItem.linkAttr.type)
                        .onChange(async (value) => {
                            let itemRow = this.parent.getItemRowEl(toolbarItem.uuid);
                            let itemLinkFieldDiv = itemRow?.querySelector('.note-toolbar-setting-item-link-field') as HTMLDivElement;
                            // if there's an error instead, remove it
                            if (!itemLinkFieldDiv) {
                                itemLinkFieldDiv = itemRow?.querySelector('.note-toolbar-setting-plugin-error') as HTMLDivElement;
                                if (itemLinkFieldDiv) {
                                    itemLinkFieldDiv.empty();
                                    itemLinkFieldDiv.removeClass('note-toolbar-setting-plugin-error');
                                    itemLinkFieldDiv.addClass('note-toolbar-setting-item-link-field');
                                }
                            }
                            if (itemLinkFieldDiv) {
                                toolbarItem.linkAttr.type = value as ItemType;
                                itemLinkFieldDiv.empty();
                                toolbarItem.link = '';
                                this.getLinkSettingForType(toolbarItem.linkAttr.type, itemLinkFieldDiv, toolbarItem);
                                await this.ntb.settingsManager.save();
                                this.renderPreview(toolbarItem);
                                // for case where icon/label/tooltip fields are not used, disable them
                                const disableFields = toolbarItem.linkAttr.type === ItemType.Group;
                                iconField.setDisabled(disableFields);
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

        let itemControlsContainer = createDiv();
        itemControlsContainer.className = "note-toolbar-setting-item-controls";

        // 
        // action buttons (desktop + tablet)
        //

        if (!Platform.isPhone) {

            new Setting(itemControlsContainer)
			.setClass("note-toolbar-setting-item-delete")
			.addButton((button: ButtonComponent) => {
				button
                    .setIcon("minus-circle")
					.setTooltip(t('setting.button-delete-tooltip'))
					.onClick(async () => this.handleItemDelete(toolbarItem));
				button.buttonEl.setAttribute(SettingsAttr.ItemUuid, toolbarItem.uuid);
			});

            new Setting(itemControlsContainer)
                .setClass('note-toolbar-setting-item-visibility-and-controls')
                .addButton((button: ButtonComponent) => {
                    button
                        .setIcon('copy-plus')
                        .setTooltip(t('setting.item.button-duplicate-tooltip'))
                        .onClick(async () => this.handleItemDuplicate(toolbarItem));
            });

        }

        //
        // actions menu
        //

        new Setting(itemControlsContainer)
            .setClass('note-toolbar-setting-item-actions') // so it can be focussed on if needed
            .setClass('note-toolbar-setting-item-visibility-and-controls')
            .addButton((cb) => {
                cb.setIcon("ellipsis")
                    .setTooltip(t('setting.item.menu-more-actions'))
                    .onClick(async (event) => {
                        let menu = this.generateItemActionMenu(toolbarItem);
                        menu.showAtPosition(getElementPosition(cb.buttonEl));
                    });
            });

        //
        // separators + breaks: show these types after the buttons, to keep the UI minimal
        //

        if ([ItemType.Break, ItemType.Separator].includes(toolbarItem.linkAttr.type)) {
            let type = toolbarItem.linkAttr.type;
            let separatorTitle = createSpan();
            separatorTitle.setText(type === ItemType.Break ? t('setting.item.option-break') : t('setting.item.option-separator'));
            itemControlsContainer.append(separatorTitle);
        }

        //
        // visibility controls
        // 

        let visibilityControlsContainer = createDiv();
        visibilityControlsContainer.className = "note-toolbar-setting-item-visibility-container";

        let visButtons = new Setting(visibilityControlsContainer)
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
                            await this.ntb.settingsManager.save();
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
                            await this.ntb.settingsManager.save();
                        }
                        else {
                            let visibilityMenu = this.getItemVisibilityMenu(toolbarItem.visibility.mobile, t('setting.item.option-visibility-platform-mobile'), cb);
                            visibilityMenu.showAtPosition(getElementPosition(cb.buttonEl));
                        }
                    });
            });

        if (this.parent instanceof ToolbarSettingsModal) {
            visButtons.addExtraButton((cb) => {
                cb.setIcon('grip-horizontal')
                    .setTooltip(t('setting.button-drag-tooltip'))
                    .extraSettingsEl.addClass('sortable-handle');
                cb.extraSettingsEl.setAttribute(SettingsAttr.ItemUuid, toolbarItem.uuid);
                cb.extraSettingsEl.tabIndex = 0;
                this.ntb.registerDomEvent(
                    cb.extraSettingsEl,	'keydown', (e) => {
                        if (this.parent instanceof ToolbarSettingsModal) this.parent.listMoveHandlerById(e, this.toolbar.items, toolbarItem.uuid);
                    } );
            });
        }

        let itemVisilityAndControlsContainer = createDiv();
        itemVisilityAndControlsContainer.className = "note-toolbar-setting-item-visibility-and-controls";
        itemVisilityAndControlsContainer.setAttribute(SettingsAttr.PreviewType, toolbarItem.linkAttr.type);
        itemVisilityAndControlsContainer.appendChild(itemControlsContainer);
        itemVisilityAndControlsContainer.appendChild(visibilityControlsContainer);

        itemDiv.appendChild(itemVisilityAndControlsContainer);

        return itemDiv;

    }

    /**
     * Creates the actions menu for the item.
     * @param toolbarItem Item to generate a menu for.
     * @returns the menu.
     */
    generateItemActionMenu(toolbarItem: ToolbarItemSettings): Menu {

        let menu = new Menu();

        if (Platform.isPhone) {
            menu.addItem((menuItem: MenuItem) => {
                menuItem
                    .setTitle(t('setting.item.button-duplicate-tooltip'))
                    .setIcon('copy-plus')
                    .onClick(async (menuEvent) => this.handleItemDuplicate(toolbarItem));
            });
        }

        menu.addItem((menuItem: MenuItem) => {
            menuItem
                .setTitle(t('setting.item.menu-copy-item'))
                .setIcon('square-arrow-right')
                .onClick(async (menuEvent) => {
                    await copyToolbarItem(this.ntb, this.toolbar, toolbarItem);
                });
        });

        menu.addSeparator();

        if (![ItemType.Break, ItemType.Group, ItemType.Menu, ItemType.Separator].contains(toolbarItem.linkAttr.type)) {

            // copy item command URI
            if (toolbarItem.hasCommand) {
                const itemCommand = this.ntb.commands.getCommandFor(toolbarItem);
                if (itemCommand) {
                    menu.addItem((menuItem: MenuItem) => {
                        menuItem
                            .setTitle(t('setting.use-item-command.name-copy'))
                            .setIcon('copy')
                            .onClick(async (menuEvent) => {
                                const commandText = `obsidian://note-toolbar?command=${itemCommand.id}`;
                                navigator.clipboard.writeText(commandText);
                                new Notice(t('command.copy-command-notice')).containerEl.addClass('mod-success');
                            });
                    });
                }
            }

            // add/remove item command
            menu.addItem((menuItem: MenuItem) => {
                menuItem
                    .setTitle(toolbarItem.hasCommand ? t('setting.use-item-command.name-remove') : t('setting.use-item-command.name-add'))
                    .setIcon('terminal')
                    .onClick(async (menuEvent) => {
                        toolbarItem.hasCommand = !toolbarItem.hasCommand;
                        if (toolbarItem.hasCommand) {
                            await this.ntb.commands.addItemCommand(toolbarItem, (commandName) => {
                                // open notice with a CTA to change hotkeys
                                const message = 
                                    t('setting.use-item-command.notice-command-added', { command: commandName, interpolation: { escapeValue: false } }) +
                                    (Platform.isPhone ? '' : '\n' + t('setting.use-item-command.notice-command-added-hotkeys', { cta: Platform.isDesktop ? t('notice.cta-click') : t('notice.cta-tap') }));
                                const notice = new Notice(message, 10000);
                                notice.containerEl.addClass('mod-success');
                                const noticeEl = notice.messageEl;
                                noticeEl.addClass('note-toolbar-notice-pointer');
                                this.ntb.registerDomEvent(noticeEl, 'click', async () => {
                                    notice.hide();
                                    this.parent.close();
                                    await this.ntb.commands.openSettings('hotkeys');
                                });
                                this.parent.display();
                            });
                        }
                        else {
                            await this.ntb.commands.removeItemCommand(toolbarItem);
                            this.parent.display();
                        }
                    });
            });
        }

        menu.addItem((menuItem: MenuItem) => {
            menuItem
                .setTitle(t('setting.item.menu-copy-id'))
                .setIcon('code')
                .onClick(async (menuEvent) => {
                    navigator.clipboard.writeText(toolbarItem.uuid);
                    new Notice(t('setting.item.menu-copy-id-notice')).containerEl.addClass('mod-success');
                });
        });

        if (Platform.isPhone) {

            menu.addSeparator();

            menu.addItem((menuItem: MenuItem) => {
                menuItem
                    .setTitle(t('setting.button-delete-tooltip'))
                    .setIcon('minus-circle')
                    .onClick(async (menuEvent) => this.handleItemDelete(toolbarItem))
                    .setWarning(true);
            });
    
        }

        return menu;

    }

    async handleItemDelete(toolbarItem: ToolbarItemSettings) {
        if (this.parent instanceof ToolbarSettingsModal) {
            this.parent.listMoveHandlerById(null, this.toolbar.items, toolbarItem.uuid, 'delete');                            
        }
        else {
            this.ntb.settingsManager.deleteToolbarItemById(toolbarItem.uuid);
            this.toolbar.updated = new Date().toISOString();
            await this.ntb.settingsManager.save();
            this.parent.close();
        }
    }

    async handleItemDuplicate(toolbarItem: ToolbarItemSettings) {
        const index = this.toolbar.items.indexOf(toolbarItem);
        const itemIndex = index >= 0 ? index + 1 : undefined;
        const newItem = await this.ntb.settingsManager.duplicateToolbarItem(this.toolbar, toolbarItem, itemIndex);
        await this.ntb.settingsManager.save();
        if (this.parent instanceof ItemModal) {
            let newItemModal = new ItemModal(this.ntb, this.toolbar, newItem);
            this.parent.close();
            newItemModal.open();
        }
        else {
            this.parent.display(newItem.uuid);
        }
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
					await this.ntb.settingsManager.save();
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
					await this.ntb.settingsManager.save();
					let [state, tooltip] = this.getPlatformStateLabel(platform, platformLabel);
					this.updateItemVisButton(button, state, tooltip);
				});
		});

		return menu;

	}

    getLinkSetting(
        type: ItemType, 
        fieldDiv: HTMLDivElement, 
        toolbarItem: ToolbarItemSettings,
        helpTextFr: DocumentFragment)
    {

        switch(type) {
            case ItemType.Command: {
                const commandSetting = new Setting(fieldDiv)
                    .setClass("note-toolbar-setting-item-field-link")
                    .addSearch((cb) => {
                        new CommandSuggester(this.ntb.app, cb.inputEl, async (command) => {
                            await updateItemComponentStatus(this.ntb, this.parent, command.id, SettingType.Command, cb.inputEl.parentElement);
                            cb.inputEl.value = command.name;
                            toolbarItem.link = command.name;
                            toolbarItem.linkAttr.commandId = command.id;
                            toolbarItem.linkAttr.type = type;
                            await this.ntb.settingsManager.save();
                            this.renderPreview(toolbarItem);
                        });
                        cb.setPlaceholder(t('setting.item.option-command-placeholder'))
                            .setValue(this.ntb.utils.getCommandNameById(toolbarItem.linkAttr.commandId) || '')
                            .onChange(debounce(async (commandName) => {
                                const commandId = commandName ? this.ntb.utils.getCommandIdByName(commandName) : '';
                                const isValid = await updateItemComponentStatus(this.ntb, this.parent, commandId, SettingType.Command, cb.inputEl.parentElement);
                                toolbarItem.link = isValid && commandName ? commandName : '';
                                toolbarItem.linkAttr.commandId = isValid && commandId ? commandId : '';
                                toolbarItem.linkAttr.type = type;
                                await this.ntb.settingsManager.save();
                                this.renderPreview(toolbarItem);
                            }, 500));
                        updateItemComponentStatus(this.ntb, this.parent, toolbarItem.linkAttr.commandId, SettingType.Command, cb.inputEl.parentElement);
                    });	

                const commandAdvancedEl = fieldDiv.createDiv();
                commandAdvancedEl.addClass('note-toolbar-setting-item-link-advanced');
                this.getCommandSubfields(toolbarItem, commandAdvancedEl);

                commandSetting.controlEl.addClass('note-toolbar-setting-item-control-advanced');
                commandSetting.addExtraButton((button) => {
                    button
                        .setIcon('gear')
                        .setTooltip(t('setting.item.button-advanced-tooltip'))
                        .onClick(() => {
                            commandAdvancedEl.toggleAttribute('data-active');
                        });
                    button.extraSettingsEl.tabIndex = 0;
                    handleKeyClick(this.ntb, button.extraSettingsEl);     
                });

                setFieldHelp(commandSetting.settingEl, helpTextFr);
                break;
            }
            case ItemType.Dataview:
            case ItemType.JavaScript:
            case ItemType.JsEngine:
            case ItemType.Templater: {
                if (this.ntb.settings.scriptingEnabled) {
                    let adapter = this.ntb.adapters.getAdapterForItemType(type);
                    if (adapter) {
                        const functionOptions = {
                            '': t('adapter.option-function-default'),
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
                                        await this.ntb.settingsManager.save();
                                        if (adapter) {
                                            let subfieldsDiv = createDiv();
                                            subfieldsDiv.addClass('note-toolbar-setting-item-link-subfield');
                                            this.getScriptSubfields(adapter, toolbarItem, subfieldsDiv);
                                            fieldDiv.append(subfieldsDiv);
                                            const selectedFunction = adapter.getFunctions().get(value);
                                            if (selectedFunction?.description) {
                                                setFieldHelp(scriptSetting.controlEl, selectedFunction.description);
                                            }
                                        }
                                        this.renderPreview(toolbarItem); // to make sure error state is refreshed
                                    });
                                });
                        setFieldHelp(scriptSetting.controlEl, helpTextFr);
                        toolbarItem.scriptConfig ??= { pluginFunction: '' };
                        const subfieldsDiv = fieldDiv.createDiv();
                        subfieldsDiv.addClass('note-toolbar-setting-item-link-subfield');
                        this.getScriptSubfields(adapter, toolbarItem, subfieldsDiv);
                    }
                    else {
                        fieldDiv.removeClass('note-toolbar-setting-item-link-field');
                        fieldDiv.addClass('note-toolbar-setting-plugin-error');
                        fieldDiv.setText(t('adapter.error.plugin-disabled'));
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
                    fieldDiv.setText(t('adapter.error.scripting-disabled'));
                }
                break;
            }
            case ItemType.File: {
                const fileSetting = new Setting(fieldDiv)
                    .setClass("note-toolbar-setting-item-field-link")
                    .addSearch((cb) => {
                        new FileSuggester(this.ntb, cb.inputEl);
                        cb.setPlaceholder(t('setting.item.option-file-placeholder'))
                            .setValue(toolbarItem.link)
                            .onChange(debounce(async (value) => {
                                let isValid = await updateItemComponentStatus(this.ntb, this.parent, value, SettingType.File, cb.inputEl.parentElement);
                                toolbarItem.link = isValid ? normalizePath(value) : '';
                                toolbarItem.linkAttr.commandId = '';
                                toolbarItem.linkAttr.type = type;
                                await this.ntb.settingsManager.save();
                                this.renderPreview(toolbarItem);
                            }, 500));
                        updateItemComponentStatus(this.ntb, this.parent, toolbarItem.link, SettingType.File, cb.inputEl.parentElement);
                    });
                const fileAdvancedEl = fieldDiv.createDiv();
                fileAdvancedEl.addClass('note-toolbar-setting-item-link-advanced');
                this.getFileSubfields(toolbarItem, fileAdvancedEl);

                fileSetting.controlEl.addClass('note-toolbar-setting-item-control-advanced');
                fileSetting.addExtraButton((button) => {
                    button
                        .setIcon('gear')
                        .setTooltip(t('setting.item.button-advanced-tooltip'))
                        .onClick(() => {
                            fileAdvancedEl.toggleAttribute('data-active');
                        });
                    button.extraSettingsEl.tabIndex = 0;
                    handleKeyClick(this.ntb, button.extraSettingsEl);      
                });

                setFieldHelp(fileSetting.settingEl, helpTextFr);
                break;
            }
            case ItemType.Group: {
                const initialGroupToolbar = this.ntb.settingsManager.getToolbar(toolbarItem.link);
                const groupSetting = new Setting(fieldDiv)
                    .setClass("note-toolbar-setting-item-field-link")
                    .addSearch((cb) => {
                        new ToolbarSuggester(this.ntb, cb.inputEl);
                        cb.setPlaceholder(t('setting.item.option-item-group-placeholder'))
                            .setValue(initialGroupToolbar ? initialGroupToolbar.name : '')
                            .onChange(debounce(async (name) => {
                                let isValid = await updateItemComponentStatus(this.ntb, this.parent, name, SettingType.Toolbar, cb.inputEl.parentElement);
                                let groupToolbar = isValid ? this.ntb.settingsManager.getToolbarByName(name) : undefined;
                                toolbarItem.link = groupToolbar ? groupToolbar.uuid : '';
                                toolbarItem.linkAttr.commandId = '';
                                toolbarItem.linkAttr.type = type;
                                await this.ntb.settingsManager.save();
                                this.renderPreview(toolbarItem);
                                // update help text with toolbar preview or default if none selected
                                let groupPreviewFr = groupToolbar 
                                    ? createToolbarPreviewFr(this.ntb, groupToolbar, undefined, true) 
                                    : learnMoreFr(t('setting.item.option-item-group-help'), 'Creating-toolbar-items');
                                setFieldHelp(groupSetting.controlEl, groupPreviewFr);
                            }, 500));
                        updateItemComponentStatus(this.ntb, this.parent, toolbarItem.link, SettingType.Toolbar, cb.inputEl.parentElement);
                    });
                setFieldHelp(groupSetting.controlEl, helpTextFr);
                break;
            }
            case ItemType.Menu: {
                const initialMenuToolbar = this.ntb.settingsManager.getToolbar(toolbarItem.link);
                const menuSetting = new Setting(fieldDiv)
                    .setClass("note-toolbar-setting-item-field-link")
                    .addSearch((cb) => {
                        new ToolbarSuggester(this.ntb, cb.inputEl);
                        cb.setPlaceholder(t('setting.item.option-item-menu-placeholder'))
                            .setValue(initialMenuToolbar ? initialMenuToolbar.name : '')
                            .onChange(debounce(async (name) => {
                                let isValid = await updateItemComponentStatus(this.ntb, this.parent, name, SettingType.Toolbar, cb.inputEl.parentElement);
                                // TODO? return an ID from the suggester vs. the name
                                let menuToolbar = isValid ? this.ntb.settingsManager.getToolbarByName(name) : undefined;
                                toolbarItem.link = menuToolbar ? menuToolbar.uuid : '';
                                toolbarItem.linkAttr.commandId = '';
                                toolbarItem.linkAttr.type = type;
                                await this.ntb.settingsManager.save();
                                this.renderPreview(toolbarItem);
                                // update help text with toolbar preview or default if none selected
                                let menuHelpFr = menuToolbar 
                                    ? createToolbarPreviewFr(this.ntb, menuToolbar, undefined, true)
                                    : learnMoreFr(t('setting.item.option-item-menu-help'), 'Creating-toolbar-items');
                                // add disclaimers
                                const isNativeMenusEnabled: boolean = !!this.ntb.app.vault.getConfig('nativeMenus');
                                if (isNativeMenusEnabled) {
                                    menuHelpFr.append(
                                        document.createElement('br'),
                                        getDisclaimersFr(SETTINGS_DISCLAIMERS, ['nativeMenus']));
                                }
                                setFieldHelp(menuSetting.controlEl, menuHelpFr);
                            }, 500));
                        updateItemComponentStatus(this.ntb, this.parent, toolbarItem.link, SettingType.Toolbar, cb.inputEl.parentElement);
                    });
                setFieldHelp(menuSetting.controlEl, helpTextFr);
                break;
            }
            case ItemType.Uri: {
                const uriSetting = new Setting(fieldDiv)
                    .setClass("note-toolbar-setting-item-field-link")
                    .addText(cb => {
                        cb.setPlaceholder(t('setting.item.option-uri-placehoder'))
                            .setValue(toolbarItem.link)
                            .onChange(
                                debounce(async (value) => {
                                    updateItemComponentStatus(this.ntb, this.parent, value, SettingType.Text, cb.inputEl.parentElement);
                                    toolbarItem.link = value;
                                    toolbarItem.linkAttr.commandId = '';
                                    toolbarItem.linkAttr.type = type;
                                    this.toolbar.updated = new Date().toISOString();
                                    await this.ntb.settingsManager.save();
                                    this.renderPreview(toolbarItem);
                                }, 500));
                        updateItemComponentStatus(this.ntb, this.parent, toolbarItem.link, SettingType.Text, cb.inputEl.parentElement);
                    });
                // unable to put help about vars below the field without restructuring; leaving out for now
                // setFieldHelp(uriSetting.controlEl, helpTextFr);
                const uriAdvancedEl = fieldDiv.createDiv();
                uriAdvancedEl.addClass('note-toolbar-setting-item-link-advanced');
                this.getUriSubfields(toolbarItem, uriAdvancedEl);

                uriSetting.controlEl.addClass('note-toolbar-setting-item-control-advanced');
                uriSetting.addExtraButton((button) => {
                    button
                        .setIcon('gear')
                        .setTooltip(t('setting.item.button-advanced-tooltip'))
                        .onClick(() => {
                            uriAdvancedEl.toggleAttribute('data-active');
                        });
                    button.extraSettingsEl.tabIndex = 0;
                    handleKeyClick(this.ntb, button.extraSettingsEl);
                });
                setFieldHelp(uriSetting.settingEl, helpTextFr);
                break;
            }
        }

    }

    getCommandSubfields(item: ToolbarItemSettings, fieldDiv: HTMLDivElement) {

        const subSettings = new SettingGroup(fieldDiv);

        // hide if not available
        subSettings.addSetting((commandCheckSetting) => {
            commandCheckSetting
                .setName(t('setting.item.option-command-check'))
                .setDesc(t('setting.item.option-command-check-description'))
                .addToggle((toggle) => {
                    toggle
                        .setValue(item.linkAttr.commandCheck)
                        .onChange(async (value: boolean) => {
                            item.linkAttr.commandCheck = value;
                            await this.ntb.settingsManager.save();
                        });
                });       
        });

        // focus
        subSettings.addSetting((focusSetting) => {
            focusSetting
                .setName(t('setting.item.option-command-focus'))
                .setDesc(t('setting.item.option-command-focus-description'))
                .addToggle((toggle) => {
                    toggle
                        .setValue(item.linkAttr.focus === 'editor')
                        .onChange(async (value: boolean) => {
                            item.linkAttr.focus = value ? 'editor' : undefined;
                            await this.ntb.settingsManager.save();
                        });
                });
        });

        // target
        subSettings.addSetting((targetSetting) => {
            const targetsToExclude = new Set(['window', 'modal']);
            const targetOptions = Object.fromEntries(Object.entries(TARGET_OPTIONS).filter(([key]) => !targetsToExclude.has(key)));
            targetSetting            
                .setName(t('setting.item.option-command-target'))
                .setDesc(t('setting.item.option-command-target-description'))
                .addDropdown((dropdown) =>
                    dropdown
                        .addOptions(targetOptions)
                        .setValue(item.linkAttr.target || 'default')
                        .onChange(async (value) => {
                            if (value === 'default') item.linkAttr.target = undefined
                            else item.linkAttr.target = value as PaneType;
                            this.toolbar.updated = new Date().toISOString();
                            await this.ntb.settingsManager.save();
                        })
                    );
        });

    }

    getFileSubfields(item: ToolbarItemSettings, fieldDiv: HTMLDivElement) {

        const subSettings = new SettingGroup(fieldDiv);

        subSettings.addSetting((targetSetting) => {
            targetSetting
                .setName(t('setting.item.option-file-target'))
                .setDesc(t('setting.item.option-file-target-description'))
                .addDropdown((dropdown) =>
                    dropdown
                        .addOptions(TARGET_OPTIONS)
                        .setValue(item.linkAttr.target || 'default')
                        .onChange(async (value) => {
                            if (value === 'default') item.linkAttr.target = undefined
                            else item.linkAttr.target = value as PaneType | 'modal';
                            
                            this.toolbar.updated = new Date().toISOString();
                            await this.ntb.settingsManager.save();
                        })
                    );
        });

    }

    getScriptSubfields(
        adapter: Adapter,
        toolbarItem: ToolbarItemSettings,
        fieldDiv: HTMLDivElement)
    {
        if (toolbarItem.scriptConfig) {
            let outputContainerSettingEl: HTMLElement | undefined = undefined;
            const config = toolbarItem.scriptConfig;
            const selectedFunction = adapter.getFunctions().get(toolbarItem.scriptConfig.pluginFunction);
            selectedFunction?.parameters.forEach(param => {
                let initialValue = config[param.parameter as keyof ScriptConfig];
                let setting: Setting | undefined;
                switch (param.type) {
                    case SettingType.Command:
                        setting = new Setting(fieldDiv)
                            .setClass("note-toolbar-setting-item-field-link")
                            .addSearch((cb) => {
                                new CommandSuggester(this.ntb.app, cb.inputEl, async (command) => {
                                    updateItemComponentStatus(this.ntb, this.parent, command.id, param.type, cb.inputEl.parentElement);
                                    config[param.parameter as keyof ScriptConfig] = command.id;
                                    cb.inputEl.value = command.name;
                                    await this.ntb.settingsManager.save();
                                });
                                cb.setPlaceholder(param.label)
                                    .setValue(initialValue ? (this.ntb.utils.getCommandNameById(initialValue) || '') : '')
                                    .onChange(debounce(async (commandName) => {
                                        const commandId = commandName ? this.ntb.utils.getCommandIdByName(commandName) : '';
                                        const isValid = await updateItemComponentStatus(this.ntb, this.parent, commandId, param.type, cb.inputEl.parentElement);
                                        config[param.parameter as keyof ScriptConfig] = isValid && commandId ? commandId : '';
                                        await this.ntb.settingsManager.save();
                                        this.renderPreview(toolbarItem); // to make sure error state is refreshed
                                    }, 500));
                                updateItemComponentStatus(this.ntb, this.parent, initialValue ? initialValue : '', param.type, cb.inputEl.parentElement);
                            });
                        break;
                    case SettingType.File:
                        setting = new Setting(fieldDiv)
                            .setClass("note-toolbar-setting-item-field-link")
                            .addSearch((cb) => {
                                let fileSuggesterFolder: string | undefined = undefined;
                                let fileSuggesterExt: string | undefined = '.js';
                                if (toolbarItem.linkAttr.type === ItemType.Templater) {
                                    fileSuggesterFolder = this.ntb.adapters.tp?.getSetting('templates_folder');
                                    fileSuggesterExt = undefined;
                                }
                                new FileSuggester(this.ntb, cb.inputEl, true, fileSuggesterExt, fileSuggesterFolder);
                                cb.setPlaceholder(param.label)
                                    .setValue(initialValue ? initialValue : '')
                                    .onChange(debounce(async (value) => {
                                        let isValid = await updateItemComponentStatus(this.ntb, this.parent, value, param.type, cb.inputEl.parentElement);
                                        config[param.parameter as keyof ScriptConfig] = isValid ? normalizePath(value) : '';
                                        this.toolbar.updated = new Date().toISOString();
                                        await this.ntb.settingsManager.save();
                                        this.renderPreview(toolbarItem); // to make sure error state is refreshed
                                    }, 500));
                                updateItemComponentStatus(this.ntb, this.parent, initialValue ? initialValue : '', param.type, cb.inputEl.parentElement);
                            });
                        break;
                    case SettingType.Text: {
                        setting = new Setting(fieldDiv)
                           .setClass("note-toolbar-setting-item-field-link")
                            .addText(cb => {
                                cb.setPlaceholder(param.label)
                                    .setValue(initialValue ? initialValue : '')
                                    .onChange(
                                        debounce(async (value: string) => {
                                            let isValid = await updateItemComponentStatus(this.ntb, this.parent, value, param.type, cb.inputEl.parentElement);
                                            config[param.parameter as keyof ScriptConfig] = isValid ? value : '';
                                            this.toolbar.updated = new Date().toISOString();
                                            await this.ntb.settingsManager.save();
                                            this.renderPreview(toolbarItem); // to make sure error state is refreshed
                                        }, 500));
                                updateItemComponentStatus(this.ntb, this.parent, initialValue ? initialValue : '', param.type, cb.inputEl.parentElement);
                            });
                        // outputContainer setting is shown in Advanced settings section below
                        if (param.parameter === 'outputContainer') {
                            outputContainerSettingEl = setting.settingEl;
                        }
                        // fieldHelp ? textSetting.controlEl.insertAdjacentElement('beforeend', fieldHelp) : undefined;
                        break;
                    }
                    case SettingType.Args:
                    case SettingType.TextArea:
                        setting = new Setting(fieldDiv)
                            .setClass("note-toolbar-setting-item-field-link")
                            .addTextArea(cb => {
                                cb.setPlaceholder(param.label)
                                    .setValue(initialValue ? initialValue : '')
                                    .onChange(
                                        debounce(async (value: string) => {
                                            let isValid = await updateItemComponentStatus(this.ntb, this.parent, value, param.type, cb.inputEl.parentElement);
                                            config[param.parameter as keyof ScriptConfig] = isValid ? value : '';
                                            this.toolbar.updated = new Date().toISOString();
                                            await this.ntb.settingsManager.save();
                                            this.renderPreview(toolbarItem); // to make sure error state is refreshed
                                        }, 500));
                                updateItemComponentStatus(this.ntb, this.parent, initialValue ? initialValue : '', param.type, cb.inputEl.parentElement);					
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

            this.getScriptAdvancedSubfields(toolbarItem, fieldDiv, outputContainerSettingEl);
        }
    }

    getScriptAdvancedSubfields(toolbarItem: ToolbarItemSettings, fieldDiv: HTMLDivElement, outputContainerSettingEl?: HTMLDivElement) {

        const advancedDivEl = fieldDiv.createDiv();
        advancedDivEl.addClass('note-toolbar-setting-subfield-advanced-container');

        const advancedSetting = new Setting(advancedDivEl)
            .setName(t('adapter.option-advanced'))
            .setClass("note-toolbar-setting-item-field-link")
            .addExtraButton((button) => {
                button
                .setIcon('gear')
                .setTooltip(t('adapter.option-advanced-tooltip'))
                .onClick(() => {
                    advancedSettingsDiv.toggleAttribute('data-active');
                });
                button.extraSettingsEl.tabIndex = 0;
                handleKeyClick(this.ntb, button.extraSettingsEl);     
            });
        advancedSetting.settingEl.addClass('note-toolbar-setting-subfield-advanced');
        this.ntb.registerDomEvent(advancedSetting.infoEl, 'click', (event) => {
            advancedSettingsDiv.toggleAttribute('data-active');
        });

        const advancedSettingsDiv = advancedDivEl.createDiv();
        advancedSettingsDiv.addClass('note-toolbar-setting-item-link-advanced');

        const subSettings = new SettingGroup(advancedSettingsDiv);

        // show output container setting here instead
        if (outputContainerSettingEl !== undefined) {
            const settingItemsEl = advancedSettingsDiv.querySelector('.setting-group .setting-items');
            if (settingItemsEl) {
                settingItemsEl.append(outputContainerSettingEl);
            }
        }

        subSettings.addSetting((focusSetting) => {
            focusSetting
                .setName(t('setting.item.option-script-focus'))
                .setDesc(t('setting.item.option-script-focus-description'))
                .addToggle((toggle) => {
                    toggle
                        .setValue(!toolbarItem.linkAttr.focus || toolbarItem.linkAttr.focus === 'editor')
                        .onChange(async (value: boolean) => {
                            value ? toolbarItem.linkAttr.focus = 'editor' : toolbarItem.linkAttr.focus = 'none';
                            this.toolbar.updated = new Date().toISOString();
                            await this.ntb.settingsManager.save();
                        });
                });
        });

    }

    getUriSubfields(item: ToolbarItemSettings, fieldDiv: HTMLDivElement) {

        const subSettings = new SettingGroup(fieldDiv);

        subSettings.addSetting((uriTargetSetting) => {
            uriTargetSetting
                .setName(t('setting.item.option-uri-target'))
                .setDesc(this.getUriTargetDescription(item.linkAttr.target || 'default'))
                .addDropdown((dropdown) =>
                    dropdown
                        .addOptions(TARGET_OPTIONS)
                        .setValue(item.linkAttr.target || 'default')
                        .onChange(async (value) => {
                            if (value === 'default') item.linkAttr.target = undefined
                            else item.linkAttr.target = value as PaneType | 'modal';
                            uriTargetSetting.setDesc(this.getUriTargetDescription(item.linkAttr.target || 'default'));
                            this.toolbar.updated = new Date().toISOString();
                            await this.ntb.settingsManager.save();
                        })
                    );
        });

    }

    getUriTargetDescription(target: PaneType | 'default' | 'modal'): DocumentFragment {
        const descFr = document.createDocumentFragment();
        descFr.append(t('setting.item.option-uri-target-description'));
        if (Platform.isPhone && ['split', 'window'].includes(target)) descFr.append(descFr.createEl('br'), '* ', t('setting.item.option-uri-target-disclaimer-device'));
        if (Platform.isTablet && target === 'window') descFr.append(descFr.createEl('br'), '* ', t('setting.item.option-uri-target-disclaimer-device'));
        if (target !== 'default') descFr.append(descFr.createEl('br'), '* ', t('setting.item.option-uri-target-disclaimer-non-default'));
        return descFr;
    }

    getLinkSettingForType(
        type: ItemType, 
        fieldDiv: HTMLDivElement, 
        toolbarItem: ToolbarItemSettings
    ) {
        switch (type) {
            case ItemType.Command:
                this.getLinkSetting(type, fieldDiv, toolbarItem, learnMoreFr(t('setting.item.option-command-help'), 'Command-items'));
                break;
            case ItemType.Dataview:
                this.getLinkSetting(type, fieldDiv, toolbarItem, learnMoreFr(t('setting.item.option-dataview-help'), 'Dataview'));
                break;
            case ItemType.File:
                this.getLinkSetting(type, fieldDiv, toolbarItem, learnMoreFr(t('setting.item.option-file-help'), 'File-items'));
                break;
            case ItemType.JavaScript:
                this.getLinkSetting(type, fieldDiv, toolbarItem, learnMoreFr(t('setting.item.option-javascript-help'), 'JavaScript'));
                break;
            case ItemType.JsEngine:
                this.getLinkSetting(type, fieldDiv, toolbarItem, learnMoreFr(t('setting.item.option-js-engine-help'), 'JS-Engine'));
                break;
            case ItemType.Group:
            case ItemType.Menu: {
                const menuGroupToolbar = this.ntb.settingsManager.getToolbar(toolbarItem.link);
                const fieldHelp = document.createDocumentFragment();
                menuGroupToolbar
                    ? fieldHelp.append(createToolbarPreviewFr(this.ntb, menuGroupToolbar, undefined, true))
                    : fieldHelp.append(
                        learnMoreFr(
                            type === ItemType.Group ? t('setting.item.option-item-group-help') : t('setting.item.option-item-menu-help'),
                            type === ItemType.Group ? 'Item-Groups': 'Item-Menus')
                    );
                this.getLinkSetting(type, fieldDiv, toolbarItem, fieldHelp);
                break;
            }
            case ItemType.Templater:
                this.getLinkSetting(type, fieldDiv, toolbarItem, learnMoreFr(t('setting.item.option-templater-help'), 'Templater'));
                break;
            case ItemType.Uri:
                this.getLinkSetting(type, fieldDiv, toolbarItem, learnMoreFr(t('setting.item.option-uri-help'), 'URI-items'));
                break;
        }
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

    renderPreview(toolbarItem: ToolbarItemSettings) {
        if (this.parent instanceof ToolbarSettingsModal) this.parent.renderPreview(toolbarItem);
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

}