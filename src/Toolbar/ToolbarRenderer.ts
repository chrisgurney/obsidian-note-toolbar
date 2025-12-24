import { Rect } from "@codemirror/view";
import NoteToolbarPlugin from "main";
import { MarkdownView, ItemView, TFile, Platform, setIcon, setTooltip, FrontMatterCache, getIcon, Menu, MenuItem, MenuPositionDef, TFolder, Notice } from "obsidian";
import { ToolbarSettings, DefaultStyleType, MobileStyleType, PositionType, ItemType, LocalVar, ToggleUiStateType, t, ToolbarStyle, OBSIDIAN_UI_ELEMENTS } from "Settings/NoteToolbarSettings";
import ToolbarSettingsModal from "Settings/UI/Modals/ToolbarSettingsModal";
import { hasStyle, putFocusInMenu, getViewId, isValidUri, calcComponentVisToggles, calcItemVisToggles } from "Utils/Utils";

// note: make sure CSS is updated if these are changed
export enum TbarData {
	FabMeta = 'data-fab-metadata',
	Name = 'data-name',
	Position = 'data-tbar-position',
	Replace = 'data-replace',
	Updated = 'data-updated',
	ViewMode = 'data-view-mode'
}

/**
 * Provides toolbar rendering, update, and cleanup functions.
 */
export default class ToolbarRenderer {

	mouseX: number = 0;
	mouseY: number = 0;
    textToolbarEl: HTMLDivElement | null = null;
    
	activeViewIds: string[] = []; // track opened views, to reduce unneccesary toolbar re-renders
    isRendering: Record<string, boolean> = {}; // track if a toolbar is being rendered in a view, to prevent >1 event from triggering two renders
	mobileNavbarMargin: number;
	viewActionsHeight: number;

    constructor(
        private ntb: NoteToolbarPlugin
    ) {}

	/**
	 * Check to see if the text toolbar is present.
	 * @returns true if the text toolbar is present and visible; false otherwise.
	 */
	hasTextToolbar(): boolean {
		return this.textToolbarEl?.isConnected ?? false;
	}
	
	/**
	 * Check to see if a standard toolbar (non-text toolbar) is present.
	 * @returns true if there's a toolbar; false otherwise.
	 */
	hasToolbar(): boolean {
		return this.ntb.el.getToolbarEl() !== null;
    }

	/**
	 * Check to see if the text toolbar is in focus.
	 * @returns true if the text toolbar is in focus; false otherwise.
	 */
	isTextToolbarFocussed(): boolean {
		return this.ntb.render.textToolbarEl?.contains(activeDocument.activeElement) ?? false;
	}

	/**
	 * Removes the focus class from all items in the toolbar.
	 */
	async removeFocusStyle() {
		// remove focus effect from all toolbar items
		let toolbarListEl = this.ntb.el.getToolbarListEl();
		if (toolbarListEl) {
			Array.from(toolbarListEl.children).forEach(element => {
				element.removeClass(ToolbarStyle.ItemFocused);
			});
		}
	}

    /**
     * Adds the styles to the bottom toolbar.
     * @param toolbar toolbar to check for style settings.
     * @param toolbarEl toolbar element.
     */
    renderBottomToolbarStyles(toolbar: ToolbarSettings, toolbarEl: HTMLElement) {
        let bottomStyles: string[] = [];
        if (hasStyle(toolbar, DefaultStyleType.Wide, MobileStyleType.Wide)) {
            bottomStyles.push(`width: 100%`);
        }
        else {
            hasStyle(toolbar, DefaultStyleType.Right, MobileStyleType.Right)
                ? bottomStyles.push(`right: 0`)
                : hasStyle(toolbar, DefaultStyleType.Left, MobileStyleType.Left)
                    ? bottomStyles.push(`left: 0`)
                    : bottomStyles.push(this.renderBottomLeftStyle(toolbarEl));
        }
        toolbarEl.setAttribute('style', bottomStyles.join(';'));
    }

    /**
     * Calculates the left position for bottom toolbars.
     * @param toolbarEl toolbar element.
     * @returns CSS style string.
     */
    renderBottomLeftStyle(toolbarEl: HTMLElement): string {
        let viewPaddingOffset = 0;
        let activeLeaf: MarkdownView | ItemView | null = this.ntb.app.workspace.getActiveViewOfType(MarkdownView);
        if (!activeLeaf) activeLeaf = this.ntb.app.workspace.getActiveViewOfType(ItemView);
        // if (activeLeaf) {
        // 	const contentElStyle = getComputedStyle(activeLeaf?.contentEl);
        // 	viewPaddingOffset = parseFloat(contentElStyle.paddingLeft) || 0;
        // }
        return `left: max(0%, calc(50% - calc(${toolbarEl.offsetWidth}px / 2) + ${viewPaddingOffset}px))`;
    }

