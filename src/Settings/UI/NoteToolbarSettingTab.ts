import NoteToolbarPlugin from 'main';
import { ButtonComponent, debounce, Menu, MenuItem, normalizePath, Notice, Platform, PluginSettingTab, setIcon, Setting, SettingGroup, setTooltip, ToggleComponent } from 'obsidian';
import { FolderMapping, RIBBON_ACTION_OPTIONS, RibbonAction, SETTINGS_VERSION, SettingType, t, ToolbarSettings } from 'Settings/NoteToolbarSettings';
import IconSuggestModal from 'Settings/UI/Modals/IconSuggestModal';
import FolderSuggester from 'Settings/UI/Suggesters/FolderSuggester';
import ToolbarSuggester from 'Settings/UI/Suggesters/ToolbarSuggester';
import Sortable from 'sortablejs';
import { exportToCallout } from 'Utils/ImportExport';
import { arraymove, getElementPosition, moveElement } from 'Utils/Utils';
import { confirmWithModal } from './Modals/ConfirmModal';
import { importFromModal } from './Modals/ImportModal';
import ShareModal from './Modals/ShareModal';
import { createToolbarPreviewFr, displayHelpSection, emptyMessageFr, handleKeyClick, headingLearnMoreFr, iconTextFr, learnMoreFr, removeFieldHelp, setFieldHelp, showWhatsNewIfNeeded, updateItemComponentStatus } from "./Utils/SettingsUIUtils";
// import RuleUi from './RuleUi';

type SettingsSectionType = 'appToolbars' | 'callouts' | 'contexts' | 'displayRules' | 'itemList';

export default class NoteToolbarSettingTab extends PluginSettingTab {

	private itemListIdCounter: number = 0;

	// track UI state
	private lastScrollPosition: number;
	private lastScrollListenerRegistered = false;
	private isSectionOpen: Record<SettingsSectionType, boolean> = {
		'appToolbars': true,
		'callouts': false,
		'contexts': false,
		'displayRules': true,
		'itemList': true,
	}

	// private ruleUi: RuleUi;

	constructor(
		private ntb: NoteToolbarPlugin
	) {
		super(ntb.app, ntb);
		this.icon = 'circle-ellipsis';
		// this.ruleUi = new RuleUi(this.plugin, this);
	}

	/*************************************************************************
	 * SETTINGS DISPLAY
	 *************************************************************************/

	/**
	 * Displays the main settings.
	 */
	public display(focusSelector?: string, scrollToFocus: boolean = false): void {

		const { containerEl } = this;
		containerEl.empty();
		containerEl.addClass('note-toolbar-setting-ui');

		if (this.ntb.settings.version !== SETTINGS_VERSION) {
			new Setting(containerEl)
				.setName(t('setting.error-old-settings-name'))
				.setDesc(t('setting.error-old-settings-description', { oldVersion: this.ntb.settings.version + '', currentVersion: SETTINGS_VERSION + '' }))
				.setClass('note-toolbar-setting-plugin-error')
				.setHeading();
		}

		// help
		displayHelpSection(this.ntb, containerEl, undefined, () => {
			// @ts-ignore
			this.ntb.app.setting.close();
		});

		// toolbar list
		this.displayToolbarList(containerEl);

		// display rules
		this.displayRules(containerEl);
		// this.ruleUi.displayRules(containerEl);

		this.displayAppToolbarSettings(containerEl);
		this.displayFileTypeSettings(containerEl);

		// other global settings
		this.displayCopyAsCalloutSettings(containerEl);
		this.displayOtherSettings(containerEl);

		// scroll + focus view
		this.displayFocusScroll(focusSelector, scrollToFocus);

		// show the What's New view once, if the user hasn't seen it yet
		showWhatsNewIfNeeded(this.ntb);

	}

	/**
	 * Scrolls and optionally focusses on the given selector; otherwise scrolls to the previous view position.
	 * @param focusSelector selector to focus on, after UI is rendered.
	 * @param scrollToFocus set to true to scroll to the given selector; false otherwise.
	 */
	displayFocusScroll(focusSelector: string | undefined, scrollToFocus: boolean) {

		// if search is enabled (>4 toolbars), focus on search field by default
		// this.ntb.debug('focusSelector', focusSelector, 'lastScrollPosition', this.lastScrollPosition);
		if (!Platform.isPhone && (this.lastScrollPosition === undefined) && !focusSelector && (this.ntb.settings.toolbars.length > 4)) {
			focusSelector = '#tbar-search input';
		}

		// scroll to provided selector, or last scroll position
		if (focusSelector) {
			requestAnimationFrame(() => {
				const focusEl = this.containerEl.querySelector(focusSelector) as HTMLElement;
				// TODO: does this focus() need a setTimeout? 
				focusEl?.focus();
				if (scrollToFocus) {
					setTimeout(() => { 
						focusEl?.scrollIntoView(true);
					}, Platform.isMobile ? 100 : 0); // delay on mobile for the on-screen keyboard	
				}
			});
		}
		else if (this.lastScrollPosition != null && this.lastScrollPosition > 0) {
			// wait for content to render before scrolling
			const targetPosition = this.lastScrollPosition;
			requestAnimationFrame(() => {
				this.containerEl.scrollTo({ top: targetPosition, behavior: "auto" });
				// this.ntb.debug("Restored scroll to:", targetPosition);
			});
		}

		// listen to scroll changes
		if (!this.lastScrollListenerRegistered) {
			this.ntb.registerDomEvent(this.containerEl, 'scroll', (event) => {
				this.lastScrollPosition = this.containerEl.scrollTop;
				// this.ntb.debug("this.lastScrollPosition UPDATE:", this.lastScrollPosition);
			});
			this.lastScrollListenerRegistered = true;
		}

	}

