import { ComponentType, ItemViewContext, PlatformType, ViewType, Visibility } from "src/Settings/NoteToolbarSettings";

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
 * @param Visibility
 * @returns booleans indicating whether to showOnDesktop, showOnMobile, showOnTablet
 */
export function calcItemVisToggles(visibility: Visibility): [boolean, boolean, boolean] {
    const desktopHasComponents = hasComponents(visibility.desktop);
    const mobileHasComponents = hasComponents(visibility.mobile);
    const tabletHasComponents = hasComponents(visibility.tablet);
    return [desktopHasComponents, mobileHasComponents, tabletHasComponents];
}

/**
 * Local function to check if given visibility has components or not, for use in determining whether or not 
 * we should show it on a given platform.
 * @param platform platform visibility to check
 * @returns true if it has components; false otherwise
 */
function hasComponents(platform: { allViews?: { components: ComponentType[] } }): boolean {
    return !!platform && !!platform.allViews && platform.allViews.components.length > 0;
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
 * Gets the position of the given element. Should probably use only if not available otherwise.
 * @param element to get position of
 * @returns x, y position
 */
export function getPosition(element: HTMLElement): { x: number, y: number } {
    const rect = element.getBoundingClientRect();
    return {
        x: rect.left + activeWindow.scrollX,
        y: rect.top + activeWindow.scrollY
    };
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