    /**
     * Renders the toolbar for the provided toolbar settings.
     * @param toolbar ToolbarSettings
     * @param file TFile for the note that the toolbar is being rendered for
     * @param view MarkdownView or ItemView to render toolbar in; if not provided uses active view
     */
    async render(toolbar: ToolbarSettings, file: TFile | null, view?: ItemView): Promise<void> {

        this.ntb.debugGroup(`renderToolbar: ${toolbar.name}`);

        // get position for this platform; default to 'props' if it's not set for some reason (should not be the case)
        let position: PositionType;
        Platform.isMobile
            ? position = toolbar.position.mobile?.allViews?.position ?? PositionType.Props
            : position = toolbar.position.desktop?.allViews?.position ?? PositionType.Props;

        // if no view is provided, get the active view
        if (!view) view = this.ntb.app.workspace.getActiveViewOfType(MarkdownView) ?? undefined;
        if (!view) view = this.ntb.app.workspace.getActiveViewOfType(ItemView) ?? undefined;
        if (!view) {
            this.ntb.debugGroupEnd();
            return;
        }

        if (!(view instanceof MarkdownView)) {
            const isToolbarVisible = this.ntb.utils.checkToolbarForItemView(view);
            if (!isToolbarVisible) {
                this.ntb.debug("🛑 renderToolbar: nothing to render in this view");
                this.ntb.debugGroupEnd();
                return;
            }
            if (position === PositionType.Props) position = PositionType.Top;
        }

        let noteToolbarElement: HTMLElement | undefined;
        let embedBlock = activeDocument.createElement((position === PositionType.TabBar) ? 'button' : 'div');
        embedBlock.addClass('cg-note-toolbar-container');
        toolbar.uuid ? embedBlock.id = toolbar.uuid : undefined;
        const markdownViewMode = (view instanceof MarkdownView) ? view.getMode() : '';
        embedBlock.setAttrs({
            [TbarData.Name]: toolbar.name,
            [TbarData.Position]: position,
            [TbarData.Updated]: toolbar.updated,
            [TbarData.ViewMode]: markdownViewMode
        });

        // render the toolbar based on its position
        switch (position) {
            case PositionType.FabLeft:
            case PositionType.FabRight:
                noteToolbarElement = await this.renderAsFab(toolbar, position);
                embedBlock.append(noteToolbarElement);
                this.ntb.registerDomEvent(embedBlock, 'click', (e) => this.ntb.events.fabHandler(e, noteToolbarElement!));
                // render toolbar in context menu if a default item is set
                if (toolbar.defaultItem) {
                    this.ntb.registerDomEvent(noteToolbarElement, 'contextmenu', (event) => {
                        this.renderAsMenu(toolbar, file, this.ntb.settings.showEditInFabMenu).then(menu => {
                            navigator.vibrate(50);
                            menu.showAtPosition(event);
                            event instanceof KeyboardEvent ? putFocusInMenu() : undefined;
                        });
                    });
                }
                else {
                    this.ntb.registerDomEvent(noteToolbarElement, 'contextmenu', (e) => this.ntb.events.contextMenuHandler(e));
                }
                break;
            case PositionType.TabBar: {
                setIcon(embedBlock, this.ntb.settings.icon);
                setTooltip(embedBlock, toolbar.name);
                embedBlock.addClasses(['clickable-icon', 'view-action']);
                this.ntb.registerDomEvent(embedBlock, 'click', (e) => this.ntb.events.fabHandler(e, noteToolbarElement!));
                this.ntb.registerDomEvent(embedBlock, 'contextmenu', (e) => this.ntb.events.contextMenuHandler(e));
                break;
            }
            case PositionType.Bottom:
            case PositionType.Props:
            case PositionType.Top: {
                noteToolbarElement = await this.renderAsCallout(toolbar, file, view);
                // extra div workaround to emulate callout-in-content structure, to use same sticky css
                let div = activeDocument.createElement("div");
                div.append(noteToolbarElement);
                embedBlock.addClasses(['cm-embed-block', 'cm-callout', 'cg-note-toolbar-bar-container']);
                embedBlock.append(div);
                this.ntb.registerDomEvent(embedBlock, 'contextmenu', (e) => this.ntb.events.contextMenuHandler(e));
                this.ntb.registerDomEvent(embedBlock, 'keydown', (e) => this.ntb.events.keyboardHandler(e));	
                break;
            }
            case PositionType.Hidden:
            default:
                // we're not rendering it
                break;
        }

        const useLaunchpad = Boolean(
            !(view instanceof MarkdownView) && view.getViewType() === 'empty' 
            && this.ntb.settings.showLaunchpad && this.ntb.settings.emptyViewToolbar
        );
        view.contentEl.toggleClass('note-toolbar-launchpad-container', useLaunchpad);
        if (useLaunchpad && noteToolbarElement) {
            noteToolbarElement.addClass('note-toolbar-launchpad');
            view.contentEl.insertAdjacentElement('afterbegin', embedBlock);
            this.ntb.debugGroupEnd();
            return;
        }

		if (noteToolbarElement) this.updatePhoneNavigation(position, noteToolbarElement.offsetHeight);
		
        // add the toolbar to the editor or modal UI
        const modalEl = activeDocument.querySelector('.modal-container .note-toolbar-ui') as HTMLElement;
        const viewEl = view?.containerEl as HTMLElement | null;
        switch(position) {
            case PositionType.Bottom:
                // position relative to modal container if in a modal
                if (modalEl) modalEl.insertAdjacentElement('afterbegin', embedBlock)
                else viewEl
                    ? viewEl.insertAdjacentElement('afterbegin', embedBlock)
                    : this.ntb.debug(`🛑 renderToolbar: Unable to find active leaf to insert toolbar`);
                break;
            case PositionType.FabLeft:
            case PositionType.FabRight:
                // position relative to modal container if in a modal
                if (modalEl) modalEl.appendChild(embedBlock);
                else if (Platform.isPhone) {
					const navbarEl = activeDocument.querySelector('.mobile-navbar') as HTMLElement;
					navbarEl?.insertAdjacentElement('afterend', embedBlock);
				}
				else {
					viewEl?.appendChild(embedBlock);
				}
                break;
            case PositionType.TabBar: {
                const viewActionsEl = viewEl?.querySelector('.view-actions') as HTMLElement;
                viewActionsEl.insertAdjacentElement('afterbegin', embedBlock);
                break;
            }
            case PositionType.Top: {
                let viewHeader = viewEl?.querySelector('.view-header') as HTMLElement;
                // FIXME: add to modal header, but this is causing duplicate toolbars
                // if (modalEl) viewHeader = modalEl.querySelector('.modal-header') as HTMLElement;
                viewHeader 
                    ? viewHeader.insertAdjacentElement("afterend", embedBlock)
                    : this.ntb.debug("🛑 renderToolbar: Unable to find .view-header to insert toolbar");
                break;
            }
            default:
                // default case includes Hidden and Props positions; Hidden is rendered for command reference
                if (view instanceof MarkdownView) {
                    // inject it between the properties and content divs
                    let propsEl = this.ntb.el.getPropsEl(view);
                    if (!propsEl) {
                        this.ntb.debug("🛑 renderToolbar: Unable to find .metadata-container to insert toolbar");
                    }
                    propsEl?.insertAdjacentElement("afterend", embedBlock);
                }
                break;
        }

        this.ntb.debug(`⭐️ Rendered: ${toolbar.name} in view:`, getViewId(view));
        this.ntb.debugGroupEnd();

    }
    