	/**
	 * Displays the list of toolbars.
	 * @param containerEl HTMLElement to add the settings to.
	 */
	displayToolbarList(containerEl: HTMLElement): void {

		const itemsListContainer = createDiv();
		itemsListContainer.addClass('note-toolbar-setting-items-list-container');

		const itemsContainer = createDiv();
		itemsContainer.addClass('note-toolbar-setting-items-container');
		itemsContainer.setAttribute('data-active', this.isSectionOpen['itemList'].toString());

		const toolbarListHeading = this.isSectionOpen['itemList'] ? t('setting.toolbars.name') : t('setting.toolbars.name-with-count', { count: this.ntb.settings.toolbars.length });
		const toolbarListSetting = new Setting(itemsContainer)
			.setName(toolbarListHeading)
			.setHeading();

		// search button (or field on desktop)
		if (this.ntb.settings.toolbars.length > 4) {
			if (!Platform.isPhone) {
				// search field
				this.renderSearchField(toolbarListSetting.controlEl);
			}
			else {
				const searchButton = toolbarListSetting
					.addExtraButton((cb) => {
						cb.setIcon('search')
						.setTooltip(t('setting.search.button-tooltip'))
						.onClick(async () => {
							this.toggleSearch();
							// un-collapse list container if it's collapsed
							if (!this.isSectionOpen['itemList']) {
								this.toggleToolbarList();
							}
						});
						handleKeyClick(this.ntb, cb.extraSettingsEl);
						// used to set focus on settings display
						cb.extraSettingsEl.id = 'ntb-tbar-search-button';
					});
			}
		}

		// import button
		toolbarListSetting
			.addExtraButton((cb) => {
				cb.setIcon('import')
				.setTooltip(t('import.button-import-tooltip'))
				.onClick(async () => {
					importFromModal(
						this.ntb
					).then(async (importedToolbar: ToolbarSettings) => {
						if (importedToolbar) {
							await this.ntb.settingsManager.addToolbar(importedToolbar);
							await this.ntb.settingsManager.save();
							await this.ntb.commands.openToolbarSettingsForId(importedToolbar.uuid);
							this.display();
						}
					});
				});
				handleKeyClick(this.ntb, cb.extraSettingsEl);
			});

		// search field (phone)
		if (this.ntb.settings.toolbars.length > 4) {
			if (Platform.isPhone) this.renderSearchField(itemsContainer);
		}

		// make collapsible
		if (this.ntb.settings.toolbars.length > 4) {
			this.renderSettingToggle(toolbarListSetting, '.note-toolbar-setting-items-container', 'itemList', () => {
				toolbarListSetting.setName(
					this.isSectionOpen['itemList'] ? t('setting.toolbars.name') : t('setting.toolbars.name-with-count', { count: this.ntb.settings.toolbars.length }));
			});
		}

		if (this.ntb.settings.toolbars.length == 0) {
			itemsListContainer
				.createEl("div", { text: emptyMessageFr(t('setting.toolbars.label-empty-create-tbar')) })
				.className = "note-toolbar-setting-empty-message";
		}
		else {
			const toolbarListDiv = createDiv();
			toolbarListDiv.addClass("note-toolbar-setting-toolbar-list");
			this.ntb.settings.toolbars.forEach(
				(toolbar) => {
					
					const toolbarNameFr = document.createDocumentFragment();
					toolbarNameFr.append(toolbar.name ? toolbar.name : t('setting.toolbars.label-tbar-name-not-set'));
					// show hotkey
					if (!Platform.isPhone) {
						const tbarCommand = this.ntb.commands.getCommandFor(toolbar);
						if (tbarCommand) {
							const hotkeyEl = this.ntb.hotkeys.getHotkeyEl(tbarCommand);
							if (hotkeyEl) {
								toolbarNameFr.appendChild(hotkeyEl);
							}
							else {
								let commandIconEl = toolbarNameFr.createSpan();
								commandIconEl.addClass('note-toolbar-setting-command-indicator');
								setIcon(commandIconEl, 'terminal');
								setTooltip(commandIconEl, t('setting.use-item-command.tooltip-command-indicator', { command: tbarCommand.name, interpolation: { escapeValue: false } }));
							}
						}
					}

					const toolbarListItemSetting = new Setting(toolbarListDiv)
						.setName(toolbarNameFr)
						.addButton((button: ButtonComponent) => {
							button
								.setIcon('more-horizontal')
								.setTooltip(t('setting.toolbars.button-more-tooltip'))
								.onClick(() => {
									let menu = new Menu();
									menu.addItem((menuItem: MenuItem) => {
										menuItem
											.setTitle(t('setting.toolbars.button-duplicate-tbar-tooltip'))
											.setIcon('copy-plus')
											.onClick(async () => {
												this.ntb.settingsManager.duplicateToolbar(toolbar).then((newToolbarUuid) => {
													this.display(`.note-toolbar-setting-toolbar-list > div[data-tbar-uuid="${newToolbarUuid}"] > .setting-item-control > .mod-cta`);
												});
											});
									});
									menu.addSeparator();
									menu.addItem((menuItem: MenuItem) => {
										menuItem
											.setTitle(t('export.label-share'))
											.setIcon('share')
											.onClick(async () => {
												const shareUri = await this.ntb.protocolManager.getShareUri(toolbar);
												let shareModal = new ShareModal(this.ntb, shareUri, toolbar);
												shareModal.open();
											});
									});
									menu.addItem((menuItem: MenuItem) => {
										menuItem
											.setTitle(t('export.label-callout'))
											.setIcon('copy')
											.onClick(async () => {
												let calloutExport = await exportToCallout(this.ntb, toolbar, this.ntb.settings.export);
												navigator.clipboard.writeText(calloutExport);
												new Notice(learnMoreFr(t('export.notice-completed'), 'Creating-callouts-from-toolbars'));
											});
									});
									menu.addSeparator();
									menu.addItem((menuItem: MenuItem) => {
										menuItem
											.setTitle(t('setting.delete-toolbar.button-delete'))
											.setIcon('minus-circle')
											.onClick(async () => {
												confirmWithModal(
													this.ntb.app, 
													{ 
														title: t('setting.delete-toolbar.title', { toolbar: toolbar.name, interpolation: { escapeValue: false } }),
														questionLabel: t('setting.delete-toolbar.label-delete-confirm'),
														approveLabel: t('setting.delete-toolbar.button-delete-confirm'),
														denyLabel: t('setting.button-cancel'),
														warning: true
													}
												).then((isConfirmed: boolean) => {
													if (isConfirmed) {
														this.ntb.settingsManager.deleteToolbar(toolbar.uuid);
														this.ntb.settingsManager.save();
														this.display();
													}
												});
											})
											.setWarning(true);
									});									
									menu.showAtPosition(getElementPosition(button.buttonEl));
								});
							// used to distinguish buttons for keyboard navigation
							button.buttonEl.addClass('ntb-tbar-more');
						})
						.addButton((button: ButtonComponent) => {
							button
								.setTooltip(t('setting.toolbars.button-edit-tbar-tooltip'))
								.setButtonText(t('setting.toolbars.button-edit-tbar'))
								.onClick(() => {
									this.ntb.settingsManager.openToolbarSettings(toolbar, this);
								});
							// used to distinguish buttons for keyboard navigation
							button.buttonEl.addClass('ntb-tbar-edit');
						});

					// for performance, render previews after a slight delay
					requestAnimationFrame(() => {
						toolbarListItemSetting.descEl.append(createToolbarPreviewFr(this.ntb, toolbar, this.ntb.settingsManager));
					});

					toolbarListItemSetting.settingEl.setAttribute('data-tbar-uuid', toolbar.uuid);
					toolbar.name ? undefined : toolbarListItemSetting.nameEl.addClass('mod-warning');
			
					this.ntb.registerDomEvent(
						toolbarListItemSetting.settingEl, 'keydown', (e: KeyboardEvent) => {
							switch (e.key) {
								case "d": {
									const modifierPressed = (Platform.isWin || Platform.isLinux) ? e?.ctrlKey : e?.metaKey;
									if (modifierPressed) {
										this.ntb.settingsManager.duplicateToolbar(toolbar).then((newToolbarUuid) => {
											this.display(`.note-toolbar-setting-toolbar-list > div[data-tbar-uuid="${newToolbarUuid}"] > .setting-item-control > .mod-cta`);
										});
									}
								}
							}
					});
				}
			);

			// support up/down arrow keys
			this.ntb.registerDomEvent(
				toolbarListDiv, 'keydown', (keyEvent) => {
					if (!['ArrowUp', 'ArrowDown'].contains(keyEvent.key)) return;
					const currentFocussed = activeDocument.activeElement as HTMLElement;
					if (currentFocussed) {
						const buttonSelector = `.setting-item-control > button.${currentFocussed.className}`;
						const toolbarButtonEls = Array.from(toolbarListDiv.querySelectorAll<HTMLElement>(buttonSelector))
							.filter((btn) => getComputedStyle(btn.closest('.setting-item')!).display !== 'none');
						const currentIndex = toolbarButtonEls.indexOf(currentFocussed);
						switch (keyEvent.key) {
							case 'ArrowUp':
								if (currentIndex > 0) {
									toolbarButtonEls[currentIndex - 1].focus();
									keyEvent.preventDefault();
								}
								break;
							case 'ArrowDown':
								if (currentIndex < toolbarButtonEls.length - 1) {
									toolbarButtonEls[currentIndex + 1].focus();
									keyEvent.preventDefault();
								}
								break;
						}
					}
				}
			);

			itemsListContainer.appendChild(toolbarListDiv);

		}

		itemsContainer.appendChild(itemsListContainer);

		// add toolbar
		new Setting(itemsContainer)
			.setClass('note-toolbar-setting-button')
			.setClass('note-toolbar-setting-no-background')
			.addButton((button: ButtonComponent) => {
				button
					.setTooltip(t('setting.toolbars.button-new-tbar-tooltip'))
					.setCta()
					.onClick(async () => {
						const newToolbar = await this.ntb.settingsManager.newToolbar();
						this.ntb.settingsManager.openToolbarSettings(newToolbar, this);
					});
				button.buttonEl.setText(iconTextFr('plus', t('setting.toolbars.button-new-tbar')));
			});

		containerEl.append(itemsContainer);

	}

