import NoteToolbarPlugin from "main";
import { ButtonComponent, getIcon, Notice, Platform, setIcon, Setting, setTooltip, TFile, TFolder } from "obsidian";
import { COMMAND_DOES_NOT_EXIST, DEFAULT_ITEM_VISIBILITY_SETTINGS, IGNORE_PLUGIN_IDS, ItemType, ScriptConfig, SettingType, t, ToolbarItemSettings, ToolbarSettings, URL_RELEASES, URL_USER_GUIDE, VIEW_TYPE_GALLERY, VIEW_TYPE_HELP, VIEW_TYPE_WHATS_NEW, WHATSNEW_VERSION } from "Settings/NoteToolbarSettings";
import SettingsManager from "Settings/SettingsManager";
import { importArgs } from "Utils/Utils";
import { PLUGIN_VERSION } from "version";
import { confirmWithModal } from "../Modals/ConfirmModal";
import ItemModal from "../Modals/ItemModal";
import ItemSuggestModal, { ItemSuggestMode } from "../Modals/ItemSuggestModal";
import ToolbarSettingsModal from "../Modals/ToolbarSettingsModal";
import ToolbarSuggestModal from "../Modals/ToolbarSuggestModal";
import NoteToolbarSettingTab from "../NoteToolbarSettingTab";

/**
 * Returns an element contianing a dismissable onboarding message.
 * @param ntb NoteToolbarPlugin
 * @param messageId unique identifier for the message, so it's not shown again
 * @param title title of the message
 * @param content content of the message
 * @returns 
 */
export function createOnboardingMessageEl(
	ntb: NoteToolbarPlugin,
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
					ntb.settings.onboarding[messageId] = true;
					ntb.settingsManager.save();
				});
			button.extraSettingsEl.addClass('note-toolbar-setting-plugin-onboarding-close');
			handleKeyClick(ntb, button.extraSettingsEl);
		});
	return setting.settingEl;
}

/**
 * Constructs a preview of the given toolbar, including the icons used.
 * @param ntb NoteToolbarPlugin reference
 * @param toolbar ToolbarSettings to display in the preview.
 * @param settingsManager Optional SettingsManager if Groups need to be expanded within previews. 
 * @param showEditLink set to true to add a link to edit the toolbar, after the preview; default is false.
 * @returns DocumentFragment
 */
