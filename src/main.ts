import { CachedMetadata, FrontMatterCache, MarkdownView, Menu, Platform, Plugin, TFile, addIcon, debounce, setIcon, setTooltip } from 'obsidian';
import { NoteToolbarSettingTab } from './Settings/NoteToolbarSettingTab';
import { DEFAULT_SETTINGS, ToolbarSettings, ToolbarItemSettings, NoteToolbarSettings, SETTINGS_VERSION, FolderMapping, Position, ToolbarItemLinkAttr, ItemViewContext, Visibility } from './Settings/NoteToolbarSettings';
import { calcComponentVisToggles, migrateItemVisPlatform, calcItemVisToggles, debugLog, isValidUri } from './Utils/Utils';
import ToolbarSettingsModal from './Settings/ToolbarSettingsModal';

export default class NoteToolbarPlugin extends Plugin {

	settings: NoteToolbarSettings;

	/**
	 * When this plugin is loaded (e.g., on Obsidian startup, or plugin is enabled in settings):
	 * adds listeners, settings, and renders the toolbar for the active file.
	 */
	async onload() {

		await this.loadSettings();

		// this.registerEvent(this.app.workspace.on('file-open', this.fileOpenListener));
		this.registerEvent(this.app.workspace.on('active-leaf-change', this.leafChangeListener));
		this.registerEvent(this.app.metadataCache.on('changed', this.metadataCacheListener));
		this.registerEvent(this.app.workspace.on('layout-change', this.layoutChangeListener));

		this.addCommand({ id: 'focus', name: 'Focus', callback: async () => this.focusCommand() });
		this.addCommand({ id: 'open-settings', name: 'Open Plugin Settings', callback: async () => this.openSettingsCommand() });
		this.addCommand({ id: 'open-toolbar-settings', name: 'Open Toolbar Settings', callback: async () => this.openToolbarSettingsCommand() });
		this.addCommand({ id: 'show-properties', name: 'Show Properties', callback: async () => this.togglePropsCommand('show') });
		this.addCommand({ id: 'hide-properties', name: 'Hide Properties', callback: async () => this.togglePropsCommand('hide') });
		this.addCommand({ id: 'toggle-properties', name: 'Toggle Properties', callback: async () => this.togglePropsCommand('toggle') });

		// add icons specific to the plugin
		addIcon('note-toolbar-empty', '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" class="svg-icon note-toolbar-empty”></svg>');

		// adds the ribbon icon, on mobile only (seems redundant to add on desktop as well)
		if (Platform.isMobile) {
			debugLog('isMobile');
			this.addRibbonIcon(this.settings.icon, 'Note Toolbar', (event) => {
				let activeFile = this.app.workspace.getActiveFile();
				if (activeFile) {
					let frontmatter = activeFile ? this.app.metadataCache.getFileCache(activeFile)?.frontmatter : undefined;
					let toolbar: ToolbarSettings | undefined = this.getMatchingToolbar(frontmatter, activeFile);
					if (toolbar) {
						this.renderToolbarAsMenu(toolbar).then(menu => { menu.showAtPosition(event); });
					}
				}
			});
		}

		this.addSettingTab(new NoteToolbarSettingTab(this.app, this));

		// provides support for the Style Settings plugin: https://github.com/mgmeyers/obsidian-style-settings
		this.app.workspace.trigger("parse-style-settings");

		debugLog('LOADED');

		this.app.workspace.onLayoutReady(() => {
			debugLog('onload: rendering initial toolbar');
			this.renderToolbarForActiveFile();
		});

	}

	/**
	 * When this plugin is unloaded (e.g., disabled in settings, or Obsidian is restarted):
	 * removes all toolbars.
	 */
	async onunload() {
		// TODO: is this necessary?
		this.removeAllToolbars();
		debugLog('UNLOADED');
	}
 
	/* keeping for potential future use
	async storeLeafId(currentView: MarkdownView) {
		// @ts-ignore
		this.activeLeafIds.push(currentView?.file?.path + '_' + currentView?.leaf.id);
	}

	haveLeafId(currentView: MarkdownView): boolean {
		// @ts-ignore
		return this.activeLeafIds.contains(currentView?.file?.path + '_' + currentView?.leaf.id);
	}

	async removeLeafId(idToRemove: string) {
		// not sure when to call this; can't find event that's fired when leaf closes
		this.activeLeafIds.remove(idToRemove);
	}
	*/

	/*************************************************************************
	 * LISTENERS
	 *************************************************************************/

	/**
	 * On opening of a file, check and render toolbar if necessary.
	 * @param file TFile that was opened.
	 */
	fileOpenListener = (file: TFile) => {
		// make sure we actually opened a file (and not just a new tab)
		if (file != null) {
			debugLog('file-open: ' + file.name);
			this.checkAndRenderToolbar(file, this.app.metadataCache.getFileCache(file)?.frontmatter);
		}
	};

	/**
	 * On layout changes, delete, check and render toolbar if necessary.
	 */
	layoutChangeListener = () => {
		let currentView = this.app.workspace.getActiveViewOfType(MarkdownView);
		let viewMode = currentView?.getMode();
		debugLog('===== LAYOUT-CHANGE ===== ', viewMode);
		// check for editing or reading mode
		switch(viewMode) {
			case "source":
			case "preview":
				debugLog("layout-change: ", viewMode, " -> re-rendering toolbar");
				this.removeActiveToolbar();
				this.app.workspace.onLayoutReady(debounce(() => {
					debugLog("LAYOUT READY");
					this.renderToolbarForActiveFile();
				}, (viewMode === "preview" ? 200 : 0)));
				break;
			default:
				return;
		}
	};