	/**
	 * Displays the search field.
	 * @param containerEl HTMLElement to render search field in.
	 */
	renderSearchField(containerEl: HTMLElement) {
		const toolbarSearchSetting = new Setting(containerEl);
		toolbarSearchSetting
			.setClass('note-toolbar-setting-no-border')
			.setClass('note-toolbar-setting-no-background')
			.addSearch((cb) => {
				cb.setPlaceholder(t('setting.search.field-placeholder'))
				.onChange((search: string) => {
					if (!Platform.isPhone && !this.isSectionOpen['itemList']) {
						this.toggleToolbarList();
					}
					const query = search.toLowerCase();
					let firstVisibleSet = false;
					let hasMatch = false;
					// let hasNonVisibleMatch = false;
					this.containerEl
						.querySelectorAll<HTMLElement>('.note-toolbar-setting-toolbar-list .setting-item')
						.forEach((toolbarEl) => {
							// search contents of name and item text
							const toolbarName = toolbarEl.querySelector('.setting-item-name')?.textContent?.toLowerCase() ?? '';
							const allItemText = Array.from(toolbarEl.querySelectorAll('*:not(svg)'))
								.flatMap(el => Array.from(el.childNodes))
								.filter(node => node.nodeType === Node.TEXT_NODE)
								.map(node => node.textContent?.trim())
								.filter(text => text)
								.join(' ')
								.toLowerCase();
							// const allItemTooltips = Array.from(toolbarEl.querySelectorAll('.note-toolbar-setting-toolbar-list-preview-item[aria-label]'))
							// 	.map(el => el.getAttribute('aria-label')?.trim())
							// 	.filter(label => label)
							// 	.join(' ')
							// 	.toLowerCase();

							const toolbarNameMatches = toolbarName.includes(query);
							const itemTextMatches = allItemText.includes(query);
							// const itemTooltipMatches = allItemTooltips.includes(query);

							// hide non-matching results
							(toolbarNameMatches || itemTextMatches) ? toolbarEl.show() : toolbarEl.hide();

							hasMatch = hasMatch || ((toolbarNameMatches || itemTextMatches) && query.length > 0);
							// hasNonVisibleMatch = hasNonVisibleMatch || (itemTooltipMatches && query.length > 0);

							// remove the top border on the first search result
							if ((toolbarNameMatches || itemTextMatches) && !firstVisibleSet) {
								toolbarEl.classList.add('note-toolbar-setting-no-border');
								firstVisibleSet = true;
							} else {
								toolbarEl.classList.remove('note-toolbar-setting-no-border');
							}
						});

					// if no results, show "no results" message
					const toolbarListEl = this.containerEl.querySelector('.note-toolbar-setting-toolbar-list') as HTMLElement;
					toolbarListEl?.querySelector('.note-toolbar-setting-empty-message')?.remove();
					if (!hasMatch && query.length > 0) {
						toolbarListEl?.createDiv({ 
							text: emptyMessageFr(t('setting.search.label-no-results')), 
							cls: 'note-toolbar-setting-empty-message' 
						});
					}

					// show that some results are hidden, and reset the "found" flag
					// this.plugin.debug(hasNonVisibleMatch);
					// hasNonVisibleMatch
					// 	? setFieldHelp(toolbarSearchSetting.controlEl, 'Some results match tooltips.')
					// 	: removeFieldHelp(toolbarSearchSetting.controlEl);
					// hasNonVisibleMatch = false;

				});
			});
		toolbarSearchSetting.settingEl.id = 'tbar-search';
		
		const searchInputEl = toolbarSearchSetting.settingEl.querySelector('input');

		// allow keyboard navigation down to first search result
		if (searchInputEl) {
			this.ntb.registerDomEvent(
				searchInputEl, 'keydown', (e) => {
					switch (e.key) {
						case 'ArrowDown': {
							const selector = '.note-toolbar-setting-toolbar-list .ntb-tbar-edit';
							const toolbarButtonEls = Array.from(this.containerEl.querySelectorAll<HTMLElement>(selector))
								.filter((btn) => getComputedStyle(btn.closest('.setting-item')!).display !== 'none');
							if (toolbarButtonEls.length > 0) toolbarButtonEls[0].focus();
							e.preventDefault();
							break;
						}
					}
				}
			)
		}

		if (Platform.isPhone) {
			toolbarSearchSetting.settingEl.setAttribute('data-active', 'false');
			// search field: remove if it's empty and loses focus
			if (searchInputEl) {
				this.ntb.registerDomEvent(
					searchInputEl, 'blur', (e) => {
						const searchButtonClicked = (e.relatedTarget as HTMLElement)?.id === 'ntb-tbar-search-button';
						if (!searchInputEl.value && !searchButtonClicked) {
							let searchEl = containerEl.querySelector('#tbar-search') as HTMLElement;
							searchEl?.setAttribute('data-active', 'false');
						}
					}
				);
			}
		}
		else {
			toolbarSearchSetting.settingEl.setCssProps({'padding-bottom': 'unset'});
		}
	}

	/**
	 * Toggles the search box, based on the provided flag.
	 * @param isVisible true if search should be visible; false otherwise
	 */
	toggleSearch(isVisible?: boolean) {
		const toolbarSearchEl = this.containerEl.querySelector('#tbar-search') as HTMLElement;
		if (toolbarSearchEl) {
			const searchActive = 
				(isVisible !== undefined) ? (!isVisible).toString() : toolbarSearchEl.getAttribute('data-active');
			if (searchActive === 'true') {
				toolbarSearchEl.setAttribute('data-active', 'false');
				// clear search value
				let searchInputEl = toolbarSearchEl.querySelector('input');
				if (searchInputEl) {
					searchInputEl.value = '';
					searchInputEl.trigger('input');
					searchInputEl.blur();
				}
			}
			else {
				toolbarSearchEl.setAttribute('data-active', 'true');
				// set focus in search field
				const searchInputEl = toolbarSearchEl?.querySelector('input');
				setTimeout(() => {
					searchInputEl?.focus();
				}, 50);
			}
		}
	}

