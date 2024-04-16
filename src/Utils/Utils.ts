import { PlatformType } from "src/Settings/NoteToolbarSettings";

const DEBUG: boolean = false;

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
 * Item visibility: Returns the platform value corresponding to the UI flags set for hideOnDesktop, hideOnMobile;
 * Platform value should be the opposite of these flags.
 * @param hideOnDesktop 
 * @param hideOnMobile 
 * @returns PlatformType
 */
export function calcItemVisPlatform(hideOnDesktop: boolean, hideOnMobile: boolean): PlatformType {
	if (!hideOnDesktop && !hideOnMobile) {
		return 'all';
	} else if (hideOnDesktop && hideOnMobile) {
		return 'none';
	} else if (hideOnMobile) {
		return 'desktop';
	} else if (hideOnDesktop) {
		return 'mobile';
	} else {
		// this case should never occur
		return 'all';
	}
}

/**
 * Item visibility: Returns the values of the toggles to show in the UI based on the platform value provided;
 * toggle values are the opposite of the Platform values.
 * @param platform PlatformOptions
 * @returns booleans corresponding with hideOnDesktop, hideOnMobile
 */
export function calcItemVisToggles(platform: PlatformType): [boolean, boolean] {
	// returns [hideOnDesktop, hideOnMobile]
	switch (platform) {
		case 'all':
			return [false, false];
		case 'desktop':
			return [false, true];
		case 'mobile':
			return [true, false];
		case 'none':
			return [true, true];
	}
}

/**
 * Utility for debug logging.
 * @param message Message to output for debugging.
 */
export function debugLog(message?: any, ...optionalParams: any[]): void {
	DEBUG && console.log(message, ...optionalParams);
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
