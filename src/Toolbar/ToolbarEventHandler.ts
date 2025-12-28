import NoteToolbarPlugin from "main";
import { Menu, ItemView, Platform, MenuItem, Notice, Editor, MarkdownFileInfo, MarkdownView, TFile } from "obsidian";
import { ItemType, t, PositionType, ToolbarSettings, LocalVar, RibbonAction, ToolbarStyle } from "Settings/NoteToolbarSettings";
import ItemModal from "Settings/UI/Modals/ItemModal";
import ShareModal from "Settings/UI/Modals/ShareModal";
import StyleModal from "Settings/UI/Modals/StyleModal";
import ToolbarSettingsModal from "Settings/UI/Modals/ToolbarSettingsModal";
import { openItemSuggestModal, learnMoreFr } from "Settings/UI/Utils/SettingsUIUtils";
import { exportToCallout, importFromCallout } from "Utils/ImportExport";
import { TbarData } from "./ToolbarRenderer";
import { EditorView } from "@codemirror/view";

/**
 * Handles toolbar events registered with Obsidian's `registerEvent()`. 
 */
export default class ToolbarEventHandler {

    constructor(
        private ntb: NoteToolbarPlugin
    ) {}

	/**
	 * On click of an item in the toolbar, we replace any variables that might
	 * be in the URL, and then open it.
	 * @param event MouseEvent
	 */
	async clickHandler(event: MouseEvent) {

		// this.ntb.debug('clickHandler:', event);

		// allow standard and middle clicks through
		if (event.type === 'click' || (event.type === 'auxclick' && event.button === 1)) {

			let clickedEl = event.currentTarget as HTMLLinkElement;
			let linkHref = clickedEl.getAttribute("href");
	
			if (linkHref != null) {
				
				const itemUuid = clickedEl.id;

				let linkType = clickedEl.getAttribute("data-toolbar-link-attr-type") as ItemType;
				linkType ? (Object.values(ItemType).includes(linkType) ? event.preventDefault() : undefined) : undefined
	
				// this.ntb.debug('clickHandler: ', 'clickedEl: ', clickedEl);
	
				let linkCommandId = clickedEl.getAttribute("data-toolbar-link-attr-commandid");
				
				// remove the focus effect if clicked with a mouse
				if ((event as PointerEvent)?.pointerType === "mouse") {
					clickedEl.blur();
					await this.ntb.render.removeFocusStyle();
				}

				await this.ntb.items.handleLink(itemUuid, linkHref, linkType, linkCommandId, event);
	
			}

		}

	}