    /**
     * Renders the given toolbar as a callout (to add to the container) and returns it.
     * @param toolbar ToolbarSettings to render
     * @param file TFile of the note to render the toolbar for
     * @param view ItemView to render toolbar in, just used for context
     * @returns HTMLElement cg-note-toolbar-callout
     */
    async renderAsCallout(toolbar: ToolbarSettings, file: TFile | null, view: ItemView): Promise<HTMLElement> {
        
        /* create the unordered list of menu items */
        let noteToolbarUl = activeDocument.createElement("ul");
        noteToolbarUl.setAttribute("role", "menu");

        let noteToolbarLiArray = await this.renderLItems(toolbar, file, view);
        noteToolbarUl.append(...noteToolbarLiArray);

        let noteToolbarCallout = activeDocument.createElement("div");

        // don't render content if it's empty, but keep the metadata so the toolbar commands & menu still work
        // TODO: also check if all child items are display: none - use Platform.isMobile and check the mb booleans, dk otherwise?
        if (toolbar.items.length > 0) {

            let noteToolbarCalloutContent = activeDocument.createElement("div");
            noteToolbarCalloutContent.className = "callout-content";
            noteToolbarCalloutContent.append(noteToolbarUl);

            noteToolbarCallout.addClasses(["callout", "cg-note-toolbar-callout"]);
            toolbar.customClasses && noteToolbarCallout.addClasses([...toolbar.customClasses.split(' ')]);
            noteToolbarCallout.setAttribute("data-callout", "note-toolbar");
            noteToolbarCallout.setAttribute("data-callout-metadata", [...toolbar.defaultStyles, ...toolbar.mobileStyles].join('-'));
            noteToolbarCallout.append(noteToolbarCalloutContent);
            
            // support for Page preview plugin
            this.ntb.registerDomEvent(noteToolbarCallout, 'mouseover', async (evt: MouseEvent) => {
                const target = (evt.target as HTMLElement)?.closest('.external-link');
                const type = target?.getAttribute('data-toolbar-link-attr-type');
                if (target && type && [ItemType.File, ItemType.Uri].contains(type as ItemType)) {
                    let itemLink = target.getAttribute('href') || '';
                    itemLink = await this.ntb.vars.replaceVars(itemLink, this.ntb.app.workspace.getActiveFile());
                    // make sure it's not actually a folder or URI, as we can't preview them
                    const isFolder = this.ntb.app.vault.getAbstractFileByPath(itemLink) instanceof TFolder;
                    const isUri = ((type === ItemType.Uri) && isValidUri(itemLink));
                    if (!isFolder && !isUri) {
                        // source doesn't seem to be required as Page preview plugin settings aren't being respected
                        this.ntb.app.workspace.trigger('hover-link', {
                            event: evt,
                            source: '',
                            hoverParent: noteToolbarCallout,
                            targetEl: target,
                            linktext: itemLink,
                        });
                    }
                }
            });

        }

        return noteToolbarCallout;

    }

	/**
	 * Returns the callout LIs for the items in the given toolbar.
	 * @param toolbar ToolbarSettings to render
	 * @param file TFile to render the toolbar for
	 * @param view ItemView items are being rendered for, for context
	 * @param recursions tracks how deep we are to stop recursion
	 * @returns Array of HTMLLIElements
	 */
	async renderLItems(toolbar: ToolbarSettings, file: TFile | null, view: ItemView, recursions: number = 0): Promise<HTMLLIElement[]> {

		if (recursions >= 2) {
			return []; // stop recursion
		}

		let noteToolbarLiArray: HTMLLIElement[] = [];

		const resolvedLabels: string[] = await this.ntb.vars.resolveLabels(toolbar, file);

		for (let i = 0; i < toolbar.items.length; i++) {

			const item = toolbar.items[i];

			// TODO: use calcItemVisToggles for the relevant platform here instead?
			// filter out empty items on display
			if (item.label === "" && item.icon === "" 
				&& ![ItemType.Break, ItemType.Group, ItemType.Separator].includes(item.linkAttr.type)) {
				continue;
			}

			let toolbarItem: HTMLElement | undefined = undefined;
			const [showOnDesktop, showOnMobile, showOnTablet] = calcItemVisToggles(item.visibility);

			switch (item.linkAttr.type) {
				case ItemType.Break:
				case ItemType.Separator: {
					if (view.getViewType() === 'empty' && this.ntb.settings.showLaunchpad) continue;
					toolbarItem = activeDocument.createElement('data');
					toolbarItem.setAttribute(
						item.linkAttr.type === ItemType.Break ? 'data-break' : 'data-sep', '');
					toolbarItem.setAttribute('role', 'separator');
					break;
				}
				case ItemType.Group: {
					const groupToolbar = this.ntb.settingsManager.getToolbar(item.link);
					if (groupToolbar) {
						if ((Platform.isMobile && showOnMobile) || (Platform.isDesktop && showOnDesktop)) {
							const groupLItems = await this.renderLItems(groupToolbar, file, view, recursions + 1);
							noteToolbarLiArray.push(...groupLItems);
						}
					}
					break;
				}
				default: {
					// changed to span as temporary(?) fix (#19) for links on Android
					toolbarItem = activeDocument.createElement('span');
					toolbarItem.className = "external-link";
					toolbarItem.setAttrs({
						'href': item.link,
						'role': 'link',
						'rel': 'noopener'
					});
					toolbarItem.tabIndex = 0;
					Object.entries(item.linkAttr).forEach(([key, value]) => {
						toolbarItem?.setAttribute(`data-toolbar-link-attr-${key}`, value);
					});

					if (!Platform.isPhone) {
						const itemCommand = this.ntb.commands.getCommandFor(item);
						let hotkeyText = itemCommand ? this.ntb.hotkeys.getHotkeyText(itemCommand) : undefined;
						let tooltipText = item.tooltip ? item.tooltip + (hotkeyText ? ` (${hotkeyText})` : '') : hotkeyText || '';
						if (tooltipText) setTooltip(toolbarItem, tooltipText, { placement: "top" });
					}

					this.ntb.registerDomEvent(toolbarItem, 'click', (e) => this.ntb.events.clickHandler(e));
					this.ntb.registerDomEvent(toolbarItem, 'auxclick', (e) => this.ntb.events.clickHandler(e));
		
					const [dkHasIcon, dkHasLabel, mbHasIcon, mbHasLabel, tabHasIcon, tabHasLabel] = calcComponentVisToggles(item.visibility);
					if (item.label) {
						if (item.icon) {
							let itemIcon = toolbarItem.createSpan();
							this.setComponentDisplayClass(itemIcon, dkHasIcon, mbHasIcon);
							setIcon(itemIcon, item.icon);
		
							let itemLabelEl = toolbarItem.createSpan();
							this.setComponentDisplayClass(itemLabelEl, dkHasLabel, mbHasLabel);
							itemLabelEl.innerText = resolvedLabels[i];
							itemLabelEl.addClass('cg-note-toolbar-item-label');
						}
						else {
							this.setComponentDisplayClass(toolbarItem, dkHasLabel, mbHasLabel);
							toolbarItem.innerText = resolvedLabels[i];
							toolbarItem.addClass('cg-note-toolbar-item-label');
						}
					}
					else {
						this.setComponentDisplayClass(toolbarItem, dkHasIcon, mbHasIcon);
						setIcon(toolbarItem, item.icon);
					}
					break;
				}
			}

			if (toolbarItem) {
				item.uuid ? toolbarItem.id = item.uuid : undefined;
				toolbarItem.addClass('cg-note-toolbar-item');

				let noteToolbarLi = activeDocument.createElement("li");
				noteToolbarLi.dataset.index = i.toString();
				!showOnMobile ? noteToolbarLi.addClass('hide-on-mobile') : false;
				!showOnDesktop ? noteToolbarLi.addClass('hide-on-desktop') : false;
				noteToolbarLi.append(toolbarItem);
				noteToolbarLiArray.push(noteToolbarLi);
			}

		}

		return noteToolbarLiArray;

	}

