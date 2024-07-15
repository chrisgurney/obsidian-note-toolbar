import { App, PaneType, Platform, TFile, setIcon } from "obsidian";
import { ComponentType, ToolbarItemSettings, Visibility } from "src/Settings/NoteToolbarSettings";

const DEBUG: boolean = false;

/**
 * Adds the given component to the given visibility prop.
 * @param platform platform visibility to add to
 * @param component component to add
 */
export function addComponentVisibility(platform: { allViews?: { components: ComponentType[] }}, component: ComponentType) {
	if (platform && platform.allViews) {
		if (!platform.allViews.components.includes(component)) {
			platform.allViews.components.push(component);
		}
	}
}

/**
 * Utility to swap item in an array, used with list controls I borrowed from Templater.
 * @author SilentVoid13 (Templater Plugin) 
 * @link https://github.com/SilentVoid13/Templater/blob/master/src/settings/Settings.ts#L481
*/
export function arraymove<T>(arr: (T | string)[], fromIndex: number, toIndex: number): void {
	if (toIndex < 0 || toIndex === arr.length) {
		return;
	}
	const element = arr[fromIndex];
	arr[fromIndex] = arr[toIndex];
	arr[toIndex] = element;
}

/**
 * Component visibility: Returns booleans indicating whether to show each component in a link, for all platforms. 
 * @param visibility 
 */
export function calcComponentVisToggles(visibility: Visibility) {
	const desktopComponents = hasComponents(visibility.desktop);
	const mobileComponents = hasComponents(visibility.mobile);
	const tabletComponents = hasComponents(visibility.tablet);
	return desktopComponents.concat(mobileComponents, tabletComponents);
}

/**
 * Item visibility: Returns the values of the toggles to show in the UI based on the platform value provided;
 * toggle values are the opposite of the Platform values.
 * @param Visibility
 * @returns booleans indicating whether to showOnDesktop, showOnMobile, showOnTablet
 */
export function calcItemVisToggles(visibility: Visibility): [boolean, boolean, boolean] {
    const desktopHasComponents = hasVisibleComponents(visibility.desktop);
    const mobileHasComponents = hasVisibleComponents(visibility.mobile);
    const tabletHasComponents = hasVisibleComponents(visibility.tablet);
    return [desktopHasComponents, mobileHasComponents, tabletHasComponents];
}

/**
 * Utility for debug logging.
 * @param message Message to output for debugging.
 */
export function debugLog(message?: any, ...optionalParams: any[]): void {
	DEBUG && console.log(message, ...optionalParams);
}

/**
 * Gets the position of the given element. Should probably use only if not available otherwise.
 * @param element to get position of
 * @returns x, y position
 */
export function getElementPosition(element: HTMLElement): { x: number, y: number } {
    const rect = element.getBoundingClientRect();
    return {
        x: rect.left + activeWindow.scrollX,
        y: rect.top + activeWindow.scrollY
    };
}

/**
 * Determines where to open a link given any modifiers held on link activation.
 * @param event MouseEvent or KeyboardEvent
 * @returns PaneType or undefined
 */
export function getLinkDest(event: MouseEvent | KeyboardEvent): PaneType | undefined {
	let linkDest: PaneType | undefined = undefined;
	// check if modifier keys were pressed on click, to fix #91
	if (event) {
		// rules per: https://help.obsidian.md/User+interface/Tabs#Open+a+link
		const modifierPressed = (Platform.isWin || Platform.isLinux) ? event?.ctrlKey : event?.metaKey;
		if (modifierPressed) {
			linkDest = event?.altKey ? (event?.shiftKey ? 'window' : 'split') : 'tab';
		}
	}
	return linkDest;
}

/**
 * Local function to effectively convert component strings to booleans.
 * @param platform platform visibiliity to get
 * @returns booleans indicating whether there's an icon and a label, for each desktop, mobile, and tablet
 */
function hasComponents(platform: { allViews?: { components: string[] } }): [boolean, boolean] {
    let hasIcon = false;
    let hasLabel = false;

    if (platform && platform.allViews) {
        hasIcon = platform.allViews.components.includes('icon');
        hasLabel = platform.allViews.components.includes('label');
    }

    return [hasIcon, hasLabel];
}

