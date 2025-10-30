import NoteToolbarPlugin from "main";
import { COMMAND_DOES_NOT_EXIST, ComponentType, ItemType, LINK_OPTIONS, ScriptConfig, SETTINGS_DISCLAIMERS, SettingType, t, TARGET_OPTIONS, ToolbarItemSettings, ToolbarSettings } from "Settings/NoteToolbarSettings";
import ToolbarSettingsModal, { SettingsAttr } from "./Modals/ToolbarSettingsModal";
import { Setting, debounce, ButtonComponent, setIcon, TFile, TFolder, Menu, MenuItem, normalizePath, DropdownComponent, Platform, Notice, PaneType } from "obsidian";
import { removeComponentVisibility, addComponentVisibility, getElementPosition, importArgs, getCommandIdByName, getCommandNameById } from "Utils/Utils";
import { IconSuggestModal } from "./Modals/IconSuggestModal";
import { copyToolbarItem, createToolbarPreviewFr, getDisclaimersFr, handleKeyClick, learnMoreFr, pluginLinkFr, removeFieldError, setFieldError, setFieldHelp, updateItemIcon } from "./Utils/SettingsUIUtils";
import { FileSuggester } from "./Suggesters/FileSuggester";
import { CommandSuggester } from "./Suggesters/CommandSuggester";
import { ToolbarSuggester } from "./Suggesters/ToolbarSuggester";
import { Adapter } from "Adapters/Adapter";
import ItemModal from "./Modals/ItemModal";

export default class ToolbarItemUi {

    public plugin: NoteToolbarPlugin;
    public toolbar: ToolbarSettings;
    private parent: ToolbarSettingsModal | ItemModal;

