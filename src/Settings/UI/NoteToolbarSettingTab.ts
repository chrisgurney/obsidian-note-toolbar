import { App, ButtonComponent, Menu, MenuItem, Notice, Platform, PluginSettingTab, Setting, ToggleComponent, debounce, normalizePath, setIcon } from 'obsidian';
import NoteToolbarPlugin from 'main';
import { arraymove, debugLog, getElementPosition, moveElement } from 'Utils/Utils';
import { createToolbarPreviewFr, displayHelpSection, showWhatsNewIfNeeded, emptyMessageFr, learnMoreFr } from "./Utils/SettingsUIUtils";
import { FolderMapping, RIBBON_ACTION_OPTIONS, RibbonAction, SETTINGS_VERSION, t, ToolbarSettings } from 'Settings/NoteToolbarSettings';
import { FolderSuggester } from 'Settings/UI/Suggesters/FolderSuggester';
import { ToolbarSuggester } from 'Settings/UI/Suggesters/ToolbarSuggester';
import { IconSuggestModal } from 'Settings/UI/Modals/IconSuggestModal'
import Sortable from 'sortablejs';
import { exportToCallout } from 'Utils/ImportExport';
import { confirmWithModal } from './Modals/ConfirmModal';
import { ShareModal } from './Modals/ShareModal';
import { importFromModal } from './Modals/ImportModal';

export class NoteToolbarSettingTab extends PluginSettingTab {

	plugin: NoteToolbarPlugin;
	app: App;

	private itemListIdCounter: number = 0;

	private calloutSettingsOpen: boolean = false;
	private itemListOpen: boolean = true;
	private mappingListOpen: boolean = true;

