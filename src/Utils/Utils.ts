import NoteToolbarPlugin from "main";
import { App, Command, FileView, ItemView, MarkdownView, Notice, PaneType, Platform, TFile } from "obsidian";
import { COMMAND_DOES_NOT_EXIST, ComponentType, DefaultStyleType, ItemType, MOBILE_STYLE_COMPLIMENTS, MobileStyleType, ToolbarItemSettings, ToolbarSettings, Visibility } from "Settings/NoteToolbarSettings";

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
 * Returns the index of the item in the toolbar that *would be* where the mouse was clicked.
 * @param plugin 
 * @param event 
 * @returns 
 */
export function calcMouseItemIndex(plugin: NoteToolbarPlugin, event: MouseEvent): number | undefined {
    const toolbarListEl = plugin.getToolbarListEl();
    if (!toolbarListEl) return;

    const children = Array.from(toolbarListEl.children) as HTMLElement[];
    const rects = children.map(el => el.getBoundingClientRect());
    const { clientX: x, clientY: y } = event;

    const itemRow = rects.filter(r => y >= r.top && y <= r.bottom);
    const findEl = (r: DOMRect | undefined): HTMLElement | undefined =>
        r ? children[rects.indexOf(r)] : undefined; // helper

    const mouseEl = findEl(itemRow.find(r => x >= r.left && x <= r.right));
    const leftEl = findEl(itemRow.filter(r => r.right <= x).pop());
    const rightEl = findEl(itemRow.find(r => r.left > x));

    // plugin.debug('Item under cursor:', mouseEl || null);
    // plugin.debug('Left:', leftEl || null);
    // plugin.debug('Right:', rightEl || null);

    const getIndex = (el?: HTMLElement): number | undefined =>
        el?.dataset.index ? Number(el.dataset.index) : undefined;

    return getIndex(mouseEl) ?? getIndex(leftEl) ?? getIndex(rightEl);
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
 * Determines whether a toolbar should be visible for the given view type.
 * @param plugin NoteToolbarPlugin instance containing toolbar visibility settings.
 * @param currentViewType Type of the current view.
 * @returns `true` if the toolbar should be visible, otherwise `false`.
 */
export function checkToolbarForItemView(plugin: NoteToolbarPlugin, itemView: ItemView): boolean {
	const currentViewType = itemView.getViewType();
	if (plugin.settings.showToolbarInOther.includes(currentViewType)) return true;
	
    const viewSettings: Record<string, boolean | undefined> = {
        'audio': plugin.settings.showToolbarIn.audio,
		'bases': plugin.settings.showToolbarIn.bases,
        'beautitab-react-view': (plugin.settings.emptyViewToolbar !== undefined),
        'canvas': plugin.settings.showToolbarIn.canvas,
        'empty': (plugin.settings.emptyViewToolbar !== undefined),
        'home-tab-view': (plugin.settings.emptyViewToolbar !== undefined),
        'image': plugin.settings.showToolbarIn.image,
		'kanban': plugin.settings.showToolbarIn.kanban,
        'pdf': plugin.settings.showToolbarIn.pdf,
        'video': plugin.settings.showToolbarIn.video,
    };

    if (viewSettings[currentViewType] === false) return false;
    if (!(currentViewType in viewSettings)) return false;
    return true;
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
		errorEl.setText(message + '\n' + error);
	}
	let errorFr = createFragment();
	errorFr.append(message);
	error ? errorFr.append('\n', error) : undefined;
	new Notice(errorFr, 5000);
}

/**
 * Returns the active view for markdown, empty tab, and other file types.
 * @returns FileView, MarkdownView, ItemView, or `null`.
 */
export function getActiveView(): FileView | MarkdownView | ItemView | null {
	let activeView: FileView | MarkdownView | ItemView | null = this.app.workspace.getActiveViewOfType(MarkdownView);
	if (!activeView) activeView = this.app.workspace.getActiveViewOfType(ItemView);
	if (!activeView) activeView = this.app.workspace.getActiveViewOfType(FileView);
	return activeView;
}

