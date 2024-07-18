import { setIcon } from "obsidian";
import { ToolbarItemSettings } from "Settings/NoteToolbarSettings";

/**
 * Constructs a preview of the given toolbar, including the icons used.
 * @param toolbarItems Array of ToolbarItemSettings to display in the preview.
 * @returns DocumentFragment
 */

export function createToolbarPreviewFr(toolbarItems: ToolbarItemSettings[]): DocumentFragment {
	let toolbarFr: DocumentFragment = document.createDocumentFragment();
	let previewContainer = toolbarFr.createDiv();
	previewContainer.addClass('note-toolbar-setting-tbar-preview');
	let itemsFr: DocumentFragment = document.createDocumentFragment();
	if (toolbarItems.length > 0) {
		toolbarItems
			.filter((item: ToolbarItemSettings) => {
				// ignore all empty toolbar items (no label or icon)
				return ((item.label === "" && item.icon === "") ? false : true);
			})
			.map(item => {
				let itemFr = createDiv();
				itemFr.addClass("note-toolbar-setting-toolbar-list-preview-item");
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
				itemFr.append(iconFr, labelFr);
				itemsFr.append(itemFr);
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
