import { ButtonComponent, getIcon, Platform, setIcon, Setting } from "obsidian";
import { ItemType, RELEASES_URL, t, ToolbarItemSettings, ToolbarSettings, USER_GUIDE_URL } from "Settings/NoteToolbarSettings";
import { SettingsManager } from "Settings/SettingsManager";
import { WhatsNewModal } from "../Modals/WhatsNewModal";
import { HelpModal } from "../Modals/HelpModal";
import NoteToolbarPlugin from "main";

/**
 * Constructs a preview of the given toolbar, including the icons used.
 * @param toolbar ToolbarSettings to display in the preview.
 * @param settingsManager Optional SettingsManager if Groups need to be expanded within previews. 
 * @param showEditLink set to true to add a link to edit the toolbar, after the preview; default is false.
 * @returns DocumentFragment
 */
export function createToolbarPreviewFr(
	toolbar: ToolbarSettings, settingsManager?: SettingsManager, showEditLink: boolean = false): DocumentFragment {

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
 */
export function displayHelpSection(plugin: NoteToolbarPlugin, settingsDiv: HTMLElement, useTextVersion: boolean = false) {
	
	if (Platform.isPhone || useTextVersion) {

		let helpContainerEl = settingsDiv.createDiv();
		helpContainerEl.addClass('note-toolbar-setting-help-section');
		const helpDesc = document.createDocumentFragment();
		helpDesc.append(
			"v" + plugin.manifest.version,
			" • ",
			helpDesc.createEl("a", { href: "obsidian://note-toolbar?whatsnew", text: t('setting.button-whats-new') }),
			" • ",
			helpDesc.createEl("a", { href: "obsidian://note-toolbar?help",	text: iconTextFr('help-circle', t('setting.button-help')) }),
		);
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
						let whatsnew = new WhatsNewModal(plugin);
						whatsnew.open();
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
export function learnMoreFr(message: string, page: string): DocumentFragment {
	let messageFr = document.createDocumentFragment();
	messageFr.append(
		message, ' ',
		messageFr.createEl('a', { href: USER_GUIDE_URL + page, text: t('setting.button-learn-more') })
	);
	return messageFr;
}
