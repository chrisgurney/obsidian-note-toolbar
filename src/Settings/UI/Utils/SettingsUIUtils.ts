import NoteToolbarPlugin from "main";
import { ButtonComponent, getIcon, ItemView, Notice, Platform, setIcon, Setting, setTooltip, TFile, TFolder, ToggleComponent } from "obsidian";
import { COMMAND_DOES_NOT_EXIST, ComponentType, DEFAULT_ITEM_VISIBILITY_SETTINGS, IGNORE_PLUGIN_IDS, ItemComponentVisibility, ItemType, ScriptConfig, SettingType, t, ToolbarItemSettings, ToolbarSettings, URL_RELEASES, URL_USER_GUIDE, VIEW_TYPE_GALLERY, VIEW_TYPE_HELP, VIEW_TYPE_WHATS_NEW, ViewModeType, WHATSNEW_VERSION } from "Settings/NoteToolbarSettings";
import SettingsManager from "Settings/SettingsManager";
import { hasVisibleComponents, importArgs } from "Utils/Utils";
import { PLUGIN_VERSION } from "version";
import { confirmWithModal } from "../Modals/ConfirmModal";
import ItemModal from "../Modals/ItemModal";
import ItemSuggestModal, { ItemSuggestMode } from "../Modals/ItemSuggestModal";
import ToolbarSettingsModal from "../Modals/ToolbarSettingsModal";
import ToolbarSuggestModal from "../Modals/ToolbarSuggestModal";
import NoteToolbarSettingTab from "../NoteToolbarSettingTab";

// warnings if this toolbar is assigned to any app locations
const APP_TOOLBAR_WARNINGS = [
	{ key: 'defaultToolbar', warning: t('setting.delete-toolbar.warning-default') },
	{ key: 'editorMenuToolbar', warning: t('setting.delete-toolbar.warning-editor-menu') },
	{ key: 'emptyViewToolbar', warning: t('setting.delete-toolbar.warning-empty-view') },
	{ key: 'ribbonToolbar', warning: t('setting.delete-toolbar.warning-ribbon') },
	{ key: 'textToolbar', warning: t('setting.delete-toolbar.warning-text') },
	{ key: 'webviewerToolbar', warning: t('setting.delete-toolbar.warning-webviewer') }
] as const;

export default class SettingsUIUtils {

	constructor(
		private ntb: NoteToolbarPlugin
	) {}

	addCloseToPhoneNav(view: ItemView) {
		if (!Platform.isPhone) return;
		const closeButton = activeDocument.createElement('button');
		setIcon(closeButton, 'x');
		setTooltip(closeButton, t('setting.help.button-close'));
		closeButton.addClasses(['clickable-icon', 'view-action']);
		this.ntb.registerDomEvent(closeButton, 'click', (e) => view.leaf?.detach());
		const viewEl = view.leaf?.containerEl as HTMLElement | null;
		const viewActionsEl = viewEl?.querySelector('.view-actions') as HTMLElement;
		viewActionsEl?.insertAdjacentElement('afterbegin', closeButton);
	}

	/**
	 * Shows a confirmation modal to delete a toolbar, with warnings if it's in use.
	 * @param toolbar ToolbarSettings to delete
	 * @param onConfirm callback to execute after successful deletion
	 */
	async confirmDeleteToolbar(toolbar: ToolbarSettings, onConfirm: () => void): Promise<void> {
		const questionFr = activeDocument.createDocumentFragment();
		questionFr.createEl('p', { text: t('setting.delete-toolbar.label-delete-confirm') });
		questionFr.createEl('p', { text: t('setting.delete-toolbar.warning-permanent') });

		const notesFr = activeDocument.createDocumentFragment();
		const warningsFr = notesFr.createEl('ul');

		// warnings if this toolbar is assigned to any app locations
		APP_TOOLBAR_WARNINGS.forEach(({ key, warning }) => {
			if (this.ntb.settings[key] === toolbar.uuid) {
				warningsFr
					.createEl('li', { text: warning })
					.addClass('mod-warning');
			}
		});

		// check usage stats
		let usageStats = this.ntb.settingsUtils.getToolbarUsageText(toolbar);
		if (usageStats) {
			warningsFr.createEl('li', { text: t('setting.usage.description') + usageStats });
		}

		// add usage note
		warningsFr.createEl('li', { 
			text: t('setting.delete-toolbar.label-usage-note', { 
				propertyName: this.ntb.settings.toolbarProp, 
				toolbarName: toolbar.name 
			}) 
		});

		// confirm and delete
		const isConfirmed = await confirmWithModal(this.ntb.app, {
			title: t('setting.delete-toolbar.title', { toolbar: toolbar.name }),
			questionLabel: questionFr,
			notes: notesFr,
			approveLabel: t('setting.delete-toolbar.button-delete-confirm'),
			denyLabel: t('setting.button-cancel'),
			warning: true
		});
		if (isConfirmed) {
			await this.ntb.settingsManager.deleteToolbar(toolbar.uuid);
			onConfirm();
		}
	}

	/**
	 * Returns an element contianing a dismissable onboarding message.
	 * @param messageId unique identifier for the message, so it's not shown again
	 * @param title title of the message
	 * @param content content of the message
	 * @returns 
	 */
	createOnboardingMessageEl(
		messageId: string,
		title: string,
		content: string,
	): HTMLElement {
		let containerEl = createDiv();
		let setting = new Setting(containerEl)
			.setName(title)
			.setDesc(content)
			.setClass('note-toolbar-setting-plugin-onboarding')
			.addExtraButton((button) => {
				button
					.setIcon('cross')
					.setTooltip("Dismiss") // FIXME: localize string
					.onClick(() => {
						setting.settingEl.remove();
						this.ntb.settings.onboarding[messageId] = true;
						this.ntb.settingsManager.save();
					});
				button.extraSettingsEl.addClass('note-toolbar-setting-plugin-onboarding-close');
				this.handleKeyClick(button.extraSettingsEl);
			});
		return setting.settingEl;
	}