	/**
	 * Shows a context menu with links to settings/configuration.
	 * @param mouseEvent MouseEvent
	 */
	async contextMenuHandler(mouseEvent: MouseEvent) {

		mouseEvent.preventDefault();

		// figure out what toolbar we're in
		let toolbarEl = (mouseEvent.target as Element).closest('.cg-note-toolbar-container') as HTMLElement;
		let toolbarSettings = toolbarEl?.id ? this.ntb.settingsManager.getToolbarById(toolbarEl.id) : undefined;
		const isFloatingToolbar = toolbarEl.getAttribute(TbarData.Position) === PositionType.Floating;

		// figure out what item was clicked on (if any)
		let toolbarItemEl: Element | null = null;
		if (mouseEvent.target instanceof HTMLLIElement) {
			toolbarItemEl = (mouseEvent.target as Element).querySelector('.cg-note-toolbar-item');
		}
		else {
			toolbarItemEl = (mouseEvent.target as Element).closest('.cg-note-toolbar-item');
		}
		let toolbarItem = toolbarItemEl?.id ? this.ntb.settingsManager.getToolbarItemById(toolbarItemEl.id) : undefined;

		let contextMenu = new Menu();

		const currentView = this.ntb.app.workspace.getActiveViewOfType(ItemView);
		const currentPosition = toolbarSettings ? this.ntb.settingsManager.getToolbarPosition(toolbarSettings) : undefined;

		if (toolbarSettings !== undefined) {

			if (Platform.isPhone) {
				contextMenu.addItem((item: MenuItem) => {
					item
						.setTitle(toolbarSettings.name)
						.setIsLabel(true)
				});
			}

			//
			// position
			//

			if (!isFloatingToolbar) {

				// workaround: sub-menus only work on non-tablet devices
				let positionMenu = contextMenu;
				if (!Platform.isTablet) {
					contextMenu.addItem((item: MenuItem) => {
						item.setTitle(t('toolbar.menu-position'));
						item.setIcon('move');
						positionMenu = item.setSubmenu() as Menu;
					});
				}

				if (currentView?.getViewType() === 'empty') {
					if (this.ntb.settings.showLaunchpad) {
						if (currentPosition !== PositionType.Top && currentPosition !== PositionType.Props) {
							positionMenu.addItem((item: MenuItem) => {
								item.setTitle(t('setting.position.option-centered'))
									.setIcon('layout-grid')
									.onClick(async (menuEvent) => {
										await this.ntb.settingsManager.updatePosition(toolbarSettings, PositionType.Props);
										contextMenu.close();
									});
							});
						}
					}
					else {
						if (currentPosition !== PositionType.Top) {
							positionMenu.addItem((item: MenuItem) => {
								item.setTitle(t('setting.position.option-top'))
									.setIcon('arrow-up-to-line')
									.onClick(async (menuEvent) => {
										await this.ntb.settingsManager.updatePosition(toolbarSettings, PositionType.Top);
										contextMenu.close();
									});
							});
						}
					}
				} 
				else {
					const positions = [
						{ type: PositionType.TabBar, titleKey: 'setting.position.option-tabbar', icon: 'panel-top' },
						{ type: PositionType.Top, titleKey: 'setting.position.option-top', icon: 'arrow-up-to-line' },
						{ type: PositionType.Props, titleKey: 'setting.position.option-props', icon: 'arrow-down-narrow-wide' },
						{ type: PositionType.Bottom, titleKey: 'setting.position.option-bottom', icon: 'arrow-down-to-line' }
					];

					positions.forEach(({ type, titleKey, icon }) => {
						if (currentPosition !== type) {
							positionMenu.addItem((item: MenuItem) => {
								item.setTitle(t(titleKey))
									.setIcon(icon)
									.onClick(async () => {
										await this.ntb.settingsManager.updatePosition(toolbarSettings, type);
										contextMenu.close();
									});
							});
						}
					});
				}

				const fabPositions = [
					{ type: PositionType.FabLeft, titleKey: 'setting.position.option-fabl', icon: 'circle-chevron-left' },
					{ type: PositionType.FabRight, titleKey: 'setting.position.option-fabr', icon: 'circle-chevron-right' }
				];

				fabPositions.forEach(({ type, titleKey, icon }) => {
					if (currentPosition !== type) {
						positionMenu.addItem((item: MenuItem) => {
							item.setTitle(t(titleKey))
								.setIcon(icon)
								.onClick(async () => {
									await this.ntb.settingsManager.updatePosition(toolbarSettings, type);
									contextMenu.close();
								});
						});
					}
				});

				if (Platform.isTablet) contextMenu.addSeparator();

			}

			//
			// style toolbar
			//

			// no need to show it for the tab bar position, as it can't be styled there
			if (currentPosition !== PositionType.TabBar) {
				contextMenu.addItem((item: MenuItem) => {
					item
						.setIcon('palette')
						.setTitle(t('toolbar.menu-style'))
						.onClick(async () => {
							if (toolbarSettings) {
								const styleModal = new StyleModal(this.ntb, toolbarSettings);
								styleModal.open();
							}
						});
				});
			}

			//
			// show/hide properties + bases toolbars
			//

			if (this.ntb.utils.hasView('markdown')) {
				const propsEl = this.ntb.el.getPropsEl();
				if (propsEl) {
					const propsDisplayStyle = getComputedStyle(propsEl).getPropertyValue('display');
					const uiHidden = propsDisplayStyle === 'none';
					contextMenu.addItem((item: MenuItem) => {
						item.setTitle(uiHidden ? t('toolbar.menu-show-properties') : t('toolbar.menu-hide-properties'))
							.setIcon(uiHidden ? 'captions' : 'captions-off')
							.onClick(async (menuEvent) => this.ntb.commands.toggleUi('props', uiHidden ? 'show' : 'hide'));
					});
				}
			}
			else if (this.ntb.utils.hasView('bases')) {
				const baseToolbarEl = activeDocument.querySelector('.bases-header');
				if (baseToolbarEl) {
					const baseToolbarDisplayStyle = getComputedStyle(baseToolbarEl).getPropertyValue('display');
					const uiHidden = baseToolbarDisplayStyle === 'none';
					contextMenu.addItem((item: MenuItem) => {
						item.setTitle(uiHidden ? t('toolbar.menu-show-base-toolbar') : t('toolbar.menu-hide-base-toolbar'))
							.setIcon(uiHidden ? 'panel-top-open' : 'panel-top-close')
							.onClick(async (menuEvent) => this.ntb.commands.toggleUi('baseToolbar', uiHidden ? 'show' : 'hide'));
					});
				}
			}

		}
		
		contextMenu.addSeparator();

		//
		// add item
		//

		contextMenu.addItem((item: MenuItem) => {
			item
				.setIcon('plus')
				.setTitle(t('toolbar.menu-add-item'))
				.onClick(async () => {
					const toolbarItemIndex = this.ntb.utils.calcToolbarItemIndex(mouseEvent);
					if (toolbarSettings) openItemSuggestModal(this.ntb, toolbarSettings, 'New', undefined, toolbarItemIndex);
				});
		});

		//
		// edit item
		//

		if (toolbarItem) {
			const activeFile = this.ntb.app.workspace.getActiveFile();
			let itemText = await this.ntb.items.getItemText(toolbarItem, activeFile, true);
			if (!itemText && toolbarItem.linkAttr.type === ItemType.Separator) itemText = t('setting.item.option-separator');
			contextMenu.addItem((item: MenuItem) => {
				item
					.setIcon('lucide-pen-box')
					.setTitle(itemText 
						? t('toolbar.menu-edit-item', { text: itemText, interpolation: { escapeValue: false } }) 
						: t('toolbar.menu-edit-item_none'))
					.onClick(async () => {
						if (toolbarSettings) {
							const itemModal = new ItemModal(this.ntb, toolbarSettings, toolbarItem);
							itemModal.open();
						}
					});
			});

			if (toolbarItem.linkAttr.type === ItemType.Menu) {
				const menuToolbar = this.ntb.settingsManager.getToolbar(toolbarItem.link);
				if (menuToolbar) {
					contextMenu.addItem((item: MenuItem) => {
						item
							.setIcon('square-menu')
							.setTitle(t('toolbar.menu-edit-menu', { toolbar: menuToolbar.name, interpolation: { escapeValue: false } }))
							.onClick(async () => {
								const modal = new ToolbarSettingsModal(this.ntb.app, this.ntb, null, menuToolbar as ToolbarSettings);
								modal.setTitle(t('setting.title-edit-toolbar', { toolbar: menuToolbar.name, interpolation: { escapeValue: false } }));
								modal.open();
							});
					});					
				}
			}
		}

		contextMenu.addSeparator();

		//
		// edit toolbar
		//

		if (toolbarSettings !== undefined) {
			contextMenu.addItem((item: MenuItem) => {
				item
					.setTitle(t('toolbar.menu-edit-toolbar', { toolbar: toolbarSettings?.name, interpolation: { escapeValue: false } }))
					.setIcon('rectangle-ellipsis')
					.onClick((menuEvent) => {
						const modal = new ToolbarSettingsModal(this.ntb.app, this.ntb, null, toolbarSettings as ToolbarSettings);
						modal.setTitle(t('setting.title-edit-toolbar', { toolbar: toolbarSettings?.name, interpolation: { escapeValue: false } }));
						modal.open();
					});
			  });
		}

		//
		// swap toolbar
		//

		// (if filetype is markdown, and prop != 'tags' so we don't accidentally remove them)
		if (!isFloatingToolbar && currentView?.getViewType() === 'markdown' && this.ntb.settings.toolbarProp !== 'tags') {
			contextMenu.addItem((item: MenuItem) => {
				item
					.setIcon('repeat')
					.setTitle(t('toolbar.menu-swap-toolbar'))
					.onClick(() => this.ntb.commands.swapToolbar());
			});
		}

		if (toolbarSettings !== undefined) {

			contextMenu.addSeparator();

			// share
			contextMenu.addItem((item: MenuItem) => {
				item
					.setIcon('share')
					.setTitle(t('export.label-share'))
					.onClick(async () => {
						if (toolbarSettings) {
							const shareUri = await this.ntb.protocolManager.getShareUri(toolbarSettings);
							let shareModal = new ShareModal(this.ntb, shareUri, toolbarSettings);
							shareModal.open();
						}
					});
			});

			// copy as callout
			contextMenu.addItem((item: MenuItem) => {
				item
					.setTitle(t('export.label-callout'))
					.setIcon('copy')
					.onClick(async (menuEvent) => {
						if (toolbarSettings) {
							let calloutExport = await exportToCallout(this.ntb, toolbarSettings, this.ntb.settings.export);
							navigator.clipboard.writeText(calloutExport);
							new Notice(learnMoreFr(t('export.notice-completed'), 'Creating-callouts-from-toolbars'));
						}
					})
				});

			contextMenu.addSeparator();

		}

		contextMenu.addItem((item: MenuItem) => {
			item
			  .setTitle(t('toolbar.menu-toolbar-settings'))
			  .setIcon('gear')
			  .onClick(async (menuEvent) => {
				  await this.ntb.commands.openSettings();
			  });
		  });

		navigator.vibrate(50);
		contextMenu.showAtPosition(mouseEvent);

	}