	/**
	 * On leaf changes, delete, check and render toolbar if necessary. 
	 */
	leafChangeListener = (event: any) => {
		let currentView = this.app.workspace.getActiveViewOfType(MarkdownView);
		let viewMode = currentView?.getMode();
		// console.clear();
		debugLog('===== LEAF-CHANGE ===== ', viewMode, event);
		// @ts-ignore - TODO: if I need an identifier for the leaf + file, I think I can use this:
		debugLog(currentView?.file?.path, currentView?.leaf.id);
		// check for editing or reading mode
		switch(viewMode) {
			case "source":
			case "preview":
				debugLog("leaf-change: ", viewMode, " -> re-rendering toolbar");
				this.removeActiveToolbar();
				// don't seem to need a delay before rendering for leaf changes
				this.renderToolbarForActiveFile();
				break;
			default:
				return;
		}
	}

	/**
	 * On changes to metadata, trigger the checks and rendering of a toolbar if necessary.
	 * @param file TFile in which metadata changed.
	 * @param data ??? (not used)
	 * @param cache CachedMetadata, from which we look at the frontmatter.
	 */
	metadataCacheListener = (file: TFile, data: any, cache: CachedMetadata) => {
		debugLog("metadata-changed: " + file.name);
		if (this.app.workspace.getActiveFile() === file) {
			this.checkAndRenderToolbar(file, cache.frontmatter);
		}
	};

	/*************************************************************************
	 * TOOLBAR RENDERERS
	 *************************************************************************/

	/**
	 * Checks if the provided file and frontmatter meets the criteria to render a toolbar,
	 * or if we need to remove the toolbar if it shouldn't be there.
	 * @param file TFile (note) to check if we need to create a toolbar.
	 * @param frontmatter FrontMatterCache to check if there's a prop for the toolbar.
	 */
	async checkAndRenderToolbar(file: TFile, frontmatter: FrontMatterCache | undefined): Promise<void> {

		debugLog('checkAndRenderToolbar()');

		// get matching toolbar for this note, if there is one		
		let matchingToolbar: ToolbarSettings | undefined = this.getMatchingToolbar(frontmatter, file);
		
		// remove existing toolbar if needed
		let toolbarRemoved: boolean = this.removeToolbarIfNeeded(matchingToolbar);

		// render the toolbar if we have one, and we don't have an existing toolbar to keep
		if (matchingToolbar && toolbarRemoved) {
			debugLog("-- RENDERING TOOLBAR: ", matchingToolbar, " for file: ", file);
			this.renderToolbar(matchingToolbar);
		}
		
	}

	/**
	 * Get toolbar for the given frontmatter (based on a toolbar prop), and failing that the file (based on folder mappings).
	 * @param frontmatter FrontMatterCache to check if there's a prop for the toolbar.
	 * @param file The note to check if we have a toolbar for.
	 * @returns ToolbarSettings or undefined, if there is no matching toolbar.
	 */
	private getMatchingToolbar(frontmatter: FrontMatterCache | undefined, file: TFile): ToolbarSettings | undefined {

		debugLog('getMatchingToolbar()');

		let matchingToolbar: ToolbarSettings | undefined = undefined;

		// debugLog('- frontmatter: ', frontmatter);
		const propName = this.settings.toolbarProp;
		let ignoreToolbar = false;

		const notetoolbarProp: string[] = frontmatter?.[propName] ?? null;
		if (notetoolbarProp !== null) {
			// if any prop = 'none' then don't return a toolbar
			notetoolbarProp.includes('none') ? ignoreToolbar = true : false;
			// is it valid? (i.e., is there a matching toolbar?)
			ignoreToolbar ? undefined : matchingToolbar = this.getToolbarSettingsFromProps(notetoolbarProp);
		}

		// we still don't have a matching toolbar
		if (!matchingToolbar && !ignoreToolbar) {

			// check if the note is in a folder that's mapped, and if the mapping is valid
			let mapping: FolderMapping;
			let filePath: string;
			for (let index = 0; index < this.settings.folderMappings.length; index++) {
				mapping = this.settings.folderMappings[index];
				filePath = file.parent?.path === '/' ? '/' : file.path.toLowerCase();
				// debugLog('getMatchingToolbar: checking folder mappings: ', filePath, ' startsWith? ', mapping.folder.toLowerCase());
				if (['*'].includes(mapping.folder) || filePath.toLowerCase().startsWith(mapping.folder.toLowerCase())) {
					// continue until we get a matching toolbar
					matchingToolbar = this.getToolbarSettings(mapping.toolbar);
					if (matchingToolbar) {
						// debugLog('  - matched toolbar:', matchingToolbar);
						break;
					}
				}
			}

		}

		return matchingToolbar;

	}