	/**
	 * Constructs a preview of the given toolbar, including the icons used.
	 * @param toolbar ToolbarSettings to display in the preview.
	 * @param settingsManager Optional SettingsManager if Groups need to be expanded within previews. 
	 * @param showEditLink set to true to add a link to edit the toolbar, after the preview; default is false.
	 * @returns DocumentFragment
	 */
	createToolbarPreviewFr(
		toolbar: ToolbarSettings, 
		settingsManager?: SettingsManager, 
		showEditLink: boolean = false
	): DocumentFragment {

		const toolbarFr: DocumentFragment = document.createDocumentFragment();

		const previewContainer = toolbarFr.createDiv();
		previewContainer.addClass('note-toolbar-setting-tbar-preview');

		const itemsFr: DocumentFragment = document.createDocumentFragment();

		if (toolbar.items.length > 0) {
			toolbar.items
				.filter((item: ToolbarItemSettings) => {

					// ignore all empty toolbar items (no label or icon)
					return ((item.label === "" && item.icon === "" && 
						![ItemType.Break, ItemType.Group, ItemType.Separator, ItemType.Spreader].includes(item.linkAttr.type)) ? false : true);
		
				})
				.map(item => {

					switch (item.linkAttr.type) {
						case ItemType.Break:
						case ItemType.Separator:
						case ItemType.Spreader:
							break;
						case ItemType.Group:
							if (settingsManager) {
								const groupToolbar = settingsManager.getToolbar(item.link);
								if (groupToolbar) {
									const groupItemEl = createDiv();
									groupItemEl.addClass("note-toolbar-setting-toolbar-list-preview-item");
									const groupNameEl = createSpan();
									groupNameEl.addClass('note-toolbar-setting-group-preview');
									groupNameEl.setText(groupToolbar.name);
									groupItemEl.append(groupNameEl);
									itemsFr.append(groupItemEl);
								}
							}
							break;
						default: {
							const itemIcon = item.icon ? getIcon(item.icon) : null;
							if (itemIcon || item.label) {
								const defaultItemFr = createDiv();
								defaultItemFr.addClass("note-toolbar-setting-toolbar-list-preview-item");
								if (item.icon) {
									if (itemIcon) {
										const iconFr = document.createDocumentFragment();
										iconFr.appendChild(itemIcon.cloneNode(true) as SVGSVGElement);
										defaultItemFr.append(iconFr);
									}
								}
								if (item.label) {
									const labelFr = createSpan();
									labelFr.textContent = item.label;
									if (item.label && this.ntb.vars.hasVars(item.label)) {
										labelFr.addClass('note-toolbar-setting-item-preview-code');
									}
									defaultItemFr.append(labelFr);
								}
								if (item.tooltip) {
									setTooltip(defaultItemFr, item.tooltip);
								}
								itemsFr.append(defaultItemFr);
							}
							break;
						}

					}

				});
		}
		else {
			itemsFr.appendChild(this.emptyMessageFr(t('setting.item.label-preview-empty-no-items')));
		}
		previewContainer.appendChild(itemsFr);

		if (showEditLink) {
			let toolbarLinkContainer = createDiv();
			toolbarLinkContainer.addClass('note-toolbar-setting-tbar-preview-edit');
			let toolbarLink = createEl('a');
			toolbarLink.href = "obsidian://note-toolbar?toolbarsettings=" + encodeURIComponent(toolbar.name);
			toolbarLink.setText(t('setting.item.label-preview-edit', { toolbar: toolbar.name, interpolation: { escapeValue: false } }));
			toolbarLinkContainer.appendChild(toolbarLink);
			toolbarFr.appendChild(toolbarLinkContainer);
		}

		return toolbarFr;

	}