	/**
	 * Creates a floating button to attach event to, to render the menu.
	 * @param position button position (i.e., 'fabl' or 'fabr') 
	 * @returns HTMLElement cg-note-toolbar-fab
	 */
	async renderAsFab(toolbar: ToolbarSettings, position: string): Promise<HTMLElement> {

		let noteToolbarFabContainer = activeDocument.createElement('div');
		noteToolbarFabContainer.addClass('cg-note-toolbar-fab-container');
		noteToolbarFabContainer.setAttrs({
			role: 'group',
			'data-tbar-position': position
		});

		let noteToolbarFabButton = activeDocument.createElement('button');
		noteToolbarFabButton.addClass('cg-note-toolbar-fab');
		noteToolbarFabButton.setAttribute(TbarData.FabMeta, [...toolbar.defaultStyles, ...toolbar.mobileStyles].join('-'));

		const defaultItem = toolbar.defaultItem ? this.ntb.settingsManager.getToolbarItemById(toolbar.defaultItem) : undefined;
		// show default item if set
		if (defaultItem) {
			let activeFile = this.ntb.app.workspace.getActiveFile();
			let defaultItemText = defaultItem.label || defaultItem.tooltip;
			if (this.ntb.vars.hasVars(defaultItemText)) defaultItemText = await this.ntb.vars.replaceVars(defaultItemText, activeFile);
			noteToolbarFabButton.setAttribute('aria-label', defaultItemText);
			setIcon(noteToolbarFabButton, defaultItem.icon ? defaultItem.icon : this.ntb.settings.icon);
		}
		else {
			noteToolbarFabButton.setAttribute('aria-label', toolbar.name);
			setIcon(noteToolbarFabButton, this.ntb.settings.icon);
		}
		
		noteToolbarFabContainer.append(noteToolbarFabButton);

		return noteToolbarFabContainer;

	}

	/**
	 * Renders the given toolbar as a menu and returns it.
	 * @param toolbar ToolbarSettings to show menu for.
	 * @param activeFile TFile to show menu for.
	 * @param showEditToolbar set true to show Edit Toolbar link at bottom of menu.
	 * @param showToolbarName set true to show the menu toolbar's name at top of menu.
	 * @returns Menu with toolbar's items
	 */
	async renderAsMenu(
		toolbar: ToolbarSettings, 
		activeFile: TFile | null, 
		showEditToolbar: boolean = false
	): Promise<Menu> {

		let menu = new Menu();

		if (Platform.isPhone) {
			menu.addItem((item: MenuItem) => {
				item
					.setTitle(toolbar.name)
					.setIsLabel(true)
			});
		}

		await this.renderMenuItems(menu, toolbar, activeFile);

		if (showEditToolbar) {
			menu.addSeparator();
			menu.addItem((item: MenuItem) => {
				item
					.setTitle(t('toolbar.menu-edit-toolbar', { toolbar: toolbar.name, interpolation: { escapeValue: false } }))
					.setIcon('rectangle-ellipsis')
					.onClick((menuEvent) => {
						const modal = new ToolbarSettingsModal(this.ntb.app, this.ntb, null, toolbar as ToolbarSettings);
						modal.setTitle(t('setting.title-edit-toolbar', { toolbar: toolbar.name, interpolation: { escapeValue: false } }));
						modal.open();
					});
			});
		}

		// add class so we can style the menu
		menu.dom.addClass('note-toolbar-menu');

		// apply custom classes to the sub-menu by getting the note's toolbar 
		const activeToolbar = this.ntb.settingsManager.getCurrentToolbar();
		if (activeToolbar && activeToolbar.customClasses) menu.dom.addClasses([...activeToolbar.customClasses.split(' ')]);

		return menu;

	}

	/**
	 * Adds items from the given toolbar to the given menu.
	 * @param menu Menu to add items to.
	 * @param toolbar ToolbarSettings to add menu items for.
	 * @param file TFile to show menu for.
	 * @param recursions tracks how deep we are to stop recursion.
	 * @param resolveVars set to false to skip variable resolution.
	 * @returns 
	 */
	async renderMenuItems(menu: Menu, toolbar: ToolbarSettings, file: TFile | null, recursions: number = 0, resolveVars = true): Promise<void> {

		if (recursions >= 2) {
			return; // stop recursion
		}

		// check if the toolbar has icons, so we know whether to show placeholders or not
		// FIXME: this does not take platform visibility into account
		const hasIcons = toolbar.items.some(item => item.icon?.length);

		const toolbarView = this.ntb.app.workspace.getActiveViewOfType(ItemView);

		for (const toolbarItem of toolbar.items) { 
			// skip empty items
			if (![ItemType.Break, ItemType.Group, ItemType.Separator].includes(toolbarItem.linkAttr.type) &&
				!toolbarItem.icon && !toolbarItem.label && !toolbarItem.tooltip) continue;
		
			const [showOnDesktop, showOnMobile, showOnTablet] = calcItemVisToggles(toolbarItem.visibility);
			if ((Platform.isMobile && showOnMobile) || (Platform.isDesktop && showOnDesktop)) {
				// replace variables in labels (or tooltip, if no label set)
				const title = resolveVars 
					? await this.ntb.items.getItemText(toolbarItem, file, false, resolveVars)
					: (toolbarItem.label || toolbarItem.tooltip || '');
				switch(toolbarItem.linkAttr.type) {
					case ItemType.Break:
						// show breaks as separators in menus
						menu.addSeparator();
						break;
					case ItemType.Separator:
						menu.addSeparator();
						break;
					case ItemType.Group: {
						const groupToolbar = this.ntb.settingsManager.getToolbar(toolbarItem.link);
						if (groupToolbar) {
							if (resolveVars) {
								await this.renderMenuItems(menu, groupToolbar, file, recursions + 1, resolveVars);
							}
							else {
								this.renderMenuItems(menu, groupToolbar, file, recursions + 1, resolveVars);
							}
						}
						break;
					}
					case ItemType.Menu:
						// the sub-menu UI doesn't appear to work on mobile, so default to treat as link
						if (!Platform.isMobile) {
							// display menus in sub-menus, but only if we're not more than a level deep
							if (recursions >= 1) break;
							menu.addItem(async (item: MenuItem) => {
								item
									.setIcon(toolbarItem.icon && getIcon(toolbarItem.icon)
										? toolbarItem.icon 
										: (hasIcons ? 'note-toolbar-empty' : null))
									.setTitle(title);
								let subMenu = item.setSubmenu() as Menu;
								// add class so we can style the menu
								subMenu.dom.addClass('note-toolbar-menu');
								// apply custom classes to the sub-menu by getting the note's toolbar 
								const activeToolbar = this.ntb.settingsManager.getCurrentToolbar();
								if (activeToolbar && activeToolbar.customClasses) subMenu.dom.addClasses([...activeToolbar.customClasses.split(' ')]);
								// render the sub-menu items
								let menuToolbar = this.ntb.settingsManager.getToolbar(toolbarItem.link);
								if (menuToolbar) {
									if (resolveVars) {
										await this.renderMenuItems(subMenu, menuToolbar, file, recursions + 1, resolveVars);
									}
									else {
										this.renderMenuItems(subMenu, menuToolbar, file, recursions + 1, resolveVars);
									}
								}
							});
							break;
						}
						// fall through
					default: {
						// don't show the item if the link has variables and resolves to nothing
						if (resolveVars && this.ntb.vars.hasVars(toolbarItem.link)) {
							const resolvedLink = await this.ntb.vars.replaceVars(toolbarItem.link, file);
							if (resolvedLink === "") break;
						}	
						// don't show command if not available
						const isCommandAvailable = this.ntb.items.isCommandItemAvailable(toolbarItem, toolbarView);
						if (!isCommandAvailable) break;

						menu.addItem((item: MenuItem) => {

							const itemTitleFr = document.createDocumentFragment();
							itemTitleFr.append(title);
							// show hotkey
							if (!Platform.isPhone) {
								const itemCommand = this.ntb.commands.getCommandFor(toolbarItem);
								if (itemCommand) {
									const itemHotkeyEl = this.ntb.hotkeys.getHotkeyEl(itemCommand);
									if (itemHotkeyEl) itemTitleFr.appendChild(itemHotkeyEl);
								}
							}
							
							item
								.setIcon(toolbarItem.icon && getIcon(toolbarItem.icon)
									? toolbarItem.icon 
									: (hasIcons ? 'note-toolbar-empty' : null))
								.setTitle(itemTitleFr)
								.onClick(async (menuEvent) => {
									await this.ntb.items.handleItemLink(toolbarItem, menuEvent, file);
									// fixes issue where focus sticks on executing commands
									if (toolbarItem.linkAttr.type !== ItemType.Menu) {
										await this.removeFocusStyle();
										this.ntb.app.workspace.activeEditor?.editor?.focus();
									}
								});
							});
						break;
					}
				}
			}
		};

	}