/**
 * Returns the name of a command based on its ID, if known.
 * @param commandId command ID to look up
 * @returns name of command; undefined otherwise
 */
export function getCommandNameById(plugin: NoteToolbarPlugin, commandId: string): string | undefined {
	const availableCommands: Command[] = Object.values(plugin.app.commands.commands);
	const matchedCommand = availableCommands.find(command => command.id === commandId);
	return matchedCommand ? matchedCommand.name : undefined;
}

/**
 * Get command ID by name.
 * @param commandName name of the command to look for.
 * @returns command ID or undefined.
 */
export function getCommandIdByName(plugin: NoteToolbarPlugin, commandName: string): string {
	const availableCommands: Command[] = Object.values(plugin.app.commands.commands);
	const matchedCommand = availableCommands.find(command => command.name === commandName);
	return matchedCommand ? matchedCommand.id : COMMAND_DOES_NOT_EXIST;
}

/**
 * Returns the text for a toolbar item.
 * @param plugin Plugin instance.
 * @param toolbarItem Item to return text for.
 * @param ignoreVars If true, function tries to return any text that does not include vars/expressions.
 * @returns The resolved text for the toolbar item.
 */
export function getItemText(plugin: NoteToolbarPlugin, toolbarItem: ToolbarItemSettings, ignoreVars: boolean = false): string {
	if (ignoreVars) {
		if (plugin.hasVars(toolbarItem.label)) {
			return plugin.hasVars(toolbarItem.tooltip) ? '' : toolbarItem.tooltip ?? '';
		}
	}
    return toolbarItem.label || toolbarItem.tooltip || '';
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
export function getLinkUiTarget(event: MouseEvent | KeyboardEvent | undefined): PaneType | undefined {
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
 * Gets a unique ID for the current view.
 * @param view to get the identifer for
 * @returns ID string, consisting of the leaf's ID and the view's file path
 */
export function getViewId(view: ItemView | null | undefined): string | undefined {
	let viewId = undefined;
	if (view instanceof FileView || view instanceof MarkdownView) {
		viewId = `${view.leaf.id} ${view.file?.path}`;
		if (view instanceof MarkdownView) viewId += ` ${view.getMode()}`;
	}
	return viewId;
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
 * Local function to check if given visibility has any components or not, for use in determining whether or not 
 * we should show it on a given platform.
 * @param platform platform visibility to check
 * @returns true if it has components; false otherwise
 */
function hasVisibleComponents(platform: { allViews?: { components: ComponentType[] } }): boolean {
    return !!platform && !!platform.allViews && platform.allViews.components.length > 0;
}

/**
 * Checks if the given toolbar has the given style.
 * @param toolbar toolbar to check if it has the given style.
 * @param defaultStyle default style string to check
 * @param mobileStyle mobile style string to check for, if the current platform is mobile (supercedes defaultStyle)
 * @returns true if the toolbar has the given style; false otherwise 
 */
export function hasStyle(toolbar: ToolbarSettings, defaultStyle: DefaultStyleType, mobileStyle: MobileStyleType): boolean {
	const isDefaultStyle = toolbar.defaultStyles.includes(defaultStyle);
	if (Platform.isDesktop) return isDefaultStyle;

	const isMobileStyle = toolbar.mobileStyles.includes(mobileStyle);
	if (isMobileStyle) return true;

	// get other styles that could override out the one provided (e.g., left -> right)
	const mobileCompliments = MOBILE_STYLE_COMPLIMENTS.find(list => list.includes(mobileStyle));
	// check for mobile styles in that list
	const hasMobileCompliment = mobileCompliments?.some(el => toolbar.mobileStyles.includes(el));

	// either there's a mobile style, otherwise use the default
	return hasMobileCompliment ? isMobileStyle : isDefaultStyle;
}

/**
 * Imports the given arguments string as if it were JSON, but allows for missing parens and quotes.
 * @param args JSON-formatted string
 * @returns parsed arguments, or null if parsing fails
 */
export function importArgs(args: string): Record<string, any> | null {
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