	/**
	 * Displays the help section.
	 * @param containerEl HTMLElement to add the content to.
	 * @param useTextVersion set to true to just use the small text version.
	 * @param closeCallback function to close the settings window, which will depend on where it was launched from
	 */
	displayHelpSection(settingsDiv: HTMLElement, useTextVersion: boolean = false, closeCallback: () => void) {
		
		if (Platform.isPhone || useTextVersion) {

			let helpContainerEl = settingsDiv.createDiv();
			helpContainerEl.addClass('note-toolbar-setting-help-section-phone');

			const helpDesc = document.createDocumentFragment();
			helpDesc.append("v" + PLUGIN_VERSION, " • ");
			const whatsNewLink = helpDesc.createEl("a", { href: "#", text: t('setting.button-whats-new') });
			this.ntb.registerDomEvent(whatsNewLink, 'click', (event) => { 
				this.ntb.app.workspace.getLeaf(true).setViewState({ type: VIEW_TYPE_WHATS_NEW, active: true });
				if (Platform.isPhone) this.ntb.app.workspace.leftSplit?.collapse();
				closeCallback();
			});
			helpDesc.append(' • ');
			const galleryLink = helpDesc.createEl("a", { href: "#", text: iconTextFr('layout-grid', t('setting.button-gallery')) });
			this.ntb.registerDomEvent(galleryLink, 'click', (event) => { 
				this.ntb.app.workspace.getLeaf(true).setViewState({ type: VIEW_TYPE_GALLERY, active: true });
				if (Platform.isPhone) this.ntb.app.workspace.leftSplit?.collapse();
				closeCallback();
			});
			helpDesc.append(' • ');
			const helpLink = helpDesc.createEl("a", { href: "#", text: iconTextFr('help-circle', t('setting.button-help')) });
			this.ntb.registerDomEvent(helpLink, 'click', (event) => { 
				this.ntb.app.workspace.getLeaf(true).setViewState({ type: VIEW_TYPE_HELP, active: true });
				if (Platform.isPhone) this.ntb.app.workspace.leftSplit?.collapse();
				closeCallback();
			});
			helpContainerEl.append(helpDesc);
			
		}
		else {

			const helpDesc = document.createDocumentFragment();
			const whatsNewLink = helpDesc.createEl("a", { href: "#", text: t('setting.button-whats-new') });
			this.ntb.registerDomEvent(whatsNewLink, 'click', (event) => { 
				this.ntb.app.workspace.getLeaf(true).setViewState({ type: VIEW_TYPE_WHATS_NEW, active: true });
				if (Platform.isPhone) this.ntb.app.workspace.leftSplit?.collapse();
				closeCallback();
			});

			new Setting(settingsDiv)
				.setName(t('plugin.note-toolbar') + ' • v' + PLUGIN_VERSION)
				.setClass('note-toolbar-setting-help-section')
				.setDesc(helpDesc)
				.addButton((button: ButtonComponent) => {
					button
						.setTooltip(t('setting.button-gallery-tooltip'))
						.onClick(() => {
							this.ntb.app.workspace.getLeaf(true).setViewState({ type: VIEW_TYPE_GALLERY, active: true });
							if (Platform.isPhone) this.ntb.app.workspace.leftSplit?.collapse();
							closeCallback();
						})
						.buttonEl.setText(iconTextFr('layout-grid', t('setting.button-gallery')));
				})
				.addButton((button: ButtonComponent) => {
					button
						.setTooltip(t('setting.button-help-tooltip'))
						.onClick(() => {
							this.ntb.app.workspace.getLeaf(true).setViewState({ type: VIEW_TYPE_HELP, active: true });
							if (Platform.isPhone) this.ntb.app.workspace.leftSplit?.collapse();
							closeCallback();
						})
						.buttonEl.setText(iconTextFr('help-circle', t('setting.button-help')))
				});

		}

	}

	/**
	 * Creates a text fragment with the given message, for an empty state.
	 * @param message Message to return as a fragment.
	 * @returns DocumentFragment containing the message and styling.
	 */
	emptyMessageFr(message: string, linkText?: string, linkCallback?: () => void): DocumentFragment {

		let messageFr = document.createDocumentFragment();
		let messageFrText = document.createElement("i");
		messageFrText.textContent = message;
		messageFr.append(messageFrText);

		if (linkText && linkCallback) {
			messageFr.append('\u00A0');
			const createLinkEl = messageFr.createEl('a', { href: '#', text: linkText });
			createLinkEl.addClass('note-toolbar-setting-focussable-link');
			this.ntb.registerDomEvent(createLinkEl, 'click', linkCallback);
			this.handleKeyClick(createLinkEl);
		}

		return messageFr;
	}

	/**
	 * Gets a list of plugin names required by this item, derived from the commandId or plugin property.
	 * @param item ToolbarItemSettings to get plugin list from
	 * @returns list of plugin names
	 */
	getPluginNames(item: ToolbarItemSettings): string | undefined {
		if (item.linkAttr.type === ItemType.Plugin) {
			const itemPluginType = (Array.isArray(item.plugin) ? item.plugin : [item.plugin]);
			// replace known commands with user-friendly strings (if supported), and create a list
			if (itemPluginType) return itemPluginType.map(p => t(`plugin.${p}`)).join(', ')
				else return undefined;
		}
		else if (item.linkAttr.type === ItemType.Command) {
			// make sure the command exists
			const command = this.ntb.app.commands.commands[item.linkAttr.commandId];
			const commandPluginId = item.linkAttr.commandId.split(':')[0];
			if (!command) {
				// show plugin name if known, otherwise show command ID
				const pluginName = t(`plugin.${commandPluginId}`, { defaultValue: '' });
				return pluginName || t('setting.add-item.error-invalid-command', { commandId: item.linkAttr.commandId });
			}
			// we can ignore built-in commands
			const itemPluginType = !IGNORE_PLUGIN_IDS.includes(commandPluginId) ? commandPluginId : undefined;
			// replace known commands with user-friendly string (if supported)
			if (itemPluginType) return t(`plugin.${itemPluginType}`)
				else return undefined;
		}
	}

	/**
	 * Returns a URI that opens a search of the toolbar name in the toolbar property across all notes.
	 * @param toolbarName name of the toolbar to look for.
	 * @returns string 'obsidian://' URI.
	 */
	private getToolbarPropSearchUri(toolbarName: string): string {
		let searchUri = 'obsidian://search?vault=' + this.ntb.app.vault.getName() + '&query=[' + this.ntb.settings.toolbarProp + ': ' + toolbarName + ']';
		return encodeURI(searchUri);
	}

	/**
	 * Search through settings to find out where this toolbar is referenced.
	 * @param id UUID of the toolbar to check usage for.
	 * @returns mappingCount and itemCount
	 */
	private getToolbarSettingsUsage(id: string): [number, number] {
		let mappingCount = this.ntb.settings.folderMappings.filter(mapping => mapping.toolbar === id).length;
		let itemCount = this.ntb.settings.toolbars.reduce((count, toolbar) => {
			return count + toolbar.items.filter(item => 
				item.link === id && (item.linkAttr.type === ItemType.Group || item.linkAttr.type === ItemType.Menu)
			).length;
		}, 0);
		return [mappingCount, itemCount];
	}