	constructor(app: App, plugin: NoteToolbarPlugin) {
		super(app, plugin);
		this.app = app;
		this.plugin = plugin;
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
		this.displayEmptyViewSetting(containerEl);

		// other global settings
		this.displayCopyAsCalloutSettings(containerEl);
		this.displayOtherSettings(containerEl);

		if (focusSelector) {
			let focusEl = this.containerEl.querySelector(focusSelector) as HTMLElement;
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

		let itemsContainer = createDiv();
		itemsContainer.addClass('note-toolbar-setting-items-container');
		itemsContainer.setAttribute('data-active', this.itemListOpen.toString());

		// TODO: toolbar search
		// if (this.plugin.settings.toolbars.length > 4) {
		// 	let toolbarSearchSetting = new Setting(itemsContainer)
		// 		.setName('Search toolbars')
		// 		.setDesc('Filter toolbars by name or item.');

		// 	toolbarSearchSetting
		// 	.addSearch((cb) => {
		// 		cb.setPlaceholder('Search')
		// 		.onChange((value: string) => {
		// 			// TODO: dynamically filter list items (display: none), based on toolbar position/ID
		// 		});
		// 	});
		// }

		let toolbarListSetting = new Setting(itemsContainer)
			.setName(t('setting.toolbars.name'))
			.setDesc(t('setting.toolbars.description'))
			.setHeading();

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

		if (this.plugin.settings.toolbars.length > 4) {
			toolbarListSetting
				.addExtraButton((cb) => {
					cb.setIcon('right-triangle')
					.setTooltip(t('setting.button-collapse-tooltip'))
					.onClick(async () => {
						let itemsContainer = containerEl.querySelector('.note-toolbar-setting-items-container');
						if (itemsContainer) {
							this.itemListOpen = !this.itemListOpen;
							itemsContainer.setAttribute('data-active', this.itemListOpen.toString());
							let heading = itemsContainer.querySelector('.setting-item-info .setting-item-name');
							this.itemListOpen ? heading?.setText(t('setting.toolbars.name')) : heading?.setText(t('setting.toolbars.name-with-count', { count: this.plugin.settings.toolbars.length }));
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

		let itemsListContainer = createDiv();
		itemsListContainer.addClass('note-toolbar-setting-items-list-container');

		if (this.plugin.settings.toolbars.length == 0) {
			itemsListContainer
				.createEl("div", { text: emptyMessageFr(t('setting.toolbars.label-empty-create-tbar')) })
				.className = "note-toolbar-setting-empty-message";
		}
		else {
			let toolbarListDiv = createDiv();
			toolbarListDiv.addClass("note-toolbar-setting-toolbar-list");
			this.plugin.settings.toolbars.forEach(
				(toolbar) => {
					let toolbarListItemSetting = new Setting(toolbarListDiv)
						.setName(toolbar.name ? toolbar.name : t('setting.toolbars.label-tbar-name-not-set'))
						.setDesc(createToolbarPreviewFr(this.plugin, toolbar, this.plugin.settingsManager))
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
														title: t('setting.delete-toolbar.title', { toolbar: toolbar.name }),
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
						})
						.addButton((button: ButtonComponent) => {
							button
								.setTooltip(t('setting.toolbars.button-edit-tbar-tooltip'))
								.setButtonText(t('setting.toolbars.button-edit-tbar'))
								.onClick(() => {
									this.plugin.settingsManager.openToolbarSettings(toolbar, this);
								});
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

			itemsListContainer.appendChild(toolbarListDiv);

		}

		new Setting(itemsListContainer)
			.setClass("note-toolbar-setting-button")
			.addButton((button: ButtonComponent) => {
				button
					.setTooltip(t('setting.toolbars.button-new-tbar-tooltip'))
					.setButtonText(t('setting.toolbars.button-new-tbar'))
					.setCta()
					.onClick(async () => {
						const newToolbar = await this.plugin.settingsManager.newToolbar();
						this.plugin.settingsManager.openToolbarSettings(newToolbar, this);
					});
			});

		itemsContainer.appendChild(itemsListContainer);
		containerEl.append(itemsContainer);

	}

	/**
	 * Displays the empty view toolbar setting.
	 * @param containerEl HTMLElement to add the settings to.
	 */
	displayEmptyViewSetting(containerEl: HTMLElement): void {

		let hasEmptyViewToolbar = this.plugin.settings.emptyViewToolbar ? true : false;

		new Setting(containerEl)
			.setName(t('setting.display-rules.toggle-emptyview'))
			.setDesc(t('setting.display-rules.toggle-emptyview-description'))
			.addToggle((cb: ToggleComponent) => {
				cb
					.setValue(hasEmptyViewToolbar)
					.onChange(async (value: boolean) => {
						if (!value) this.plugin.settings.emptyViewToolbar = null;
						await this.plugin.settingsManager.save();
						let emptyViewToolbarContainer = containerEl.querySelector('#empty-view-tbar');
						if (emptyViewToolbarContainer) {
							emptyViewToolbarContainer.setAttribute('data-active', value.toString());
						}
					});
			});

		let emptyViewTbarSetting = new Setting(containerEl)
			.setName(t('setting.display-rules.option-emptyview'))
			.setDesc(t('setting.display-rules.option-emptyview-description'))
			.setClass('note-toolbar-setting-no-border')
			.addSearch((cb) => {
				new ToolbarSuggester(this.app, this.plugin, cb.inputEl);
				cb.setPlaceholder(t('setting.mappings.placeholder-toolbar'))
					.setValue(this.plugin.settings.emptyViewToolbar ? this.plugin.settingsManager.getToolbarName(this.plugin.settings.emptyViewToolbar) : '')
					.onChange(debounce(async (name) => {
						const newToolbar = this.plugin.settingsManager.getToolbarByName(name);
						if (newToolbar) {
							this.plugin.settings.emptyViewToolbar = newToolbar.uuid;
							await this.plugin.settingsManager.save();
						}
					}, 250));
			});
		emptyViewTbarSetting.settingEl.id = 'empty-view-tbar';
		emptyViewTbarSetting.settingEl.setAttribute('data-active', hasEmptyViewToolbar.toString());

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
		mappingsContainer.addClass('note-toolbar-setting-mappings-container');
		mappingsContainer.setAttribute('data-active', this.mappingListOpen.toString());

		let toolbarMapSetting = new Setting(mappingsContainer)
			.setName(t('setting.mappings.name'))
			.setDesc(t('setting.mappings.description'))
			.setClass("note-toolbar-setting-no-border");

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
					debugLog("sortable: index: ", item.oldIndex, " -> ", item.newIndex);
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
					.setButtonText(t('setting.mappings.button-new'))
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
						debugLog("rowId", rowId);
						rowId ? this.listMoveHandlerById(e, rowId) : undefined;
					});
			});

		toolbarFolderListItemDiv.append(textFieldsDiv);
		toolbarFolderListItemDiv.append(itemHandleDiv);

		return toolbarFolderListItemDiv;

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

		copyAsCalloutSetting
			.addExtraButton((cb) => {
				cb.setIcon('right-triangle')
				.setTooltip(t('setting.button-collapse-tooltip'))
				.onClick(async () => {
					let itemsContainer = containerEl.querySelector('.note-toolbar-setting-callout-container');
					if (itemsContainer) {
						this.calloutSettingsOpen = !this.calloutSettingsOpen;
						itemsContainer.setAttribute('data-active', this.calloutSettingsOpen.toString());
						cb.setTooltip(this.calloutSettingsOpen ? t('setting.button-collapse-tooltip') : t('setting.button-expand-tooltip'));
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
			.setName(t('setting.other.icon.name'))
			.setDesc(t('setting.other.icon.description'))
			.addButton((cb) => {
				cb.setIcon(this.plugin.settings.icon)
					.setTooltip(t('setting.other.icon.tooltip'))
					.onClick(async (e) => {
						e.preventDefault();
						const modal = new IconSuggestModal(this.plugin, (icon) => this.updateNoteToolbarIcon(cb.buttonEl, icon));
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
								const modal = new IconSuggestModal(this.plugin, (icon) => this.updateNoteToolbarIcon(cb.buttonEl, icon));
								modal.open();
						}
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
			.setName(t('setting.other.show-toolbar-in-file-menu.name'))
			.setDesc(learnMoreFr(t('setting.other.show-toolbar-in-file-menu.description'), 'Other-settings'))
			.addToggle((cb) => {
				cb.setValue(this.plugin.settings.showToolbarInFileMenu)
				cb.onChange(async (value) => {
					this.plugin.settings.showToolbarInFileMenu = value;
					await this.plugin.settingsManager.save();
					// TODO? force the re-rendering of the current toolbar to update the menu
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
		debugLog("listMoveHandlerById: moving index:", itemIndex);
		await this.listMoveHandler(keyEvent, itemIndex, action);
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