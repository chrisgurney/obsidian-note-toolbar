import { ButtonComponent, getIcon, Notice, Platform, setIcon, Setting, setTooltip } from "obsidian";
import { ItemType, URL_RELEASES, t, ToolbarItemSettings, ToolbarSettings, URL_USER_GUIDE, VIEW_TYPE_WHATS_NEW, WHATSNEW_VERSION, VIEW_TYPE_GALLERY, IGNORE_PLUGIN_IDS, DEFAULT_ITEM_VISIBILITY_SETTINGS, VIEW_TYPE_HELP } from "Settings/NoteToolbarSettings";
import { SettingsManager } from "Settings/SettingsManager";
import NoteToolbarPlugin from "main";
import ToolbarSettingsModal from "../Modals/ToolbarSettingsModal";
import ItemModal from "../Modals/ItemModal";
import { ItemSuggestModal, ItemSuggestMode } from "../Modals/ItemSuggestModal";
import { confirmWithModal } from "../Modals/ConfirmModal";
import { PLUGIN_VERSION } from "version";
import { ToolbarSuggestModal } from "../Modals/ToolbarSuggestModal";

/**
 * Returns an element contianing a dismissable onboarding message.
 * @param plugin NoteToolbarPlugin
 * @param messageId unique identifier for the message, so it's not shown again
 * @param title title of the message
 * @param content content of the message
 * @returns 
 */
export function createOnboardingMessageEl(
	plugin: NoteToolbarPlugin,
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
					plugin.settings.onboarding[messageId] = true;
					plugin.settingsManager.save();
				});
			button.extraSettingsEl.addClass('note-toolbar-setting-plugin-onboarding-close');
			handleKeyClick(plugin, button.extraSettingsEl);
		});
	return setting.settingEl;
}

/**
 * Constructs a preview of the given toolbar, including the icons used.
 * @param plugin NoteToolbarPlugin reference
 * @param toolbar ToolbarSettings to display in the preview.
 * @param settingsManager Optional SettingsManager if Groups need to be expanded within previews. 
 * @param showEditLink set to true to add a link to edit the toolbar, after the preview; default is false.
 * @returns DocumentFragment
 */