	getToolbarUsageFr(toolbar: ToolbarSettings, parent: ToolbarSettingsModal): DocumentFragment {
		let usageFr = document.createDocumentFragment();
		let usageStats = this.getToolbarUsageText(toolbar);
		if (usageStats) {
			usageFr.append(t('setting.usage.description'));
			usageFr.append(usageFr.createEl("br"));
			usageFr.append(usageStats);
		}
		else {
			usageFr.append(t('setting.usage.description_none'));
		}
		
		usageFr.append(usageFr.createEl("br"));
		const descLinkFr = usageFr.createEl('a', {href: '#', text: t('setting.usage.description-search')});
		usageFr.append(descLinkFr);
		this.ntb.registerDomEvent(descLinkFr, 'click', () => {
			parent?.close();
			// @ts-ignore
			ntb.app.setting.close();
			window.open(this.getToolbarPropSearchUri(toolbar.name));
		});

		return usageFr;
	}

	/**
	 * Returns mapping and item usage statistics for the given toolbar; empty string otherwise.
	 * @param toolbar ToolbarSettings
	 * @returns comma-separated list of usage statistics
	 */
	getToolbarUsageText(toolbar: ToolbarSettings): string {
		const [ mappingCount, itemCount ] = this.getToolbarSettingsUsage(toolbar.uuid);
		let usage: String[] = [];
		if (mappingCount > 0) usage.push(t('setting.usage.description-mappings', { count: mappingCount }));
		if (itemCount > 0) usage.push(t('setting.usage.description-toolbar-items', { count: itemCount }));
		return (usage.length > 0) ? usage.join(', ') : '';
	}

	handleKeyClick(el: HTMLElement) {
		el.tabIndex = 0;
		this.ntb.registerDomEvent(
			el, 'keydown', (evt) => {
				switch (evt.key) {
					case 'Enter':
					case ' ':
						evt.preventDefault();
						el.click();
				}
			});
	}

	/**
	 * Opens an item suggester that then adds the selected item to this toolbar.
	 */
	openItemSuggestModal(
		toolbar: ToolbarSettings, 
		mode: ItemSuggestMode, 
		parent?: ToolbarSettingsModal, 
		toolbarInsertIndex?: number
	) {
		const modal = new ItemSuggestModal(
			this.ntb, 
			undefined, 
			async (selectedItem: ToolbarItemSettings) => {
				
				const isBrowseGalleryItem = selectedItem.uuid === 'OPEN_GALLERY';
				if (isBrowseGalleryItem) {
					this.ntb.app.workspace.getLeaf(true).setViewState({ type: VIEW_TYPE_GALLERY, active: true });
					if (parent) parent.close();
					return;
				}

				const isEmptyItem = selectedItem.uuid === 'NEW_ITEM';
				if (isEmptyItem) selectedItem.label = '';
				if (isEmptyItem && parent) {
					const itemContainer = parent.contentEl.querySelector('.note-toolbar-sortablejs-list') as HTMLElement;
					if (itemContainer) {
						await parent.itemListUi.addItemHandler(selectedItem.linkAttr.type, itemContainer);
						return;
					}
				}

				let newItem = await this.ntb.settingsManager.duplicateToolbarItem(toolbar, selectedItem, toolbarInsertIndex);
				// reset the visibility setting, as there's no prior indication to the user as to its visibility
				newItem.visibility = JSON.parse(JSON.stringify(DEFAULT_ITEM_VISIBILITY_SETTINGS));

				// confirm with user if they would like to enable scripting
				const isScriptingEnabled = await this.openScriptPrompt(newItem);
				if (!isScriptingEnabled) return;

				if (selectedItem.inGallery && !(await this.ntb.settingsManager.resolveGalleryItem(newItem))) return;
				
				toolbar.updated = new Date().toISOString();
				await this.ntb.settingsManager.save();

				if (isEmptyItem) new ItemModal(this.ntb, toolbar, newItem).open()
				else new Notice(t('setting.add-item.notice-item-added', { toolbarName: toolbar.name, interpolation: { escapeValue: false } })).containerEl.addClass('mod-success');

				parent?.display(newItem.uuid);

			}, 
			mode
		);
		modal.open();
	}

	/**
	 * Prompts the user if they want to enable scripting, if the item requires it.
	 * @param item 
	 * @returns true if the user confirmed, false if they cancelled
	 */
	async openScriptPrompt(item: ToolbarItemSettings): Promise<boolean> {
		const isScript = [ItemType.Dataview,  ItemType.JavaScript, ItemType.JsEngine, ItemType.Templater].contains(item.linkAttr.type);

		if (isScript && !this.ntb.settings.scriptingEnabled) {
			const isConfirmed = await confirmWithModal(
				this.ntb.app, 
				{
					title: t('setting.add-item.title-confirm-scripting'),
					questionLabel: t('setting.add-item.label-confirm-scripting'),
					approveLabel: t('setting.button-enable'),
					denyLabel: t('setting.button-cancel')
				}
			);
			
			if (isConfirmed) {
				this.ntb.settings.scriptingEnabled = true;
				this.ntb.adapters.updateAdapters();
				await this.ntb.settingsManager.save();
			}

			return isConfirmed;
		}

		return true;
	}

	/**
	 * Copies an item to a toolbar of the user's choice.
	 * @param fromToolbar toolbar to copy the item from
	 * @param item item to copy
	 */
	async copyToolbarItem(fromToolbar: ToolbarSettings, item: ToolbarItemSettings): Promise<void> {
		const modal = new ToolbarSuggestModal(this.ntb, false, false, false, async (toToolbar: ToolbarSettings) => {
			if (toToolbar) {
				await this.ntb.settingsManager.duplicateToolbarItem(toToolbar, item);
				await this.ntb.settingsManager.save();
				new Notice(t('setting.item.menu-copy-item-notice', { toolbarName: toToolbar.name })).containerEl.addClass('mod-success');
			}
		});
		modal.open();
	}