	/**
	 * On opening of the editor menu, check what was selected and add relevant menu options.
	 */
	editorMenuHandler = async (menu: Menu, editor: Editor, view: MarkdownView | MarkdownFileInfo) => {

		// replace Editor menu with the selected toolbar
		if (this.ntb.settings.editorMenuToolbar) {
			// FIXME? should we check if the active file is what we're viewing? might be confusing otherwise
			const activeFile = this.ntb.app.workspace.getActiveFile();
			const toolbar = this.ntb.settingsManager.getToolbarById(this.ntb.settings.editorMenuToolbar);
			if (toolbar) {
				// @ts-ignore
				menu.items = [];
				if (this.ntb.settings.editorMenuAsToolbar) {
					const mouseRect = {
						left: this.ntb.render.mouseX,
						top: this.ntb.render.mouseY,
						right: this.ntb.render.mouseX,
						bottom: this.ntb.render.mouseY
					}
					await this.ntb.render.renderFloatingToolbar(toolbar, mouseRect, mouseRect);
				}
				else {
					// not replacing variables here, because we need to call it synchronously
					this.ntb.render.renderMenuItems(menu, toolbar, activeFile, undefined, false);
				}
				return;
			}
			else {
				new Notice(t('setting.display-locations.option-editor-menu-error'));
			}
		}
		// otherwise, add callout helper items to the standard Editor menu
		else {
			const selection = editor.getSelection().trim();
			const line = editor.getLine(editor.getCursor().line).trim();
			if (selection.includes('[!note-toolbar') || line.includes('[!note-toolbar')) {
				menu.addItem((item: MenuItem) => {
					item
						.setIcon('info')
						.setTitle(t('import.option-help'))
						.onClick(async () => {
							window.open('https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Note-Toolbar-Callouts', '_blank');
						});
				});
			}
			if (selection.includes('[!note-toolbar')) {
				menu.addItem((item: MenuItem) => {
					item
						.setIcon('import')
						.setTitle(t('import.option-create'))
						.onClick(async () => {
							let toolbar = await importFromCallout(this.ntb, selection);
							await this.ntb.settingsManager.addToolbar(toolbar);
							await this.ntb.commands.openToolbarSettingsForId(toolbar.uuid);
						});
				});
			}
		}

	}