	/**
	 * Toggles the toolbar list between hidden or not.
	 */
	toggleToolbarList() {
		let itemsContainer = this.containerEl.querySelector('.note-toolbar-setting-items-container');
		if (itemsContainer) {
			this.isSectionOpen['itemList'] = !this.isSectionOpen['itemList'];
			itemsContainer.setAttribute('data-active', this.isSectionOpen['itemList'].toString());
			const headingEl = itemsContainer.querySelector('.setting-item-info .setting-item-name');
			this.isSectionOpen['itemList'] ? headingEl?.setText(t('setting.toolbars.name')) : headingEl?.setText(t('setting.toolbars.name-with-count', { count: this.ntb.settings.toolbars.length }));
		}
	}

	/**
	 * Settings for Display rules.
	 * @param containerEl HTMLElement to add the settings to.
	 */
	displayRules(containerEl: HTMLElement): void {

		const settingsContainerEl = createDiv();
		settingsContainerEl.addClasses(['note-toolbar-setting-mappings-container']);
		settingsContainerEl.setAttribute('data-active', this.isSectionOpen['displayRules'].toString());

		const rulesSetting = new Setting(settingsContainerEl)
			.setHeading()
			.setName(t('setting.display-rules.name'))
			.setDesc(learnMoreFr(t('setting.display-rules.description'), 'Defining-where-to-show-toolbars'));

		// make collapsible
		this.renderSettingToggle(rulesSetting, '.note-toolbar-setting-mappings-container', 'displayRules');

		const collapsibleContainerEl = createDiv();
		collapsibleContainerEl.addClass('note-toolbar-setting-items-collapsible-container');

		this.displayMappingsSettings(collapsibleContainerEl);

		settingsContainerEl.appendChild(collapsibleContainerEl);
		containerEl.append(settingsContainerEl);

	}

	/**
	 * Displays the mappings settings.
	 * @param containerEl HTMLElement to add the settings to.
	 */
	displayMappingsSettings(containerEl: HTMLElement): void {

		const mappingsGroup = new SettingGroup(containerEl);

		mappingsGroup.addSetting((propertySetting) => {
			propertySetting
				.setName(t('setting.display-rules.option-property'))
				.setDesc(t('setting.display-rules.option-property-description'))
				.addText(text => text
					.setPlaceholder(t('setting.display-rules.option-property-placeholder'))
					.setValue(this.ntb.settings.toolbarProp)
					.onChange(debounce(async (value) => {
						this.ntb.settings.toolbarProp = value;
						// FIXME? set all toolbars to updated?
						// this.plugin.settings.toolbars.updated = new Date().toISOString();
						await this.ntb.settingsManager.save();	
					}, 750)));
		});

		mappingsGroup.addSetting((folderMappingSetting) => {
			folderMappingSetting
				.setName(t('setting.mappings.name'))
				.setDesc(t('setting.mappings.description'));
		});

		const settingItemsEl = containerEl.querySelector('.setting-group .setting-items');
		if (settingItemsEl) {
			
			let itemsContainerEl = createDiv();
			itemsContainerEl.addClass('note-toolbar-setting-items-list-container');

			if (this.ntb.settings.folderMappings.length == 0) {
				containerEl
					.createEl("div", { text: emptyMessageFr(t('setting.mappings.label-empty')) })
					.className = "note-toolbar-setting-empty-message";
			}
			else {
				const toolbarFolderListEl = createDiv();
				toolbarFolderListEl.addClass('note-toolbar-sortablejs-list');

				this.ntb.settings.folderMappings.forEach((mapping, index) => {
					let rowId = this.itemListIdCounter.toString();
					let toolbarFolderListItemDiv = this.generateMappingForm(mapping, rowId);
					toolbarFolderListEl.append(toolbarFolderListItemDiv);
					this.itemListIdCounter++;
				});

				Sortable.create(toolbarFolderListEl, {
					chosenClass: 'sortable-chosen',
					ghostClass: 'sortable-ghost',
					handle: '.sortable-handle',
					onChange: (item) => navigator.vibrate(50),
					onChoose: (item) => navigator.vibrate(50),
					onSort: async (item) => {
						this.ntb.debug("sortable: index: ", item.oldIndex, " -> ", item.newIndex);
						if (item.oldIndex !== undefined && item.newIndex !== undefined) {
							moveElement(this.ntb.settings.folderMappings, item.oldIndex, item.newIndex);
							await this.ntb.settingsManager.save();
						}
					}
				});

				itemsContainerEl.appendChild(toolbarFolderListEl)
				settingItemsEl.appendChild(itemsContainerEl);

			}

		//
		// "Add a new mapping" button
		//

		new Setting(settingItemsEl as HTMLElement)
			.setClass('note-toolbar-setting-button')
			.setClass('note-toolbar-setting-no-border')
			.addButton((button: ButtonComponent) => {
				button
					.setTooltip(t('setting.mappings.button-new-tooltip'))
					.setCta()
					.onClick(async () => {
						let newMapping = {
							folder: "",
							toolbar: ""
						};
						this.ntb.settings.folderMappings.push(newMapping);
						await this.ntb.settingsManager.save();
						// TODO: add a form item to the existing list
							// TODO: put the existing code in a function
						// TODO: set the focus in the form
						this.display('.note-toolbar-sortablejs-list > div:last-child input[type="search"]', true);
					});
				button.buttonEl.setText(iconTextFr('plus', t('setting.mappings.button-new')));
			});

		}

	}

	/**
	 * Returns the form to edit a mapping line.
	 * @param mapping mapping to return the form for
	 * @param rowId row ID of the mapping in the mapping list
	 * @returns the form element as a div
	 */
	generateMappingForm(mapping: FolderMapping, rowId: string): HTMLDivElement {

		let toolbarFolderListItemDiv = createDiv();
		toolbarFolderListItemDiv.className = "note-toolbar-setting-folder-list-item-container";

		toolbarFolderListItemDiv.setAttribute('data-row-id', rowId);
		let textFieldsDiv = createDiv();
		textFieldsDiv.id = "note-toolbar-setting-item-field-" + this.itemListIdCounter;
		textFieldsDiv.className = "note-toolbar-setting-item-fields";

		new Setting(toolbarFolderListItemDiv)
			.setClass("note-toolbar-setting-item-delete")
			.addButton((cb) => {
				cb.setIcon("minus-circle")
					.setTooltip(t('setting.button-delete-tooltip'))
					.onClick(async () => {
						let rowId = cb.buttonEl.getAttribute('data-row-id');
						rowId ? this.listMoveHandlerById(null, rowId, 'delete') : undefined;
					});
				cb.buttonEl.setAttribute('data-row-id', rowId);
			});

		new Setting(textFieldsDiv)
			.setClass("note-toolbar-setting-mapping-field")
			.addSearch((cb) => {
				new FolderSuggester(this.app, cb.inputEl);
				cb.setPlaceholder(t('setting.mappings.placeholder-folder'))
					.setValue(mapping.folder)
					.onChange(debounce(async (newFolder) => {
						if (
							newFolder &&
							this.ntb.settings.folderMappings.some(
								(map, mapIndex) => {
									return mapping != map ? map.folder.toLowerCase() === newFolder.toLowerCase() : undefined;
								}
							)
						) {
							if (document.getElementById("note-toolbar-name-error") === null) {
								let errorDiv = createEl("div", { 
									text: t('setting.mappings.error-folder-already-mapped'), 
									attr: { id: "note-toolbar-name-error" }, cls: "note-toolbar-setting-error-message" });
								toolbarFolderListItemDiv.insertAdjacentElement('afterend', errorDiv);
								toolbarFolderListItemDiv.children[0].addClass("note-toolbar-setting-error");
							}
						}
						else {
							document.getElementById("note-toolbar-name-error")?.remove();
							toolbarFolderListItemDiv.children[0].removeClass("note-toolbar-setting-error");
							mapping.folder = newFolder ? normalizePath(newFolder) : "";
							await this.ntb.settingsManager.save();
						}
					}, 250));
			});
		new Setting(textFieldsDiv)
			.setClass("note-toolbar-setting-mapping-field")
			.addSearch((cb) => {
				new ToolbarSuggester(this.ntb, cb.inputEl);
				cb.setPlaceholder(t('setting.mappings.placeholder-toolbar'))
					.setValue(this.ntb.settingsManager.getToolbarName(mapping.toolbar))
					.onChange(debounce(async (name) => {
						let mappedToolbar = this.ntb.settingsManager.getToolbarByName(name);
						if (mappedToolbar) {
							mapping.toolbar = mappedToolbar.uuid;
							await this.ntb.settingsManager.save();
						}
						// TODO: if not valid show error/warning
					}, 250));
			});

		let itemHandleDiv = createDiv();
		itemHandleDiv.addClass("note-toolbar-setting-item-controls");
		new Setting(itemHandleDiv)
			.addExtraButton((cb) => {
				cb.setIcon('grip-horizontal')
					.setTooltip(t('setting.button-drag-tooltip'))
					.extraSettingsEl.addClass('sortable-handle');
				cb.extraSettingsEl.setAttribute('data-row-id', this.itemListIdCounter.toString());
				cb.extraSettingsEl.tabIndex = 0;
				this.ntb.registerDomEvent(
					cb.extraSettingsEl,	'keydown', (e) => {
						let currentEl = e.target as HTMLElement;
						let rowId = currentEl.getAttribute('data-row-id');
						// this.plugin.debug("rowId", rowId);
						rowId ? this.listMoveHandlerById(e, rowId) : undefined;
					});
			});

		toolbarFolderListItemDiv.append(textFieldsDiv);
		toolbarFolderListItemDiv.append(itemHandleDiv);

		return toolbarFolderListItemDiv;

	}