    constructor(plugin: NoteToolbarPlugin, parent: ToolbarSettingsModal | ItemModal, toolbar: ToolbarSettings) {
        this.parent = parent;
        this.plugin = plugin;
        this.toolbar = toolbar;
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
                            let itemRow = this.parent.getItemRowEl(toolbarItem.uuid);
                            const modal = new IconSuggestModal(this.plugin, toolbarItem.icon, true, async (icon) => {
                                toolbarItem.icon = (icon === t('setting.icon-suggester.option-no-icon') ? "" : icon);
                                this.plugin.settingsManager.save();
                                updateItemIcon(this.parent, itemRow, icon);
                                if (toolbarItem.hasCommand) await this.plugin.commands.updateItemCommand(toolbarItem, false);
                            });
                            modal.open();
                        });
                    cb.extraSettingsEl.setAttribute("data-note-toolbar-no-icon", !toolbarItem.icon ? "true" : "false");
                    cb.extraSettingsEl.setAttribute("tabindex", "0");
                    this.plugin.registerDomEvent(
                        cb.extraSettingsEl, 'keydown', (e) => {
                            switch (e.key) {
                                case "Enter":
                                case " ": {
                                    const modifierPressed = (Platform.isWin || Platform.isLinux) ? e?.ctrlKey : e?.metaKey;
                                    if (!modifierPressed) {
                                        e.preventDefault();
                                        let itemRow = this.parent.getItemRowEl(toolbarItem.uuid);
                                        const modal = new IconSuggestModal(this.plugin, toolbarItem.icon, true, (icon) => {
                                            toolbarItem.icon = (icon === t('setting.icon-suggester.option-no-icon') ? "" : icon);
                                            this.plugin.settingsManager.save();
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
                            let isValid = this.updateItemComponentStatus(value, SettingType.Text, text.inputEl.parentElement);
                            toolbarItem.label = value;
                            // TODO: if the label contains vars, set the flag to always rerender this toolbar
                            // however, if vars are removed, make sure there aren't any other label vars, and only then unset the flag
                            this.toolbar.updated = new Date().toISOString();
                            await this.plugin.settingsManager.save();
                            if (toolbarItem.hasCommand) await this.plugin.commands.updateItemCommand(toolbarItem);
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
                            if (toolbarItem.hasCommand) await this.plugin.commands.updateItemCommand(toolbarItem);
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
                                await this.plugin.settingsManager.save();
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
            separatorTitle.setText(type.charAt(0).toUpperCase() + type.slice(1));
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
            });

        if (this.parent instanceof ToolbarSettingsModal) {
            visButtons.addExtraButton((cb) => {
                cb.setIcon('grip-horizontal')
                    .setTooltip(t('setting.button-drag-tooltip'))
                    .extraSettingsEl.addClass('sortable-handle');
                cb.extraSettingsEl.setAttribute(SettingsAttr.ItemUuid, toolbarItem.uuid);
                cb.extraSettingsEl.tabIndex = 0;
                this.plugin.registerDomEvent(
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
                    await copyToolbarItem(this.plugin, this.toolbar, toolbarItem);
                });
        });

        menu.addSeparator();

        if (![ItemType.Break, ItemType.Group, ItemType.Menu, ItemType.Separator].contains(toolbarItem.linkAttr.type)) {

            // copy item command URI
            if (toolbarItem.hasCommand) {
                const itemCommand = this.plugin.commands.getCommandFor(toolbarItem);
                if (itemCommand) {
                    menu.addItem((menuItem: MenuItem) => {
                        menuItem
                            .setTitle(t('setting.use-item-command.name-copy'))
                            .setIcon('copy')
                            .onClick(async (menuEvent) => {
                                const commandText = `obsidian://note-toolbar?command=${itemCommand.id}`;
                                navigator.clipboard.writeText(commandText);
                                new Notice(t('command.copy-command-notice'));
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
                            await this.plugin.commands.addItemCommand(toolbarItem, (commandName) => {
                                // open notice with a CTA to change hotkeys
                                const message = 
                                    t('setting.use-item-command.notice-command-added', { command: commandName, interpolation: { escapeValue: false } }) +
                                    (Platform.isPhone ? '' : '\n' + t('setting.use-item-command.notice-command-added-hotkeys', { cta: Platform.isDesktop ? t('notice.cta-click') : t('notice.cta-tap') }));
                                const notice = new Notice(message, 10000);
                                const noticeEl = notice.messageEl;
                                noticeEl.addClass('note-toolbar-notice-with-cta');
                                this.plugin.registerDomEvent(noticeEl, 'click', async () => {
                                    notice.hide();
                                    this.parent.close();
                                    await this.plugin.commands.openSettings('hotkeys');
                                });
                                this.parent.display();
                            });
                        }
                        else {
                            await this.plugin.commands.removeItemCommand(toolbarItem);
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
                    new Notice(t('setting.item.menu-copy-id-notice'));
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
            this.plugin.settingsManager.deleteToolbarItemById(toolbarItem.uuid);
            this.toolbar.updated = new Date().toISOString();
            await this.plugin.settingsManager.save();
            this.parent.close();
        }
    }

    async handleItemDuplicate(toolbarItem: ToolbarItemSettings) {
        const index = this.toolbar.items.indexOf(toolbarItem);
        const itemIndex = index >= 0 ? index + 1 : undefined;
        const newItem = await this.plugin.settingsManager.duplicateToolbarItem(this.toolbar, toolbarItem, itemIndex);
        await this.plugin.settingsManager.save();
        if (this.parent instanceof ItemModal) {
            let newItemModal = new ItemModal(this.plugin, this.toolbar, newItem);
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
                        new CommandSuggester(this.plugin.app, cb.inputEl, async (command) => {
                            await this.updateItemComponentStatus(command.id, SettingType.Command, cb.inputEl.parentElement);
                            cb.inputEl.value = command.name;
                            toolbarItem.link = command.name;
                            toolbarItem.linkAttr.commandId = command.id;
                            toolbarItem.linkAttr.type = type;
                            await this.plugin.settingsManager.save();
                            this.renderPreview(toolbarItem);
                        });
                        cb.setPlaceholder(t('setting.item.option-command-placeholder'))
                            .setValue(getCommandNameById(this.plugin, toolbarItem.linkAttr.commandId) || '')
                            .onChange(debounce(async (commandName) => {
                                const commandId = commandName ? getCommandIdByName(this.plugin, commandName) : '';
                                const isValid = await this.updateItemComponentStatus(commandId, SettingType.Command, cb.inputEl.parentElement);
                                toolbarItem.link = isValid && commandName ? commandName : '';
                                toolbarItem.linkAttr.commandId = isValid && commandId ? commandId : '';
                                toolbarItem.linkAttr.type = type;
                                await this.plugin.settingsManager.save();
                                this.renderPreview(toolbarItem);
                            }, 500));
                        this.updateItemComponentStatus(toolbarItem.linkAttr.commandId, SettingType.Command, cb.inputEl.parentElement);
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
                    handleKeyClick(this.plugin, button.extraSettingsEl);     
                });

                setFieldHelp(commandSetting.settingEl, helpTextFr);
                break;
            }
            case ItemType.Dataview:
            case ItemType.JavaScript:
            case ItemType.JsEngine:
            case ItemType.Templater: {
                if (this.plugin.settings.scriptingEnabled) {
                    let adapter = this.plugin.getAdapterForItemType(type);
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
                                        await this.plugin.settingsManager.save();
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
                        new FileSuggester(this.plugin, cb.inputEl);
                        cb.setPlaceholder(t('setting.item.option-file-placeholder'))
                            .setValue(toolbarItem.link)
                            .onChange(debounce(async (value) => {
                                let isValid = await this.updateItemComponentStatus(value, SettingType.File, cb.inputEl.parentElement);
                                toolbarItem.link = isValid ? normalizePath(value) : '';
                                toolbarItem.linkAttr.commandId = '';
                                toolbarItem.linkAttr.type = type;
                                await this.plugin.settingsManager.save();
                                this.renderPreview(toolbarItem);
                            }, 500));
                        this.updateItemComponentStatus(toolbarItem.link, SettingType.File, cb.inputEl.parentElement);
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
                    handleKeyClick(this.plugin, button.extraSettingsEl);      
                });

                setFieldHelp(fileSetting.settingEl, helpTextFr);
                break;
            }
            case ItemType.Group: {
                const initialGroupToolbar = this.plugin.settingsManager.getToolbar(toolbarItem.link);
                const groupSetting = new Setting(fieldDiv)
                    .setClass("note-toolbar-setting-item-field-link")
                    .addSearch((cb) => {
                        new ToolbarSuggester(this.plugin.app, this.plugin, cb.inputEl);
                        cb.setPlaceholder(t('setting.item.option-item-group-placeholder'))
                            .setValue(initialGroupToolbar ? initialGroupToolbar.name : '')
                            .onChange(debounce(async (name) => {
                                let isValid = await this.updateItemComponentStatus(name, SettingType.Toolbar, cb.inputEl.parentElement);
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
                                setFieldHelp(groupSetting.controlEl, groupPreviewFr);
                            }, 500));
                        this.updateItemComponentStatus(toolbarItem.link, SettingType.Toolbar, cb.inputEl.parentElement);
                    });
                setFieldHelp(groupSetting.settingEl, helpTextFr);
                break;
            }
            case ItemType.Menu: {
                const initialMenuToolbar = this.plugin.settingsManager.getToolbar(toolbarItem.link);
                const menuSetting = new Setting(fieldDiv)
                    .setClass("note-toolbar-setting-item-field-link")
                    .addSearch((cb) => {
                        new ToolbarSuggester(this.plugin.app, this.plugin, cb.inputEl);
                        cb.setPlaceholder(t('setting.item.option-item-menu-placeholder'))
                            .setValue(initialMenuToolbar ? initialMenuToolbar.name : '')
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
                                let menuHelpFr = menuToolbar 
                                    ? createToolbarPreviewFr(this.plugin, menuToolbar, undefined, true)
                                    : learnMoreFr(t('setting.item.option-item-menu-help'), 'Creating-toolbar-items');
                                // add disclaimers
                                const isNativeMenusEnabled: boolean = !!this.plugin.app.vault.getConfig('nativeMenus');
                                if (isNativeMenusEnabled) {
                                    menuHelpFr.append(
                                        document.createElement('br'),
                                        getDisclaimersFr(SETTINGS_DISCLAIMERS, ['nativeMenus']));
                                }
                                setFieldHelp(menuSetting.controlEl, menuHelpFr);
                            }, 500));
                        this.updateItemComponentStatus(toolbarItem.link, SettingType.Toolbar, cb.inputEl.parentElement);
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
                    handleKeyClick(this.plugin, button.extraSettingsEl);
                });
                setFieldHelp(uriSetting.settingEl, helpTextFr);
                break;
            }
        }

    }

    getCommandSubfields(item: ToolbarItemSettings, fieldDiv: HTMLDivElement) {

        // hide if not available
         new Setting(fieldDiv)
            .setName(t('setting.item.option-command-check'))
            .setDesc(t('setting.item.option-command-check-description'))
            .addToggle((toggle) => {
                toggle
                    .setValue(item.linkAttr.commandCheck)
                    .onChange(async (value: boolean) => {
                        item.linkAttr.commandCheck = value;
                        await this.plugin.settingsManager.save();
                    });
            });       

        // focus
        new Setting(fieldDiv)
            .setName(t('setting.item.option-command-focus'))
            .setDesc(t('setting.item.option-command-focus-description'))
            .addToggle((toggle) => {
                toggle
                    .setValue(item.linkAttr.focus === 'editor')
                    .onChange(async (value: boolean) => {
                        item.linkAttr.focus = value ? 'editor' : undefined;
                        await this.plugin.settingsManager.save();
                    });
            });

        // target
        const targetsToExclude = new Set(['window', 'modal']);
        const targetOptions = Object.fromEntries(Object.entries(TARGET_OPTIONS).filter(([key]) => !targetsToExclude.has(key)));
        new Setting(fieldDiv)
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
                        await this.plugin.settingsManager.save();
                    })
                );
    }

    getFileSubfields(item: ToolbarItemSettings, fieldDiv: HTMLDivElement) {
        new Setting(fieldDiv)
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
                        await this.plugin.settingsManager.save();
                    })
                );
    }

    getScriptSubfields(
        adapter: Adapter,
        toolbarItem: ToolbarItemSettings,
        fieldDiv: HTMLDivElement)
    {
        if (toolbarItem.scriptConfig) {
            let outputContainerSettingEl: HTMLDivElement | undefined = undefined;
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
                                new CommandSuggester(this.plugin.app, cb.inputEl, async (command) => {
                                    this.updateItemComponentStatus(command.id, param.type, cb.inputEl.parentElement);
                                    config[param.parameter as keyof ScriptConfig] = command.id;
                                    cb.inputEl.value = command.name;
                                    await this.plugin.settingsManager.save();
                                });
                                cb.setPlaceholder(param.label)
                                    .setValue(initialValue ? (getCommandNameById(this.plugin, initialValue) || '') : '')
                                    .onChange(debounce(async (commandName) => {
                                        const commandId = commandName ? getCommandIdByName(this.plugin, commandName) : '';
                                        const isValid = await this.updateItemComponentStatus(commandId, param.type, cb.inputEl.parentElement);
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
                                new FileSuggester(this.plugin, cb.inputEl, true, fileSuggesterExt, fileSuggesterFolder);
                                cb.setPlaceholder(param.label)
                                    .setValue(initialValue ? initialValue : '')
                                    .onChange(debounce(async (value) => {
                                        let isValid = await this.updateItemComponentStatus(value, param.type, cb.inputEl.parentElement);
                                        config[param.parameter as keyof ScriptConfig] = isValid ? normalizePath(value) : '';
                                        this.toolbar.updated = new Date().toISOString();
                                        await this.plugin.settingsManager.save();
                                        this.renderPreview(toolbarItem); // to make sure error state is refreshed
                                    }, 500));
                                this.updateItemComponentStatus(initialValue ? initialValue : '', param.type, cb.inputEl.parentElement);
                            });
                        break;
                    case SettingType.Text: {
                        // outputContainer setting is shown in Advanced settings section below
                        const textFieldDiv = param.parameter === 'outputContainer'
                            ? (outputContainerSettingEl = createDiv())
                            : fieldDiv;
                        setting = new Setting(textFieldDiv)
                           .setClass("note-toolbar-setting-item-field-link")
                            .addText(cb => {
                                cb.setPlaceholder(param.label)
                                    .setValue(initialValue ? initialValue : '')
                                    .onChange(
                                        debounce(async (value: string) => {
                                            let isValid = await this.updateItemComponentStatus(value, param.type, cb.inputEl.parentElement);
                                            config[param.parameter as keyof ScriptConfig] = isValid ? value : '';
                                            this.toolbar.updated = new Date().toISOString();
                                            await this.plugin.settingsManager.save();
                                            this.renderPreview(toolbarItem); // to make sure error state is refreshed
                                        }, 500));
                                this.updateItemComponentStatus(initialValue ? initialValue : '', param.type, cb.inputEl.parentElement);
                            });
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
                                            let isValid = await this.updateItemComponentStatus(value, param.type, cb.inputEl.parentElement);
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
                handleKeyClick(this.plugin, button.extraSettingsEl);     
            });
        advancedSetting.settingEl.addClass('note-toolbar-setting-subfield-advanced');

        const advancedSettingsDiv = advancedDivEl.createDiv();
        advancedSettingsDiv.addClass('note-toolbar-setting-item-link-advanced');

        // show output container setting here instead
        if (outputContainerSettingEl !== undefined) advancedSettingsDiv.append(outputContainerSettingEl);

        const focusSetting = new Setting(advancedSettingsDiv)
            .setName(t('setting.item.option-script-focus'))
            .setDesc(t('setting.item.option-script-focus-description'))
            .addToggle((toggle) => {
                toggle
                    .setValue(!toolbarItem.linkAttr.focus || toolbarItem.linkAttr.focus === 'editor')
                    .onChange(async (value: boolean) => {
                        value ? toolbarItem.linkAttr.focus = 'editor' : toolbarItem.linkAttr.focus = 'none';
                        this.toolbar.updated = new Date().toISOString();
                        await this.plugin.settingsManager.save();
                    });
            });
    }

    getUriSubfields(item: ToolbarItemSettings, fieldDiv: HTMLDivElement) {
        const uriTargetSetting = new Setting(fieldDiv)
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
                        await this.plugin.settingsManager.save();
                    })
                );
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
                const menuGroupToolbar = this.plugin.settingsManager.getToolbar(toolbarItem.link);
                const fieldHelp = document.createDocumentFragment();
                menuGroupToolbar
                    ? fieldHelp.append(createToolbarPreviewFr(this.plugin, menuGroupToolbar, undefined, true))
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
     * Updates the UI state of the given component if the value is invalid.
     * @param itemValue string value to check
     * @param fieldType SettingFieldType to check against
     * @param componentEl HTMLElement to update
     * @param toolbarItem ToolbarItemSettings for the item if needed to provide more context
     * @returns true if the item is valid; false otherwise
     */
    async updateItemComponentStatus(
        itemValue: string, 
        fieldType: SettingType, 
        componentEl: HTMLElement | null, 
        toolbarItem?: ToolbarItemSettings): Promise<boolean> 
    {

        const enum Status {
            Empty = 'empty',
            Invalid = 'invalid',
            Valid = 'valid'
        }

        let status: Status = Status.Valid;
        let statusMessage: string = '';
        let statusLink: HTMLAnchorElement | undefined = undefined;
        let isValid = true;

        // FIXME: this isn't happening if there's no value, (e.g., URI with no link set)
        if (toolbarItem?.hasCommand) {
            // check if a command was actually created for this item
            const command = this.plugin.commands.getCommandFor(toolbarItem);
            if (!command) {
                status = Status.Invalid;
                statusMessage = t('setting.use-item-command.error-noname');
            }
        }

        if (itemValue) {
            switch(fieldType) {
                case SettingType.Args: {
                    const parsedArgs = importArgs(itemValue);
                    if (!parsedArgs) {
                        status = Status.Invalid;
                        statusMessage = t('adapter.error.args-format');
                    }
                    break;
                }
                case SettingType.Command:
                    if (!(itemValue in this.plugin.app.commands.commands)) {
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
                case SettingType.File: {
                    const file = this.plugin.app.vault.getAbstractFileByPath(itemValue);
                    if (!(file instanceof TFile) && !(file instanceof TFolder)) {
                        status = Status.Invalid;
                        statusMessage = t('setting.item.option-file-error-does-not-exist');
                    }
                    break;
                }
                case SettingType.Text:
                    // if (this.plugin.hasVars(itemValue)) {
                    // 	this.plugin.debug('VALIDATING TEXT', itemValue);
                    // 	const activeFile = this.plugin.app.workspace.getActiveFile();
                    // 	this.plugin.replaceVars(itemValue, activeFile).then((resolvedText) => {
                            
                    // 	});
                    // }
                    break;
                case SettingType.Toolbar: {
                    let toolbar = this.plugin.settingsManager.getToolbarByName(itemValue);
                    if (!toolbar) {
                        toolbar = this.plugin.settingsManager.getToolbar(itemValue);
                        if (!toolbar) {
                            status = Status.Invalid;
                            statusMessage = t('setting.item.option-item-menu-error-does-not-exist');
                        }
                    }
                    break;
                }
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
                            if (params) {
                                for (const [index, param] of params.entries()) {
                                    // TODO? error if required parameter is empty?
                                    const value = toolbarItem.scriptConfig?.[param.parameter] ?? null;
                                    if (value) {
                                        const subfieldValid = await this.updateItemComponentStatus(value, param.type, componentEl);
                                        status = subfieldValid ? Status.Valid : Status.Invalid;
                                    }
                                }
                            }
                        }
                        else {
                            status = Status.Invalid;
                            statusMessage = (this.plugin.settings.scriptingEnabled)
                                ? t('adapter.error.plugin-not-installed') 
                                : t('adapter.error.scripting-disabled');
                        }
                    }
                    break;
                default:
                    // if the status isn't already invalid (e.g., for a command that doesn't exist)
                    if (status !== Status.Invalid) {
                        status = Status.Empty;
                        statusMessage = '';
                    }
                    break;
            }
        }

        removeFieldError(componentEl, 'afterend');
        switch (status) {
            case Status.Empty:
                // TODO? flag for whether empty should show as an error or not
                isValid = false;
                break;
            case Status.Invalid:
                setFieldError(this.parent, componentEl, 'afterend', statusMessage, statusLink);
                isValid = false;
                break;
        }

        return isValid;

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