	/**
	 * On opening of the file menu, check and render toolbar as a submenu.
	 * @param menu the file Menu
	 * @param file TFile for link that was clicked on
	 */
	fileMenuHandler = (menu: Menu, file: TFile) => {
		if (this.ntb.settings.showToolbarInFileMenu) {
			// don't bother showing in the file menu for the active file
			let activeFile = this.ntb.app.workspace.getActiveFile();
			if (activeFile && file !== activeFile) {
				let cache = this.ntb.app.metadataCache.getFileCache(file);
				if (cache) {
					let toolbar = this.ntb.settingsManager.getMappedToolbar(cache.frontmatter, file);
					if (toolbar) {
						// the submenu UI doesn't appear to work on mobile, render items in menu
						if (Platform.isMobile) {
							toolbar ? this.ntb.render.renderMenuItems(menu, toolbar, file, 1) : undefined;
						}
						else {
							menu.addItem((item: MenuItem) => {
								item
									.setIcon(this.ntb.settings.icon)
									.setTitle(toolbar ? toolbar.name : '');
								let subMenu = item.setSubmenu() as Menu;
								toolbar ? this.ntb.render.renderMenuItems(subMenu, toolbar, file) : undefined;
							});
						}
					}
				}
			}
		}
	}

	/**
	 * Handles what happens when the ribbon icon is used.
	 * @param event MouseEvent
	 */
	async ribbonMenuHandler(event: MouseEvent) {
		switch (this.ntb.settings.ribbonAction) {
			case (RibbonAction.ItemSuggester):
				await this.ntb.commands.openQuickTools();
				break;
			case (RibbonAction.ToolbarSuggester):
				await this.ntb.commands.openToolbarSuggester();
				break;
			case (RibbonAction.Toolbar): {
				let activeFile = this.ntb.app.workspace.getActiveFile();
				if (activeFile) {
					let frontmatter = activeFile ? this.ntb.app.metadataCache.getFileCache(activeFile)?.frontmatter : undefined;
					let toolbar: ToolbarSettings | undefined = this.ntb.settingsManager.getMappedToolbar(frontmatter, activeFile);
					if (toolbar) {
						this.ntb.render.renderAsMenu(toolbar, activeFile, this.ntb.settings.showEditInFabMenu).then(menu => { 
							menu.showAtPosition(event); 
						});
					}
				}
				break;
			}
		}
	}

	/**
	 * Handles the floating action button.
	 * @param event MouseEvent
	 * @param posAtElement HTMLElement to position the menu at, which might be different from where the event originated
	 */
	async fabHandler(event: MouseEvent, posAtElement: HTMLElement) {

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
					new Notice(t('setting.position.notice-defaultitem-invalid'));
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
	 * Handles keyboard navigation within the toolbar.
	 * @param e KeyboardEvent
	 * @param isFloatingToolbar set to true if this is for a floating toolbar.
	 */
	async keyboardHandler(e: KeyboardEvent, isFloatingToolbar: boolean = false) {

		this.ntb.debugGroup("keyboardHandler");

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