	/**
	 * Renders the toolbar in the provided view or active view, assuming it needs one.
	 */
	async renderForView(view?: ItemView) {

		const toolbarView = view ? view : this.ntb.app.workspace.getActiveViewOfType(ItemView);

		let activeFile: TFile | null = null;
		if (!toolbarView) return;
		if (toolbarView instanceof MarkdownView) {
			activeFile = toolbarView.file;
		}
		else if (toolbarView instanceof ItemView) {
			const viewState = toolbarView.getState();
			const abstractFile = viewState.file ? this.ntb.app.vault.getAbstractFileByPath(viewState.file as string) : null;
			if (abstractFile && abstractFile instanceof TFile) activeFile = abstractFile; 
		}
		
		// for notes and other file types
		if (activeFile) {
			let frontmatter = activeFile ? this.ntb.app.metadataCache.getFileCache(activeFile)?.frontmatter : undefined;
			await this.checkAndRender(activeFile, frontmatter, toolbarView);
		}
		// for New tab view
		else {
			if (this.ntb.settings.emptyViewToolbar) {
				const toolbar = this.ntb.settingsManager.getToolbarById(this.ntb.settings.emptyViewToolbar);
				const toolbarRemoved = this.removeIfNeeded(toolbar, toolbarView);
				if (toolbar) {
					// render the toolbar if we have one, and we don't have an existing toolbar to keep
					if (toolbarRemoved) {
						await this.render(toolbar, null, toolbarView);	
					}
					await this.update(toolbar, null, toolbarView);
				}
			}
		}

	}

	/**
	 * Iterates all leaves and renders toolbars for all active leaves.
	 */
	async renderForAllLeaves() {
		this.ntb.app.workspace.iterateAllLeaves(leaf => {
			if (leaf.view instanceof ItemView) this.renderForView(leaf.view as ItemView);
		});
	}

	/**
	 * Sets the appropriate class on the given component, based on its visibility settings.
	 * @param element HTMLElement to set the display class on
	 * @param dkVisible true if component is visible on desktop
	 * @param mbVisibile true if component is visible on mobile
	 */
	setComponentDisplayClass(element: HTMLElement, dkVisible: boolean, mbVisibile: boolean): void {
		// remove any display classes in case they were set elsewhere
		element.removeClasses(['hide', 'hide-on-desktop', 'hide-on-mobile']);
		if (!dkVisible && !mbVisibile) {
			element.addClass('hide');
		} else {
			!dkVisible && element.addClass('hide-on-desktop');
			!mbVisibile && element.addClass('hide-on-mobile');
			// !tabVisible && element.addClass('hide-on-tablet');
		}
	}

	/**
	 * Shows toolbar menu at the given element, adjusting its position if necessary.
	 * @param Menu
	 * @param Element to position the menu at, or null if using a saved menu position.
	 */
	async showMenuAtElement(menu: Menu, clickedItemEl: Element | null) {

		this.ntb.debug('showMenuAtElement', menu, clickedItemEl);
		let menuPos: MenuPositionDef | undefined = undefined;

		// store menu position for sub-menu positioning
		if (clickedItemEl) {
			let elemRect = clickedItemEl.getBoundingClientRect();
			menuPos = { x: elemRect.x, y: elemRect.bottom, overlap: true, left: false };
			this.ntb.app.saveLocalStorage(LocalVar.MenuPos, JSON.stringify(menuPos));
		}

		// if we don't have a position yet, try to get it from the previous menu
		if (!menuPos) {
			let previousPosData = this.ntb.app.loadLocalStorage(LocalVar.MenuPos) as string;
			menuPos = previousPosData ? JSON.parse(previousPosData) : undefined;
		}

		// position (and potentially offset) the menu, and then set focus in it if necessary
		if (menuPos) {
			menu.showAtPosition(menuPos);
			if (!menuPos.left) {
				// reposition if the menu overlaps the right edge
				let menuOverflow = activeWindow.innerWidth - (menuPos.x + menu.dom.offsetWidth);
				// not sure why this is close to 2 -- border pixels on either side? is this theme-dependent?
				if (menuOverflow <= 2) {
					this.ntb.debug('⬅️ repositioned menu');
					// show the menu along the right edge of the window instead
					menu.showAtPosition( { x: activeWindow.innerWidth, y: menuPos.y, overlap: true, left: true } );
				}
			}
		}

	}