	/**
	 * Moves an item to a toolbar of the user's choice.
	 * @param fromToolbar toolbar to move the item from
	 * @param item item to move
	 * @param callback function to execute after move is complete, to update the UI as needed
	 */
	async moveToolbarItem(fromToolbar: ToolbarSettings, item: ToolbarItemSettings, callback: () => void | Promise<void>): Promise<void> {
		const modal = new ToolbarSuggestModal(this.ntb, false, false, false, async (toToolbar: ToolbarSettings) => {
			if (toToolbar) {
				fromToolbar.items.remove(item);
				toToolbar.items.push(item);
				await this.ntb.settingsManager.save();
				new Notice(t('setting.item.menu-move-item-notice', { toolbarName: toToolbar.name })).containerEl.addClass('mod-success');
				await callback();
			}
		});
		modal.open();
	}

	/**
	 * Renders the item suggestion into the given element, for use in item suggesters and Quick Tools.
	 * @param item ToolbarItemSettings to render
	 * @param el HEMLElement to render suggestion into
	 * @param inputStr string that was used to search for this item
	 * @param showMeta boolean to set true if the meta icon should be shown (for Quick Tools)
	 * @param replaceVars boolean to set true if vars should be replaced; false to leave as-is (default)
	 */
	renderItemSuggestion(
		item: ToolbarItemSettings, 
		el: HTMLElement, 
		inputStr: string, 
		showMeta: boolean = false,
		replaceVars: boolean = false
	) {
		if (!item) { return }
		el.addClass("note-toolbar-item-suggestion");
		el.setAttribute('id', item.uuid);

		const itemMainEl = el.createDiv();
		itemMainEl.addClass('note-toolbar-item-suggestion-container');

		if (item.icon) {
			let svgExists = getIcon(item.icon);
			if (svgExists) {
				let iconGlyphEl = itemMainEl.createSpan();
				setIcon(iconGlyphEl, item.icon);
			}
		}
		let itemNameEl = itemMainEl.createSpan();
		let itemName = item.label || item.tooltip;

		// fallback if no label or tooltip
		let isItemNameLink = false;
		if (!itemName) {
			if (item.icon) {
				isItemNameLink = true;
				itemName = item.link;
			}
			else {
				itemName = '';
			}
		}

		itemNameEl.addClass("note-toolbar-item-suggester-name");
		const itemLabelEl = itemNameEl.createSpan();

		let title = itemName;
		// replace variables in labels (or tooltip, if no label set)
		const activeFile = this.ntb.app.workspace.getActiveFile();
		if (replaceVars) {
			this.ntb.vars.replaceVars(itemName, activeFile).then((resolvedName: string) => {
				itemLabelEl.setText(resolvedName);
			});
		}
		else {
			itemLabelEl.setText(itemName);
		}
		
		if (showMeta) {
			let itemMeta = itemNameEl.createSpan();
			itemMeta.addClass("note-toolbar-item-suggester-type");
			switch (item.linkAttr.type) {
				case ItemType.Command:
					setTooltip(itemMeta, t('setting.item.option-command'));
					break;
				case ItemType.File:
					setIcon(itemMeta, 'file');
					setTooltip(itemMeta, t('setting.item.option-file'));
					break;
				case ItemType.Menu:
					setIcon(itemMeta, 'menu');
					setTooltip(itemMeta, t('setting.item.option-menu'));
					break;
				case ItemType.Uri:
					setIcon(itemMeta, 'globe');
					setTooltip(itemMeta, t('setting.item.option-uri'));
					break;
				case ItemType.Dataview:
				case ItemType.JavaScript:
				case ItemType.JsEngine:
					setIcon(itemMeta, 'scroll');
					setTooltip(itemMeta, "Script");
					break;
				case ItemType.Templater:
					setIcon(itemMeta, 'templater-icon');
					setTooltip(itemMeta, "Templater");
					break;
			}
		}
		
		const inputStrLower = inputStr.toLowerCase();
		// if what's shown doesn't already contain the searched string, show it below
		if (!title.toLowerCase().includes(inputStrLower)) {
			let inputMatch = 
				item.label.toLowerCase().includes(inputStrLower)
					? item.label
					: item.tooltip.toLowerCase().includes(inputStrLower) 
						? item.tooltip 
						: item.link;
			const itemNoteEl = el.createDiv();
			itemNoteEl.addClass('note-toolbar-item-suggester-note');
			itemNoteEl.setText(inputMatch);
		}
		// show the description if one is set
		if (item.description) {
			const itemDescEl = el.createDiv();
			itemDescEl.addClass('note-toolbar-item-suggester-note');
			itemDescEl.setText(item.description);

			// show the plugin(s) supported, or the command ID used
			if ([ItemType.Command, ItemType.Dataview, ItemType.JsEngine, ItemType.Plugin, ItemType.Templater].contains(item.linkAttr.type)) {
				let itemPluginText = this.getPluginNames(item);
				if (itemPluginText) {
					const pluginDescEl = el.createDiv();
					pluginDescEl.addClass('note-toolbar-item-suggester-note');	
					setIcon(pluginDescEl.createSpan(), 'puzzle');		
					pluginDescEl.createSpan().setText(t('gallery.label-requires-plugin', { plugin: itemPluginText }));
				}
			}
		}
	}

	/**
	 * Runs onboarding logic once per onboardingId.
	 * @param onboardingId unique identifier for this onboarding step
	 * @param callback function to execute on first run
	 */
	async runOnboarding(onboardingId: string, callback: () => void | Promise<void>): Promise<void> {
		if (!this.ntb.settings.onboarding[onboardingId]) {
			this.ntb.settings.onboarding[onboardingId] = true;
			await this.ntb.settingsManager.save();
			await callback();
		}
	}

