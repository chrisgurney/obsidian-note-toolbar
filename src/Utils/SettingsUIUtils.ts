import { setIcon } from "obsidian";
import { ItemType, ToolbarItemSettings, ToolbarSettings } from "Settings/NoteToolbarSettings";
import { SettingsManager } from "Settings/SettingsManager";

/**
 * Constructs a preview of the given toolbar, including the icons used.
 * @param toolbar ToolbarSettings to display in the preview.
 * @param settingsManager Optional SettingsManager if Groups need to be expanded within previews. 
 * @returns DocumentFragment
 */
export function createToolbarPreviewFr(
	toolbar: ToolbarSettings, settingsManager?: SettingsManager): DocumentFragment {

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
						let defaultItemFr = createDiv();
						defaultItemFr.addClass("note-toolbar-setting-toolbar-list-preview-item");
						let iconFr = createSpan();
						let labelFr = createSpan();
						if (item.icon) {
							setIcon(iconFr, item.icon);
							itemsFr.append(iconFr);
						}
						if (item.label) {
							labelFr.textContent = item.label;
							itemsFr.append(labelFr);
						}
						defaultItemFr.append(iconFr, labelFr);
						itemsFr.append(defaultItemFr);
						break;

				}

			});
	}
	else {
		itemsFr = emptyMessageFr("No items. Edit this toolbar to add items.");
	}
	previewContainer.appendChild(itemsFr);

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
		messageFr.createEl('a', { href: url, text: "Learn\u00A0more" })
	);
	return messageFr;
}