	/**
	 * Renders the toolbar for the provided toolbar settings.
	 * @param toolbar ToolbarSettings
	 */
	async renderToolbar(toolbar: ToolbarSettings): Promise<void> {

		debugLog("renderToolbar: ", toolbar);

		// get position for this platform; default to 'props' if it's not set for some reason (should not be the case)
		let position;
		Platform.isMobile
			? position = toolbar.position.mobile?.allViews?.position ?? 'props'
			: position = toolbar.position.desktop?.allViews?.position ?? 'props';

		let noteToolbarElement: HTMLElement;
		let embedBlock = activeDocument.createElement("div");
		embedBlock.addClass('cg-note-toolbar-container');

		// render the toolbar based on its position
		switch (position) {
			case 'fabl':
			case 'fabr':
				noteToolbarElement = await this.renderToolbarAsFab(toolbar);
				position === 'fabl' ? noteToolbarElement.setAttribute('data-fab-position', 'left') : undefined;
				embedBlock.append(noteToolbarElement);
				this.registerDomEvent(embedBlock, 'touchstart', (e) => this.toolbarFabHandler(e));
				// this.registerDomEvent(embedBlock, 'touchstart', (e) => this.toolbarFabHandler(e));
				// this.registerDomEvent(embedBlock, 'focusin', (e) => { e.preventDefault() });
				// this.registerDomEvent(embedBlock, 'click', (e) => { e.preventDefault() });
				// this.registerDomEvent(embedBlock, 'focusin', (e) => this.toolbarFabHandler(e));			
				break;
			case 'props':
			case 'top':
				noteToolbarElement = await this.renderToolbarAsCallout(toolbar);
				// extra div workaround to emulate callout-in-content structure, to use same sticky css
				let div = activeDocument.createElement("div");
				div.append(noteToolbarElement);
				embedBlock.addClasses(['cm-embed-block', 'cm-callout', 'cg-note-toolbar-bar-container']);
				embedBlock.append(div);
				embedBlock.oncontextmenu = (e) => this.toolbarContextMenuHandler(e);
				this.registerDomEvent(embedBlock, 'keydown', (e) => this.toolbarKeyboardHandler(e));	
				break;
			case 'hidden':
			default:
				// we're not rendering it
				break;
		}

		embedBlock.setAttribute("data-name", toolbar.name);
		embedBlock.setAttribute("data-updated", toolbar.updated);

		let currentView = this.app.workspace.getActiveViewOfType(MarkdownView);

		// add the toolbar to the editor UI
		switch(position) {
			case 'fabl':
			case 'fabr':
				currentView?.containerEl.appendChild(embedBlock);
				// activeDocument ? activeDocument.querySelector('.app-container')?.appendChild(embedBlock) : undefined
				break;
			case 'top':
				embedBlock.addClass('cg-note-toolbar-position-top');
				let viewHeader = currentView?.containerEl.querySelector('.view-header') as HTMLElement;
				// from pre-fix (#44) for calendar sidebar query -- keeping just in case
				// let viewHeader = activeDocument.querySelector('.workspace-leaf.mod-active .view-header') as HTMLElement;
				viewHeader 
					? viewHeader.insertAdjacentElement("afterend", embedBlock)
					: debugLog("🛑 renderToolbarFromSettings: Unable to find .view-header to insert toolbar");
				break;
			case 'hidden':
				// we're not rendering it above, but it still needs to be on the note somewhere, for command reference
			case 'props':
			default:
				// inject it between the properties and content divs
				let propsEl = this.getPropsEl();
				if (!propsEl) {
					debugLog("🛑 renderToolbarFromSettings: Unable to find .metadata-container to insert toolbar");
				}
				propsEl?.insertAdjacentElement("afterend", embedBlock);
				break;
		}

	}
	
	/**
	 * Renders the given toolbar as a callout (to add to the container) and returns it.
	 * @param toolbar
	 * @returns HTMLElement cg-note-toolbar-callout
	 */
	async renderToolbarAsCallout(toolbar: ToolbarSettings): Promise<HTMLElement> {

		/* create the unordered list of menu items */
		let noteToolbarUl = activeDocument.createElement("ul");
		noteToolbarUl.setAttribute("role", "menu");

		toolbar.items.filter((item: ToolbarItemSettings) => {

			// TODO: use calcItemVisToggles for the relevant platform here instead?
			// filter out empty items on display
			return ((item.label === "" && item.icon === "") ? false : true);

		}).map((item: ToolbarItemSettings) => {

			// changed to span as temporary(?) fix (#19) for links on Android
			let toolbarItem = activeDocument.createElement('span');
			toolbarItem.className = "external-link";
			toolbarItem.setAttribute("href", item.link);
			toolbarItem.setAttribute("role", "link");
			toolbarItem.tabIndex = 0;
			Object.entries(item.linkAttr).forEach(([key, value]) => {
				toolbarItem.setAttribute(`data-toolbar-link-attr-${key}`, value);
			});
			item.tooltip ? setTooltip(toolbarItem, item.tooltip, { placement: "top" }) : undefined;
			toolbarItem.setAttribute("rel", "noopener");
			toolbarItem.onclick = (e) => this.toolbarClickHandler(e);

			const [dkHasIcon, dkHasLabel, mbHasIcon, mbHasLabel, tabHasIcon, tabHasLabel] = calcComponentVisToggles(item.visibility);
			if (item.label) {
				if (item.icon) {
					let itemIcon = toolbarItem.createSpan();
					this.setComponentDisplayClass(itemIcon, dkHasIcon, mbHasIcon);
					setIcon(itemIcon, item.icon);

					let itemLabel = toolbarItem.createSpan();
					this.setComponentDisplayClass(itemLabel, dkHasLabel, mbHasLabel);
					itemLabel.innerText = item.label;
				}
				else {
					this.setComponentDisplayClass(toolbarItem, dkHasLabel, mbHasLabel);
					toolbarItem.innerText = item.label;
				}
			}
			else {
				this.setComponentDisplayClass(toolbarItem, dkHasIcon, mbHasIcon);
				setIcon(toolbarItem, item.icon);
			}

			let noteToolbarLi = activeDocument.createElement("li");
			const [showOnDesktop, showOnMobile, showOnTablet] = calcItemVisToggles(item.visibility);
			!showOnMobile ? noteToolbarLi.addClass('hide-on-mobile') : false;
			!showOnDesktop ? noteToolbarLi.addClass('hide-on-desktop') : false;
			noteToolbarLi.append(toolbarItem);

			noteToolbarUl.appendChild(noteToolbarLi);
		});

		let noteToolbarCallout = activeDocument.createElement("div");

		// don't render content if it's empty, but keep the metadata so the toolbar commands & menu still work
		// TODO: also check if all child items are display: none - use Platform.isMobile and check the mb booleans, dk otherwise?
		if (toolbar.items.length > 0) {

			let noteToolbarCalloutContent = activeDocument.createElement("div");
			noteToolbarCalloutContent.className = "callout-content";
			noteToolbarCalloutContent.append(noteToolbarUl);

			noteToolbarCallout.className = "callout cg-note-toolbar-callout";
			noteToolbarCallout.setAttribute("data-callout", "note-toolbar");
			noteToolbarCallout.setAttribute("data-callout-metadata", [...toolbar.defaultStyles, ...toolbar.mobileStyles].join('-'));
			noteToolbarCallout.append(noteToolbarCalloutContent);

		}

		return noteToolbarCallout;

	}

