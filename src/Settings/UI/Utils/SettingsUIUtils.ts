import { getIcon, setIcon } from "obsidian";
import { ItemType, t, ToolbarItemSettings, ToolbarSettings } from "Settings/NoteToolbarSettings";
import { SettingsManager } from "Settings/SettingsManager";

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
 * Creates a text fragment with help text and a Learn More link.
 * @param message Message to return as a fragment.
 * @param url Link to documentation.
 * @returns DocumentFragment containing the message and styling.
 */
export function learnMoreFr(message: string, url: string): DocumentFragment {
	let messageFr = document.createDocumentFragment();
	messageFr.append(
		message, ' ',
		messageFr.createEl('a', { href: url, text: t('setting.learn-more') })
	);
	return messageFr;
}
