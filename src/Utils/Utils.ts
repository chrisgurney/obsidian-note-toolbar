import { EditorView, Rect } from "@codemirror/view";
import NoteToolbarPlugin from "main";
import { App, Command, FileView, ItemView, MarkdownView, Notice, PaneType, Platform } from "obsidian";
import { COMMAND_DOES_NOT_EXIST, ComponentType, DefaultStyleType, ItemType, MOBILE_STYLE_COMPLIMENTS, MobileStyleType, ToolbarItemSettings, ToolbarSettings, Visibility } from "Settings/NoteToolbarSettings";

export default class PluginUtils {

	constructor(
		private ntb: NoteToolbarPlugin
	) {}

	/**
	 * Returns the index of the item in the toolbar that *would be* where the mouse was clicked.
	 * @param event 
	 * @returns 
	 */
	calcToolbarItemIndex(event: MouseEvent): number | undefined {
		const toolbarListEl = this.ntb.el.getToolbarListEl();
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
	 * Determines whether a toolbar should be visible for the given view type.
	 * @param currentViewType Type of the current view.
	 * @returns `true` if the toolbar should be visible, otherwise `false`.
	 */
	checkToolbarForItemView(itemView: ItemView): boolean {
		const currentViewType = itemView.getViewType();
		if (this.ntb.settings.showToolbarInOther.includes(currentViewType)) return true;
		
		const viewSettings: Record<string, boolean | undefined> = {
			'audio': this.ntb.settings.showToolbarIn.audio,
			'bases': this.ntb.settings.showToolbarIn.bases,
			'beautitab-react-view': (this.ntb.settings.emptyViewToolbar !== undefined),
			'canvas': this.ntb.settings.showToolbarIn.canvas,
			'empty': (this.ntb.settings.emptyViewToolbar !== undefined),
			'home-tab-view': (this.ntb.settings.emptyViewToolbar !== undefined),
			'image': this.ntb.settings.showToolbarIn.image,
			'kanban': this.ntb.settings.showToolbarIn.kanban,
			'markdown': true,
			'pdf': this.ntb.settings.showToolbarIn.pdf,
			'video': this.ntb.settings.showToolbarIn.video,
		};
	
		if (viewSettings[currentViewType] === false) return false;
		if (!(currentViewType in viewSettings)) return false;
		return true;
	}

	/**
	 * Returns the active view for markdown, empty tab, and other file types.
	 * @returns FileView, MarkdownView, ItemView, or `null`.
	 */
	getActiveView(): FileView | MarkdownView | ItemView | null {
		let activeView: FileView | MarkdownView | ItemView | null = this.ntb.app.workspace.getActiveViewOfType(MarkdownView);
		if (!activeView) activeView = this.ntb.app.workspace.getActiveViewOfType(ItemView);
		if (!activeView) activeView = this.ntb.app.workspace.getActiveViewOfType(FileView);
		return activeView;
	}

	/**
	 * Returns the name of a command based on its ID, if known.
	 * @param commandId command ID to look up
	 * @returns name of command; undefined otherwise
	 */
	getCommandNameById(commandId: string): string | undefined {
		const availableCommands: Command[] = Object.values(this.ntb.app.commands.commands);
		const matchedCommand = availableCommands.find(command => command.id === commandId);
		return matchedCommand ? matchedCommand.name : undefined;
	}

	/**
	 * Get command ID by name.
	 * @param commandName name of the command to look for.
	 * @returns command ID or undefined.
	 */
	getCommandIdByName(commandName: string): string {
		const availableCommands: Command[] = Object.values(this.ntb.app.commands.commands);
		const matchedCommand = availableCommands.find(command => command.name === commandName);
		return matchedCommand ? matchedCommand.id : COMMAND_DOES_NOT_EXIST;
	}

	/**
	 * Get the current cursor position, or editor selection (with a fallback to Preview mode).
	 * 
	 * @returns cursor position, or `undefined` if we're not showing an editor, or it does not have focus.
	 */
	getCursorPosition(): Rect | undefined {

		let result: Rect | undefined;

		// editor (preview mode) selection
		const activeView = this.ntb.app.workspace.getActiveViewOfType(ItemView);
		if (activeView instanceof MarkdownView && activeView.getMode() === 'preview') {
			const documentSelection = activeDocument.getSelection();
			if (documentSelection && documentSelection.rangeCount > 0 && !documentSelection.isCollapsed) {
				const range = documentSelection.getRangeAt(0);
				const rect = range.getBoundingClientRect();
				result = {
					top: rect.top,
					bottom: rect.bottom,
					left: rect.left,
					right: rect.right
				};
			}
		}
		// editor (editing mode) cursor, or selection
		else {
			// check if selection is in an embed
			const selectionNode = activeDocument.getSelection()?.focusNode;
			const element = (selectionNode as HTMLElement)?.closest ? 
				(selectionNode as HTMLElement) : 
				(selectionNode as Node)?.parentElement;
			const embedElement = element?.closest('.markdown-embed');

			if (embedElement) {
				// for embeds, use document selection like in preview mode
				const documentSelection = activeDocument.getSelection();
				if (documentSelection && documentSelection.rangeCount > 0 && !documentSelection.isCollapsed) {
					const range = documentSelection.getRangeAt(0);
					const rect = range.getBoundingClientRect();
					result = {
						top: rect.top,
						bottom: rect.bottom,
						left: rect.left,
						right: rect.right
					};
				}
			}
			else {
				const editor = this.ntb.app.workspace.activeEditor?.editor;
				
				// TODO: support other file types here?
				if (!editor) return;
				
				const editorView = (editor as any).cm as EditorView;
				const cursorOffset = editor.posToOffset(editor.getCursor());
				const cursorCoords = editorView.coordsAtPos(cursorOffset);
		
				if (cursorCoords) {
					result = {
						top: cursorCoords.top,
						bottom: cursorCoords.bottom,
						left: cursorCoords.left,
						right: cursorCoords.right
					}
				}
		
				// if there's an editor selection, return the bounding box of the selection
				const selection = editor.getSelection();
				if (selection) {
					const selectionRange = editor.listSelections()[0];
					const fromOffset = editor.posToOffset(selectionRange.anchor);
					const toOffset = editor.posToOffset(selectionRange.head);
					
					const startCoords = editorView.coordsAtPos(fromOffset);
					const endCoords = editorView.coordsAtPos(toOffset);
					
					if (startCoords && endCoords) {
						result = {
							top: Math.min(startCoords.top, endCoords.top),
							bottom: Math.max(startCoords.bottom, endCoords.bottom),
							left: Math.min(startCoords.left, endCoords.left),
							right: Math.max(startCoords.right, endCoords.right)
						}
					}
				}
			}

		}

		return result;
	}

	/**
	 * Returns a list of plugin IDs for any commands not recognized in the given toolbar.
	 * @param toolbar ToolbarSettings to check for command usage
	 * @returns an array of plugin IDs that are invalid, or an empty array otherwise
	 */
	getInvalidCommandsForToolbar(toolbar: ToolbarSettings): string[] {
		return toolbar.items
			.filter(item =>
				item.linkAttr.type === ItemType.Command && !(item.linkAttr.commandId in this.ntb.app.commands.commands)
			)
			.map(item => item.linkAttr.commandId.split(':')[0].trim());
	}

	/**
	 * Get the position for displaying UI elements.
	 * @param position The type of position to retrieve. Defaults to `pointer`.
     * `cursor`: editor cursor or selection position (falls back to pointer position, e.g., if editor is not in focus);
	 * `pointer`: mouse/pointer position;
	 * `toolbar`: last clicked toolbar element position (falls back to pointer position)
	 * @returns A Rect object with the position coordinates, or undefined if unable to determine
	 */
	getPosition(position: 'cursor' | 'pointer' | 'toolbar' = 'pointer'): Rect | undefined {
		// 'pointer' position
		const pointerPos: Rect = { 
			left: this.ntb.listeners.document.pointerX, right: this.ntb.listeners.document.pointerX,
			top: this.ntb.listeners.document.pointerY, bottom: this.ntb.listeners.document.pointerY 
		};
		if (position === 'pointer') return pointerPos;

		// 'cursor' position, with fallback to 'pointer'
		if (position === 'cursor') {
			const cursorPos = this.getCursorPosition();
			if (!position) this.ntb.debug('getPosition: cursor not found, falling back to pointer position');
			return cursorPos ?? pointerPos;
		};

		// 'toolbar' position (i.e., last clicked element), with fallback to 'pointer'
		return this.ntb.render.lastClickedPos ?? pointerPos;
	}

    /**
     * Gets the selected text, or the word at the cursor position. Only works in markdown editing or reading modes.
	 * 
	 * @see INoteToolbarApi.getSelection
	 * @param previewOnly set to `true` to only return select text in Preview mode or in embeds (useful for text toolbars). 
	 */
	getSelection(previewOnly: boolean = false): string {

		const editor = this.ntb.app.workspace.activeEditor?.editor;
		const view = this.ntb.app.workspace.getActiveViewOfType(ItemView);
		
		if (view instanceof MarkdownView) {
			const mode = view.getMode();
			const isPreviewMode = mode === 'preview';
			
			// check if selection is in an embed (for editing mode)
			let isInEmbed = false;
			if (!isPreviewMode) {
				const selectionNode = activeDocument.getSelection()?.focusNode;
				const element = (selectionNode as HTMLElement)?.closest ? 
					(selectionNode as HTMLElement) : 
					(selectionNode as Node)?.parentElement;
				isInEmbed = !!element?.closest('.markdown-embed');
			}
			
			// if previewOnly flag is set, only return selection for preview mode or embeds
			if (previewOnly && !isPreviewMode && !isInEmbed) {
				return '';
			}
			
			// in preview mode or in an embed, use document selection
			if (isPreviewMode || isInEmbed) {
				const documentSelection = activeDocument.getSelection();
				const selectedText = documentSelection?.toString().trim();
				if (selectedText) return selectedText;
			}
			
			// in editing mode (not in embed), use editor selection
			if (!isPreviewMode && !isInEmbed && editor) {
				const selection = editor.getSelection();
				if (selection) return selection;

				// or return word at cursor, if there is one
				const cursor = editor.getCursor();
				const wordRange = editor.wordAt(cursor);
				if (wordRange) return editor.getRange(wordRange.from, wordRange.to);
			}
		}

		return '';
	}

	/**
	 * Returns true if the current view matches the given view type.
	 * @param viewType type of view (e.g., `markdown`, `bases`).
	 * @returns true if the current view type matches the given one.
	 */
    hasView(viewType: string): boolean {
        const currentView = this.ntb.app.workspace.getActiveViewOfType(ItemView);
        return currentView?.getViewType() === viewType;
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
 * Returns the text for a toolbar item.
 * @param ntb Plugin instance.
 * @param toolbarItem Item to return text for.
 * @param ignoreVars If true, function tries to return any text that does not include vars/expressions.
 * @returns The resolved text for the toolbar item.
 */
export function getItemText(ntb: NoteToolbarPlugin, toolbarItem: ToolbarItemSettings, ignoreVars: boolean = false): string {
	if (ignoreVars) {
		if (ntb.vars.hasVars(toolbarItem.label)) {
			return ntb.vars.hasVars(toolbarItem.tooltip) ? '' : toolbarItem.tooltip ?? '';
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
 * Checks if the given toolbar has a menu (which refers to another toolbar).
 * @param toolbar ToolbarSettings to check for menu usage
 * @returns true if a menu is used in the toolbar; false otherwise
 */
export function toolbarHasMenu(toolbar: ToolbarSettings): boolean {
	return toolbar.items.some(item => 
		(item.linkAttr.type === ItemType.Menu) && (item.link)
	);
}