	/**
	 * 
	 * @param toolbar 
	 * @returns HTMLElement cg-note-toolbar-fab
	 */
	async renderToolbarAsFab(toolbar: ToolbarSettings): Promise<HTMLElement> {

		let noteToolbarFabContainer = activeDocument.createElement('div');
		noteToolbarFabContainer.addClass('cg-note-toolbar-fab-container');
		noteToolbarFabContainer.setAttribute('role', 'group');
		noteToolbarFabContainer.setAttribute('aria-label', 'Note Toolbar button');

		let noteToolbarFabButton = activeDocument.createElement('button');
		noteToolbarFabButton.addClass('cg-note-toolbar-fab');
		noteToolbarFabButton.setAttribute('title', 'Open Note Toolbar');
		noteToolbarFabButton.setAttribute('aria-label', 'Open Note Toolbar');
		setIcon(noteToolbarFabButton, this.settings.icon);
		
		noteToolbarFabContainer.append(noteToolbarFabButton);

		return noteToolbarFabContainer;

	}

	/**
	 * Renders the given toolbar as a menu and returns it.
	 * @param toolbar 
	 * @returns Menu with toolbar's items
	 */
	async renderToolbarAsMenu(toolbar: ToolbarSettings): Promise<Menu> {

		let menu = new Menu();
		toolbar.items.forEach((toolbarItem, index) => {
			const [showOnDesktop, showOnMobile, showOnTablet] = calcItemVisToggles(toolbarItem.visibility);
			if (showOnMobile) {
				menu.addItem((item) => {
					item
						.setIcon(toolbarItem.icon ? toolbarItem.icon : 'note-toolbar-empty')
						.setTitle(toolbarItem.label ? toolbarItem.label : toolbarItem.tooltip)
						.onClick((menuEvent) => {
							debugLog(toolbarItem.link, toolbarItem.linkAttr, toolbarItem.contexts);
							this.handleLink(toolbarItem.link, toolbarItem.linkAttr);
						});
					});
			}
		});

		if (this.settings.showEditInFabMenu) {
			menu.addSeparator();
			menu.addItem((item) => {
				item
					.setTitle("Edit toolbar: " + toolbar.name + "...")
					.setIcon("lucide-pen-box")
					.onClick((menuEvent) => {
						const modal = new ToolbarSettingsModal(this.app, this, null, toolbar as ToolbarSettings);
						modal.setTitle("Edit Toolbar: " + toolbar.name);
						modal.open();
					});
			});
		}

		return menu;

	}

	/**
	 * Creates the toolbar in the active file (assuming it needs one).
	 */
	async renderToolbarForActiveFile() {
		let activeFile = this.app.workspace.getActiveFile();
		if (activeFile) {
			let frontmatter = activeFile ? this.app.metadataCache.getFileCache(activeFile)?.frontmatter : undefined;
			this.checkAndRenderToolbar(activeFile, frontmatter);
		}	
	}

	/**
	 * Sets the appropriate class on the given component, based on its visibility settings.
	 * @param element HTMLElement to set the display class on
	 * @param dkVisible true if component is visible on desktop
	 * @param mbVisibile true if component is visible on mobile
	 */
	setComponentDisplayClass(element: HTMLElement, dkVisible: boolean, mbVisibile: boolean): void {
		if (!dkVisible && !mbVisibile) {
			element.addClass('hide');
		} else {
			!dkVisible && element.addClass('hide-on-desktop');
			!mbVisibile && element.addClass('hide-on-mobile');
			// !tabVisible && element.addClass('hide-on-tablet');
		}
	}

	/*************************************************************************
	 * COMMANDS
	 *************************************************************************/

	/**
	 * Sets the focus on the first item in the toolbar.
	 */
	async focusCommand(): Promise<void> {

		debugLog("focusCommand()");
		let itemsUl: HTMLElement | null = this.getToolbarListEl();
		if (itemsUl) {
			debugLog("focus command: toolbar: ", itemsUl);
			let items = Array.from(itemsUl.children);
			const visibleItems = items.filter(item => {
				return window.getComputedStyle(item).getPropertyValue('display') !== 'none';
			});
			const link = visibleItems[0] ? visibleItems[0].querySelector('span') : null;
			debugLog("focus command: focussed item: ", link);
			link?.focus();
		}

	}

	/**
	 * Convenience command to open Note Toolbar's settings.
	 */
	async openSettingsCommand(): Promise<void> {
		// @ts-ignore
		const settings = this.app.setting;
		settings.open();
		settings.openTabById('note-toolbar');
	}

	/**
	 * Convenience command to open this toolbar's settings.
	 */
	async openToolbarSettingsCommand(): Promise<void> {
		// figure out what toolbar is on the screen
		let toolbarEl = this.getToolbarEl();
		let toolbarName = toolbarEl?.getAttribute('data-name');
		let toolbarSettings = toolbarName ? this.getToolbarSettings(toolbarName) : undefined;
		if (toolbarSettings) {
			const modal = new ToolbarSettingsModal(this.app, this, null, toolbarSettings);
			modal.setTitle("Edit Toolbar: " + toolbarName);
			modal.open();
		}
	}

	/**
	 * Shows, completely hides, or toggles the visibility of this note's Properties.
	 * @param visibility Set to 'show', 'hide', or 'toggle'
	 */
	async togglePropsCommand(visibility: 'show' | 'hide' | 'toggle'): Promise<void> {

		let propsEl = this.getPropsEl();
		let currentView = this.app.workspace.getActiveViewOfType(MarkdownView);
		debugLog("togglePropsCommand: ", "visibility: ", visibility, "props: ", propsEl);
		// @ts-ignore make sure we're not in source (code) view
		if (propsEl && !currentView.editMode.sourceMode) {
			let propsDisplayStyle = getComputedStyle(propsEl).getPropertyValue('display');
			visibility === 'toggle' ? (propsDisplayStyle === 'none' ? visibility = 'show' : visibility = 'hide') : undefined;
			switch (visibility) {
				case 'show':
					propsEl.style.display = 'var(--metadata-display-editing)';
					// expand the Properties heading if it's collapsed, because it will stay closed if the file is saved in that state
					if (propsEl.classList.contains('is-collapsed')) {
						(propsEl.querySelector('.metadata-properties-heading') as HTMLElement).click();
					}	
					break;
				case 'hide':
					propsEl.style.display = 'none';
					break;
			}
		}

	}