export function createToolbarPreviewFr(
	ntb: NoteToolbarPlugin, 
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
					![ItemType.Break, ItemType.Group, ItemType.Separator].includes(item.linkAttr.type)) ? false : true);
	 
			})
			.map(item => {

				switch (item.linkAttr.type) {
					case ItemType.Break:
					case ItemType.Separator:
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
								if (item.label && ntb.vars.hasVars(item.label)) {
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
		itemsFr.appendChild(emptyMessageFr(t('setting.item.label-preview-empty-no-items')));
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
export function displayHelpSection(ntb: NoteToolbarPlugin, settingsDiv: HTMLElement, useTextVersion: boolean = false, closeCallback: () => void) {
	
	if (Platform.isPhone || useTextVersion) {

		let helpContainerEl = settingsDiv.createDiv();
		helpContainerEl.addClass('note-toolbar-setting-help-section-phone');

		const helpDesc = document.createDocumentFragment();
		helpDesc.append("v" + PLUGIN_VERSION, " • ");
		const whatsNewLink = helpDesc.createEl("a", { href: "#", text: t('setting.button-whats-new') });
		ntb.registerDomEvent(whatsNewLink, 'click', (event) => { 
			ntb.app.workspace.getLeaf(true).setViewState({ type: VIEW_TYPE_WHATS_NEW, active: true });
			if (Platform.isPhone) ntb.app.workspace.leftSplit?.collapse();
			closeCallback();
		});
		helpDesc.append(' • ');
		const galleryLink = helpDesc.createEl("a", { href: "#", text: iconTextFr('layout-grid', t('setting.button-gallery')) });
		ntb.registerDomEvent(galleryLink, 'click', (event) => { 
			ntb.app.workspace.getLeaf(true).setViewState({ type: VIEW_TYPE_GALLERY, active: true });
			if (Platform.isPhone) ntb.app.workspace.leftSplit?.collapse();
			closeCallback();
		});
		helpDesc.append(' • ');
		const helpLink = helpDesc.createEl("a", { href: "#", text: iconTextFr('help-circle', t('setting.button-help')) });
		ntb.registerDomEvent(helpLink, 'click', (event) => { 
			ntb.app.workspace.getLeaf(true).setViewState({ type: VIEW_TYPE_HELP, active: true });
			if (Platform.isPhone) ntb.app.workspace.leftSplit?.collapse();
			closeCallback();
		});
		helpContainerEl.append(helpDesc);
		
	}
	else {

		const helpDesc = document.createDocumentFragment();
		helpDesc.append(
			helpDesc.createEl("a", { href: URL_RELEASES, text: 'v' + PLUGIN_VERSION })
		);

		new Setting(settingsDiv)
			.setName(t('plugin.note-toolbar') + ' • v' + PLUGIN_VERSION)
			.setDesc(t('setting.help.description'))
			.addButton((button: ButtonComponent) => {
				button
					.setTooltip(t('setting.button-whats-new-tooltip'))
					.onClick(() => {
						ntb.app.workspace.getLeaf(true).setViewState({
							type: VIEW_TYPE_WHATS_NEW,
							active: true
						});
						if (Platform.isPhone) ntb.app.workspace.leftSplit?.collapse();
						closeCallback();
					})
					.buttonEl.setText(t('setting.button-whats-new'));
			})
			.addButton((button: ButtonComponent) => {
				button
					.setTooltip(t('setting.button-gallery-tooltip'))
					.onClick(() => {
						ntb.app.workspace.getLeaf(true).setViewState({ type: VIEW_TYPE_GALLERY, active: true });
						if (Platform.isPhone) ntb.app.workspace.leftSplit?.collapse();
						closeCallback();
					})
					.buttonEl.setText(iconTextFr('layout-grid', t('setting.button-gallery')));
			})
			.addButton((button: ButtonComponent) => {
				button
					.setTooltip(t('setting.button-help-tooltip'))
					.onClick(() => {
						ntb.app.workspace.getLeaf(true).setViewState({ type: VIEW_TYPE_HELP, active: true });
						if (Platform.isPhone) ntb.app.workspace.leftSplit?.collapse();
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
export function emptyMessageFr(message: string): DocumentFragment {
	let messageFr = document.createDocumentFragment();
	let messageFrText = document.createElement("i");
	messageFrText.textContent = message;
	messageFr.append(messageFrText);
	return messageFr;
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
 * Returns a URI that opens a search of the toolbar name in the toolbar property across all notes.
 * @param toolbarName name of the toolbar to look for.
 * @returns string 'obsidian://' URI.
 */
export function getToolbarPropSearchUri(ntb: NoteToolbarPlugin, toolbarName: string): string {
	let searchUri = 'obsidian://search?vault=' + ntb.app.vault.getName() + '&query=[' + ntb.settings.toolbarProp + ': ' + toolbarName + ']';
	return encodeURI(searchUri);
}

/**
 * Search through settings to find out where this toolbar is referenced.
 * @param id UUID of the toolbar to check usage for.
 * @returns mappingCount and itemCount
 */
export function getToolbarSettingsUsage(ntb: NoteToolbarPlugin, id: string): [number, number] {
	let mappingCount = ntb.settings.folderMappings.filter(mapping => mapping.toolbar === id).length;
	let itemCount = ntb.settings.toolbars.reduce((count, toolbar) => {
		return count + toolbar.items.filter(item => 
			item.link === id && (item.linkAttr.type === ItemType.Group || item.linkAttr.type === ItemType.Menu)
		).length;
	}, 0);
	return [mappingCount, itemCount];
}

export function getToolbarUsageFr(ntb: NoteToolbarPlugin, toolbar: ToolbarSettings, parent?: ToolbarSettingsModal): DocumentFragment {
	let usageFr = document.createDocumentFragment();
	let usageText = getToolbarUsageText(ntb, toolbar) || t('setting.usage.description_none');
	usageFr.append(usageText);
	
	if (parent) {
		if (usageText) usageFr.append(usageFr.createEl("br")); 
		const descLinkFr = usageFr.createEl('a', {href: '#', text: t('setting.usage.description-search')});
		usageFr.append(descLinkFr);
		ntb.registerDomEvent(descLinkFr, 'click', () => {
			parent.close();
			// @ts-ignore
			ntb.app.setting.close();
			window.open(getToolbarPropSearchUri(ntb, toolbar.name));
		});
	}

	return usageFr;
}

export function getToolbarUsageText(ntb: NoteToolbarPlugin, toolbar: ToolbarSettings): string {
	const [ mappingCount, itemCount ] = getToolbarSettingsUsage(ntb, toolbar.uuid);
	let label = t('setting.usage.description');
	let usage: String[] = [];
	if (mappingCount > 0) usage.push(t('setting.usage.description-mappings', { count: mappingCount }));
	if (itemCount > 0) usage.push(t('setting.usage.description-toolbar-items', { count: itemCount }));
	return (usage.length > 0) ? label + usage.join(', ') : '';
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

export function handleKeyClick(ntb: NoteToolbarPlugin, el: HTMLElement) {
	el.tabIndex = 0;
	ntb.registerDomEvent(
		el, 'keydown', (evt) => {
			switch (evt.key) {
				case 'Enter':
				case ' ':
					evt.preventDefault();
					el.click();
			}
		});
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
 * Opens an item suggester that then adds the selected item to this toolbar.
 */
export function openItemSuggestModal(
	ntb: NoteToolbarPlugin, 
	toolbar: ToolbarSettings, 
	mode: ItemSuggestMode, 
	parent?: ToolbarSettingsModal, 
	toolbarInsertIndex?: number
) {
	const modal = new ItemSuggestModal(
		ntb, 
		undefined, 
		async (selectedItem: ToolbarItemSettings) => {
			
			const isBrowseGalleryItem = selectedItem.uuid === 'OPEN_GALLERY';
			if (isBrowseGalleryItem) {
				ntb.app.workspace.getLeaf(true).setViewState({ type: VIEW_TYPE_GALLERY, active: true });
				if (parent) parent.close();
				return;
			}

			const isEmptyItem = selectedItem.uuid === 'NEW_ITEM';
			if (isEmptyItem) selectedItem.label = '';

			let newItem = await ntb.settingsManager.duplicateToolbarItem(toolbar, selectedItem, toolbarInsertIndex);
			// reset the visibility setting, as there's no prior indication to the user as to its visibility
			newItem.visibility = JSON.parse(JSON.stringify(DEFAULT_ITEM_VISIBILITY_SETTINGS));

			// confirm with user if they would like to enable scripting
			const isScriptingEnabled = await openScriptPrompt(ntb, newItem);
			if (!isScriptingEnabled) return;

			if (selectedItem.inGallery && !(await ntb.settingsManager.resolveGalleryItem(newItem))) return;
			
			toolbar.updated = new Date().toISOString();
			await ntb.settingsManager.save();

			if (isEmptyItem) new ItemModal(ntb, toolbar, newItem).open()
			else new Notice(t('setting.add-item.notice-item-added', { toolbarName: toolbar.name, interpolation: { escapeValue: false } })).containerEl.addClass('mod-success');

			if (parent) parent.display(newItem.uuid);

		}, 
		mode
	);
	modal.open();
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
 * Renders the item suggestion into the given element, for use in item suggesters and Quick Tools.
 * @param ntb NoteToolbarPlugin
 * @param item ToolbarItemSettings to render
 * @param el HEMLElement to render suggestion into
 * @param inputStr string that was used to search for this item
 * @param showMeta boolean to set true if the meta icon should be shown (for Quick Tools)
 * @param replaceVars boolean to set true if vars should be replaced; false to leave as-is (default)
 */
export function renderItemSuggestion(
	ntb: NoteToolbarPlugin, 
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
	const activeFile = ntb.app.workspace.getActiveFile();
	if (replaceVars) {
		ntb.vars.replaceVars(itemName, activeFile).then((resolvedName: string) => {
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
			let itemPluginText = getPluginNames(ntb, item);
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
 * Updates the UI state of the given component if the value is invalid.
 * @param ntb NoteToolbarPlugin
 * @param parent Setting UI tab/modal that the component is in
 * @param itemValue string value to check
 * @param fieldType SettingFieldType to check against
 * @param componentEl HTMLElement to update
 * @param toolbarItem ToolbarItemSettings for the item if needed to provide more context
 * @param [errorPosition='afterend'] where to add the error relative to the given componentEl
 * @returns true if the item is valid; false otherwise
 */
export async function updateItemComponentStatus(
	ntb: NoteToolbarPlugin,
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
		const command = ntb.commands.getCommandFor(toolbarItem);
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
				if (!(itemValue in ntb.app.commands.commands)) {
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
				const file = ntb.app.vault.getAbstractFileByPath(itemValue);
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
				let toolbar = ntb.settingsManager.getToolbarByName(itemValue);
				if (!toolbar) {
					toolbar = ntb.settingsManager.getToolbar(itemValue);
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
					let adapter = ntb.adapters.getAdapterForItemType(toolbarItem.linkAttr.type);
					if (adapter) {
						let selectedFunction = toolbarItem.scriptConfig?.pluginFunction || '';
						const params = adapter?.getFunctions().get(selectedFunction)?.parameters;
						if (params) {
							for (const [index, param] of params.entries()) {
								// TODO? error if required parameter is empty?
								const value = toolbarItem.scriptConfig?.[param.parameter as keyof ScriptConfig] ?? null;
								if (value) {
									const subfieldValid = await updateItemComponentStatus(ntb, this.parent, value, param.type, componentEl);
									status = subfieldValid ? Status.Valid : Status.Invalid;
								}
							}
						}
					}
					else {
						status = Status.Invalid;
						statusMessage = (ntb.settings.scriptingEnabled)
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
			setFieldError(ntb, parent, componentEl, errorPosition, statusMessage, statusLink);
			isValid = false;
			break;
	}

	return isValid;

}

/**
 * Prompts the user if they want to enable scripting, if the item requires it.
 * @param ntb NoteToolbarPlugin
 * @param item 
 * @returns true if the user confirmed, false if they cancelled
 */
export async function openScriptPrompt(ntb: NoteToolbarPlugin, item: ToolbarItemSettings): Promise<boolean> {
	const isScript = [ItemType.Dataview,  ItemType.JavaScript, ItemType.JsEngine, ItemType.Templater].contains(item.linkAttr.type);

	if (isScript && !ntb.settings.scriptingEnabled) {
		const isConfirmed = await confirmWithModal(
			ntb.app, 
			{
				title: t('setting.add-item.title-confirm-scripting'),
				questionLabel: t('setting.add-item.label-confirm-scripting'),
				approveLabel: t('setting.button-enable'),
				denyLabel: t('setting.button-cancel')
			}
		);
		
		if (isConfirmed) {
			ntb.settings.scriptingEnabled = true;
			ntb.adapters.updateAdapters();
			await ntb.settingsManager.save();
		}

		return isConfirmed;
	}

	return true;
}

/**
 * Gets a list of plugin names required by this item, derived from the commandId or plugin property.
 * @param item ToolbarItemSettings to get plugin list from
 * @returns list of plugin names
 */
export function getPluginNames(ntb: NoteToolbarPlugin, item: ToolbarItemSettings): string | undefined {
	if (item.linkAttr.type === ItemType.Plugin) {
		const itemPluginType = (Array.isArray(item.plugin) ? item.plugin : [item.plugin]);
		// replace known commands with user-friendly strings (if supported), and create a list
		if (itemPluginType) return itemPluginType.map(p => t(`plugin.${p}`)).join(', ')
			else return undefined;
	}
	else if (item.linkAttr.type === ItemType.Command) {
		// make sure the command exists
		const command = ntb.app.commands.commands[item.linkAttr.commandId];
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
 * Copies an item to a toolbar of the user's choice.
 * @param fromToolbar toolbar to copy the item from
 * @param item item to copy
 */
export async function copyToolbarItem(ntb: NoteToolbarPlugin, fromToolbar: ToolbarSettings, item: ToolbarItemSettings): Promise<void> {
	const modal = new ToolbarSuggestModal(ntb, false, false, false, async (toToolbar: ToolbarSettings) => {
		if (toToolbar) {
			await ntb.settingsManager.duplicateToolbarItem(toToolbar, item);
			await ntb.settingsManager.save();
			new Notice(t('setting.item.menu-copy-item-notice', { toolbarName: toToolbar.name })).containerEl.addClass('mod-success');
		}
	});
	modal.open();
}

/**
 * Moves an item to a toolbar of the user's choice.
 * @param fromToolbar toolbar to move the item from
 * @param item item to move
 */
export async function moveToolbarItem(ntb: NoteToolbarPlugin, fromToolbar: ToolbarSettings, item: ToolbarItemSettings): Promise<void> {
	const modal = new ToolbarSuggestModal(ntb, false, false, false, async (toToolbar: ToolbarSettings) => {
		if (toToolbar) {
			fromToolbar.items.remove(item);
			toToolbar.items.push(item);
			await ntb.settingsManager.save();
			new Notice(t('setting.item.menu-move-item-notice', { toolbarName: toToolbar.name })).containerEl.addClass('mod-success');
		}
	});
	modal.open();
}

/**
 * Updates the given element with an error border and text.
 * @param ntb NoteToolbarPlugin
 * @param parent ToolbarSettingsModal
 * @param fieldEl HTMLElement to update
 * @param position Position to insert the error text
 * @param errorText Optional error text to display
 * @param errorLink Optional link to display after error text
 */
export function setFieldError(
	ntb: NoteToolbarPlugin,
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
					ntb.registerDomEvent(errorLink, 'click', (event) => {
						let refreshLink = document.createDocumentFragment().createEl('a', { text: t('setting.item.option-command-error-refresh'), href: '#' } );
						let refreshIcon = refreshLink.createSpan();
						setIcon(refreshIcon, 'refresh-cw');
						let oldLink = event.currentTarget as HTMLElement;
						oldLink?.replaceWith(refreshLink);
						ntb.registerDomEvent(refreshLink, 'click', event => {
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
 * Shows the What's New dialog if the user hasn't seen it yet.
 */
export function showWhatsNewIfNeeded(ntb: NoteToolbarPlugin) {

	// show the What's New dialog once if the user hasn't seen it yet
	if (ntb.settings.whatsnew_version !== WHATSNEW_VERSION) {
		ntb.settings.whatsnew_version = WHATSNEW_VERSION;
		ntb.settingsManager.save().then(() => {
			ntb.app.workspace.getLeaf(true).setViewState({
				type: VIEW_TYPE_WHATS_NEW,
				active: true
			});
		});
	}

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