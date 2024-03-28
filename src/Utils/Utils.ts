import { setIcon } from "obsidian";

const DEBUG: boolean = false;

/**
 * Utility to swap item in an array, used with list controls I borrowed from Templater.
 * @author SilentVoid13 (Templater Plugin) 
 * @link https://github.com/SilentVoid13/Templater/blob/master/src/settings/Settings.ts#L481
*/
export function arraymove<T>(
	arr: T[],
	fromIndex: number,
	toIndex: number
): void {
	if (toIndex < 0 || toIndex === arr.length) {
		return;
	}
	const element = arr[fromIndex];
	arr[fromIndex] = arr[toIndex];
	arr[toIndex] = element;
}

/**
 * Utility for debug logging.
 * @param message Message to output for debugging.
 */
export function debugLog(message?: any, ...optionalParams: any[]): void {
	DEBUG && console.log(message, ...optionalParams);
}

/**
 * A wrapper for Obsidian's setIcon(), but with the difference that this one does not need a container as a parameter.
 * @author taitava, from the Shell Commands plugin.
 * @link https://github.com/Taitava/obsidian-shellcommands/blob/8d030a23540d587a85bd0dfe2e08c8e6b6b955ab/src/Icons.ts#L26 
 */
export function getIconHTML(icon_id: string) {
    if (!icon_id) {
        return "";
    }
    const icon_container = document.body.createEl("div"); // A temporary element, will be deleted soon. Not nice to create a temporary element in the body, but I don't know any better way.
    setIcon(icon_container, icon_id);
	// TODO: look at Obsidian Commander and Obsidian Badges plugins for other ways to incorporate Lucide icons
    const icon_html = icon_container.innerHTML;
    icon_container.remove();
    return icon_html;
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
 * Check if a string has vars, defined as {{variablename}}
 * @param s The string to check.
 */
export function hasVars(s: string): boolean {
	const urlVariableRegex = /{{.*?}}/g;
	return urlVariableRegex.test(s);
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