export function createToolbarPreviewFr(
	plugin: NoteToolbarPlugin, 
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
					default:
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
								if (item.label && plugin.hasVars(item.label)) {
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
export function displayHelpSection(plugin: NoteToolbarPlugin, settingsDiv: HTMLElement, useTextVersion: boolean = false, closeCallback: () => void) {
	
	if (Platform.isPhone || useTextVersion) {

		let helpContainerEl = settingsDiv.createDiv();
		helpContainerEl.addClass('note-toolbar-setting-help-section');
		const helpDesc = document.createDocumentFragment();
		helpDesc.append("v" + PLUGIN_VERSION, " • ");
		const whatsNewLink = helpDesc.createEl("a", { href: "#", text: t('setting.button-whats-new') });
		plugin.registerDomEvent(whatsNewLink, 'click', (event) => { 
			plugin.app.workspace.getLeaf(true).setViewState({ type: VIEW_TYPE_WHATS_NEW, active: true });
			if (Platform.isPhone) plugin.app.workspace.leftSplit?.collapse();
			closeCallback();
		});
		helpDesc.append(' • ');
		const galleryLink = helpDesc.createEl("a", { href: "#", text: iconTextFr('layout-grid', t('setting.button-gallery')) });
		plugin.registerDomEvent(galleryLink, 'click', (event) => { 
			plugin.app.workspace.getLeaf(true).setViewState({ type: VIEW_TYPE_GALLERY, active: true });
			if (Platform.isPhone) plugin.app.workspace.leftSplit?.collapse();
			closeCallback();
		});
		helpDesc.append(' • ');
		const helpLink = helpDesc.createEl("a", { href: "#", text: iconTextFr('help-circle', t('setting.button-help')) });
		plugin.registerDomEvent(helpLink, 'click', (event) => { 
			plugin.app.workspace.getLeaf(true).setViewState({ type: VIEW_TYPE_HELP, active: true });
			if (Platform.isPhone) plugin.app.workspace.leftSplit?.collapse();
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
						plugin.app.workspace.getLeaf(true).setViewState({
							type: VIEW_TYPE_WHATS_NEW,
							active: true
						});
						if (Platform.isPhone) plugin.app.workspace.leftSplit?.collapse();
						closeCallback();
					})
					.buttonEl.setText(t('setting.button-whats-new'));
			})
			.addButton((button: ButtonComponent) => {
				button
					.setTooltip(t('setting.button-gallery-tooltip'))
					.onClick(() => {
						plugin.app.workspace.getLeaf(true).setViewState({ type: VIEW_TYPE_GALLERY, active: true });
						if (Platform.isPhone) plugin.app.workspace.leftSplit?.collapse();
						closeCallback();
					})
					.buttonEl.setText(iconTextFr('layout-grid', t('setting.button-gallery')));
			})
			.addButton((button: ButtonComponent) => {
				button
					.setTooltip(t('setting.button-help-tooltip'))
					.onClick(() => {
						plugin.app.workspace.getLeaf(true).setViewState({ type: VIEW_TYPE_HELP, active: true });
						if (Platform.isPhone) plugin.app.workspace.leftSplit?.collapse();
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
export function getToolbarPropSearchUri(plugin: NoteToolbarPlugin, toolbarName: string): string {
	let searchUri = 'obsidian://search?vault=' + plugin.app.vault.getName() + '&query=[' + plugin.settings.toolbarProp + ': ' + toolbarName + ']';
	return encodeURI(searchUri);
}

/**
 * Search through settings to find out where this toolbar is referenced.
 * @param id UUID of the toolbar to check usage for.
 * @returns mappingCount and itemCount
 */
export function getToolbarSettingsUsage(plugin: NoteToolbarPlugin, id: string): [number, number] {
	let mappingCount = plugin.settings.folderMappings.filter(mapping => mapping.toolbar === id).length;
	let itemCount = plugin.settings.toolbars.reduce((count, toolbar) => {
		return count + toolbar.items.filter(item => 
			item.link === id && (item.linkAttr.type === ItemType.Group || item.linkAttr.type === ItemType.Menu)
		).length;
	}, 0);
	return [mappingCount, itemCount];
}

export function getToolbarUsageFr(plugin: NoteToolbarPlugin, toolbar: ToolbarSettings, parent?: ToolbarSettingsModal): DocumentFragment {
	let usageFr = document.createDocumentFragment();
	let usageText = getToolbarUsageText(plugin, toolbar) || t('setting.usage.description_none');
	usageFr.append(usageText);
	
	if (parent) {
		if (usageText) usageFr.append(usageFr.createEl("br")); 
		const descLinkFr = usageFr.createEl('a', {href: '#', text: t('setting.usage.description-search')});
		usageFr.append(descLinkFr);
		plugin.registerDomEvent(descLinkFr, 'click', () => {
			parent.close();
			// @ts-ignore
			plugin.app.setting.close();
			window.open(getToolbarPropSearchUri(plugin, toolbar.name));
		});
	}

	return usageFr;
}

export function getToolbarUsageText(plugin: NoteToolbarPlugin, toolbar: ToolbarSettings): string {
	const [ mappingCount, itemCount ] = getToolbarSettingsUsage(plugin, toolbar.uuid);
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

export function handleKeyClick(plugin: NoteToolbarPlugin, el: HTMLElement) {
	el.tabIndex = 0;
	plugin.registerDomEvent(
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
 * Opens an item suggester that then adds the selected item to this toolbar.
 */
export function openItemSuggestModal(
	plugin: NoteToolbarPlugin, 
	toolbar: ToolbarSettings, 
	mode: ItemSuggestMode, 
	parent?: ToolbarSettingsModal, 
	toolbarInsertIndex?: number
) {
	const modal = new ItemSuggestModal(
		plugin, 
		undefined, 
		async (selectedItem: ToolbarItemSettings) => {
			
			const isBrowseGalleryItem = selectedItem.uuid === 'OPEN_GALLERY';
			if (isBrowseGalleryItem) {
				plugin.app.workspace.getLeaf(true).setViewState({ type: VIEW_TYPE_GALLERY, active: true });
				if (parent) parent.close();
				return;
			}

			const isEmptyItem = selectedItem.uuid === 'NEW_ITEM';
			if (isEmptyItem) selectedItem.label = '';

			let newItem = await plugin.settingsManager.duplicateToolbarItem(toolbar, selectedItem, toolbarInsertIndex);
			// reset the visibility setting, as there's no prior indication to the user as to its visibility
			newItem.visibility = JSON.parse(JSON.stringify(DEFAULT_ITEM_VISIBILITY_SETTINGS));

			// confirm with user if they would like to enable scripting
			const isScriptingEnabled = await openScriptPrompt(plugin, newItem);
			if (!isScriptingEnabled) return;

			if (selectedItem.inGallery && !(await plugin.settingsManager.resolveGalleryItem(newItem))) return;
			
			toolbar.updated = new Date().toISOString();
			await plugin.settingsManager.save();

			if (isEmptyItem) new ItemModal(plugin, toolbar, newItem).open()
			else new Notice(t('setting.add-item.notice-item-added', { toolbarName: toolbar.name }));

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
 * @param plugin NoteToolbarPlugin
 * @param item ToolbarItemSettings to render
 * @param el HEMLElement to render suggestion into
 * @param inputStr string that was used to search for this item
 * @param showMeta boolean to set true if the meta icon should be shown (for Quick Tools)
 * @param replaceVars boolean to set true if vars should be replaced; false to leave as-is (default)
 */
export function renderItemSuggestion(
	plugin: NoteToolbarPlugin, 
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
	const activeFile = plugin.app.workspace.getActiveFile();
	if (replaceVars) {
		plugin.replaceVars(itemName, activeFile).then((resolvedName: string) => {
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
			let itemPluginText = getPluginNames(plugin, item);
			if (itemPluginText) {
				const pluginDescEl = el.createDiv();
				pluginDescEl.addClass('note-toolbar-item-suggester-note');	
				setIcon(pluginDescEl.createSpan(), 'puzzle');		
				pluginDescEl.createSpan().setText(t('gallery.label-plugin', { plugin: itemPluginText }));
			}
		}
	}
}

/**
 * Prompts the user if they want to enable scripting, if the item requires it.
 * @param plugin NoteToolbarPlugin
 * @param item 
 * @returns true if the user confirmed, false if they cancelled
 */
export async function openScriptPrompt(plugin: NoteToolbarPlugin, item: ToolbarItemSettings): Promise<boolean> {
	const isScript = [ItemType.Dataview,  ItemType.JavaScript, ItemType.JsEngine, ItemType.Templater].contains(item.linkAttr.type);

	if (isScript && !plugin.settings.scriptingEnabled) {
		const isConfirmed = await confirmWithModal(
			plugin.app, 
			{
				title: t('setting.add-item.title-confirm-scripting'),
				questionLabel: t('setting.add-item.label-confirm-scripting'),
				approveLabel: t('setting.button-enable'),
				denyLabel: t('setting.button-cancel')
			}
		);
		
		if (isConfirmed) {
			plugin.settings.scriptingEnabled = true;
			plugin.updateAdapters();
			await plugin.settingsManager.save();
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
export function getPluginNames(plugin: NoteToolbarPlugin, item: ToolbarItemSettings): string | undefined {
	if (item.linkAttr.type === ItemType.Plugin) {
		const itemPluginType = (Array.isArray(item.plugin) ? item.plugin : [item.plugin]);
		// replace known commands with user-friendly strings (if supported), and create a list
		if (itemPluginType) return itemPluginType.map(p => t(`plugin.${p}`)).join(', ')
			else return undefined;
	}
	else if (item.linkAttr.type === ItemType.Command) {
		// make sure the command exists
		const command = plugin.app.commands.commands[item.linkAttr.commandId];
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
export async function copyToolbarItem(plugin: NoteToolbarPlugin, fromToolbar: ToolbarSettings, item: ToolbarItemSettings): Promise<void> {
	const modal = new ToolbarSuggestModal(plugin, false, false, false, async (toToolbar: ToolbarSettings) => {
		if (toToolbar) {
			await plugin.settingsManager.duplicateToolbarItem(toToolbar, item);
			await plugin.settingsManager.save();
			new Notice(t('setting.item.menu-copy-item-notice', { toolbarName: toToolbar.name }));
		}
	});
	modal.open();
}

/**
 * Moves an item to a toolbar of the user's choice.
 * @param fromToolbar toolbar to move the item from
 * @param item item to move
 */
export async function moveToolbarItem(plugin: NoteToolbarPlugin, fromToolbar: ToolbarSettings, item: ToolbarItemSettings): Promise<void> {
	const modal = new ToolbarSuggestModal(plugin, false, false, false, async (toToolbar: ToolbarSettings) => {
		if (toToolbar) {
			fromToolbar.items.remove(item);
			toToolbar.items.push(item);
			await plugin.settingsManager.save();
			new Notice(t('setting.item.menu-move-item-notice', { toolbarName: toToolbar.name }));
		}
	});
	modal.open();
}

/**
 * Updates the given element with an error border and text.
 * @param parent ToolbarSettingsModal
 * @param fieldEl HTMLElement to update
 * @param position Position to insert the error text
 * @param errorText Optional error text to display
 * @param errorLink Optional link to display after error text
 */
export function setFieldError(
	parent: ToolbarSettingsModal | ItemModal, 
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
					parent.plugin.registerDomEvent(errorLink, 'click', event => {
						let refreshLink = document.createDocumentFragment().createEl('a', { text: t('setting.item.option-command-error-refresh'), href: '#' } );
						let refreshIcon = refreshLink.createSpan();
						setIcon(refreshIcon, 'refresh-cw');
						let oldLink = event.currentTarget as HTMLElement;
						oldLink?.replaceWith(refreshLink);
						parent.plugin.registerDomEvent(refreshLink, 'click', event => {
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
export function showWhatsNewIfNeeded(plugin: NoteToolbarPlugin) {

	// show the What's New dialog once if the user hasn't seen it yet
	if (plugin.settings.whatsnew_version !== WHATSNEW_VERSION) {
		plugin.settings.whatsnew_version = WHATSNEW_VERSION;
		plugin.settingsManager.save().then(() => {
			plugin.app.workspace.getLeaf(true).setViewState({
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