/**
 * Check if a string has vars, defined as {{variablename}}
 * @param s The string to check.
 */
export function hasVars(s: string): boolean {
	const urlVariableRegex = /{{.*?}}/g;
	return urlVariableRegex.test(s);
}

/**
 * Local function to check if given visibility has any components or not, for use in determining whether or not 
 * we should show it on a given platform.
 * @param platform platform visibility to check
 * @returns true if it has components; false otherwise
 */
function hasVisibleComponents(platform: { allViews?: { components: ComponentType[] } }): boolean {
    return !!platform && !!platform.allViews && platform.allViews.components.length > 0;
}

/**
 * Check if a string is a valid URI.
 * @link https://stackoverflow.com/a/49909903
 */
// I think this is defined outside the function to reuse the object, for efficiency
let validUrlEl: HTMLInputElement | undefined;
export function isValidUri(u: string): boolean {
	if (u !== "") {  
		if (!validUrlEl) {
			validUrlEl = document.createElement('input');
			validUrlEl.setAttribute('type', 'url');
		}
		validUrlEl.value = u;
		return validUrlEl.validity.valid;
	}
	else {
		return false
	}
}

/**
 * Utility to move item in an array.
 */
export function moveElement<T>(array: T[], fromIndex: number, toIndex: number): void {
	if (fromIndex !== toIndex && fromIndex >= 0 && fromIndex < array.length && toIndex >= 0 && toIndex < array.length) {
		const element = array.splice(fromIndex, 1)[0];
		array.splice(toIndex, 0, element);
	}
}

/**
 * Issues a down-arrow event in order to put focus in menus (works in non-native menus only).
 */
export function putFocusInMenu() {
	setTimeout(() => {
		const downArrowEvent = new KeyboardEvent('keydown', {
			key: 'ArrowDown',
			code: 'ArrowDown',
			keyCode: 40, // Note: keyCode is deprecated
			bubbles: true,
			cancelable: true
		});
		activeDocument.dispatchEvent(downArrowEvent);
	}, 50);
}

/**
 * Removes the given component from the given visibility prop.
 * @param platform platform visibility to remove from
 * @param component component to remove
 */
export function removeComponentVisibility(platform: { allViews?: { components: ComponentType[] }}, component: ComponentType) {
	if (platform && platform.allViews) {
        const index = platform.allViews.components.indexOf(component);
        if (index !== -1) {
            platform.allViews.components.splice(index, 1);
        }
    }
}

/**
 * Replace variables in the given string of the format {{variablename}}, with metadata from the file.
 * @param app App
 * @param s String to replace the variables in.
 * @param file File with the metadata (name, frontmatter) we'll use to fill in the variables.
 * @param encode True if we should encode the variables (recommended if part of external URL).
 * @returns String with the variables replaced.
 */
export function replaceVars(app: App, s: string, file: TFile | null, encode: boolean): string {

	let noteTitle = file?.basename;
	if (noteTitle != null) {
		s = s.replace('{{note_title}}', (encode ? encodeURIComponent(noteTitle) : noteTitle));
	}
	// have to get this at run/click-time, as file or metadata may not have changed
	let frontmatter = file ? app.metadataCache.getFileCache(file)?.frontmatter : undefined;
	// replace any variable of format {{prop_KEY}} with the value of the frontmatter dictionary with key = KEY
	s = s.replace(/{{prop_(.*?)}}/g, (match, p1) => {
		const key = p1.trim();
		if (frontmatter && frontmatter[key] !== undefined) {
			// regex to remove [[ and ]] and any alias (bug #75), in case an internal link was passed
			const linkWrap = /\[\[([^\|\]]+)(?:\|[^\]]*)?\]\]/g;
			// handle the case where the prop might be a list
			let fm = Array.isArray(frontmatter[key]) ? frontmatter[key].join(',') : frontmatter[key];
			return fm ? (encode ? encodeURIComponent(fm?.replace(linkWrap, '$1')) : fm.replace(linkWrap, '$1')) : '';
		}
		else {
			return '';
		}
	});
	return s;

}

/*************************************************************************
 * SETTINGS UI HELPERS
 *************************************************************************/

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
	let messageFrText = document.createElement("i")
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
		messageFr.createEl('a', {href: url, text: "Learn\u00A0more"})
	)
	return messageFr;
}