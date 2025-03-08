import { ButtonComponent, getIcon, Platform, setIcon, Setting, setTooltip } from "obsidian";
import { ItemType, RELEASES_URL, t, ToolbarItemSettings, ToolbarSettings, USER_GUIDE_URL, VIEW_TYPE_WHATS_NEW, WHATSNEW_VERSION } from "Settings/NoteToolbarSettings";
import { SettingsManager } from "Settings/SettingsManager";
import { HelpModal } from "../Modals/HelpModal";
import NoteToolbarPlugin from "main";
import { debugLog } from "Utils/Utils";
import ToolbarSettingsModal from "../Modals/ToolbarSettingsModal";
import ItemModal from "../Modals/ItemModal";

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
				.setTooltip("Dismiss")
				.onClick(() => {
					setting.settingEl.remove();
					plugin.settings.onboarding[messageId] = true;
					plugin.settingsManager.save();
				});
			button.extraSettingsEl.addClass('note-toolbar-setting-plugin-onboarding-close');
			button.extraSettingsEl.tabIndex = 0;
			plugin.registerDomEvent(button.extraSettingsEl, 'keydown', (e: KeyboardEvent) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					button.extraSettingsEl.click();
				}
			});
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

	let toolbarFr: DocumentFragment = document.createDocumentFragment();
	let previewContainer = toolbarFr.createDiv();
	previewContainer.addClass('note-toolbar-setting-tbar-preview');
	let itemsFr: DocumentFragment = document.createDocumentFragment();
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
							let groupToolbar = settingsManager.getToolbarById(item.link);
							if (groupToolbar) {
								let groupItemFr = createDiv();
								groupItemFr.addClass("note-toolbar-setting-toolbar-list-preview-item");
								let groupNameFr = createSpan();
								groupNameFr.addClass('note-toolbar-setting-group-preview');
								groupNameFr.setText(groupToolbar.name);
								groupItemFr.append(groupNameFr);
								itemsFr.append(groupItemFr);
							}
						}
						break;
					default:
						let iconExists = getIcon(item.icon);
						if (iconExists || item.label) {
							let defaultItemFr = createDiv();
							defaultItemFr.addClass("note-toolbar-setting-toolbar-list-preview-item");
							if (item.icon) {
								if (iconExists) {
									let iconFr = createSpan();
									setIcon(iconFr, item.icon);
									itemsFr.append(iconFr);
									defaultItemFr.append(iconFr);
								}
							}
							if (item.label) {
								let labelFr = createSpan();
								labelFr.textContent = item.label;
								if (item.label && plugin.hasVars(item.label)) {
									labelFr.addClass('note-toolbar-setting-item-preview-code');
								}
								itemsFr.append(labelFr);
								defaultItemFr.append(labelFr);
							}
							itemsFr.append(defaultItemFr);
						}
						break;

				}

			});
	}
	else {
		itemsFr = emptyMessageFr(t('setting.item.label-preview-empty-no-items'));
	}
	previewContainer.appendChild(itemsFr);

	if (showEditLink) {
		let toolbarLinkContainer = createDiv();
		toolbarLinkContainer.addClass('note-toolbar-setting-tbar-preview-edit');
		let toolbarLink = createEl('a');
		toolbarLink.href = "obsidian://note-toolbar?toolbarsettings=" + encodeURIComponent(toolbar.name);
		toolbarLink.setText(t('setting.item.label-preview-edit', { toolbar: toolbar.name }));
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
		helpDesc.append("v" + plugin.manifest.version, " • ");
		let whatsNewLink = helpDesc.createEl("a", { href: "#", text: t('setting.button-whats-new') });
		plugin.registerDomEvent(whatsNewLink, 'click', (event) => { 
			plugin.app.workspace.getLeaf(true).setViewState({
				type: VIEW_TYPE_WHATS_NEW,
				active: true
			});
			closeCallback();
		});
		helpDesc.append(" • ", helpDesc.createEl("a", { href: "obsidian://note-toolbar?help",	text: iconTextFr('help-circle', t('setting.button-help')) }));
		helpContainerEl.append(helpDesc);

	}
	else {

		const helpDesc = document.createDocumentFragment();
		helpDesc.append(
			helpDesc.createEl("a", { href: RELEASES_URL, text: 'v' + plugin.manifest.version })
		);

		new Setting(settingsDiv)
			.setName(t('plugin.name') + ' • v' + plugin.manifest.version)
			.setDesc(t('setting.help.description'))
			.addButton((button: ButtonComponent) => {
				button
					.setTooltip(t('setting.button-whats-new-tooltip'))
					.onClick(() => {
						plugin.app.workspace.getLeaf(true).setViewState({
							type: VIEW_TYPE_WHATS_NEW,
							active: true
						});
						closeCallback();
					})
					.buttonEl.setText(t('setting.button-whats-new'));
			})
			.addButton((button: ButtonComponent) => {
				button
					.setTooltip(t('setting.button-help-tooltip'))
					.onClick(() => {
						let help = new HelpModal(plugin);
						help.open();
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
 * Returns a fragment containing any applicable style disclaimers to show, for the provided styles.
 * @param disclaimers List of disclaimers, corresponds with DEFAULT and MOBILE _STYLE_DISCLAIMERS
 * @param stylesToCheck styles that have been applied by the user, to check for applicable disclaimers
 * @returns DocumentFragment with disclaimers to show in settings UI
 */
export function getStyleDisclaimersFr(disclaimers: {[key: string]: string}[], stylesToCheck: string[]): DocumentFragment {
	let disclaimersFr = document.createDocumentFragment();
	stylesToCheck.forEach(style => {
		disclaimers.find(disclaimer => style in disclaimer)
			? disclaimersFr.append( disclaimersFr.createEl("br"), "* ", getValueForKey(disclaimers, style) )
			: undefined;
	});
	return disclaimersFr;
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
	let learnMoreLink = messageFr.createEl('a', { href: USER_GUIDE_URL + page, text: linkText });
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
 */
export function removeFieldError(el: HTMLElement | null) {
	if (el) {
		const itemControlClass = 'setting-item-control';
		const itemPreviewClass = 'note-toolbar-setting-item-preview';
		let containerEl = null;
		el.hasClass(itemControlClass) ? containerEl = el : containerEl = el.closest(`.${itemControlClass}`);
		if (!containerEl) {
			el.hasClass(itemPreviewClass) ? containerEl = el : containerEl = el.closest(`.${itemPreviewClass}`);
		}
		containerEl?.querySelector('.note-toolbar-setting-field-error')?.remove();
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
 */
export function renderItemSuggestion(
	plugin: NoteToolbarPlugin, 
	item: ToolbarItemSettings, 
	el: HTMLElement, 
	inputStr: string, 
	showMeta: boolean = false
) {
	if (!item) { return }
	el.addClass("note-toolbar-item-suggestion");
	el.setAttribute('id', item.uuid);
	if (item.icon) {
		let svgExists = getIcon(item.icon);
		if (svgExists) {
			let iconGlyph = el.createSpan();
			setIcon(iconGlyph, item.icon);
		}
	}
	let itemNameEl = el.createSpan();
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
	let itemLabel = itemNameEl.createSpan();

	let title = itemName;
	// replace variables in labels (or tooltip, if no label set)
	const activeFile = plugin.app.workspace.getActiveFile();
	plugin.replaceVars(itemName, activeFile).then((resolvedName: string) => {
		itemLabel.setText(resolvedName);
	});
	
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
			case ItemType.Uri:
				setIcon(itemMeta, 'globe');
				setTooltip(itemMeta, t('setting.item.option-uri'));
				break;
			case ItemType.Dataview:
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
		let itemNoteEl = itemLabel.createDiv();
		itemNoteEl.addClass('note-toolbar-item-suggester-note');
		itemNoteEl.setText(inputMatch);
	}
}

/**
 * Updates the given element with an error border and text.
 * @param parent ToolbarSettingsModal
 * @param fieldEl HTMLElement to update
 * @param errorText Optional error text to display
 * @param errorLink Optional link to display after error text
 */
export function setFieldError(parent: ToolbarSettingsModal | ItemModal, fieldEl: HTMLElement | null, errorText?: string, errorLink?: HTMLAnchorElement) {
	if (fieldEl) {
		let fieldContainerEl = fieldEl.closest('.setting-item-control');
		if (!fieldContainerEl) {
			fieldContainerEl = fieldEl.closest('.note-toolbar-setting-item-preview');
		}
		if (fieldContainerEl?.querySelector('.note-toolbar-setting-field-error') === null) {
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
				fieldContainerEl.insertAdjacentElement('beforeend', errorDiv);
			}
			fieldEl.addClass('note-toolbar-setting-error');
		}
	}
}

/**
 * Updates the given element with the given help text.
 * @param fieldEl HTMLElement to update
 * @param helpText DocumentFragment or string of the help text
 */
export function setFieldHelp(fieldEl: HTMLElement, helpText: DocumentFragment | string | undefined) {
	if (!helpText) return;
	let existingHelp = fieldEl.querySelector('.note-toolbar-setting-field-help');
	existingHelp?.remove();
	let fieldHelp = createDiv();
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