	/**
	 * Updates the given element with an error border and text.
	 * @param parent ToolbarSettingsModal
	 * @param fieldEl HTMLElement to update
	 * @param position Position to insert the error text
	 * @param errorText Optional error text to display
	 * @param errorLink Optional link to display after error text
	 */
	setFieldError(
		parent: NoteToolbarSettingTab | ToolbarSettingsModal | ItemModal, 
		fieldEl: HTMLElement | null, 
		position: 'afterend' | 'beforeend',
		errorText?: string, 
		errorLink?: HTMLAnchorElement
	) {
		if (fieldEl) {
			let fieldContainerEl = fieldEl.closest('.setting-item-control');
			if (!fieldContainerEl) {
				fieldContainerEl = fieldEl.closest('.note-toolbar-setting-item-preview-container');
			}
			const hasError = 
				(position === 'afterend') 
					? fieldContainerEl?.nextElementSibling?.classList.contains('note-toolbar-setting-field-error') === true
					: fieldContainerEl?.querySelector('.note-toolbar-setting-field-error') !== null;
			if (fieldContainerEl && !hasError) {
				if (errorText) {
					let errorDiv = createEl('div', { 
						text: errorText, 
						cls: 'note-toolbar-setting-field-error' });
					if (errorLink) {
						// as it's not easy to listen for plugins being enabled,
						// user will have to click a refresh link to dismiss the error
						this.ntb.registerDomEvent(errorLink, 'click', (event) => {
							let refreshLink = document.createDocumentFragment().createEl('a', { text: t('setting.item.option-command-error-refresh'), href: '#' } );
							let refreshIcon = refreshLink.createSpan();
							setIcon(refreshIcon, 'refresh-cw');
							let oldLink = event.currentTarget as HTMLElement;
							oldLink?.replaceWith(refreshLink);
							this.ntb.registerDomEvent(refreshLink, 'click', event => {
								parent.display();
							});
						});
						errorDiv.append(' ', errorLink);
					}
					fieldContainerEl.insertAdjacentElement(position, errorDiv);
				}
				fieldEl.addClass('note-toolbar-setting-error');
			}
		}
	}

	/**
	 * Updates the toolbar preview for the given setting.
	 */
	setFieldPreview(setting: Setting, toolbar: ToolbarSettings | undefined) {
		const toolbarPreviewFr = toolbar && this.ntb.settingsUtils.createToolbarPreviewFr(toolbar, undefined, false);
		removeFieldHelp(setting.controlEl);
		setFieldHelp(setting.controlEl, toolbarPreviewFr);
	}

	/**
	 * Shows the Help view (for onboarding) if the user hasn't seen it yet.
	 */
	showHelpViewIfNeeded() {
		this.runOnboarding('startup-help-view', () => {
			this.ntb.app.workspace.getLeaf(true).setViewState({	type: VIEW_TYPE_HELP, active: true });
		});
	}

	/**
	 * Shows the What's New dialog if the user hasn't seen it yet.
	 */
	showWhatsNewIfNeeded() {
		// show the What's New dialog once if the user hasn't seen it yet
		if (this.ntb.settings.showWhatsNew && this.ntb.settings.whatsnew_version !== WHATSNEW_VERSION) {
			this.ntb.settings.whatsnew_version = WHATSNEW_VERSION;
			this.ntb.settingsManager.save().then(() => {
				this.ntb.app.workspace.getLeaf(true).setViewState({
					type: VIEW_TYPE_WHATS_NEW,
					active: true
				});
			});
		}
	}
	
	/**
	 * Updates the UI state of the given component if the value is invalid.
	 * @param parent Setting UI tab/modal that the component is in
	 * @param itemValue string value to check
	 * @param fieldType SettingFieldType to check against
	 * @param componentEl HTMLElement to update
	 * @param toolbarItem ToolbarItemSettings for the item if needed to provide more context
	 * @param [errorPosition='afterend'] where to add the error relative to the given componentEl
	 * @returns true if the item is valid; false otherwise
	 */
	async updateItemComponentStatus(
		parent: NoteToolbarSettingTab | ToolbarSettingsModal | ItemModal,
		itemValue: string, 
		fieldType: SettingType, 
		componentEl: HTMLElement | null, 
		toolbarItem?: ToolbarItemSettings,
		errorPosition: 'beforeend' | 'afterend' = 'afterend'): Promise<boolean> 
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
			const command = this.ntb.commands.getCommandFor(toolbarItem);
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
					if (!(itemValue in this.ntb.app.commands.commands)) {
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
					const file = this.ntb.app.vault.getAbstractFileByPath(itemValue);
					if (!(file instanceof TFile) && !(file instanceof TFolder)) {
						status = Status.Invalid;
						statusMessage = t('setting.item.option-file-error-does-not-exist');
					}
					break;
				}
				case SettingType.Text:
					// if (plugin.hasVars(itemValue)) {
					// 	plugin.debug('VALIDATING TEXT', itemValue);
					// 	const activeFile = plugin.app.workspace.getActiveFile();
					// 	plugin.replaceVars(itemValue, activeFile).then((resolvedText) => {
							
