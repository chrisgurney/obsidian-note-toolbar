import NoteToolbarPlugin from "main";
import { App, MarkdownView, PaneType, Platform, TFile } from "obsidian";
import { ComponentType, ItemType, ToolbarSettings, Visibility } from "Settings/NoteToolbarSettings";

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
	DEBUG && console.debug(message, ...optionalParams);
}

/**
 * Displays the provided scripting error as a console message, and is output to a container, if provided. 
 * @param message 
 * @param error 
 * @param containerEl 
 */
export function displayScriptError(message: string, error?: any, containerEl?: HTMLElement) {
	console.error(message, error);
	if (containerEl) {
		let errorEl = containerEl.createEl('pre');
		errorEl.addClass('dataview', 'dataview-error');
		errorEl.setText(message + '\n' + error);
	}
}

/**
 * Gets a new UUID.
 * @returns string UUID
 */
export function getUUID(): string {
	return window.crypto.randomUUID();
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
 * Determines where to open a link given any modifiers used on link activation.
 * @param event MouseEvent or KeyboardEvent
 * @returns PaneType or undefined
 */
export function getLinkUiDest(event: MouseEvent | KeyboardEvent | undefined): PaneType | undefined {
	let linkDest: PaneType | undefined = undefined;
	if (event) {
		// check if middle button was clicked
		if (event instanceof MouseEvent && event.type === 'auxclick' && event.button === 1) {
			linkDest = 'tab';
		}
		else {
			// check if modifier keys were pressed on click, to fix #91
			// rules per: https://help.obsidian.md/User+interface/Tabs#Open+a+link
			const modifierPressed = (Platform.isWin || Platform.isLinux) ? event?.ctrlKey : event?.metaKey;
			if (modifierPressed) {
				linkDest = event?.altKey ? (event?.shiftKey ? 'window' : 'split') : 'tab';
			}
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
        hasIcon = platform.allViews.components.includes(ComponentType.Icon);
        hasLabel = platform.allViews.components.includes(ComponentType.Label);
    }

    return [hasIcon, hasLabel];
}

/**
 * Check if a string has vars, defined as {{variablename}}
 * @param s The string to check.
 */
export function hasVars(s: string): boolean {
	// TODO: check for vars in item labels & tooltips as well
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
 * Imports the given arguments string as if it were JSON, but allows for missing parens and quotes.
 * @param args JSON-formatted string
 * @returns parsed arguments, or null if parsing fails
 */
function importArgs(args: string): Record<string, any> | null {
	try {
		// remove spaces between keys and colons
		args = args.replace(/(\w+)\s*:/g, '"$1":');
		
		// add missing curly brackets
		if (!args.trim().startsWith('{')) args = `{${args}`;
		if (!args.trim().endsWith('}')) args = `${args}}`;

		return JSON.parse(args);
	} 
	catch {
		return null; 
	}
}

/**
 * Inserts a string at the current cursor position.
 * @param app App
 * @param textToInsert thing to insert
 */
export function insertTextAtCursor(app: App, textToInsert: any) {
	const activeLeaf = app.workspace.getActiveViewOfType(MarkdownView);
	const editor = activeLeaf ? activeLeaf.editor : null;
	if (editor) {
		const cursor = editor?.getCursor();
		const text = String(textToInsert);
		editor.replaceRange(text, cursor);
		editor.setCursor(cursor.line, cursor.ch + text.length);
	}
}

/**
 * Check if current view is a canvas.
 * Without a proper check, the toolbar gets added to other ItemViews e.g., Bookmarks view
 * @param itemView the current ItemView
 * @returns true if data looks like canvas data.
 * @link https://github.com/Zachatoo/obsidian-canvas-send-to-back/blob/68b27531f644784047be98af2b1cc6c102acf51f/src/canvas.ts#L35-L45
 */
export function isViewCanvas(itemView: any): boolean {
	debugLog("isViewCanvas", itemView);
	return itemView.getViewType() === 'canvas';
	// @ts-ignore
	return itemView && itemView.file && itemView.file.extension === 'canvas';
	// following does not work if there is no data in the canvas
	// if (!itemView || !itemView.getViewData || !itemView.setViewData || !itemView.requestSave) {
	// 	return false;
	// }
	// const data: unknown = JSON.parse(itemView.getViewData());
	// return (
	// 	!!data &&
	// 	typeof data === "object" &&
	// 	"nodes" in data &&
	// 	Array.isArray(data.nodes) &&
	// 	"edges" in data &&
	// 	Array.isArray(data.edges)
	// );
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
			// FIXME: does not work with number properties
			return fm ? (encode ? encodeURIComponent(fm?.replace(linkWrap, '$1')) : fm.replace(linkWrap, '$1')) : '';
		}
		else {
			return '';
		}
	});
	return s;

}

/**
 * Returns a list of plugin IDs for any commands not recognized in the given toolbar.
 * @param toolbar ToolbarSettings to check for command usage
 * @returns an array of plugin IDs that are invalid, or an empty array otherwise
 */
export function toolbarInvalidCommands(plugin: NoteToolbarPlugin, toolbar: ToolbarSettings): string[] {
	return toolbar.items
		.filter(item =>
			item.linkAttr.type === ItemType.Command && !(item.linkAttr.commandId in plugin.app.commands.commands)
		)
		.map(item => item.linkAttr.commandId.split(':')[0].trim());
}

/**
 * Checks if the given toolbar has a menu (which refers to another toolbar).
 * @param toolbar ToolbarSettings to check for menu usage
 * @returns true if a menu is used in the toolbar; false otherwise
 */
export function toolbarHasMenu(toolbar: ToolbarSettings): boolean {
	return toolbar.items.some(item => 
		(item.linkAttr.type === ItemType.Menu) && (item.link)
	);
}

/**
 * Checks if the given toolbar uses variables at all.
 * @param toolbar ToolbarSettings to check for variable usage
 * @returns true if variables are used in the toolbar; false otherwise
 */
export function toolbarHasVars(toolbar: ToolbarSettings): boolean {
    return toolbar.items.some(item =>
        hasVars([item.label, item.tooltip, item.link].join(' '))
    );
}