	/**
	 * Renders a setting that can be toggled open or closed.
	 * @param setting Setting to add the toggle button to.
	 * @param containerSelector CSS selector for the container to toggle.
	 * @param section key in the context object that holds the toggle state.
	 * @param callback optional callback to execute after performing the toggle.
	 */
	renderSettingToggle(
		setting: Setting,
		containerSelector: string,
		section: SettingsSectionType,
		callback?: () => void
	): void {
		this.ntb.registerDomEvent(setting.infoEl, 'click', (event) => {
			// ignore the "Learn more" link
			if (!(event.target instanceof HTMLElement && 
				event.target.matches('a.note-toolbar-setting-focussable-link'))) {
				this.handleSettingToggle(containerSelector, section, callback);
			}
		});
		setting.addExtraButton((cb) => {
			cb.setIcon('right-triangle')
				.setTooltip(t('setting.button-expand-collapse-tooltip'))
				.onClick(async () => {
					this.handleSettingToggle(containerSelector, section, callback);
				});
			cb.extraSettingsEl.addClass('note-toolbar-setting-item-expand');
			handleKeyClick(this.ntb, cb.extraSettingsEl);
		});
	}

	handleSettingToggle(containerSelector: string, section: SettingsSectionType, callback?: () => void) {
		let itemsContainer = this.containerEl.querySelector(containerSelector);
		if (itemsContainer) {
			this.isSectionOpen[section] = !this.isSectionOpen[section];
			itemsContainer.setAttribute('data-active', this.isSectionOpen[section].toString());
			callback?.();
		}
	}