	/**
	 * Updates any toolbar elements that use properties, including labels and tooltips.
	 * If the item resolves to a URI that's empty, the item is hidden.
	 * @param toolbar ToolbarSettings to get values from.
	 * @param activeFile TFile to update toolbar for.
	 * @param view ItemView to update toolbar within; uses active view otherwise.
	 */
	async update(toolbar: ToolbarSettings, activeFile: TFile | null, view?: ItemView) {

		this.ntb.debugGroup(`updateToolbar: ${toolbar.name}`);

		if (this.ntb.settings.keepPropsState) {
			// restore properties to the state they were before
			const propsState = this.ntb.app.loadLocalStorage(LocalVar.TogglePropsState);
			if (propsState && ['toggle', 'show', 'hide', 'fold'].includes(propsState)) {
				this.ntb.commands.toggleUi('props', propsState as ToggleUiStateType, true);
			}
		}

		const currentView = view ? view : this.ntb.app.workspace.getActiveViewOfType(ItemView);
		const toolbarEl = this.ntb.el.getToolbarEl(currentView ?? undefined);
		const currentPosition = this.ntb.settingsManager.getToolbarPosition(toolbar);

		// no need to run update for certain positions
		if ([PositionType.FabLeft, PositionType.FabRight, PositionType.Hidden, undefined].includes(currentPosition)) {
			this.ntb.debugGroupEnd();
			return;
		}

		// if we have a toolbarEl, double-check toolbar's name and updated stamp are as provided
		let toolbarElName = toolbarEl?.getAttribute(TbarData.Name);
		let toolbarElUpdated = toolbarEl?.getAttribute(TbarData.Updated);
		let toolbarElOverride = toolbarEl?.getAttribute(TbarData.Replace);
		if (toolbarEl === null || toolbar.name !== toolbarElName || toolbar.updated !== toolbarElUpdated) {
			this.ntb.debugGroupEnd();
			return;
		}

		// iterate over the item elements of this toolbarEl
		let toolbarItemEls = Array.from(toolbarEl.querySelectorAll('.callout-content > ul > li') as NodeListOf<HTMLElement>);
		for (const itemEl of toolbarItemEls) {

			let itemSpanEl = itemEl.querySelector('span.external-link') as HTMLSpanElement;

			// skip separators and breaks
			if (!itemSpanEl) { continue }

			let itemSetting = this.ntb.settingsManager.getToolbarItemById(itemSpanEl.id);
			if (itemSetting && itemSpanEl.id === itemSetting.uuid) {
				const isCommandAvailable = this.ntb.items.isCommandItemAvailable(itemSetting, currentView);
				if (isCommandAvailable) {
					itemEl.ariaDisabled = 'false';
				}
				else {
					itemEl.ariaDisabled = 'true';
					setTooltip(itemSpanEl, t('toolbar.item-unavailable-tooltip'));
					continue;
				}

				// update tooltip + label
				if (this.ntb.vars.hasVars(itemSetting.tooltip)) {
					let newTooltip = await this.ntb.vars.replaceVars(itemSetting.tooltip, activeFile);
					setTooltip(itemSpanEl, newTooltip, { placement: "top" });
				}
				if (this.ntb.vars.hasVars(itemSetting.label)) {
					let newLabel = await this.ntb.vars.replaceVars(itemSetting.label, activeFile);
					let itemElLabel = itemEl.querySelector('.cg-note-toolbar-item-label');
					if (newLabel) {
						itemElLabel?.removeClass('hide');
						itemElLabel?.setText(newLabel);
					}
					else {
						itemElLabel?.addClass('hide');
						itemElLabel?.setText('');
					}
				}

				// if item's empty, is not visible, or its link resolves to nothing, do not show it
				const isItemEmpty = itemSpanEl.innerText === '' && itemSetting.icon === '';
				const isItemHidden = getComputedStyle(itemSpanEl).display === 'none';
				const isLinkEmpty = this.ntb.vars.hasVars(itemSetting.link) && (await this.ntb.vars.replaceVars(itemSetting.link, activeFile) === '');
				if (isItemEmpty || isLinkEmpty || isItemHidden) {
					itemEl.addClass('hide');
					continue;
				}
				else {
					itemEl.removeClass('hide');
				}

				// update li active-file property, to allow tab-like styling
				if (activeFile && itemSetting.linkAttr.type === ItemType.File) {
					itemSpanEl.parentElement?.toggleAttribute('data-active-file', activeFile.path === itemSetting.link);
				}

			}

		}

		// re-align bottom toolbar in case width changed 
		if (currentPosition === PositionType.Bottom) {
			this.renderBottomToolbarStyles(toolbar, toolbarEl);
		}

		if (currentPosition === PositionType.Bottom || currentPosition === PositionType.Top) {
			this.updatePhoneNavigation(currentPosition, toolbarEl.offsetHeight);
		}

		this.ntb.debugGroupEnd();

	}

	/**
	 * Updates the toolbar for the active file.
	 */
	async updateActive(): Promise<void> {
		let activeFile = this.ntb.app.workspace.getActiveFile();
		if (activeFile) {
			let frontmatter = this.ntb.app.metadataCache.getFileCache(activeFile)?.frontmatter;
			let toolbar: ToolbarSettings | undefined = this.ntb.settingsManager.getMappedToolbar(frontmatter, activeFile);
			if (toolbar) await this.update(toolbar, activeFile);
		}
	}

	/**
	 * Updates an `active-item` property with the given element ID.
	 * Used by the Note Toolbar API to expose the last activated item.
	 * @param activeItemId UUID of the item that was clicked/tapped; provide nothing to unset.
	 */
	updateActiveItem(activeItemId?: string): void {
		this.ntb.app.saveLocalStorage(LocalVar.ActiveItem, activeItemId ?? '');
	}