	/*************************************************************************
	 * HANDLERS
	 *************************************************************************/
	
	/**
	 * Handles the floating action button specifically on mobile.
	 * @param event TouchEvent
	 */
	async toolbarFabHandler(event: TouchEvent) {

		debugLog("toolbarFabHandler: ", event);
		event.preventDefault();

		let activeFile = this.app.workspace.getActiveFile();
		if (activeFile) {
			let frontmatter = activeFile ? this.app.metadataCache.getFileCache(activeFile)?.frontmatter : undefined;
			let toolbar: ToolbarSettings | undefined = this.getMatchingToolbar(frontmatter, activeFile);
			if (toolbar) {
				this.renderToolbarAsMenu(toolbar).then(menu => { menu.showAtPosition({x: 0, y: 0}); });
			}
		}

	}

	/**
	 * Handles keyboard navigation within the toolbar.
	 * @param e KeyboardEvent
	 */
	async toolbarKeyboardHandler(e: KeyboardEvent) {

		debugLog("toolbarKeyboardHandler: ", e);

		let itemsUl: HTMLElement | null = this.getToolbarListEl();
		if (itemsUl) {

			// not preventing default from 'Escape' for now (I think this helps)
			e.key ? (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Enter', ' '].includes(e.key) ? e.preventDefault() : undefined) : undefined

			// remove any items that are not visible (i.e., hidden on desktop/mobile) as they are not navigable
			let items = Array.from(itemsUl.children);
			const visibleItems = items.filter(item => {
				return window.getComputedStyle(item).getPropertyValue('display') !== 'none';
			});
			let currentIndex = visibleItems.indexOf(activeDocument.activeElement?.parentElement as HTMLElement);

			// only use preventDefault within these cases, as we want to allow for tabbing out of the toolbar
			switch (e.key) {
				case 'ArrowRight':
				case 'ArrowDown':
					const nextIndex = (currentIndex + 1) % visibleItems.length;
					visibleItems[nextIndex].querySelector('span')?.focus();
					break;
				case 'ArrowLeft':
				case 'ArrowUp':
					const prevIndex = (currentIndex - 1 + visibleItems.length) % visibleItems.length;
					visibleItems[prevIndex].querySelector('span')?.focus();
					break;
				case 'Enter':
				case ' ':
					(activeDocument?.activeElement as HTMLElement).click();
					break;
				case 'Escape':
					// need this implemented for Reading mode, as escape does nothing
					let currentView = this.app.workspace.getActiveViewOfType(MarkdownView);
					let viewMode = currentView?.getMode();
					if (viewMode === 'preview') {
						(activeDocument?.activeElement as HTMLElement).blur();
					}
					break;
			}

		}

	}

	/**
	 * On click of an item in the toolbar, we replace any variables that might
	 * be in the URL, and then open it.
	 * @param e MouseEvent
	 */
	async toolbarClickHandler(e: MouseEvent) {

		let clickedEl = e.currentTarget as HTMLLinkElement;
		let linkHref = clickedEl.getAttribute("href");

		if (linkHref != null) {
			
			let linkType = clickedEl.getAttribute("data-toolbar-link-attr-type");
			linkType ? (['command', 'file', 'uri'].includes(linkType) ? e.preventDefault() : undefined) : undefined

			debugLog('toolbarClickHandler: ', e, 'clickedEl: ', clickedEl);

			// default to true if it doesn't exist, treating the url as though it is a URI with vars
			let linkHasVars = clickedEl.getAttribute("data-toolbar-link-attr-hasVars") ? 
							 clickedEl.getAttribute("data-toolbar-link-attr-hasVars") === "true" : true;

			let linkCommandId = clickedEl.getAttribute("data-toolbar-link-attr-commandid");
			
			// remove the focus effect if clicked with a mouse
			if ((e as PointerEvent)?.pointerType === "mouse") {
				clickedEl.blur();
			}

			this.handleLink(linkHref, { commandId: linkCommandId, hasVars: linkHasVars, type: linkType } as ToolbarItemLinkAttr);

		}

	}
	
	/**
	 * Handles the link provided.
	 * @param linkHref What the link is for.
	 * @param linkAttr Attributes of the link.
	 */
	async handleLink(linkHref: string, linkAttr: ToolbarItemLinkAttr) {

		if (linkAttr.hasVars) {
			let activeFile = this.app.workspace.getActiveFile();
			// only replace vars in URIs; might consider other substitution in future
			linkHref = this.replaceVars(linkHref, activeFile, false);
			debugLog('- uri vars replaced: ', linkHref);
		}

		switch (linkAttr.type) {
			case 'command':
				debugLog("- executeCommandById: ", linkAttr.commandId);
				linkAttr.commandId ? this.app.commands.executeCommandById(linkAttr.commandId) : undefined;
				break;
			case 'file':
				// it's an internal link (note); try to open it
				let activeFile = this.app.workspace.getActiveFile()?.path ?? "";
				debugLog("- openLinkText: ", linkHref, " from: ", activeFile);
				this.app.workspace.openLinkText(linkHref, activeFile);
				break;
			case 'uri':
				if (isValidUri(linkHref)) {
					// if actually a url, just open the url
					window.open(linkHref, '_blank');
				}
				else {
					// as fallback, treat it as internal note
					let activeFile = this.app.workspace.getActiveFile()?.path ?? "";
					this.app.workspace.openLinkText(linkHref, activeFile);
				}
				break;
		}
	
		// archiving for later
		if (false) {
			// if it's a js function that exists, call it without any parameters
			// @ts-ignore
			if (href.toLowerCase().startsWith('onclick:')) {
				// @ts-ignore
				let functionName = href.slice(8); // remove 'onclick:'
				if (typeof (window as any)[functionName] === 'function') {
					(window as any)[functionName]();
				}
			}
		}
		
	}

	/**
	 * Shows a context menu with links to settings/configuration.
	 * @param e MouseEvent
	 */
	async toolbarContextMenuHandler(e: MouseEvent) {

		e.preventDefault();

		// figure out what toolbar we're in
		let toolbarEl = (e.target as Element).closest('.cg-note-toolbar-container');
		let toolbarName = toolbarEl?.getAttribute('data-name');
		let toolbarSettings = toolbarName ? this.getToolbarSettings(toolbarName) : undefined;

		let contextMenu = new Menu();
		if (toolbarSettings !== undefined) {
			contextMenu.addItem((item) => {
				item
					.setTitle("Edit " + toolbarName + "...")
					.setIcon("lucide-pen-box")
					.onClick((menuEvent) => {
						const modal = new ToolbarSettingsModal(this.app, this, null, toolbarSettings as ToolbarSettings);
						modal.setTitle("Edit Toolbar: " + toolbarName);
						modal.open();
					});
			  });
		}
  		contextMenu.addItem((item) => {
		  item
			.setTitle("Note Toolbar settings...")
			.setIcon("lucide-wrench")
			.onClick((menuEvent) => {
				this.openSettingsCommand();
			});
		});

		contextMenu.showAtPosition(e);

	}

	/**
	 * Replace variables in the given string of the format {{variablename}}, with metadata from the file.
	 * @param s String to replace the variables in.
	 * @param file File with the metadata (name, frontmatter) we'll use to fill in the variables.
	 * @param encode True if we should encode the variables (recommended if part of external URL).
	 * @returns String with the variables replaced.
	 */
	replaceVars(s: string, file: TFile | null, encode: boolean): string {

		let noteTitle = file?.basename;
		if (noteTitle != null) {
			s = s.replace('{{note_title}}', (encode ? encodeURIComponent(noteTitle) : noteTitle));
		}
		// have to get this at run/click-time, as file or metadata may not have changed
		let frontmatter = file ? this.app.metadataCache.getFileCache(file)?.frontmatter : undefined;
		if (frontmatter) {
			// replace any variable of format {{prop_KEY}} with the value of the frontmatter dictionary with key = KEY
			s = s.replace(/{{prop_(.*?)}}/g, (match, p1) => {
				const key = p1.trim();
				if (frontmatter && frontmatter[key] !== undefined) {
					// handle the case where the prop might be a list
					let fm = Array.isArray(frontmatter[key]) ? frontmatter[key].join(',') : frontmatter[key];
					const linkWrap = /\[\[|\]\]/g; // remove [[ and ]] in case an internal link was passed
					return (encode ? encodeURIComponent(fm.replace(linkWrap, '')) : fm.replace(linkWrap, ''));
				}
				else {
					return '';
				}
			});
		}
		return s;

	}

	/*************************************************************************
	 * ELEMENT GETTERS
	 *************************************************************************/

	/**
	 * Gets the Properties container in the current view.
	 * @returns HTMLElement or null, if it doesn't exist.
	 */
	private getPropsEl(): HTMLElement | null {
		let currentView = this.app.workspace.getActiveViewOfType(MarkdownView);
		// TODO: remove; leaving here until rendering issues are fully sorted
		// let propertiesContainer = activeDocument.querySelector('.workspace-tab-container > .mod-active .metadata-container');
		// let propertiesContainer = this.app.workspace.activeEditor?.contentEl.querySelector('.metadata-container');
		// let propertiesContainer = currentView?.contentEl.querySelector('.metadata-container');
		// let propertiesContainer = this.app.workspace.containerEl.querySelector('.cm-editor > .metadata-container');
		let propertiesContainer = activeDocument.querySelector('.workspace-leaf.mod-active .markdown-' + currentView?.getMode() + '-view .metadata-container') as HTMLElement;
		debugLog("getPropsEl: ", '.workspace-leaf.mod-active .markdown-' + currentView?.getMode() + '-view .metadata-container');
		return propertiesContainer;
	}

	/**
	 * Get the toolbar element, in the current view.
	 * @param positionsToCheck 
	 * @returns HTMLElement or null, if it doesn't exist.
	 */
	private getToolbarEl(): HTMLElement | null {
		let existingToolbarEl = activeDocument.querySelector('.workspace-leaf.mod-active .cg-note-toolbar-container') as HTMLElement;
		debugLog("getToolbarEl: ", existingToolbarEl);
		return existingToolbarEl;
	}

	/**
	 * Get the toolbar element's <ul> element, in the current view.
	 * @returns HTMLElement or null, if it doesn't exist.
	 */
	private getToolbarListEl(): HTMLElement | null {
		let itemsUl = activeDocument.querySelector('.workspace-leaf.mod-active .cg-note-toolbar-container .callout-content > ul') as HTMLElement;
		return itemsUl;
	}

	/*************************************************************************
	 * TOOLBAR REMOVAL
	 *************************************************************************/

	/**
	 * Remove the toolbar on the active file.
	 */
	async removeActiveToolbar(): Promise<void> {
		let existingToolbar = activeDocument.querySelector('.workspace-leaf.mod-active .cg-note-toolbar-container');
		existingToolbar?.remove();
	}

	/**
	 * Remove any toolbars in all open files.
	 */
	async removeAllToolbars(): Promise<void> {
		let existingToolbars = activeDocument.querySelectorAll('.cg-note-toolbar-container');
		existingToolbars.forEach((toolbar) => {
			toolbar.remove();
		});
	}

	/**
	 * Removes toolbar in the current view only if needed: there is no valid toolbar to check against; 
	 * the toolbar names don't match; it's out of date with the settings; or it's not in the correct DOM position. 
	 * @param correctToolbar ToolbarSettings for the toolbar that should be used.
	 * @returns true if the toolbar was removed (or doesn't exist), false otherwise.
	 */
	private removeToolbarIfNeeded(correctToolbar: ToolbarSettings | undefined): boolean {

		let toolbarRemoved: boolean = false;
		let existingToolbarEl: HTMLElement | null = this.getToolbarEl();

		debugLog("removeToolbarIfNeeded: correct: ", correctToolbar, "existing: ", existingToolbarEl);

		if (existingToolbarEl) {

			// debugLog('checkAndRenderToolbar: existing toolbar');
			let existingToolbarName = existingToolbarEl?.getAttribute("data-name");
			let existingToolbarUpdated = existingToolbarEl.getAttribute("data-updated");
			let existingToolbarHasSibling = existingToolbarEl.nextElementSibling;

			// if we don't have a toolbar to check against
			if (!correctToolbar) {
				debugLog("- toolbar not needed, removing existing toolbar: " + existingToolbarName);
				toolbarRemoved = true;
			}
			// we need a toolbar BUT the name of the existing toolbar doesn't match
			else if (correctToolbar.name !== existingToolbarName) {
				debugLog("- toolbar needed, removing existing toolbar (name does not match): " + existingToolbarName);
				toolbarRemoved = true;
			}
			// we need a toolbar BUT it needs to be updated
			else if (correctToolbar.updated !== existingToolbarUpdated) {
				debugLog("- existing toolbar out of date, removing existing toolbar");
				toolbarRemoved = true;
			}
			// existingToolbarEl is not in the correct position, in preview mode
			else if (existingToolbarHasSibling?.hasClass('inline-title')) {
				debugLog("- not in the correct position (sibling is `inline-title`), removing existing toolbar");
				toolbarRemoved = true;
			}

			if (toolbarRemoved) {
				existingToolbarEl.remove();
				existingToolbarEl = null;
			}

			// TODO: if there's a setting to rerender the matchingToolbar (e.g., the names have vars), we can removeActiveToolbar
			
		}
		else {
			debugLog("- no existing toolbar");
			toolbarRemoved = true;
		}

		if (!toolbarRemoved) {
			debugLog("removeToolbarIfNeeded: nothing done");
		}

		return toolbarRemoved;

	}

	/*************************************************************************
	 * SETTINGS LOADERS
	 *************************************************************************/

	/**
	 * Loads settings, and migrates from old versions if needed.
	 * 
	 * 1. Update SETTINGS_VERSION in NoteToolbarSettings.
	 * 2. Add MIGRATION block below.
	 * 
	 * Credit to Fevol on Discord for the sample code to migrate.
	 * @link https://discord.com/channels/686053708261228577/840286264964022302/1213507979782127707
	 */
	async loadSettings(): Promise<void> {

		const loaded_settings = await this.loadData();
		debugLog("loadSettings: loaded settings: ", loaded_settings);
		this.settings = Object.assign({}, DEFAULT_SETTINGS, loaded_settings);
	
		let old_version = loaded_settings?.version as number;
		let new_version: number;

		// if we actually have existing settings for this plugin, and the old version does not match the current...
		if (loaded_settings && (old_version !== SETTINGS_VERSION)) {

			debugLog("loadSettings: versions do not match: data.json: ", old_version, " !== latest: ", SETTINGS_VERSION);
			debugLog("running migrations...");

			// first version without update (i.e., version is `undefined`)
			// MIGRATION: moved styles to defaultStyles (and introduced mobileStyles) 
			if (!old_version) {
				new_version = 20240318.1;
				debugLog("- starting migration: " + old_version + " -> " + new_version);
				// for each: double-check setting to migrate is there
				loaded_settings.toolbars?.forEach((tb: any, index: number) => {
					if (tb.styles) {
						debugLog("\t- OLD SETTING: " + tb.styles);
						debugLog("\t\t- SETTING: this.settings.toolbars[index].defaultStyles: " + this.settings.toolbars[index].defaultStyles);
						this.settings.toolbars[index].defaultStyles = tb.styles;
						debugLog("\t\t- SET: " + this.settings.toolbars[index].defaultStyles);
						debugLog("\t\t- SETTING: this.settings.toolbars[index].mobileStyles = []");
						this.settings.toolbars[index].mobileStyles = [];
						delete tb.styles;
					}
				});
				// for the next migration to run
				old_version = new_version;
			}

			// MIGRATION: added urlAttr setting
			if (old_version === 20240318.1) {
				new_version = 20240322.1;
				debugLog("- starting migration: " + old_version + " -> " + new_version);
				loaded_settings.toolbars?.forEach((tb: any, index: number) => {
					tb.items.forEach((item: any, item_index: number) => {
						if (!item?.urlAttr) {
							debugLog("  - add urlAttr for: ", tb.name, item.label);
							// assume old urls are indeed urls and have variables
							item.urlAttr = {
								hasVars: true,
								isUri: true
							};
						}
					});
				});
				// for the next migration to run
				old_version = new_version;
			}

			// MIGRATION: support for icons + generic links with types
			if (old_version === 20240322.1) {
				new_version = 20240330.1;
				debugLog("- starting migration: " + old_version + " -> " + new_version);
				loaded_settings.toolbars?.forEach((tb: any, index: number) => {
					tb.items.forEach((item: any, item_index: number) => {
						this.settings.toolbars[index].items[item_index].icon = "";
						if (item.url) {
							this.settings.toolbars[index].items[item_index].link = item.url;
							delete item.url;
						}
						if (item.urlAttr) {
							this.settings.toolbars[index].items[item_index].linkAttr = {
								commandId: "",
								hasVars: item.urlAttr.hasVars,
								type: item.urlAttr.isUri ? "uri" : "file"
							};
							delete item.urlAttr;
						}
					});
				});
				// for the next migration to run
				old_version = new_version;
			}

			// MIGRATION: support for position + contexts
			if (old_version === 20240330.1) {
				new_version = 20240416.1;
				debugLog("- starting migration: " + old_version + " -> " + new_version);
				loaded_settings.toolbars?.forEach((tb: any, index: number) => {
					tb.items.forEach((item: any, item_index: number) => {
						// convert hideOnDesktop + hideOnMobile to contexts
						this.settings.toolbars[index].items[item_index].contexts = [{
							platform: migrateItemVisPlatform(item.hideOnDesktop, item.hideOnMobile), 
							view: 'all'}];
						delete item.hideOnDesktop;
						delete item.hideOnMobile;
					});
					this.settings.toolbars[index].positions = [{
						position: 'props', 
						contexts: [{
							platform: 'all', 
							view: 'all'
						}]
					}]
				});
				// for the next migration to run
				old_version = new_version;
			}

			// MIGRATION: 
			if (old_version === 20240416.1) {
				new_version = 20240426.1;
				debugLog("- starting migration: " + old_version + " -> " + new_version);
				loaded_settings.toolbars?.forEach((tb: any, index: number) => {
					// toolbar position -> platform-specific positions
					if (this.settings.toolbars[index].positions) {
						this.settings.toolbars[index].positions?.forEach((pos, posIndex) => {
							this.settings.toolbars[index].position = {} as Position;
							if (pos.contexts) {
								pos.contexts?.forEach((ctx: ItemViewContext, ctxIndex) => {
									if (pos.position) {
										switch (ctx.platform) {
											case 'desktop':
												this.settings.toolbars[index].position.desktop = {
													allViews: { position: pos.position }
												}
												break;
											case 'mobile':
												this.settings.toolbars[index].position.mobile = {
													allViews: { position: pos.position }
												}
												this.settings.toolbars[index].position.tablet = {
													allViews: { position: pos.position }
												}
												break;
											case 'all':
												this.settings.toolbars[index].position.desktop = {
													allViews: { position: pos.position }
												}
												this.settings.toolbars[index].position.mobile = {
													allViews: { position: pos.position }
												}
												this.settings.toolbars[index].position.tablet = {
													allViews: { position: pos.position }
												}
												break;
										}
									}
								});
							}
						});
						delete this.settings.toolbars[index].positions;
					}
					// item contexts -> item / component visibility
					tb.items.forEach((item: any, item_index: number) => {
						if (this.settings.toolbars[index].items[item_index].contexts) {							
							this.settings.toolbars[index].items[item_index].contexts?.forEach((ctx: ItemViewContext, ctxIndex) => {
								if (!this.settings.toolbars[index].items[item_index].visibility) {
									this.settings.toolbars[index].items[item_index].visibility = {} as Visibility;
									switch (ctx.platform) {
										case 'desktop':
											this.settings.toolbars[index].items[item_index].visibility.desktop = {
												allViews: {	components: ['icon', 'label'] }
											}
											break;
										case 'mobile':
											this.settings.toolbars[index].items[item_index].visibility.mobile = {
												allViews: {	components: ['icon', 'label'] }
											}
											this.settings.toolbars[index].items[item_index].visibility.tablet = {
												allViews: {	components: ['icon', 'label'] }
											}
											break;
										case 'all':
											this.settings.toolbars[index].items[item_index].visibility.desktop = {
												allViews: {	components: ['icon', 'label'] }
											}
											this.settings.toolbars[index].items[item_index].visibility.mobile = {
												allViews: {	components: ['icon', 'label'] }
											}
											this.settings.toolbars[index].items[item_index].visibility.tablet = {
												allViews: {	components: ['icon', 'label'] }
											}
											break;						
										case 'none':
										default:
											break;
									}
								}
							});
							delete this.settings.toolbars[index].items[item_index].contexts;
						}
					});
				});
				// for the next migration to run
				old_version = new_version;
			}

			this.settings.version = SETTINGS_VERSION;
			debugLog("updated settings:", this.settings);

			// ensure that migrated settings are saved 
			await this.saveSettings();

		}

	}

	/**
	 * Saves settings.
	 * Sorts the toolbar list (by name) first.
	 */
	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);