					// 	});
					// }
					break;
				case SettingType.Toolbar: {
					let toolbar = this.ntb.settingsManager.getToolbarByName(itemValue);
					if (!toolbar) {
						toolbar = this.ntb.settingsManager.getToolbar(itemValue);
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
						let adapter = this.ntb.adapters.getAdapterForItemType(toolbarItem.linkAttr.type);
						if (adapter) {
							let selectedFunction = toolbarItem.scriptConfig?.pluginFunction || '';
							const params = adapter?.getFunctions().get(selectedFunction)?.parameters;
							if (params) {
								for (const [index, param] of params.entries()) {
									// TODO? error if required parameter is empty?
									const value = toolbarItem.scriptConfig?.[param.parameter as keyof ScriptConfig] ?? null;
									if (value) {
										const subfieldValid = await this.updateItemComponentStatus(parent, value, param.type, componentEl);
										status = subfieldValid ? Status.Valid : Status.Invalid;
									}
								}
							}
						}
						else {
							status = Status.Invalid;
							statusMessage = (this.ntb.settings.scriptingEnabled)
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

		removeFieldError(componentEl, errorPosition);
		switch (status) {
			case Status.Empty:
				// TODO? flag for whether empty should show as an error or not
				isValid = false;
				break;
			case Status.Invalid:
				this.setFieldError(parent, componentEl, errorPosition, statusMessage, statusLink);
				isValid = false;
				break;
		}

		return isValid;

	}

	/**
	 * Determines if an item should display a visibility warning based on platform or view mode restrictions.
	 * @param item Item settings to check
	 * @returns A tuple containing the visibility state and tooltip text. State is undefined if the item is fully visible.
	 */
	getItemVisState(item: ToolbarItemSettings): [state: 'mobile' | 'desktop' | 'reading' | 'preview' | 'hidden' | undefined, tooltip: string] {

		let state: 'mobile' | 'desktop' | 'reading' | 'preview' | 'hidden' | undefined = undefined;
		let tooltip = '';

		const isVisibleOnDesktop = hasVisibleComponents(item.visibility.desktop);
		const isVisibleOnMobile = hasVisibleComponents(item.visibility.mobile);

		if (!isVisibleOnDesktop && !isVisibleOnMobile) {
			state = 'hidden';
			tooltip = t('setting.item.visibility.tooltip-hidden');
		}
		else if (Platform.isDesktop && !isVisibleOnDesktop && isVisibleOnMobile) {
			state = 'mobile';
			tooltip = t('setting.item.visibility.tooltip-mobile-visible');
		}
		else if (Platform.isMobile && !isVisibleOnMobile && isVisibleOnDesktop) {
			state = 'desktop';
			tooltip = t('setting.item.visibility.tooltip-desktop-visible');
		}

		// check view mode if platform is OK
		if (!state) {
			const visibility = item.visibility ? (Platform.isDesktop ? item.visibility.desktop : item.visibility.mobile) : undefined;
			
			if (visibility && item.visibility.viewMode && item.visibility.viewMode !== ViewModeType.All) {
				const latestMode = this.ntb.utils.getRecentViewMode();
				if (latestMode && item.visibility.viewMode !== latestMode) {
					if (item.visibility.viewMode === 'source') {
						state = 'preview';
						tooltip = t('setting.item.visibility.tooltip-editing-visible');
					} 
					else {
						state = 'reading';
						tooltip = t('setting.item.visibility.tooltip-reading-visible');
					}
				}
			}
		}

		return [ state, tooltip ];

	}

}

/**
 * This is to fix a bug with Obsidian where toggle component labels can be tabbed into. #501
 * @param toggle ToggleComponent
 * @see https://discord.com/channels/686053708261228577/716028884885307432/1454335099545059389
 */
export function fixToggleTab(toggle: ToggleComponent) {
	toggle.toggleEl.tabIndex = -1;
}

/**
 * Returns a fragment containing any applicable disclaimers to show, for the provided keys.
 * @param disclaimers List of disclaimers, e.g., for styles this corresponds with DEFAULT and MOBILE _STYLE_DISCLAIMERS
 * @param keysToCheck e.g., styles that have been applied by the user, to check for applicable disclaimers
 * @returns DocumentFragment with disclaimers to show in settings UI
 */
export function getDisclaimersFr(disclaimers: {[key: string]: string}[], keysToCheck: string[]): DocumentFragment {
	let disclaimersFr = document.createDocumentFragment();
	let first = true;
	keysToCheck.forEach(keyToCheck => {
		const disclaimer = disclaimers.find(d => keyToCheck in d);
		if (disclaimer) {
			if (!first) disclaimersFr.append(document.createElement('br'));
			disclaimersFr.append('* ', getValueForKey(disclaimers, keyToCheck) );
			first = false;
		}
	});
	return disclaimersFr;
}

/**
 * Gets the current state of visibility for a given platform.
 * @returns a single word (hidden, visible, or the component name), and a sentence for the tooltip
 */
export function getPlatformVisState(item: ToolbarItemSettings, platform: 'desktop' | 'mobile'): [ItemComponentVisibility, string, string] {

	const labelPlatform = platform === 'desktop' ? t('setting.item.visibility.platform-desktop') : t('setting.item.visibility.platform-mobile');
	const visibility = item.visibility ? (platform === 'desktop' ? item.visibility.desktop : item.visibility.mobile) : undefined;

	if (visibility) {
		let components = visibility?.components;
		if (components) {
			if (components.length === 2) {
				return ['visible', '', t('setting.item.visibility.option-item-show', { platform: labelPlatform })];
			}
			else if (components.length === 1) {
				if (components[0] === ComponentType.Icon) {
					return ['icon', '', t('setting.item.visibility.option-component-show', { component: t('setting.item.visibility.component-icon'), platform: labelPlatform })];
				} else if (components[0] === ComponentType.Label) {
					return ['label', '', t('setting.item.visibility.option-component-show', { component: t('setting.item.visibility.component-label'), platform: labelPlatform })];
				}
			} 
			else {
				return ['hidden', '', t('setting.item.visibility.option-item-hide', { platform: labelPlatform })];
			}
		}
	}
	return ['hidden', '', t('setting.item.visibility.option-item-hide', { platform: labelPlatform })];
}

/**
 * Returns the value for the provided key from the provided dictionary.
 * @param dict key-value dictionary
 * @param key string key
 * @returns value from the dictionary
 */
export function getValueForKey(dict: {[key: string]: string}[], key: string): string {
	const option = dict.find(option => key in option);
	return option ? Object.values(option)[0] : '';
}

export function iconTextFr(icon: string, text: string): DocumentFragment {
	let headingFr = document.createDocumentFragment();
	let headingEl = headingFr.createEl('span');
	headingEl.addClass('note-toolbar-setting-text-with-icon');
	let headingIcon = headingEl.createEl('span');
	setIcon(headingIcon, 'lucide-' + icon);
	let headingText = headingEl.createEl('span');
	headingText.setText(text);
	headingFr.append(headingEl);
	return headingFr;
}

/**
 * Creates a text fragment with help text and a Learn More link.
 * @param message Message to return as a fragment.
 * @param page Documentation page (i.e., URL after `.../wiki/`).
 * @returns DocumentFragment containing the message and styling.
 */
export function learnMoreFr(message: string, page: string, linkText: string = t('setting.button-learn-more')): DocumentFragment {
	let messageFr = document.createDocumentFragment();
	messageFr.append(
		message, ' ',
	);
	let learnMoreLink = messageFr.createEl('a', { href: URL_USER_GUIDE + page, text: linkText });
	learnMoreLink.addClass('note-toolbar-setting-focussable-link');
	return messageFr;
}

/**
 * Creates a text fragment for use in settings headings, with description text and a Learn More link.
 * @param title Heading text.
 * @param desc Description text.
 * @param page Documentation page (i.e., URL after `.../wiki/`).
 * @returns DocumentFragment containing the message and styling.
 */
export function headingLearnMoreFr(title: string, desc: string, page: string, linkText: string = t('setting.button-learn-more')): DocumentFragment {
	let messageFr = document.createDocumentFragment();
	messageFr.append(title);

	// description + learn more link
	let descFr = messageFr.createEl('div', 'setting-item-description');
	descFr.append(desc, ' ');
	let learnMoreLink = descFr.createEl('a', { href: URL_USER_GUIDE + page, text: linkText });
	learnMoreLink.addClass('note-toolbar-setting-focussable-link');

	return messageFr;
}

/**
 * Creates a text fragment with a link to install/enable a plugin used by a given command.
 * @param commandId ID of command to get the plugin ID from.
 * @param linkText text to show as the link instead of the default "Review plugin"
 * @returns DocumentFragement containing the link to open the plugin within Obsidian.
 */
export function pluginLinkFr(commandId: string, linkText?: string): DocumentFragment | undefined {
	let pluginLinkFr = undefined;
	let pluginId = commandId.includes(':') ? commandId.split(':')[0].trim() : undefined;
	// don't show Community Plugins link for Obsidian's built-in commands
	if (pluginId && pluginId !== 'workspace') {
		pluginLinkFr = document.createDocumentFragment();
		// TODO: return link to core plugin settings if ID is in CORE_PLUGIN_IDS
		let pluginLink = pluginLinkFr.createEl('a', { 
			href: `obsidian://show-plugin?id=${pluginId}`, 
			text: linkText ? linkText : t('setting.item.label-review-plugin') 
		});
		pluginLink.addClass('note-toolbar-setting-focussable-link');
	}
	return pluginLinkFr;
}

/**
 * Removes the error on the field.
 * @param el HTMLElement to update
 * @param position Position to insert the error text
 */
export function removeFieldError(el: HTMLElement | null, position: 'beforeend' | 'afterend') {
	if (el) {
		const itemControlClass = 'setting-item-control';
		const itemPreviewClass = 'note-toolbar-setting-item-preview';
		let containerEl = null;
		el.hasClass(itemControlClass) ? containerEl = el : containerEl = el.closest(`.${itemControlClass}`);
		if (!containerEl) {
			el.hasClass(itemPreviewClass) ? containerEl = el : containerEl = el.closest(`.${itemPreviewClass}`);
		}
		const errorEl = position === 'beforeend'
			? containerEl?.querySelector('.note-toolbar-setting-field-error')
			: containerEl?.nextElementSibling?.classList.contains('note-toolbar-setting-field-error')
				? containerEl.nextElementSibling
				: null;

		errorEl?.remove();
		el?.removeClass('note-toolbar-setting-error');
	}
}

/**
 * Removes help from the given element, if it exists.
 * @param fieldEl HTMLElement to update
 */
export function removeFieldHelp(fieldEl: HTMLElement) {
	const existingHelp = fieldEl.querySelector('.note-toolbar-setting-field-help');
	existingHelp?.remove();
}

/**
 * Updates the given element with the given help text.
 * @param fieldEl HTMLElement to update
 * @param helpText DocumentFragment or string of the help text
 */
export function setFieldHelp(fieldEl: HTMLElement, helpText: DocumentFragment | string | undefined) {
	if (!helpText) return;
	removeFieldHelp(fieldEl);
	const fieldHelp = createDiv();
	fieldHelp.addClass('note-toolbar-setting-field-help');
	(helpText instanceof DocumentFragment) ? fieldHelp.append(helpText) : fieldHelp.setText(helpText);
	fieldHelp ? fieldEl.insertAdjacentElement('beforeend', fieldHelp) : undefined;
}

/**
 * Updates the icon for the preview and form
 * @param settingEl 
 * @param selectedIcon 
 */
export function updateItemIcon(parent: ToolbarSettingsModal | ItemModal, settingEl: HTMLElement, selectedIcon: string) {
	// update item form
	let formEl = settingEl.querySelector('.note-toolbar-setting-item-icon .clickable-icon') as HTMLElement;
	formEl ? setIcon(formEl, selectedIcon === t('setting.icon-suggester.option-no-icon') ? 'lucide-plus-square' : selectedIcon) : undefined;
	formEl.setAttribute('data-note-toolbar-no-icon', selectedIcon === t('setting.icon-suggester.option-no-icon') ? 'true' : 'false');
	if (parent instanceof ToolbarSettingsModal) {
		// update item preview
		let previewIconEl = settingEl.querySelector('.note-toolbar-setting-item-preview-icon') as HTMLElement;
		(previewIconEl && selectedIcon) ? setIcon(previewIconEl, selectedIcon) : undefined;
	}
}