	/**
	 * Settings for toolbars displayed across the app.
	 * @param containerEl HTMLElement to add the settings to.
	 */
	displayAppToolbarSettings(containerEl: HTMLElement): void {

		const settingsContainerEl = createDiv();
		settingsContainerEl.addClasses(['note-toolbar-setting-app-toolbars-container']);
		settingsContainerEl.setAttribute('data-active', this.isSectionOpen['appToolbars'].toString());

		const appToolbarSetting = new Setting(settingsContainerEl)
			.setHeading()
			.setName(t('setting.display-locations.name'))
			.setDesc(learnMoreFr(t('setting.display-locations.description'), 'Toolbars-within-the-app'));

		// make collapsible
		this.renderSettingToggle(appToolbarSetting, '.note-toolbar-setting-app-toolbars-container', 'appToolbars');

		const collapsibleContainerEl = createDiv();
		collapsibleContainerEl.addClass('note-toolbar-setting-items-collapsible-container');

		const appToolbarGroup = new SettingGroup(collapsibleContainerEl);

		appToolbarGroup.addSetting((editorMenuSetting) => {
			const existingEditorMenuToolbar = this.ntb.settingsManager.getToolbarById(this.ntb.settings.editorMenuToolbar);
			editorMenuSetting
				.setName(t('setting.display-locations.option-editor-menu'))
				.setDesc(learnMoreFr(t('setting.display-locations.option-editor-menu-description'), 'Toolbars-within-the-app#Editor-menu'))
				.setClass('note-toolbar-setting-item-control-std-with-help')
				.addSearch(async (cb) => {
					new ToolbarSuggester(this.ntb, cb.inputEl);
					cb.setPlaceholder(t('setting.display-locations.option-editor-menu-placeholder'))
						.setValue(existingEditorMenuToolbar ? existingEditorMenuToolbar.name : '')
						.onChange(debounce(async (name) => {
							const isValid = await updateItemComponentStatus(this.ntb, this, name, SettingType.Toolbar, editorMenuSetting.controlEl, undefined, 'beforeend');
							const newToolbar = isValid ? this.ntb.settingsManager.getToolbarByName(name) : undefined;
							this.ntb.settings.editorMenuToolbar = newToolbar?.uuid ?? null;
							// toggle editor menu as toolbar setting
							const hasEditorMenuToolbar = !!this.ntb.settings.editorMenuToolbar;
							const editorMenuAsTbarSettingEl = this.containerEl.querySelector('#note-toolbar-editor-menu-as-tbar-setting');
							editorMenuAsTbarSettingEl?.setAttribute('data-active', hasEditorMenuToolbar.toString());
							// update toolbar preview
							const toolbarPreviewFr = newToolbar && createToolbarPreviewFr(this.ntb, newToolbar, undefined, false);
							removeFieldHelp(editorMenuSetting.controlEl);
							setFieldHelp(editorMenuSetting.controlEl, toolbarPreviewFr);
							await this.ntb.settingsManager.save();
						}, 250));
					await updateItemComponentStatus(this.ntb, this, existingEditorMenuToolbar ? existingEditorMenuToolbar.name : '', SettingType.Toolbar, cb.inputEl.parentElement, undefined, 'beforeend');
				});
			const editorMenuToolbarFr = existingEditorMenuToolbar && createToolbarPreviewFr(this.ntb, existingEditorMenuToolbar, undefined, false);
			setFieldHelp(editorMenuSetting.controlEl, editorMenuToolbarFr);			
		});

		appToolbarGroup.addSetting((editorMenuAsTbarSetting) => {
			editorMenuAsTbarSetting
				.setName(t('setting.display-locations.option-editor-menu-as-tbar'))
				.setDesc(t('setting.display-locations.option-editor-menu-as-tbar-description'))
				.addToggle((cb: ToggleComponent) => {
					cb.setValue(this.ntb.settings.editorMenuAsToolbar)
						.onChange(async (value: boolean) => {
							this.ntb.settings.editorMenuAsToolbar = value;
							await this.ntb.settingsManager.save();
						});
				});
			editorMenuAsTbarSetting.settingEl.id = 'note-toolbar-editor-menu-as-tbar-setting';
			const hasEditorMenuToolbar = !!this.ntb.settings.editorMenuToolbar;
			editorMenuAsTbarSetting.settingEl.setAttribute('data-active', hasEditorMenuToolbar.toString());
		});

		appToolbarGroup.addSetting((showToolbarInFileMenuSetting) => {
			showToolbarInFileMenuSetting
				.setName(t('setting.display-contexts.option-filemenu'))
				.setDesc(learnMoreFr(t('setting.display-contexts.option-filemenu-description'), 'Toolbars-within-the-app#File-menu'))
				.addToggle((cb) => {
					cb.setValue(this.ntb.settings.showToolbarInFileMenu)
					cb.onChange(async (value) => {
						this.ntb.settings.showToolbarInFileMenu = value;
						await this.ntb.settingsManager.save();
						// TODO? force the re-rendering of the current toolbar to update the menu
					});
				});
		});

		appToolbarGroup.addSetting((emptyViewSetting) => {
			const existingEmptyViewToolbar = this.ntb.settingsManager.getToolbarById(this.ntb.settings.emptyViewToolbar)
			emptyViewSetting
				.setName(t('setting.display-locations.option-emptyview-tbar'))
				.setDesc(t('setting.display-locations.option-emptyview-tbar-description'))
				.setClass('note-toolbar-setting-item-control-std-with-help')
				.addSearch(async (cb) => {
					new ToolbarSuggester(this.ntb, cb.inputEl);
					cb.setPlaceholder(t('setting.display-locations.option-emptyview-tbar-placeholder'))
						.setValue(existingEmptyViewToolbar ? existingEmptyViewToolbar.name : '')
						.onChange(debounce(async (name) => {
							const isValid = await updateItemComponentStatus(this.ntb, this, name, SettingType.Toolbar, emptyViewSetting.controlEl, undefined, 'beforeend');
							const newToolbar = isValid ? this.ntb.settingsManager.getToolbarByName(name) : undefined;
							this.ntb.settings.emptyViewToolbar = newToolbar?.uuid ?? null;
							// toggle launchpad setting
							const hasEmptyViewToolbar = !!this.ntb.settings.emptyViewToolbar;
							const launchpadSettingEl = this.containerEl.querySelector('#note-toolbar-launchpad-setting');
							launchpadSettingEl?.setAttribute('data-active', hasEmptyViewToolbar.toString());
							// update toolbar preview
							const toolbarPreviewFr = newToolbar && createToolbarPreviewFr(this.ntb, newToolbar, undefined, false);
							removeFieldHelp(emptyViewSetting.controlEl);
							setFieldHelp(emptyViewSetting.controlEl, toolbarPreviewFr);
							await this.ntb.settingsManager.save();
						}, 250));
					await updateItemComponentStatus(this.ntb, this, existingEmptyViewToolbar ? existingEmptyViewToolbar.name : '', SettingType.Toolbar, cb.inputEl.parentElement, undefined, 'beforeend');
				});
			const emptyViewToolbarFr = existingEmptyViewToolbar && createToolbarPreviewFr(this.ntb, existingEmptyViewToolbar, undefined, false);
			setFieldHelp(emptyViewSetting.controlEl, emptyViewToolbarFr);
		});

		appToolbarGroup.addSetting((launchpadSetting) => {
			launchpadSetting
				.setName(t('setting.display-locations.option-launchpad'))
				.setDesc(learnMoreFr(t('setting.display-locations.option-launchpad-description'), 'Toolbars-within-the-app#new-tab-view'))
				.addToggle((cb: ToggleComponent) => {
					cb.setValue(this.ntb.settings.showLaunchpad)
						.onChange(async (value: boolean) => {
							this.ntb.settings.showLaunchpad = value;
							await this.ntb.settingsManager.save();
						});
				});
			launchpadSetting.settingEl.id = 'note-toolbar-launchpad-setting';
			const hasEmptyViewToolbar = !!this.ntb.settings.emptyViewToolbar;
			launchpadSetting.settingEl.setAttribute('data-active', hasEmptyViewToolbar.toString());
		});

		appToolbarGroup.addSetting((ribbonActionSetting) => {
			ribbonActionSetting
				.setName(t('setting.display-locations.ribbon-action.name'))
				.setDesc(learnMoreFr(t('setting.display-locations.ribbon-action.description'), 'Toolbars-within-the-app#Ribbon-'))
				.addDropdown((dropdown) => 
					dropdown
						.addOptions(RIBBON_ACTION_OPTIONS)
						.setValue(this.ntb.settings.ribbonAction)
						.onChange(async (value: RibbonAction) => {
							this.ntb.settings.ribbonAction = value;
							await this.ntb.settingsManager.save();
						})
					);
		});

		appToolbarGroup.addSetting((textToolbarSetting) => {
			const existingTextToolbar = this.ntb.settingsManager.getToolbarById(this.ntb.settings.textToolbar);
			textToolbarSetting
				.setName(t('setting.display-locations.option-text'))
				.setDesc(learnMoreFr(t('setting.display-locations.option-text-description'), 'Toolbars-within-the-app#Selected-text'))
				.setClass('note-toolbar-setting-item-control-std-with-help')
				.addSearch(async (cb) => {
					new ToolbarSuggester(this.ntb, cb.inputEl);
					cb.setPlaceholder(t('setting.display-locations.option-text-placeholder'))
						.setValue(existingTextToolbar ? existingTextToolbar.name : '')
						.onChange(debounce(async (name) => {
							const isValid = await updateItemComponentStatus(this.ntb, this, name, SettingType.Toolbar, textToolbarSetting.controlEl, undefined, 'beforeend');
							const newToolbar = isValid ? this.ntb.settingsManager.getToolbarByName(name) : undefined;
							this.ntb.settings.textToolbar = newToolbar?.uuid ?? null;
							// update toolbar preview
							const toolbarPreviewFr = newToolbar && createToolbarPreviewFr(this.ntb, newToolbar, undefined, false);
							removeFieldHelp(textToolbarSetting.controlEl);
							setFieldHelp(textToolbarSetting.controlEl, toolbarPreviewFr);
							await this.ntb.settingsManager.save();
						}, 250));
					await updateItemComponentStatus(this.ntb, this, existingTextToolbar ? existingTextToolbar.name : '', SettingType.Toolbar, cb.inputEl.parentElement, undefined, 'beforeend');
				});
			const textToolbarPreviewFr = existingTextToolbar && createToolbarPreviewFr(this.ntb, existingTextToolbar, undefined, false);
			setFieldHelp(textToolbarSetting.controlEl, textToolbarPreviewFr);
		});

		settingsContainerEl.appendChild(collapsibleContainerEl);
		containerEl.append(settingsContainerEl);

	}