	/** 
	 * Repositions Obsidian's navbar if necessary, and hides actions if configured.
	 * @param toolbarPosition position of current toolbar.
	 * @param toolbarHeight height of the current toolbar.
	 */ 
	updatePhoneNavigation(toolbarPosition: PositionType, toolbarHeight: number): void {

		if (!Platform.isPhone) return;

		// position Obsidian Navbar above toolbar
		const mobileNavbarEl = activeDocument.querySelector('.mobile-navbar') as HTMLElement;
		if (mobileNavbarEl) {
			if (toolbarPosition === PositionType.Bottom) {
				if (!this.mobileNavbarMargin) {
					// only calculate this once, so we don't keep adding it
					this.mobileNavbarMargin = parseInt(activeWindow.getComputedStyle(mobileNavbarEl).marginBottom);
				}
				mobileNavbarEl.style.marginBottom = (this.mobileNavbarMargin + toolbarHeight) + 'px';	
			}
			else {
				mobileNavbarEl.style.marginBottom = ''; // reset style
			}
		}

		// position header bar below toolbar
		const viewHeaderEl = activeDocument.querySelector('.view-header') as HTMLElement;
		if (viewHeaderEl) {
			if (toolbarPosition === PositionType.Top) {
				if (!this.viewActionsHeight) {
					// only calculate this once, so we don't keep adding it
					this.viewActionsHeight = parseInt(activeWindow.getComputedStyle(viewHeaderEl).marginTop);
				}
				viewHeaderEl.style.marginTop = toolbarHeight + 'px';
			}
			else {
				viewHeaderEl.style.marginTop = ''; // reset style
			}
		}

		// reduce top spacing
		const viewActionsEl = viewHeaderEl.querySelector('.view-actions') as HTMLElement;
		if (viewActionsEl) {
			if (toolbarPosition === PositionType.Top) {
				activeDocument.body.style.setProperty('--view-top-spacing-markdown', viewActionsEl.offsetHeight + 'px');
			}
			else {
				activeDocument.body.style.removeProperty('--view-top-spacing-markdown');
			}
		}

		const navbarEl = activeDocument.querySelector('.mobile-navbar') as HTMLElement;
		if (!navbarEl) return;

		navbarEl.style.marginBottom = ''; // reset spacing

		// move Navbar left/right to make room for the FAB
		navbarEl.toggleClass('note-toolbar-navbar-right', toolbarPosition === PositionType.FabLeft);
		navbarEl.toggleClass('note-toolbar-navbar-left', toolbarPosition === PositionType.FabRight);

		// hide actions on the navbar
		if (this.ntb.settings.obsidianUiVisibility) {
			const uiElements = new Map(
				OBSIDIAN_UI_ELEMENTS.map(el => [el.key, el])
			);
			const uiElementsVisibility = new Map(
				Object.entries(this.ntb.settings.obsidianUiVisibility)
					.filter(([key]) => key.startsWith('mobile.navbar.'))
			);

			// check if all navbar items are hidden
			const allNavbarKeys = Array.from(
				uiElements.keys()).filter(key => key.startsWith('mobile.navbar.')
			);
			const allHidden = allNavbarKeys.every(key => 
				uiElementsVisibility.get(key) === false
			);
			navbarEl.toggleClass('note-toolbar-hidden', allHidden);

			// hide items individually if not all are hidden
			if (!allHidden) {
				uiElementsVisibility.forEach((visible, key) => {
					const elDefinition = uiElements.get(key);
					if (!elDefinition) return;
					const elToHide = navbarEl.querySelector(elDefinition.selector) as HTMLElement;
					if (elToHide) elToHide.toggleClass('note-toolbar-hidden', !visible);
				});
			}
		}

	}

	/**
	 * Checks if the provided file and frontmatter meets the criteria to render a toolbar,
	 * or if we need to remove the toolbar if it shouldn't be there.
	 * @param file TFile (note) to check if we need to create a toolbar.
	 * @param frontmatter FrontMatterCache to check if there's a prop for the toolbar.
	 * @param view view to render toolbar in; defaults to active view if not provided.
	 */
	async checkAndRender(file: TFile, frontmatter: FrontMatterCache | undefined, view?: ItemView): Promise<void> {

		this.ntb.debug('checkAndRenderToolbar: file:', file.name, 'view:', getViewId(view));

		const viewId = getViewId(view);
		if (viewId) {	
			if (this.isRendering[viewId]) {
				this.ntb.debug('checkAndRenderToolbar: SKIPPED: ALREADY RENDERING', viewId);
				return;
			};
			this.isRendering[viewId] = true;
		}
		else return;

		try {
			// get matching toolbar for this note, if there is one		
			let matchingToolbar: ToolbarSettings | undefined = this.ntb.settingsManager.getMappedToolbar(frontmatter, file);
			
			// remove existing toolbar if needed
			let toolbarRemoved: boolean = this.removeIfNeeded(matchingToolbar, view);

			this.ntb.debug('checkAndRenderToolbar:', matchingToolbar?.name);

			if (matchingToolbar) {
				// render the toolbar if we have one, and we don't have an existing toolbar to keep
				if (toolbarRemoved) {
					this.updateActiveViewIds();
					await this.render(matchingToolbar, file, view);	
				}
				await this.update(matchingToolbar, file, view);
			}
		}
		finally {
			this.isRendering[viewId] = false;
		}

	}

	/**
	 * Positions floating toolbars (e.g., text toolbar), ensuring it doesn't go over the edge of the window.
	 */
	positionFloatingToolbar(
		toolbarEl: HTMLDivElement | null, 
		startPos: Rect, 
		endPos: Rect, 
		position: 'above' | 'below' = 'above'
	): void {

		if (!toolbarEl) return;

		const centerX = (startPos.left + endPos.right) / 2;
		let left = centerX - (toolbarEl.offsetWidth / 2);
		// TODO? make offset via CSS variable instead of subtracting here?
		let top: number;

		if (position === 'below') {
			top = endPos.bottom + 8;
			if (top + toolbarEl.offsetHeight > window.innerHeight - 8) {
				top = startPos.top - toolbarEl.offsetHeight - 8;
				// if still overflows above, clamp to top
				if (top < 8) top = 8;
			}
		}
		else {
			top = startPos.top - toolbarEl.offsetHeight - 8;
			if (top < 8) {
				top = endPos.bottom + 8;
				// if still overflows below, clamp to bottom
				if (top + toolbarEl.offsetHeight > window.innerHeight - 8) {
					top = window.innerHeight - toolbarEl.offsetHeight - 8;
				}
			}
		}

		// prevent horizontal overflow
		const minLeft = 8;
		const maxLeft = window.innerWidth - toolbarEl.offsetWidth - 8;
		left = Math.max(minLeft, Math.min(left, maxLeft));

		toolbarEl.style.left = `${left}px`;
		toolbarEl.style.top = `${top}px`;
	}

	/**
	 * Removes the text toolbar if it's present.
	 */
	async removeTextToolbar() {
		this.textToolbarEl?.remove();
	}

