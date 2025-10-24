import { App, ButtonComponent, Menu, MenuItem, Notice, Platform, PluginSettingTab, Setting, ToggleComponent, debounce, normalizePath, setIcon, setTooltip } from 'obsidian';
import NoteToolbarPlugin from 'main';
import { arraymove, getElementPosition, moveElement } from 'Utils/Utils';
import { createToolbarPreviewFr, displayHelpSection, showWhatsNewIfNeeded, emptyMessageFr, learnMoreFr, handleKeyClick, iconTextFr, setFieldHelp, removeFieldHelp } from "./Utils/SettingsUIUtils";
import { FolderMapping, LocalVar, RIBBON_ACTION_OPTIONS, RibbonAction, SETTINGS_VERSION, t, ToolbarRule, ToolbarSettings } from 'Settings/NoteToolbarSettings';
import { FolderSuggester } from 'Settings/UI/Suggesters/FolderSuggester';
import { ToolbarSuggester } from 'Settings/UI/Suggesters/ToolbarSuggester';
import { IconSuggestModal } from 'Settings/UI/Modals/IconSuggestModal'
import Sortable from 'sortablejs';
import { exportToCallout } from 'Utils/ImportExport';
import { confirmWithModal } from './Modals/ConfirmModal';
import { ShareModal } from './Modals/ShareModal';
import { importFromModal } from './Modals/ImportModal';
// import RuleUi from './RuleUi';

export class NoteToolbarSettingTab extends PluginSettingTab {

	plugin: NoteToolbarPlugin;
	app: App;

	private itemListIdCounter: number = 0;

	private calloutSettingsOpen: boolean = false;
	private contextSettingsOpen: boolean = false;
	private itemListOpen: boolean = true;
	private mappingListOpen: boolean = true;

	// private ruleUi: RuleUi;