	/**
	 * Displays toolbar settings for file types.
	 * @param containerEl HTMLElement to add the settings to.
	 */
	displayFileTypeSettings(containerEl: HTMLElement): void {

		const collapsibleEl = createDiv('note-toolbar-setting-contexts-container');
		collapsibleEl.setAttribute('data-active', this.isSectionOpen['contexts'].toString());

		const otherContextSettings = new Setting(collapsibleEl)
			.setHeading()
			.setName(t('setting.display-contexts.name'))
			.setDesc(learnMoreFr(t('setting.display-contexts.description'), 'File-types'));

		this.renderSettingToggle(otherContextSettings, '.note-toolbar-setting-contexts-container', 'contexts');

		const collapsibleContainerEl = createDiv();
		collapsibleContainerEl.addClass('note-toolbar-setting-items-collapsible-container');

		const fileTypeGroup = new SettingGroup(collapsibleContainerEl);

		fileTypeGroup.addSetting((audioSetting) => {
			audioSetting
				.setName(t('setting.display-contexts.option-audio'))
				.addToggle((cb: ToggleComponent) => {
					cb
						.setValue(this.ntb.settings.showToolbarIn.audio)
						.onChange(async (value: boolean) => {
							this.ntb.settings.showToolbarIn.audio = value;
							await this.ntb.settingsManager.save();
						});
				});
		});

		fileTypeGroup.addSetting((basesSetting) => {
			basesSetting
				.setName(t('setting.display-contexts.option-bases'))
				.addToggle((cb: ToggleComponent) => {
					cb
						.setValue(this.ntb.settings.showToolbarIn.bases)
						.onChange(async (value: boolean) => {
							this.ntb.settings.showToolbarIn.bases = value;
							await this.ntb.settingsManager.save();
						});
				});
		});

		fileTypeGroup.addSetting((canvasSetting) => {
			canvasSetting
				.setName(t('setting.display-contexts.option-canvas'))
				.addToggle((cb: ToggleComponent) => {
					cb
						.setValue(this.ntb.settings.showToolbarIn.canvas)
						.onChange(async (value: boolean) => {
							this.ntb.settings.showToolbarIn.canvas = value;
							await this.ntb.settingsManager.save();
						});
				});
		});

		fileTypeGroup.addSetting((imageSetting) => {
			imageSetting
				.setName(t('setting.display-contexts.option-image'))
				.addToggle((cb: ToggleComponent) => {
					cb
						.setValue(this.ntb.settings.showToolbarIn.image)
						.onChange(async (value: boolean) => {
							this.ntb.settings.showToolbarIn.image = value;
							await this.ntb.settingsManager.save();
						});
				});
		});

		fileTypeGroup.addSetting((kanbanSetting) => {
			kanbanSetting
				.setName(t('setting.display-contexts.option-kanban'))
				.addToggle((cb: ToggleComponent) => {
					cb
						.setValue(this.ntb.settings.showToolbarIn.kanban)
						.onChange(async (value: boolean) => {
							this.ntb.settings.showToolbarIn.kanban = value;
							await this.ntb.settingsManager.save();
						});
				});
		});

		fileTypeGroup.addSetting((pdfSetting) => {
			pdfSetting
				.setName(t('setting.display-contexts.option-pdf'))
				.addToggle((cb: ToggleComponent) => {
					cb
						.setValue(this.ntb.settings.showToolbarIn.pdf)
						.onChange(async (value: boolean) => {
							this.ntb.settings.showToolbarIn.pdf = value;
							await this.ntb.settingsManager.save();
						});
				});
		});

		fileTypeGroup.addSetting((videoSetting) => {
			videoSetting
				.setName(t('setting.display-contexts.option-video'))
				.addToggle((cb: ToggleComponent) => {
					cb
						.setValue(this.ntb.settings.showToolbarIn.video)
						.onChange(async (value: boolean) => {
							this.ntb.settings.showToolbarIn.video = value;
							await this.ntb.settingsManager.save();
						});
				});
		});

		fileTypeGroup.addSetting((showToolbarInOtherSetting) => {
			showToolbarInOtherSetting
				.setName(t('setting.display-contexts.option-other'))
				.setDesc(learnMoreFr(t('setting.display-contexts.option-other-description'), 'File-types#Other-data-types'))
				.addText(text => text
					.setPlaceholder(t('setting.display-contexts.option-other-placeholder'))
					.setValue(this.ntb.settings.showToolbarInOther)
					.onChange(debounce(async (value) => {
						this.ntb.settings.showToolbarInOther = value;
						await this.ntb.settingsManager.save();	
					}, 750)));
		});

		collapsibleEl.appendChild(collapsibleContainerEl);
		containerEl.appendChild(collapsibleEl);

	}

	/**
	 * Displays settings for exporting/copying to markdown.
	 * @param containerEl 
	 */	
	displayCopyAsCalloutSettings(containerEl: HTMLElement): void {

		let collapsibleEl = createDiv();
		collapsibleEl.addClass('note-toolbar-setting-callout-container');
		collapsibleEl.setAttribute('data-active', this.isSectionOpen['callouts'].toString());

		let copyAsCalloutSetting = new Setting(collapsibleEl)
			.setName(t('setting.copy-as-callout.title'))
			.setDesc(learnMoreFr(t('setting.copy-as-callout.description'), 'Creating-callouts-from-toolbars'))
			.setHeading();

		this.renderSettingToggle(copyAsCalloutSetting, '.note-toolbar-setting-callout-container', 'callouts');

		let collapsibleContainerEl = createDiv();
		collapsibleContainerEl.addClass('note-toolbar-setting-items-collapsible-container');

		const calloutGroup = new SettingGroup(collapsibleContainerEl);

		calloutGroup.addSetting((includeIconsSetting) => {
			includeIconsSetting
				.setName(t('setting.copy-as-callout.option-icons'))
				.setDesc(t('setting.copy-as-callout.option-icons-description'))
				.addToggle((cb: ToggleComponent) => {
					cb
						.setValue(this.ntb.settings.export.includeIcons)
						.onChange(async (value) => {
							this.ntb.settings.export.includeIcons = value;
							await this.ntb.settingsManager.save();
						});
				});
		});

		calloutGroup.addSetting((replaceVarsSetting) => {
			replaceVarsSetting
				.setName(t('setting.copy-as-callout.option-vars'))
				.setDesc(t('setting.copy-as-callout.option-vars-description', {interpolation: { skipOnVariables: true }} ))
				.addToggle((cb: ToggleComponent) => {
					cb
						.setValue(this.ntb.settings.export.replaceVars)
						.onChange(async (value) => {
							this.ntb.settings.export.replaceVars = value;
							await this.ntb.settingsManager.save();
						});
				});
		});

		calloutGroup.addSetting((useIdsSetting) => {
			useIdsSetting
				.setName(t('setting.copy-as-callout.option-ids'))
				.setDesc(t('setting.copy-as-callout.option-ids-description'))
				.addToggle((cb: ToggleComponent) => {
					cb
						.setValue(this.ntb.settings.export.useIds)
						.onChange(async (value) => {
							this.ntb.settings.export.useIds = value;
							await this.ntb.settingsManager.save();
						});
				});
		});

		calloutGroup.addSetting((useDataElsSetting) => {
			useDataElsSetting
				.setName(t('setting.copy-as-callout.option-data'))
				.setDesc(t('setting.copy-as-callout.option-data-description'))
				.addToggle((cb: ToggleComponent) => {
					cb
						.setValue(this.ntb.settings.export.useDataEls)
						.onChange(async (value) => {
							this.ntb.settings.export.useDataEls = value;
							await this.ntb.settingsManager.save();
						});
				});
		});

		collapsibleEl.appendChild(collapsibleContainerEl);
		containerEl.appendChild(collapsibleEl);

	}