		// TODO: update the toolbar instead of removing and re-adding to the DOM?
		await this.removeActiveToolbar();
		await this.renderToolbarForActiveFile();

		debugLog("SETTINGS SAVED: " + new Date().getTime());
	}

	/**
	 * Loads settings if the data file is changed externally (e.g., by Obsidian Sync).
	 */
	async onExternalSettingsChange(): Promise<void> {
		debugLog("onExternalSettingsChange()");
		// reload in-memory settings
		// FIXME? removing for now due to bug with settings not being saved properly while editing
		// this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	/**
	 * Gets toolbar from settings, using the provided name.
	 * @param name Name of toolbar to get settings for (case-insensitive).
	 * @returns ToolbarSettings for the provided matched toolbar name, undefined otherwise.
	 */
	getToolbarSettings(name: string | null): ToolbarSettings | undefined {
		return name ? this.settings.toolbars.find(tbar => tbar.name.toLowerCase() === name.toLowerCase()) : undefined;
	}

	/**
	 * Gets toolbar from settings, using the provided array of strings (which will come from note frontmatter).
	 * @param names List of potential toolbars to get settings for (case-insensitive); only the first match is returned.
	 * @returns ToolbarSettings for the provided matched toolbar name, undefined otherwise.
	 */
	getToolbarSettingsFromProps(names: string[] | null): ToolbarSettings | undefined {
		if (!names) return undefined;
		if (typeof names === "string") {
			return this.getToolbarSettings(names);
		}
		return this.settings.toolbars.find(tbar => names.some(name => tbar.name.toLowerCase() === name.toLowerCase()));
	}

	/**
	 * Removes the provided toolbar from settings; does nothing if it does not exist.
	 * @param name Name of the toolbar to remove.
	 */
	deleteToolbarFromSettings(name: string) {
		this.settings.toolbars = this.settings.toolbars.filter(tbar => tbar.name !== name);
	}

}