	/**
	 * Renders a text toolbar at the middle of the given start and end positions in the editor. 
	 * @param toolbar
	 * @param selectStartPos 
	 * @param selectEndPos 
	 * @returns nothing
	 */
	async renderTextToolbar(
		toolbar: ToolbarSettings | undefined, 
		selectStartPos: Rect | null, 
		selectEndPos: Rect | null
	): Promise<void> {

		if (!selectStartPos || !selectEndPos || !toolbar) return;

		if (!toolbar) {
			this.ntb.debug('⚠️ error: no text toolbar with ID', this.ntb.settings.textToolbar);
			new Notice(t('setting.error-invalid-text-toolbar'));
			return;
		};

		const activeFile = this.ntb.app.workspace.getActiveFile();
		const activeView = this.ntb.app.workspace.getActiveViewOfType(MarkdownView) ?? undefined;
		if (!activeFile || !activeView) return;

		// remove the existing toolbar because we're likely in a new position
		if (this.textToolbarEl) {
			this.ntb.debug('♻️ rendering text toolbar (removing old toolbar)');
			this.textToolbarEl.remove();
		}

		/*
		 * render new toolbar
		 */

		let toolbarContainerEl = activeDocument.createElement('div');
		toolbarContainerEl.id = toolbar.uuid;
		toolbarContainerEl.addClasses([
			'cg-note-toolbar-container', 'cm-embed-block', 'cm-callout', 'cg-note-toolbar-bar-container'
		]);
		toolbarContainerEl.setAttrs({
			[TbarData.Name]: toolbar.name,
			[TbarData.Position]: PositionType.Text,
			[TbarData.Updated]: toolbar.updated
		});
		
		const renderedToolbarEl = await this.renderAsCallout(toolbar, activeFile, activeView);
		toolbarContainerEl.appendChild(renderedToolbarEl);
		activeDocument.body.appendChild(toolbarContainerEl);

		this.positionFloatingToolbar(toolbarContainerEl, selectStartPos, selectEndPos, Platform.isAndroidApp ? 'below' : 'above');

		this.ntb.registerDomEvent(toolbarContainerEl, 'contextmenu', (e) => this.ntb.events.contextMenuHandler(e));
		this.ntb.registerDomEvent(toolbarContainerEl, 'keydown', (e) => this.ntb.events.keyboardHandler(e, true));

		this.textToolbarEl = toolbarContainerEl;

		// plugin.debug('drew toolbar');

		// TODO: need this for placing within modals?
		// const modalEl = activeDocument.querySelector('.modal-container .note-toolbar-ui') as HTMLElement;
		// position relative to modal container if in a modal
		// if (modalEl) modalEl.insertAdjacentElement('afterbegin', embedBlock)
		// else ...

	}

	/**
	 * Updates the list of currently active views.
	 */
	updateActiveViewIds() {
		const currentView: MarkdownView | null = this.ntb.app.workspace.getActiveViewOfType(MarkdownView);
		const currentViewId = getViewId(currentView);

		// if not in the list, add it
		if (currentViewId && !(currentViewId in this.activeViewIds)) this.activeViewIds.push(currentViewId);

		// update list of open views and remove any views that are not currently open
		let openViewIds: string[] = [];
		this.ntb.app.workspace.iterateAllLeaves((leaf) => {
			if (leaf.view instanceof MarkdownView) {
				// this.ntb.debug('🚚', leaf);
				const openViewId = getViewId(leaf.view);
				if (openViewId) openViewIds.push(openViewId);
			}
		});
		this.activeViewIds = this.activeViewIds.filter(item => openViewIds.includes(item));
		// this.ntb.debug('🚗', this.activeViewIds);
	}

	/*************************************************************************
	 * TOOLBAR REMOVAL
	 *************************************************************************/

	/**
	 * Remove the toolbar on the active file.
	 */
	async removeActive(): Promise<void> {
		const toolbarEl = this.ntb.el.getToolbarEl();
		toolbarEl?.remove();
	}

	/**
	 * Removes toolbar in the current view only if needed: there is no valid toolbar to check against; 
	 * the toolbar names don't match; it's out of date with the settings; or it's not in the correct DOM position. 
	 * @param correctToolbar ToolbarSettings for the toolbar that should be used.
	 * @param view view to check toolbar in; if not provided, uses the active view.
	 * @returns true if the toolbar was removed (or doesn't exist), false otherwise.
	 */
	removeIfNeeded(correctToolbar: ToolbarSettings | undefined, view?: ItemView): boolean {

		this.ntb.debugGroup('removeToolbarIfNeeded');

		let toolbarRemoved: boolean = false;

		// get toolbar elements in current view, or active view if not provided
		const existingToolbarEls = this.ntb.el.getAllToolbarEl(view);

		this.ntb.debug("🛑 removeToolbarIfNeeded: correct:", correctToolbar?.name, "existing:", existingToolbarEls);
		if (existingToolbarEls?.length > 0) {
			// loop over elements and remove any that are not the correct one, ensuring there's only one (or none)
			existingToolbarEls.forEach((toolbarEl) => {
				if (toolbarRemoved) toolbarEl.remove() // remove any other toolbar elements
				else {
					toolbarRemoved = this.checkRemoveToolbarEl(correctToolbar, toolbarEl as HTMLElement, view);
					if (toolbarRemoved) toolbarEl.remove();
				}
			});
			this.ntb.debug(existingToolbarEls);
		}
		else {
			this.ntb.debug("⛔️ no existing toolbar");
			toolbarRemoved = true;
		}

		this.ntb.debugGroupEnd();
		return toolbarRemoved;

	}

	private checkRemoveToolbarEl(correctToolbar: ToolbarSettings | undefined, existingToolbarEl: HTMLElement, view?: ItemView): boolean {

		let removeToolbar = false;
		const toolbarView: ItemView | MarkdownView | null = view ? view : this.ntb.app.workspace.getActiveViewOfType(MarkdownView);

		// this.ntb.debug('checkRemoveToolbarEl: existing toolbar');
		const existingToolbarOverride = existingToolbarEl.getAttribute(TbarData.Replace);
		const existingToolbarName = existingToolbarEl?.getAttribute(TbarData.Name);
		const existingToolbarUpdated = existingToolbarEl.getAttribute(TbarData.Updated);
		const existingToolbarHasSibling = existingToolbarEl.nextElementSibling;
		const existingToolbarViewMode = existingToolbarEl.getAttribute(TbarData.ViewMode);

		// if we don't have a toolbar to check against
		if (!correctToolbar) {
			this.ntb.debug("⛔️ toolbar not needed, removing existing toolbar: " + existingToolbarName);
			removeToolbar = true;
		}
		// we need a toolbar BUT the name of the existing toolbar doesn't match
		else if (correctToolbar.name !== existingToolbarName) {
			this.ntb.debug("⛔️ removing existing toolbar (name does not match): " + existingToolbarName);
			removeToolbar = true;
		}
		// we need a toolbar BUT it needs to be updated
		else if (correctToolbar.updated !== existingToolbarUpdated) {
			this.ntb.debug("⛔️ existing toolbar out of date, removing existing toolbar");
			removeToolbar = true;
		}
		// existingToolbarEl is not in the correct position, in preview mode
		else if (existingToolbarHasSibling?.hasClass('inline-title')) {
			this.ntb.debug("⛔️ toolbar not in correct position (sibling is `inline-title`), removing existing toolbar");
			removeToolbar = true;
		}
		// ensure the toolbar is for the correct view mode
		else if (toolbarView instanceof MarkdownView && toolbarView?.getMode() !== existingToolbarViewMode) {
			this.ntb.debug("⛔️ toolbar not for correct view mode");
			removeToolbar = true;
		}

		return removeToolbar;

	}

}