	constructor(app: App, plugin: NoteToolbarPlugin) {
		super(app, plugin);
		this.app = app;
		this.plugin = plugin;
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

		if (this.plugin.settings.version !== SETTINGS_VERSION) {
			new Setting(containerEl)
				.setName(t('setting.error-old-settings-name'))
				.setDesc(t('setting.error-old-settings-description', { oldVersion: this.plugin.settings.version + '', currentVersion: SETTINGS_VERSION + '' }))
				.setClass('note-toolbar-setting-plugin-error')
				.setHeading();
		}

		// help
		displayHelpSection(this.plugin, containerEl, undefined, () => {
			// @ts-ignore
			this.plugin.app.setting.close();
		});

		// toolbar list
		this.displayToolbarList(containerEl);

		// display rules
		new Setting(containerEl)
			.setName(t('setting.display-rules.name'))
			.setDesc(learnMoreFr(t('setting.display-rules.description'), 'Defining-where-to-show-toolbars'))
			.setHeading();
		this.displayPropertySetting(containerEl);
		this.displayFolderMap(containerEl);
		// this.ruleUi.displayRules(containerEl);
		this.displayEmptyViewSettings(containerEl);
		this.displayOtherViewSettings(containerEl);

		// other global settings
		this.displayCopyAsCalloutSettings(containerEl);
		this.displayOtherSettings(containerEl);

		// if search is enabled (>4 toolbars), focus on search icon by default
		if (!focusSelector && (this.plugin.settings.toolbars.length > 4)) {
			focusSelector = Platform.isPhone ? focusSelector : '#tbar-search input';
		}

		if (focusSelector) {
			let focusEl = this.containerEl.querySelector(focusSelector) as HTMLElement;
			// TODO: does this focus() need a setTimeout? 
			focusEl?.focus();
			if (scrollToFocus) {
				setTimeout(() => { 
					focusEl?.scrollIntoView(true);
				}, Platform.isMobile ? 100 : 0); // delay on mobile for the on-screen keyboard	
			}
		}

		// scroll to the position when the modal was last open
		this.rememberLastPosition(this.containerEl);

		// show the What's New view once, if the user hasn't seen it yet
		showWhatsNewIfNeeded(this.plugin);

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
		itemsContainer.setAttribute('data-active', this.itemListOpen.toString());

		const toolbarListHeading = this.itemListOpen ? t('setting.toolbars.name') : t('setting.toolbars.name-with-count', { count: this.plugin.settings.toolbars.length });
		const toolbarListSetting = new Setting(itemsContainer)
			.setName(toolbarListHeading)
			.setHeading();

		// search button (or field on desktop)
		if (this.plugin.settings.toolbars.length > 4) {
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
							if (!this.itemListOpen) {
								this.toggleToolbarList();
							}
						});
						handleKeyClick(this.plugin, cb.extraSettingsEl);
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
						this.plugin
					).then(async (importedToolbar: ToolbarSettings) => {
						if (importedToolbar) {
							await this.plugin.settingsManager.addToolbar(importedToolbar);
							await this.plugin.settingsManager.save();
							await this.plugin.commands.openToolbarSettingsForId(importedToolbar.uuid);
							this.display();
						}
					});
				});
				handleKeyClick(this.plugin, cb.extraSettingsEl);
			});

		// search field (phone)
		if (this.plugin.settings.toolbars.length > 4) {
			if (Platform.isPhone) this.renderSearchField(itemsContainer);
		}

		// collapse button
		if (this.plugin.settings.toolbars.length > 4) {
			toolbarListSetting
				.addExtraButton((cb) => {
					cb.setIcon('right-triangle')
					.setTooltip(t('setting.button-collapse-tooltip'))
					.onClick(async () => {
						this.toggleToolbarList();
					});
					cb.extraSettingsEl.addClass('note-toolbar-setting-item-expand');
					cb.extraSettingsEl.id = 'ntb-tbar-toggle-button';
					handleKeyClick(this.plugin, cb.extraSettingsEl);
				});
		}

		if (this.plugin.settings.toolbars.length == 0) {
			itemsListContainer
				.createEl("div", { text: emptyMessageFr(t('setting.toolbars.label-empty-create-tbar')) })
				.className = "note-toolbar-setting-empty-message";
		}
		else {
			const toolbarListDiv = createDiv();
			toolbarListDiv.addClass("note-toolbar-setting-toolbar-list");
			this.plugin.settings.toolbars.forEach(
				(toolbar) => {
					
					const toolbarNameFr = document.createDocumentFragment();
					toolbarNameFr.append(toolbar.name ? toolbar.name : t('setting.toolbars.label-tbar-name-not-set'));
					// show hotkey
					if (!Platform.isPhone) {
						const tbarCommand = this.plugin.commands.getCommandFor(toolbar);
						if (tbarCommand) {
							const hotkeyEl = this.plugin.hotkeys.getHotkeyEl(tbarCommand);
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
												this.plugin.settingsManager.duplicateToolbar(toolbar).then((newToolbarUuid) => {
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
												const shareUri = await this.plugin.protocolManager.getShareUri(toolbar);
												let shareModal = new ShareModal(this.plugin, shareUri, toolbar);
												shareModal.open();
											});
									});
									menu.addItem((menuItem: MenuItem) => {
										menuItem
											.setTitle(t('export.label-callout'))
											.setIcon('copy')
											.onClick(async () => {
												let calloutExport = await exportToCallout(this.plugin, toolbar, this.plugin.settings.export);
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
													this.plugin.app, 
													{ 
														title: t('setting.delete-toolbar.title', { toolbar: toolbar.name, interpolation: { escapeValue: false } }),
														questionLabel: t('setting.delete-toolbar.label-delete-confirm'),
														approveLabel: t('setting.delete-toolbar.button-delete-confirm'),
														denyLabel: t('setting.button-cancel'),
														warning: true
													}
												).then((isConfirmed: boolean) => {
													if (isConfirmed) {
														this.plugin.settingsManager.deleteToolbar(toolbar.uuid);
														this.plugin.settingsManager.save();
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
									this.plugin.settingsManager.openToolbarSettings(toolbar, this);
								});
							// used to distinguish buttons for keyboard navigation
							button.buttonEl.addClass('ntb-tbar-edit');
						});

					// for performance, render previews after a slight delay
					requestAnimationFrame(() => {
						toolbarListItemSetting.descEl.append(createToolbarPreviewFr(this.plugin, toolbar, this.plugin.settingsManager));
					});

					toolbarListItemSetting.settingEl.setAttribute('data-tbar-uuid', toolbar.uuid);
					toolbar.name ? undefined : toolbarListItemSetting.nameEl.addClass('mod-warning');
			
					this.plugin.registerDomEvent(
						toolbarListItemSetting.settingEl, 'keydown', (e: KeyboardEvent) => {
							switch (e.key) {
								case "d":
									const modifierPressed = (Platform.isWin || Platform.isLinux) ? e?.ctrlKey : e?.metaKey;
									if (modifierPressed) {
										this.plugin.settingsManager.duplicateToolbar(toolbar).then((newToolbarUuid) => {
											this.display(`.note-toolbar-setting-toolbar-list > div[data-tbar-uuid="${newToolbarUuid}"] > .setting-item-control > .mod-cta`);
										});
									}
								}
					});
				}
			);

			// support up/down arrow keys
			this.plugin.registerDomEvent(
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
			.setClass("note-toolbar-setting-button")
			.addButton((button: ButtonComponent) => {
				button
					.setTooltip(t('setting.toolbars.button-new-tbar-tooltip'))
					.setCta()
					.onClick(async () => {
						const newToolbar = await this.plugin.settingsManager.newToolbar();
						this.plugin.settingsManager.openToolbarSettings(newToolbar, this);
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
			.addSearch((cb) => {
				cb.setPlaceholder(t('setting.search.field-placeholder'))
				.onChange((search: string) => {
					if (!Platform.isPhone && !this.itemListOpen) {
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
							toolbarEl.style.display = (toolbarNameMatches || itemTextMatches) ? '' : 'none';

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
			this.plugin.registerDomEvent(
				searchInputEl, 'keydown', (e) => {
					switch (e.key) {
						case 'ArrowDown':
							const selector = '.note-toolbar-setting-toolbar-list .ntb-tbar-edit';
							const toolbarButtonEls = Array.from(this.containerEl.querySelectorAll<HTMLElement>(selector))
								.filter((btn) => getComputedStyle(btn.closest('.setting-item')!).display !== 'none');
							if (toolbarButtonEls.length > 0) toolbarButtonEls[0].focus();
							e.preventDefault();
							break;
					}
				}
			)
		}

		if (Platform.isPhone) {
			toolbarSearchSetting.settingEl.setAttribute('data-active', 'false');
			// search field: remove if it's empty and loses focus
			if (searchInputEl) {
				this.plugin.registerDomEvent(
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
			this.itemListOpen = !this.itemListOpen;
			itemsContainer.setAttribute('data-active', this.itemListOpen.toString());
			// TODO: REMOVE? commented out as was causing problems with expand/collapse
			// hide search field, if needed
			// if (!Platform.isDesktop && !this.itemListOpen) this.toggleSearch(false);
			// update heading (with toolbar count)
			let heading = itemsContainer.querySelector('.setting-item-info .setting-item-name');
			this.itemListOpen ? heading?.setText(t('setting.toolbars.name')) : heading?.setText(t('setting.toolbars.name-with-count', { count: this.plugin.settings.toolbars.length }));
			// update button tooltip
			let button = this.containerEl.querySelector('#ntb-tbar-toggle-button') as HTMLButtonElement;
			button?.setAttribute('aria-label', this.itemListOpen ? t('setting.button-collapse-tooltip') : t('setting.button-expand-tooltip'));
		}
	}

	/**
	 * Displays the property setting.
	 * @param containerEl HTMLElement to add the settings to.
	 */
	displayPropertySetting(containerEl: HTMLElement): void {

		new Setting(containerEl)
			.setName(t('setting.display-rules.option-property'))
			.setDesc(t('setting.display-rules.option-property-description'))
			.addText(text => text
				.setPlaceholder(t('setting.display-rules.option-property-placeholder'))
				.setValue(this.plugin.settings.toolbarProp)
				.onChange(debounce(async (value) => {
					this.plugin.settings.toolbarProp = value;
					// FIXME? set all toolbars to updated?
					// this.plugin.settings.toolbars.updated = new Date().toISOString();
					await this.plugin.settingsManager.save();	
				}, 750)));

	}

	/**
	 * Displays the folder mappings.
	 * @param containerEl HTMLElement to add the settings to.
	 */
	displayFolderMap(containerEl: HTMLElement): void {

		let mappingsContainer = createDiv();
		mappingsContainer.addClasses(['note-toolbar-setting-mappings-container', 'note-toolbar-setting-top-border']);
		mappingsContainer.setAttribute('data-active', this.mappingListOpen.toString());

		let toolbarMapSetting = new Setting(mappingsContainer)
			.setName(t('setting.mappings.name'))
			.setDesc(t('setting.mappings.description'));

		if (this.plugin.settings.folderMappings.length > 4) {
			toolbarMapSetting
				.addExtraButton((cb) => {
					cb.setIcon('right-triangle')
					.setTooltip(t('setting.button-collapse-tooltip'))
					.onClick(async () => {
						let mappingsContainer = containerEl.querySelector('.note-toolbar-setting-mappings-container');
						if (mappingsContainer) {
							this.mappingListOpen = !this.mappingListOpen;
							mappingsContainer.setAttribute('data-active', this.mappingListOpen.toString());
							let heading = mappingsContainer.querySelector('.setting-item-info .setting-item-name');
							this.mappingListOpen ? heading?.setText(t('setting.mappings.name')) : heading?.setText(t('setting.mappings.name-with-count', { count: this.plugin.settings.folderMappings.length }));
							cb.setTooltip(this.mappingListOpen ? t('setting.button-collapse-tooltip') : t('setting.button-expand-tooltip'));
						}
					});
					cb.extraSettingsEl.addClass('note-toolbar-setting-item-expand');
					handleKeyClick(this.plugin, cb.extraSettingsEl);
				});
		}
		else {
			// remove the area where the collapse button would be
			toolbarMapSetting.controlEl.style.display = 'none';
		}

		let collapsibleContainer = createDiv();
		collapsibleContainer.addClass('note-toolbar-setting-items-list-container');

		if (this.plugin.settings.folderMappings.length == 0) {
			mappingsContainer
				.createEl("div", { text: emptyMessageFr(t('setting.mappings.label-empty')) })
				.className = "note-toolbar-setting-empty-message";
		}
		else {
			let toolbarFolderListDiv = createDiv();
			toolbarFolderListDiv.addClass('note-toolbar-sortablejs-list');

			this.plugin.settings.folderMappings.forEach((mapping, index) => {
				let rowId = this.itemListIdCounter.toString();
				let toolbarFolderListItemDiv = this.generateMappingForm(mapping, rowId);
				toolbarFolderListDiv.append(toolbarFolderListItemDiv);
				this.itemListIdCounter++;
			});

			let sortable = Sortable.create(toolbarFolderListDiv, {
				chosenClass: 'sortable-chosen',
				ghostClass: 'sortable-ghost',
				handle: '.sortable-handle',
				onChange: (item) => navigator.vibrate(50),
				onChoose: (item) => navigator.vibrate(50),
				onSort: async (item) => {
					this.plugin.debug("sortable: index: ", item.oldIndex, " -> ", item.newIndex);
					if (item.oldIndex !== undefined && item.newIndex !== undefined) {
						moveElement(this.plugin.settings.folderMappings, item.oldIndex, item.newIndex);
						await this.plugin.settingsManager.save();
					}
				}
			});

			collapsibleContainer.appendChild(toolbarFolderListDiv)

		}

		//
		// "Add a new mapping" button
		//

		new Setting(collapsibleContainer)
			.setClass("note-toolbar-setting-button")
			.addButton((button: ButtonComponent) => {
				button
					.setTooltip(t('setting.mappings.button-new-tooltip'))
					.setCta()
					.onClick(async () => {
						let newMapping = {
							folder: "",
							toolbar: ""
						};
						this.plugin.settings.folderMappings.push(newMapping);
						await this.plugin.settingsManager.save();
						// TODO: add a form item to the existing list
							// TODO: put the existing code in a function
						// TODO: set the focus in the form
						this.display('.note-toolbar-sortablejs-list > div:last-child input[type="search"]', true);
					});
				button.buttonEl.setText(iconTextFr('plus', t('setting.mappings.button-new')));
			});

		mappingsContainer.appendChild(collapsibleContainer);
		containerEl.append(mappingsContainer);

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
							this.plugin.settings.folderMappings.some(
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
							await this.plugin.settingsManager.save();
						}
					}, 250));
			});
		new Setting(textFieldsDiv)
			.setClass("note-toolbar-setting-mapping-field")
			.addSearch((cb) => {
				new ToolbarSuggester(this.app, this.plugin, cb.inputEl);
				cb.setPlaceholder(t('setting.mappings.placeholder-toolbar'))
					.setValue(this.plugin.settingsManager.getToolbarName(mapping.toolbar))
					.onChange(debounce(async (name) => {
						let mappedToolbar = this.plugin.settingsManager.getToolbarByName(name);
						if (mappedToolbar) {
							mapping.toolbar = mappedToolbar.uuid;
							await this.plugin.settingsManager.save();
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
				this.plugin.registerDomEvent(
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
	 * @param context Object containing the state variable to change.
	 * @param stateKey key in the context object that holds the toggle state.
	 */
	renderSettingToggle(setting: Setting, containerSelector: string, context: Record<string, any>, stateKey: string): void {
		setting.addExtraButton((cb) => {
			cb.setIcon('right-triangle')
				.setTooltip(t('setting.button-collapse-tooltip'))
				.onClick(async () => {
					let itemsContainer = this.containerEl.querySelector(containerSelector);
					if (itemsContainer) {
						context[stateKey] = !context[stateKey];
						itemsContainer.setAttribute('data-active', context[stateKey].toString());
						cb.setTooltip(context[stateKey] ? t('setting.button-collapse-tooltip') : t('setting.button-expand-tooltip'));
					}
				});
			cb.extraSettingsEl.addClass('note-toolbar-setting-item-expand');
			handleKeyClick(this.plugin, cb.extraSettingsEl);
		});
	}

	/**
	 * Displays empty view toolbar settings.
	 * @param containerEl HTMLElement to add the settings to.
	 */
	displayEmptyViewSettings(containerEl: HTMLElement): void {

		const otherContextSettings = new Setting(containerEl)
			.setHeading()
			.setName(t('setting.display-empty-view.name'));

		new Setting(containerEl)
			.setName(t('setting.display-empty-view.option-emptyview'))
			.setDesc(t('setting.display-empty-view.option-emptyview-description'))
			.addSearch((cb) => {
				new ToolbarSuggester(this.app, this.plugin, cb.inputEl);
				cb.setPlaceholder(t('setting.display-empty-view.option-emptyview-placeholder'))
					.setValue(this.plugin.settings.emptyViewToolbar ? this.plugin.settingsManager.getToolbarName(this.plugin.settings.emptyViewToolbar) : '')
					.onChange(debounce(async (name) => {
						const newToolbar = this.plugin.settingsManager.getToolbarByName(name);
						this.plugin.settings.emptyViewToolbar = newToolbar?.uuid ?? null;
						const hasEmptyViewToolbar = !!this.plugin.settings.emptyViewToolbar;
						const launchpadSettingEl = this.containerEl.querySelector('#note-toolbar-launchpad-setting');
						launchpadSettingEl?.setAttribute('data-active', hasEmptyViewToolbar.toString());
						await this.plugin.settingsManager.save();
					}, 250));
			});

		const launchpadSetting = new Setting(containerEl)
			.setName(t('setting.display-empty-view.option-launchpad'))
			.setDesc(learnMoreFr(t('setting.display-empty-view.option-launchpad-description'), 'New-tab-view'))
			.addToggle((cb: ToggleComponent) => {
				cb.setValue(this.plugin.settings.showLaunchpad)
					.onChange(async (value: boolean) => {
						this.plugin.settings.showLaunchpad = value;
						await this.plugin.settingsManager.save();
					});
			});
		launchpadSetting.settingEl.id = 'note-toolbar-launchpad-setting';
		const hasEmptyViewToolbar = !!this.plugin.settings.emptyViewToolbar;
		launchpadSetting.settingEl.setAttribute('data-active', hasEmptyViewToolbar.toString());

	}

	/**
	 * Displays toolbar settings for other file types.
	 * @param containerEl HTMLElement to add the settings to.
	 */
	displayOtherViewSettings(containerEl: HTMLElement): void {

		const collapsibleEl = createDiv('note-toolbar-setting-contexts-container');
		collapsibleEl.setAttribute('data-active', this.contextSettingsOpen.toString());

		const otherContextSettings = new Setting(collapsibleEl)
			.setHeading()
			.setName(t('setting.display-contexts.name'))
			.setDesc(t('setting.display-contexts.description'));

		this.renderSettingToggle(otherContextSettings, '.note-toolbar-setting-contexts-container', this, 'contextSettingsOpen');

		const collapsibleContainer = createDiv('note-toolbar-setting-items-list-container');

		new Setting(collapsibleContainer)
			.setName(t('setting.display-contexts.option-audio'))
			.addToggle((cb: ToggleComponent) => {
				cb
					.setValue(this.plugin.settings.showToolbarIn.audio)
					.onChange(async (value: boolean) => {
						this.plugin.settings.showToolbarIn.audio = value;
						await this.plugin.settingsManager.save();
					});
			});

		new Setting(collapsibleContainer)
			.setName(t('setting.display-contexts.option-bases'))
			.addToggle((cb: ToggleComponent) => {
				cb
					.setValue(this.plugin.settings.showToolbarIn.bases)
					.onChange(async (value: boolean) => {
						this.plugin.settings.showToolbarIn.bases = value;
						await this.plugin.settingsManager.save();
					});
			});

		new Setting(collapsibleContainer)
			.setName(t('setting.display-contexts.option-canvas'))
			.addToggle((cb: ToggleComponent) => {
				cb
					.setValue(this.plugin.settings.showToolbarIn.canvas)
					.onChange(async (value: boolean) => {
						this.plugin.settings.showToolbarIn.canvas = value;
						await this.plugin.settingsManager.save();
					});
			});

		new Setting(collapsibleContainer)
			.setName(t('setting.display-contexts.option-filemenu'))
			.setDesc(learnMoreFr(t('setting.display-contexts.option-filemenu-description'), 'Other-settings'))
			.addToggle((cb) => {
				cb.setValue(this.plugin.settings.showToolbarInFileMenu)
				cb.onChange(async (value) => {
					this.plugin.settings.showToolbarInFileMenu = value;
					await this.plugin.settingsManager.save();
					// TODO? force the re-rendering of the current toolbar to update the menu
				});
			});

		new Setting(collapsibleContainer)
			.setName(t('setting.display-contexts.option-image'))
			.addToggle((cb: ToggleComponent) => {
				cb
					.setValue(this.plugin.settings.showToolbarIn.image)
					.onChange(async (value: boolean) => {
						this.plugin.settings.showToolbarIn.image = value;
						await this.plugin.settingsManager.save();
					});
			});

		new Setting(collapsibleContainer)
			.setName(t('setting.display-contexts.option-kanban'))
			.addToggle((cb: ToggleComponent) => {
				cb
					.setValue(this.plugin.settings.showToolbarIn.kanban)
					.onChange(async (value: boolean) => {
						this.plugin.settings.showToolbarIn.kanban = value;
						await this.plugin.settingsManager.save();
					});
			});

		new Setting(collapsibleContainer)
			.setName(t('setting.display-contexts.option-pdf'))
			.addToggle((cb: ToggleComponent) => {
				cb
					.setValue(this.plugin.settings.showToolbarIn.pdf)
					.onChange(async (value: boolean) => {
						this.plugin.settings.showToolbarIn.pdf = value;
						await this.plugin.settingsManager.save();
					});
			});

		new Setting(collapsibleContainer)
			.setName(t('setting.display-contexts.option-video'))
			.addToggle((cb: ToggleComponent) => {
				cb
					.setValue(this.plugin.settings.showToolbarIn.video)
					.onChange(async (value: boolean) => {
						this.plugin.settings.showToolbarIn.video = value;
						await this.plugin.settingsManager.save();
					});
			});

		new Setting(collapsibleContainer)
			.setName(t('setting.display-contexts.option-other'))
			.setDesc(t('setting.display-contexts.option-other-description'))
			.addText(text => text
				.setPlaceholder(t('setting.display-contexts.option-other-placeholder'))
				.setValue(this.plugin.settings.showToolbarInOther)
				.onChange(debounce(async (value) => {
					this.plugin.settings.showToolbarInOther = value;
					await this.plugin.settingsManager.save();	
				}, 750)));

		collapsibleEl.appendChild(collapsibleContainer);
		containerEl.appendChild(collapsibleEl);

	}

	/**
	 * Displays settings for exporting/copying to markdown.
	 * @param containerEl 
	 */	
	displayCopyAsCalloutSettings(containerEl: HTMLElement): void {

		let collapsibleEl = createDiv();
		collapsibleEl.addClass('note-toolbar-setting-callout-container');
		collapsibleEl.setAttribute('data-active', this.calloutSettingsOpen.toString());

		let copyAsCalloutSetting = new Setting(collapsibleEl)
			.setName(t('setting.copy-as-callout.title'))
			.setDesc(learnMoreFr(t('setting.copy-as-callout.description'), 'Creating-callouts-from-toolbars'))
			.setHeading();

		this.renderSettingToggle(copyAsCalloutSetting, '.note-toolbar-setting-callout-container', this, 'calloutSettingsOpen');

		let collapsibleContainer = createDiv();
		collapsibleContainer.addClass('note-toolbar-setting-items-list-container');

		new Setting(collapsibleContainer)
			.setName(t('setting.copy-as-callout.option-icons'))
			.setDesc(t('setting.copy-as-callout.option-icons-description'))
			.addToggle((cb: ToggleComponent) => {
				cb
					.setValue(this.plugin.settings.export.includeIcons)
					.onChange(async (value) => {
						this.plugin.settings.export.includeIcons = value;
						await this.plugin.settingsManager.save();
					});
			});

		new Setting(collapsibleContainer)
			.setName(t('setting.copy-as-callout.option-vars'))
			.setDesc(t('setting.copy-as-callout.option-vars-description', {interpolation: { skipOnVariables: true }} ))
			.addToggle((cb: ToggleComponent) => {
				cb
					.setValue(this.plugin.settings.export.replaceVars)
					.onChange(async (value) => {
						this.plugin.settings.export.replaceVars = value;
						await this.plugin.settingsManager.save();
					});
			});

		new Setting(collapsibleContainer)
			.setName(t('setting.copy-as-callout.option-ids'))
			.setDesc(t('setting.copy-as-callout.option-ids-description'))
			.addToggle((cb: ToggleComponent) => {
				cb
					.setValue(this.plugin.settings.export.useIds)
					.onChange(async (value) => {
						this.plugin.settings.export.useIds = value;
						await this.plugin.settingsManager.save();
					});
			});

		new Setting(collapsibleContainer)
			.setName(t('setting.copy-as-callout.option-data'))
			.setDesc(t('setting.copy-as-callout.option-data-description'))
			.addToggle((cb: ToggleComponent) => {
				cb
					.setValue(this.plugin.settings.export.useDataEls)
					.onChange(async (value) => {
						this.plugin.settings.export.useDataEls = value;
						await this.plugin.settingsManager.save();
					});
			});

		collapsibleEl.appendChild(collapsibleContainer);
		containerEl.appendChild(collapsibleEl);

	}

	/**
	 * Displays other global settings.
	 * @param containerEl 
	 */
	displayOtherSettings(containerEl: HTMLElement): void {

		new Setting(containerEl)
			.setName(t('setting.other.name'))
			.setHeading();

		new Setting(containerEl)
			.setName(t('setting.other.icon.name'))
			.setDesc(t('setting.other.icon.description'))
			.addButton((cb) => {
				cb.setIcon(this.plugin.settings.icon)
					.setTooltip(t('setting.other.icon.tooltip'))
					.onClick(async (e) => {
						e.preventDefault();
						const modal = new IconSuggestModal(
							this.plugin, this.plugin.settings.icon, (icon) => this.updateNoteToolbarIcon(cb.buttonEl, icon));
						modal.open();
					});
				cb.buttonEl.setAttribute("data-note-toolbar-no-icon", !this.plugin.settings.icon ? "true" : "false");
				cb.buttonEl.setAttribute("tabindex", "0");
				this.plugin.registerDomEvent(
					cb.buttonEl, 'keydown', (e) => {
						switch (e.key) {
							case "Enter":
							case " ":
								e.preventDefault();					
								const modal = new IconSuggestModal(
									this.plugin, this.plugin.settings.icon, (icon) => this.updateNoteToolbarIcon(cb.buttonEl, icon));
								modal.open();
						}
					});
			});

		// sync setting (stored locally only)
		//  * FIXME: DISABLED DUE TO DATA LOSS ISSUES WITH USERS NOT EVEN USING SETTING (POTENTIAL CAUSE)
		//  * More info: https://github.com/chrisgurney/obsidian-note-toolbar/issues/340
		// const loadSettingsChanges = this.plugin.app.loadLocalStorage(LocalVar.LoadSettings) === 'true';
		// new Setting(containerEl)
		// 	.setName(t('setting.other.load-settings-changes.name'))
		// 	.setDesc(t('setting.other.load-settings-changes.description'))
		// 	.addToggle((cb) => {
		// 		cb.setValue(loadSettingsChanges)
		// 		cb.onChange(async (value) => {
		// 			this.plugin.app.saveLocalStorage(LocalVar.LoadSettings, value.toString());
		// 		});
		// 	});

		new Setting(containerEl)
			.setName(t('setting.other.keep-props-state.name'))
			.setDesc(t('setting.other.keep-props-state.description'))
			.addToggle((cb: ToggleComponent) => {
				cb
					.setValue(this.plugin.settings.keepPropsState)
					.onChange(async (value) => {
						this.plugin.settings.keepPropsState = value;
						await this.plugin.settingsManager.save();
					});
			});

		new Setting(containerEl)
			.setName(t('setting.other.lock-callouts.name'))
			.setDesc(t('setting.other.lock-callouts.description'))
			.addToggle((cb: ToggleComponent) => {
				cb
					.setValue(this.plugin.settings.lockCallouts)
					.onChange(async (value) => {
						this.plugin.settings.lockCallouts = value;
						await this.plugin.settingsManager.save();
					});
			});
			
		new Setting(containerEl)
			.setName(t('setting.other.scripting.name'))
			.setDesc(learnMoreFr(t('setting.other.scripting.description'), 'Executing-scripts'))
			.addToggle((cb: ToggleComponent) => {
				cb
					.setValue(this.plugin.settings.scriptingEnabled)
					.onChange(async (value) => {
						this.plugin.settings.scriptingEnabled = value;
						this.plugin.updateAdapters();
						await this.plugin.settingsManager.save();
					});
			});

		new Setting(containerEl)
			.setName(t('setting.other.show-edit-tbar.name'))
			.setDesc(t('setting.other.show-edit-tbar.description'))
			.addToggle((cb) => {
				cb.setValue(this.plugin.settings.showEditInFabMenu)
				cb.onChange(async (value) => {
					this.plugin.settings.showEditInFabMenu = value;
					await this.plugin.settingsManager.save();
					// TODO? force the re-rendering of the current toolbar to update the menu
				});
			});

		new Setting(containerEl)
			.setName(t('setting.other.ribbon-action.name'))
			.setDesc(learnMoreFr(t('setting.other.ribbon-action.description'), 'Navigation-bar'))
			.addDropdown((dropdown) => 
				dropdown
					.addOptions(RIBBON_ACTION_OPTIONS)
					.setValue(this.plugin.settings.ribbonAction)
					.onChange(async (value: RibbonAction) => {
						this.plugin.settings.ribbonAction = value;
						await this.plugin.settingsManager.save();
					})
				);

		new Setting(containerEl)
			.setName(t('setting.other.debugging.name'))
			.setDesc(t('setting.other.debugging.description'))
			.addToggle((cb) => {
				cb.setValue(this.plugin.settings.debugEnabled)
				cb.onChange(async (value) => {
					this.plugin.settings.debugEnabled = value;
					await this.plugin.settingsManager.save();
				});
			});

	}

	/**
	 * Updates the Note Toolbar Settings > Icon setting.
	 * @param settingEl 
	 * @param selectedIcon 
	 */
	updateNoteToolbarIcon(settingEl: HTMLElement, selectedIcon: string) {
		this.plugin.settings.icon = (selectedIcon === t('setting.icon-suggester.option-no-icon') ? "" : selectedIcon);
		this.plugin.settingsManager.save();
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
				arraymove(this.plugin.settings.folderMappings, index, index - 1);
				break;
			case 'down':
				arraymove(this.plugin.settings.folderMappings, index, index + 1);
				keyEvent?.preventDefault();
				break;
			case 'delete':
				this.plugin.settings.folderMappings.splice(index, 1);
				keyEvent?.preventDefault();
				break;
		}
		await this.plugin.settingsManager.save();
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

	private lastScrollPosition: number;

	/**
	 * Remembers the scrolling position of the user and jumps to it on display.
	 * @author Taitava (Shell Commands plugin)
	 * @link https://github.com/Taitava/obsidian-shellcommands/blob/8d030a23540d587a85bd0dfe2e08c8e6b6b955ab/src/settings/SC_MainSettingsTab.ts#L701 
	*/
    private rememberLastPosition(containerEl: HTMLElement) {

		// this.plugin.debug("rememberLastPosition:", containerEl);

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

	getIndexByRowId(rowId: string): number {
		const list = this.getItemListEls();
		return Array.prototype.findIndex.call(list, (el: Element) => el.getAttribute('data-row-id') === rowId);
	}

	getItemListEls(): NodeListOf<HTMLElement> {
		return this.containerEl.querySelectorAll('.note-toolbar-sortablejs-list > div[data-row-id]');
	}

}