import NoteToolbarPlugin from "main";
import { MarkdownView, Notice } from "obsidian";
import { LocalVar, PositionType, t, ToolbarSettings, ToolbarStyle } from "Settings/NoteToolbarSettings";
import ContextMenu from "./ContextMenu";

/**
 * Handles toolbar events registered with Obsidian's `registerEvent()`. 
 */
export default class ToolbarHandler {

	private contextMenu: ContextMenu;

    constructor(
        private ntb: NoteToolbarPlugin
    ) {
		this.contextMenu = new ContextMenu(ntb);
	}

	/**
	 * Handles the floating action button.
	 * @param event MouseEvent
	 * @param posAtElement HTMLElement to position the menu at, which might be different from where the event originated
	 */
	onClickFab = async (event: MouseEvent, posAtElement: HTMLElement) => {

		// this.ntb.debug("fabHandler: ", event);
		event.preventDefault();

		let activeFile = this.ntb.app.workspace.getActiveFile();
		let toolbar: ToolbarSettings | undefined;
		
		// get toolbar to show
		if (activeFile) {
			let frontmatter = activeFile ? this.ntb.app.metadataCache.getFileCache(activeFile)?.frontmatter : undefined;
			toolbar = this.ntb.settingsManager.getMappedToolbar(frontmatter, activeFile);
		}
		else {
			toolbar = this.ntb.settingsManager.getEmptyViewToolbar();
		}

		if (toolbar) {
			// if the default option is set, handle the item
			if (toolbar.defaultItem) {
				const toolbarItem = this.ntb.settingsManager.getToolbarItemById(toolbar.defaultItem);
				if (toolbarItem) {
					await this.ntb.items.handleItemLink(toolbarItem, event, activeFile);
				}
				else {
					new Notice(t('setting.position.notice-defaultitem-invalid')).containerEl.addClass('mod-warning');
				}
			}
			else {
				this.ntb.render.renderAsMenu(toolbar, activeFile, this.ntb.settings.showEditInFabMenu).then(menu => { 
					let fabEl = this.ntb.el.getToolbarFabEl();
					if (fabEl) {
						let fabPos = fabEl.getAttribute('data-tbar-position');
						// determine menu orientation based on button position
						let elemRect = posAtElement.getBoundingClientRect();
						let menuPos = { 
							x: (fabPos === PositionType.FabLeft ? elemRect.x : elemRect.x + elemRect.width), 
							y: (elemRect.top - 4),
							overlap: true,
							left: (fabPos === PositionType.FabLeft ? false : true)
						};
						// store menu position for sub-menu positioning
						this.ntb.app.saveLocalStorage(LocalVar.MenuPos, JSON.stringify(menuPos));
						menu.showAtPosition(menuPos);
					}
					else {
						// for Position.TabBar
						menu.showAtMouseEvent(event);
					}
				});
			}
		}

	}

	/**
	 * Shows a context menu with links to settings/configuration.
	 * @param event MouseEvent
	 */
	onContextMenu = async (event: MouseEvent) => {
		await this.contextMenu.render(event);
	}

	/**
	 * Handles keyboard navigation within the toolbar.
	 * @param e KeyboardEvent
	 * @param isFloatingToolbar set to true if this is for a floating toolbar.
	 */
	onKeyDown = async (e: KeyboardEvent, isFloatingToolbar: boolean = false) => {

		this.ntb.debugGroup('onKeyDown');

		let itemsUl: HTMLElement | null = this.ntb.el.getToolbarListEl(isFloatingToolbar);
		if (itemsUl) {

			// not preventing default from 'Escape' for now (I think this helps)
			e.key ? (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Enter', 'Shift', 'Tab', ' '].includes(e.key) ? e.preventDefault() : undefined) : undefined;

			// remove any items that are not visible (i.e., hidden on desktop/mobile) as they are not navigable
			let items = Array.from(itemsUl.children);
			const visibleItems = items.filter(item => {
				const hasSpan = item.querySelector('span') !== null; // to filter out separators
				const isVisible = window.getComputedStyle(item).getPropertyValue('display') !== 'none';
				return hasSpan && isVisible;
			});
			let currentEl = activeDocument.activeElement?.parentElement as HTMLElement;
			let currentIndex = visibleItems.indexOf(currentEl);

			let key = e.key;
			// need to capture tab in order to move the focus style across the toolbar
			if (e.key === 'Tab') {
				key = e.shiftKey ? 'ArrowLeft' : 'ArrowRight';
			}

			switch (key) {
				case 'ArrowRight':
				case 'ArrowDown': {
					const nextIndex = (currentIndex + 1) % visibleItems.length;
					this.ntb.debug(currentEl);
					currentEl.removeClass(ToolbarStyle.ItemFocused);
					visibleItems[nextIndex].addClass(ToolbarStyle.ItemFocused);
					visibleItems[nextIndex].querySelector('span')?.focus();
					break;
				}
				case 'ArrowLeft':
				case 'ArrowUp': {
					const prevIndex = (currentIndex - 1 + visibleItems.length) % visibleItems.length;
					currentEl.removeClass(ToolbarStyle.ItemFocused);
					visibleItems[prevIndex].addClass(ToolbarStyle.ItemFocused);
					visibleItems[prevIndex].querySelector('span')?.focus();
					break;
				}
				case 'Enter':
				case ' ': {
					let activeEl = activeDocument?.activeElement as HTMLElement;
					let selectedItem = this.ntb.settingsManager.getToolbarItemById(activeEl?.id);
					if (selectedItem) {
						await this.ntb.items.handleItemLink(selectedItem, e);
					}
					break;
				}
				case 'Escape': {
					// need this implemented for Reading mode, as escape does nothing
					let currentView = this.ntb.app.workspace.getActiveViewOfType(MarkdownView);
					let viewMode = currentView?.getMode();
					if (viewMode === 'preview') {
						(activeDocument?.activeElement as HTMLElement).blur();
					}
					// put focus back on element if it's a toolbar item
					if (currentEl.tagName === 'LI' && currentEl.closest('.cg-note-toolbar-callout')) {
						currentEl.addClass(ToolbarStyle.ItemFocused);
					}
					else {
						await this.ntb.render.removeFocusStyle();
					}
					break;
				}
			}

		}

		this.ntb.debugGroupEnd();

	}

}