import NoteToolbarPlugin from 'main';
import { App, ButtonComponent, Modal, Notice, Platform, Setting, SettingGroup, ToggleComponent, debounce } from 'obsidian';
import { COMMAND_PREFIX_TBAR, POSITION_OPTIONS, PositionType, SETTINGS_DISCLAIMERS, TOOLBAR_COMMAND_POSITION_OPTIONS, ToolbarSettings, t } from 'Settings/NoteToolbarSettings';
import { confirmWithModal } from 'Settings/UI/Modals/ConfirmModal';
import NoteToolbarSettingTab from 'Settings/UI/NoteToolbarSettingTab';
import ItemListUi from '../Components/ItemListUi';
import ToolbarItemUi from '../Components/ToolbarItemUi';
import ToolbarStyleUi from '../Components/ToolbarStyleUi';
import ItemSuggester from '../Suggesters/ItemSuggester';
import { createOnboardingMessageEl, displayHelpSection, fixToggleTab, getDisclaimersFr, getToolbarUsageFr, getToolbarUsageText, learnMoreFr, removeFieldError, setFieldError, showWhatsNewIfNeeded } from "../Utils/SettingsUIUtils";

export const enum SettingsAttr {
	Active = 'data-active',
	ItemUuid = 'data-item-uuid',
	PreviewType = 'data-item-type',
}

export default class ToolbarSettingsModal extends Modal {

	public ntb: NoteToolbarPlugin;
	public toolbar: ToolbarSettings;
	public itemUi: ToolbarItemUi;
	public itemListUi: ItemListUi;

	private parent: NoteToolbarSettingTab | null;

	private hasDesktopFabPosition: boolean = false;
	private hasMobileFabPosition: boolean = false;

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
		this.itemUi = new ToolbarItemUi(this.ntb, this, toolbar);
		this.itemListUi = new ItemListUi(this.ntb, this, this.toolbar);
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
				settingsDiv ? this.itemListUi.collapseItemForms(settingsDiv, rowEscaped, true) : undefined;
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
		this.itemListUi.displayItemList(settingsDiv);
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
			this.itemListUi.collapseItemForms(settingsDiv, rowClicked);
		});

		// listen for focus changes, to collapse form that might be open
		this.ntb.registerDomEvent(settingsDiv, 'focusin', (e) => {
			let rowClicked = (e.target as HTMLElement).closest('.note-toolbar-setting-items-container-row');
			this.itemListUi.collapseItemForms(settingsDiv, rowClicked);
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
				fixToggleTab(toggle);
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
	public scrollToPosition(selectors: string, scrollToClass?: string) {
		let focusEl = this.contentEl.querySelector(selectors) as HTMLElement;
		focusEl?.focus();
		setTimeout(() => { 
			let scrollToEl = scrollToClass ? focusEl.closest(scrollToClass) as HTMLElement : undefined;
			scrollToEl?.scrollIntoView({ behavior: 'instant', block: 'center' });
		}, Platform.isMobile ? 100 : 0); // delay on mobile for the on-screen keyboard
	}

}