	/**
	 * Displays other global settings.
	 * @param containerEl 
	 */
	displayOtherSettings(containerEl: HTMLElement): void {

		new Setting(containerEl)
			.setHeading()
			.setName(t('setting.other.name'));

		const otherGroup = new SettingGroup(containerEl);

		otherGroup.addSetting((iconSetting) => {
			iconSetting
				.setName(t('setting.other.icon.name'))
				.setDesc(t('setting.other.icon.description'))
				.addButton((cb) => {
					cb.setIcon(this.ntb.settings.icon)
						.setTooltip(t('setting.other.icon.tooltip'))
						.onClick(async (e) => {
							e.preventDefault();
							const modal = new IconSuggestModal(
								this.ntb, this.ntb.settings.icon, false, (icon) => this.updateNoteToolbarIcon(cb.buttonEl, icon));
							modal.open();
						});
					cb.buttonEl.setAttribute("data-note-toolbar-no-icon", !this.ntb.settings.icon ? "true" : "false");
					cb.buttonEl.setAttribute("tabindex", "0");
					this.ntb.registerDomEvent(
						cb.buttonEl, 'keydown', (e) => {
							switch (e.key) {
								case "Enter":
								case " ": {
									e.preventDefault();					
									const modal = new IconSuggestModal(
										this.ntb, this.ntb.settings.icon, false, (icon) => this.updateNoteToolbarIcon(cb.buttonEl, icon));
									modal.open();
								}
							}
						});
				});
		});

		// sync setting (stored locally only)
		//  * FIXME: DISABLED DUE TO DATA LOSS ISSUES WITH USERS NOT EVEN USING SETTING (POTENTIAL CAUSE)
		//  * More info: https://github.com/chrisgurney/obsidian-note-toolbar/issues/340
		// const loadSettingsChanges = this.ntb.app.loadLocalStorage(LocalVar.LoadSettings) === 'true';
		// new Setting(containerEl)
		// 	.setName(t('setting.other.load-settings-changes.name'))
		// 	.setDesc(t('setting.other.load-settings-changes.description'))
		// 	.addToggle((cb) => {
		// 		cb.setValue(loadSettingsChanges)
		// 		cb.onChange(async (value) => {
		// 			this.ntb.app.saveLocalStorage(LocalVar.LoadSettings, value.toString());
		// 		});
		// 	});

		otherGroup.addSetting((keepPropsStateSetting) => {
			keepPropsStateSetting
				.setName(t('setting.other.keep-props-state.name'))
				.setDesc(t('setting.other.keep-props-state.description'))
				.addToggle((cb: ToggleComponent) => {
					cb
						.setValue(this.ntb.settings.keepPropsState)
						.onChange(async (value) => {
							this.ntb.settings.keepPropsState = value;
							await this.ntb.settingsManager.save();
						});
				});
		});

		otherGroup.addSetting((lockCalloutsSetting) => {
			lockCalloutsSetting
				.setName(t('setting.other.lock-callouts.name'))
				.setDesc(t('setting.other.lock-callouts.description'))
				.addToggle((cb: ToggleComponent) => {
					cb
						.setValue(this.ntb.settings.lockCallouts)
						.onChange(async (value) => {
							this.ntb.settings.lockCallouts = value;
							await this.ntb.settingsManager.save();
						});
				});
		});

		otherGroup.addSetting((scriptingSetting) => {
			scriptingSetting
				.setName(t('setting.other.scripting.name'))
				.setDesc(learnMoreFr(t('setting.other.scripting.description'), 'Executing-scripts'))
				.addToggle((cb: ToggleComponent) => {
					cb
						.setValue(this.ntb.settings.scriptingEnabled)
						.onChange(async (value) => {
							this.ntb.settings.scriptingEnabled = value;
							this.ntb.adapters.updateAdapters();
							await this.ntb.settingsManager.save();
						});
				});
		});
			
		otherGroup.addSetting((showEditInFabMenuSetting) => {
			showEditInFabMenuSetting
				.setName(t('setting.other.show-edit-tbar.name'))
				.setDesc(t('setting.other.show-edit-tbar.description'))
				.addToggle((cb) => {
					cb.setValue(this.ntb.settings.showEditInFabMenu)
					cb.onChange(async (value) => {
						this.ntb.settings.showEditInFabMenu = value;
						await this.ntb.settingsManager.save();
						// TODO? force the re-rendering of the current toolbar to update the menu
					});
				});
		});

		otherGroup.addSetting((debugSetting) => {
			debugSetting
				.setName(t('setting.other.debugging.name'))
				.setDesc(t('setting.other.debugging.description'))
				.addToggle((cb) => {
					cb.setValue(this.ntb.settings.debugEnabled)
					cb.onChange(async (value) => {
						this.ntb.settings.debugEnabled = value;
						await this.ntb.settingsManager.save();
					});
				});
		});

	}

	/**
	 * Updates the Note Toolbar Settings > Icon setting.
	 * @param settingEl 
	 * @param selectedIcon 
	 */
	updateNoteToolbarIcon(settingEl: HTMLElement, selectedIcon: string) {
		this.ntb.settings.icon = (selectedIcon === t('setting.icon-suggester.option-no-icon') ? "" : selectedIcon);
		this.ntb.settingsManager.save();
		setIcon(settingEl, selectedIcon === t('setting.icon-suggester.option-no-icon') ? 'lucide-plus-square' : selectedIcon);
		settingEl.setAttribute('data-note-toolbar-no-icon', selectedIcon === t('setting.icon-suggester.option-no-icon') ? 'true' : 'false');
	}

	/*************************************************************************
	 * SETTINGS DISPLAY HANDLERS
	 *************************************************************************/

	/**
	 * Handles moving mappings up and down the list, and deletion, based on click or keyboard event.
	 * @param keyEvent KeyboardEvent, if the keyboard is triggering this handler.
	 * @param index Number of the item in the list we're moving/deleting.
	 * @param action Direction of the move, "delete", or don't provided if just checking the keyboard for the action
	 */
	async listMoveHandler(keyEvent: KeyboardEvent | null, index: number, action?: 'up' | 'down' | 'delete'): Promise<void> {
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
				arraymove(this.ntb.settings.folderMappings, index, index - 1);
				break;
			case 'down':
				arraymove(this.ntb.settings.folderMappings, index, index + 1);
				keyEvent?.preventDefault();
				break;
			case 'delete':
				this.ntb.settings.folderMappings.splice(index, 1);
				keyEvent?.preventDefault();
				break;
		}
		await this.ntb.settingsManager.save();
		this.display();
	}

	async listMoveHandlerById(
		keyEvent: KeyboardEvent | null, 
		rowId: string,
		action?: 'up' | 'down' | 'delete'
	): Promise<void> {	
		let itemIndex = this.getIndexByRowId(rowId);
		// this.plugin.debug("listMoveHandlerById: moving index:", itemIndex);
		await this.listMoveHandler(keyEvent, itemIndex, action);
	}

	/*************************************************************************
	 * UTILITIES
	 *************************************************************************/

	getIndexByRowId(rowId: string): number {
		const list = this.getItemListEls();
		return Array.prototype.findIndex.call(list, (el: Element) => el.getAttribute('data-row-id') === rowId);
	}

	getItemListEls(): NodeListOf<HTMLElement> {
		return this.containerEl.querySelectorAll('.note-toolbar-sortablejs-list > div[data-row-id]');
	}

}