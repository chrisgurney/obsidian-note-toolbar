import { CachedMetadata, FrontMatterCache, MarkdownView, Menu, MenuPositionDef, PaneType, Platform, Plugin, TFile, TFolder, addIcon, debounce, setIcon, setTooltip } from 'obsidian';
import { NoteToolbarSettingTab } from './Settings/NoteToolbarSettingTab';
import { ToolbarSettings, ToolbarItemSettings, NoteToolbarSettings, FolderMapping, ToolbarItemLinkAttr, PositionType, LINK_OPTIONS } from './Settings/NoteToolbarSettings';
import { calcComponentVisToggles, calcItemVisToggles, debugLog, isValidUri, hasVars, putFocusInMenu, replaceVars, getLinkDest } from './Utils/Utils';
import ToolbarSettingsModal from './Settings/Modals/ToolbarSettingsModal/ToolbarSettingsModal';
import { SettingsManager } from './Settings/SettingsManager';

// allows access to Menu DOM, to add a class for styling
declare module "obsidian" {
	interface Menu {
		dom: HTMLDivElement
	}
}

export default class NoteToolbarPlugin extends Plugin {

	settings: NoteToolbarSettings;
	settingsManager: SettingsManager;

	/**
	 * When this plugin is loaded (e.g., on Obsidian startup, or plugin is enabled in settings):
	 * adds listeners, settings, and renders the toolbar for the active file.
	 */
	async onload() {

		this.settingsManager = new SettingsManager(this);
		await this.settingsManager.load();

		// this.registerEvent(this.app.workspace.on('file-open', this.fileOpenListener));
		this.registerEvent(this.app.workspace.on('active-leaf-change', this.leafChangeListener));
		this.registerEvent(this.app.metadataCache.on('changed', this.metadataCacheListener));
		this.registerEvent(this.app.workspace.on('layout-change', this.layoutChangeListener));

		this.addCommand({ id: 'focus', name: 'Focus', callback: async () => this.focusCommand() });
		this.addCommand({ id: 'open-settings', name: 'Open Plugin Settings', callback: async () => this.openSettingsCommand() });
		this.addCommand({ id: 'open-toolbar-settings', name: 'Open Toolbar Settings', callback: async () => this.openToolbarSettingsCommand() });
		this.addCommand({ id: 'show-properties', name: 'Show Properties', callback: async () => this.togglePropsCommand('show') });
		this.addCommand({ id: 'hide-properties', name: 'Hide Properties', callback: async () => this.togglePropsCommand('hide') });
		this.addCommand({ id: 'fold-properties', name: 'Fold Properties', callback: async () => this.togglePropsCommand('fold') });
		this.addCommand({ id: 'toggle-properties', name: 'Toggle Properties', callback: async () => this.togglePropsCommand('toggle') });

		// add icons specific to the plugin
		addIcon('note-toolbar-empty', '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" class="svg-icon note-toolbar-empty”></svg>');
		addIcon('note-toolbar-none', '<svg xmlns="http://www.w3.org/2000/svg" width="0" height="24" viewBox="0 0 0 24" fill="none" class="svg-icon note-toolbar-none></svg>');

		// adds the ribbon icon, on mobile only (seems redundant to add on desktop as well)
		if (Platform.isMobile) {
			debugLog('isMobile');
			this.addRibbonIcon(this.settings.icon, 'Note Toolbar', (event) => {
				let activeFile = this.app.workspace.getActiveFile();
				if (activeFile) {
					let frontmatter = activeFile ? this.app.metadataCache.getFileCache(activeFile)?.frontmatter : undefined;
					let toolbar: ToolbarSettings | undefined = this.getMatchingToolbar(frontmatter, activeFile);
					if (toolbar) {
						this.renderToolbarAsMenu(toolbar, activeFile, this.settings.showEditInFabMenu).then(menu => { 
							menu.showAtPosition(event); 
						});
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
		this.removeAllToolbars();
		debugLog('UNLOADED');
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
				let toolbarEl = this.getToolbarEl();
				let toolbarPos = toolbarEl?.getAttribute('data-tbar-position');
				debugLog("layout-change: position: ", toolbarPos);
				// the props position is the only case where we have to reset the toolbar, due to re-rendering order of the editor
				toolbarPos === 'props' ? this.removeActiveToolbar() : undefined;
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

		if (matchingToolbar) {
			// render the toolbar if we have one, and we don't have an existing toolbar to keep
			if (toolbarRemoved) {
				debugLog("-- RENDERING TOOLBAR: ", matchingToolbar, " for file: ", file);
				await this.renderToolbar(matchingToolbar);	
			}
			await this.updateToolbar(matchingToolbar, file);
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
			ignoreToolbar ? undefined : matchingToolbar = this.settingsManager.getToolbarFromProps(notetoolbarProp);
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
					matchingToolbar = this.settingsManager.getToolbar(mapping.toolbar);
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
		embedBlock.setAttribute('data-tbar-position', position);

		// render the toolbar based on its position
		switch (position) {
			case 'fabl':
			case 'fabr':
				noteToolbarElement = await this.renderToolbarAsFab(toolbar);
				position === 'fabl' ? noteToolbarElement.setAttribute('data-fab-position', 'left') : undefined;
				embedBlock.append(noteToolbarElement);
				this.registerDomEvent(embedBlock, 'click', (e) => this.toolbarFabHandler(e, noteToolbarElement));
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
					itemLabel.setAttribute('id', 'label');
				}
				else {
					this.setComponentDisplayClass(toolbarItem, dkHasLabel, mbHasLabel);
					toolbarItem.innerText = item.label;
					toolbarItem.setAttribute('id', 'label');
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
	 * @param toolbar ToolbarSettings to show menu for.
	 * @param activeFile TFile to show menu for.
	 * @param showEditToolbar set true to show Edit Toolbar link in menu.
	 * @returns Menu with toolbar's items
	 */
	async renderToolbarAsMenu(toolbar: ToolbarSettings, activeFile: TFile, showEditToolbar: boolean = false): Promise<Menu> {

		let menu = new Menu();
		toolbar.items.forEach((toolbarItem, index) => {
			const [showOnDesktop, showOnMobile, showOnTablet] = calcItemVisToggles(toolbarItem.visibility);
			if ((Platform.isMobile && showOnMobile) || (Platform.isDesktop && showOnDesktop)) {
				// don't show the item if the link has variables and resolves to nothing
				if (hasVars(toolbarItem.link) && replaceVars(this.app, toolbarItem.link, activeFile, false) === "") {
					return;
				}
				// replace variables in labels (or tooltip, if no label set)
				let title = toolbarItem.label ? 
					(hasVars(toolbarItem.label) ? replaceVars(this.app, toolbarItem.label, activeFile, false) : toolbarItem.label) : 
					(hasVars(toolbarItem.tooltip) ? replaceVars(this.app, toolbarItem.tooltip, activeFile, false) : toolbarItem.tooltip);
				menu.addItem((item) => {
					item
						.setIcon(toolbarItem.icon ? toolbarItem.icon : 'note-toolbar-empty')
						.setTitle(title)
						.onClick(async (menuEvent) => {
							debugLog(toolbarItem.link, toolbarItem.linkAttr, toolbarItem.contexts);
							await this.handleLink(toolbarItem.link, toolbarItem.linkAttr, menuEvent);
						});
					});
			}
		});

		if (showEditToolbar) {
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
	 * Updates any toolbar elements that use properties, including labels and tooltips.
	 * If the item resolves to a URI that's empty, the item is hidden.
	 * @param toolbar ToolbarSettings to get values from.
	 * @param activeFile TFile to update toolbar for.
	 */
	async updateToolbar(toolbar: ToolbarSettings, activeFile: TFile) {

		let toolbarEl = this.getToolbarEl();
		debugLog("updateToolar()", toolbarEl);

		// if we have a toolbarEl, double-check toolbar's name and updated stamp are as provided
		let toolbarElName = toolbarEl?.getAttribute("data-name");
		let toolbarElUpdated = toolbarEl?.getAttribute("data-updated");
		if (toolbarEl === null || toolbar.name !== toolbarElName || toolbar.updated !== toolbarElUpdated) {
			return;
		}

		// iterate over the item elements of this toolbarEl
		let toolbarItemEls = toolbarEl.querySelectorAll('.callout-content > ul > li > span');
		toolbarItemEls.forEach((itemEl: HTMLElement, index) => {

			let itemSetting = toolbar.items[index];
			let itemElHref = itemEl.getAttribute("href");
			// debugLog(itemEl, "should correspond to setting:", itemSetting);
			if (itemElHref === itemSetting.link) {

				// if link resolves to nothing, there's no need to display the item
				if (hasVars(itemSetting.link)) {
					if (replaceVars(this.app, itemSetting.link, activeFile, false) === "") {
						itemEl.parentElement?.addClass('hide'); // hide the containing li element
						return;
					}
					else {
						itemEl.parentElement?.removeClass('hide'); // unhide the containing li element
					}
				}

				// update tooltip + label
				if (hasVars(itemSetting.tooltip)) {
					let newTooltip = replaceVars(this.app, itemSetting.tooltip, activeFile, false);
					setTooltip(itemEl, newTooltip, { placement: "top" });
				}
				if (hasVars(itemSetting.label)) {
					let newLabel = replaceVars(this.app, itemSetting.label, activeFile, false);
					let itemElLabel = itemEl.querySelector('#label');
					if (newLabel) {
						itemElLabel?.removeClass('hide');
						itemElLabel?.setText(newLabel);
					}
					else {
						itemElLabel?.addClass('hide');
						itemElLabel?.setText('');
					}
				}

			}

		});

	}

	/*************************************************************************
	 * COMMANDS
	 *************************************************************************/

	/**
	 * Sets the focus on the first item in the toolbar.
	 */
	async focusCommand(): Promise<void> {

		debugLog("focusCommand()");
		// need to get the type of toolbar first
		let toolbarEl = this.getToolbarEl();
		let toolbarPosition = toolbarEl?.getAttribute('data-tbar-position');
		switch (toolbarPosition) {
			case 'fabr':
			case 'fabl':
				// trigger the menu
				let toolbarFab = toolbarEl?.querySelector('button.cg-note-toolbar-fab') as HTMLButtonElement;
				debugLog("focusCommand: button: ", toolbarFab);
				toolbarFab.click();
				break;
			case 'props':
			case 'top':
				// get the list and set focus on the first visible item
				let itemsUl: HTMLElement | null = this.getToolbarListEl();
				if (itemsUl) {
					debugLog("focusCommand: toolbar: ", itemsUl);
					let items = Array.from(itemsUl.children);
					const visibleItems = items.filter(item => {
						return window.getComputedStyle(item).getPropertyValue('display') !== 'none';
					});
					const link = visibleItems[0] ? visibleItems[0].querySelector('span') : null;
					debugLog("focusCommand: focussed item: ", link);
					link?.focus();
				}
				break;
			case 'hidden':
			default:
				// do nothing
				break;
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
		let toolbarSettings = toolbarName ? this.settingsManager.getToolbar(toolbarName) : undefined;
		if (toolbarSettings) {
			const modal = new ToolbarSettingsModal(this.app, this, null, toolbarSettings);
			modal.setTitle("Edit Toolbar: " + toolbarName);
			modal.open();
		}
	}

	/**
	 * Shows, completely hides, folds, or toggles the visibility of this note's Properties.
	 * @param visibility Set to 'show', 'hide', 'fold', or 'toggle'
	 */
	async togglePropsCommand(visibility: 'show' | 'hide' | 'fold' | 'toggle'): Promise<void> {

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
				case 'fold':
					if (!propsEl.classList.contains('is-collapsed')) {
						(propsEl.querySelector('.metadata-properties-heading') as HTMLElement).click();
					}
					break;	
			}
		}

	}

	/*************************************************************************
	 * HANDLERS
	 *************************************************************************/
	
	/**
	 * Handles the floating action button specifically on mobile.
	 * @param event MouseEvent
	 * @param posAtElement HTMLElement to position the menu at, which might be different from where the event originated
	 */
	async toolbarFabHandler(event: MouseEvent, posAtElement: HTMLElement) {

		debugLog("toolbarFabHandler: ", event);
		event.preventDefault();

		let activeFile = this.app.workspace.getActiveFile();
		if (activeFile) {
			let frontmatter = activeFile ? this.app.metadataCache.getFileCache(activeFile)?.frontmatter : undefined;
			let toolbar: ToolbarSettings | undefined = this.getMatchingToolbar(frontmatter, activeFile);
			if (toolbar) {
				this.renderToolbarAsMenu(toolbar, activeFile, this.settings.showEditInFabMenu).then(menu => { 
					let elemRect = posAtElement.getBoundingClientRect();
					let menuPos = { x: elemRect.x, y: elemRect.bottom, overlap: true, left: true };
					let fabEl = this.getToolbarFabEl();
					// store menu position for sub-menu positioning
					fabEl?.setAttribute('data-menu-pos', JSON.stringify(menuPos));
					// add class so we can style the menu
					menu.dom.addClass('note-toolbar-menu');
					menu.showAtPosition(menuPos);
				});
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
			e.key ? (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Enter', ' '].includes(e.key) ? e.preventDefault() : undefined) : undefined;

			// remove any items that are not visible (i.e., hidden on desktop/mobile) as they are not navigable
			let items = Array.from(itemsUl.children);
			const visibleItems = items.filter(item => {
				return window.getComputedStyle(item).getPropertyValue('display') !== 'none';
			});
			let currentIndex = visibleItems.indexOf(activeDocument.activeElement?.parentElement as HTMLElement);

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
					// FIXME? option + meta key modifiers not working here (shift + control work?)
					//        or put another way: hot keys are not being honored here
					let activeEl = activeDocument?.activeElement as HTMLElement;
					activeEl.click();
					let linkType = activeEl.getAttribute("data-toolbar-link-attr-type");
					linkType === 'menu' ? putFocusInMenu() : undefined;
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
	 * @param event MouseEvent
	 */
	async toolbarClickHandler(event: MouseEvent) {

		debugLog('toolbarClickHandler: ', event);

		let clickedEl = event.currentTarget as HTMLLinkElement;
		let linkHref = clickedEl.getAttribute("href");

		if (linkHref != null) {
			
			let linkType = clickedEl.getAttribute("data-toolbar-link-attr-type");
			linkType ? (linkType in LINK_OPTIONS ? event.preventDefault() : undefined) : undefined

			debugLog('toolbarClickHandler: ', 'clickedEl: ', clickedEl);

			// default to true if it doesn't exist, treating the url as though it is a URI with vars
			let linkHasVars = clickedEl.getAttribute("data-toolbar-link-attr-hasVars") ? 
							 clickedEl.getAttribute("data-toolbar-link-attr-hasVars") === "true" : true;

			let linkCommandId = clickedEl.getAttribute("data-toolbar-link-attr-commandid");
			
			// remove the focus effect if clicked with a mouse
			if ((event as PointerEvent)?.pointerType === "mouse") {
				clickedEl.blur();
			}

			this.handleLink(linkHref, { commandId: linkCommandId, hasVars: linkHasVars, type: linkType } as ToolbarItemLinkAttr, event);

		}

	}
	
	/**
	 * Handles the link provided.
	 * @param linkHref What the link is for.
	 * @param linkAttr Attributes of the link.
	 * @param event MouseEvent or KeyboardEvent from where link is activated
	 */
	async handleLink(linkHref: string, linkAttr: ToolbarItemLinkAttr, event: MouseEvent | KeyboardEvent) {

		let activeFile = this.app.workspace.getActiveFile();

		if (linkAttr.hasVars) {
			// only replace vars in URIs; might consider other substitution in future
			linkHref = replaceVars(this.app, linkHref, activeFile, false);
			debugLog('- uri vars replaced: ', linkHref);
		}

		switch (linkAttr.type) {
			case 'command':
				debugLog("- executeCommandById: ", linkAttr.commandId);
				linkAttr.commandId ? this.app.commands.executeCommandById(linkAttr.commandId) : undefined;
				break;
			case 'file':
				// it's an internal link (note); try to open it
				let activeFilePath = activeFile ? activeFile.path : '';
				debugLog("- openLinkText: ", linkHref, " from: ", activeFilePath);
				let fileOrFolder = this.app.vault.getAbstractFileByPath(linkHref);
				if (fileOrFolder instanceof TFile) {
					this.app.workspace.openLinkText(linkHref, activeFilePath, getLinkDest(event));
				} 
				else if (fileOrFolder instanceof TFolder) {
					// @ts-ignore
					this.app.internalPlugins.getEnabledPluginById("file-explorer").revealInFolder(fileOrFolder);
				}
				break;
			case 'menu':
				let toolbar = this.settingsManager.getToolbar(linkHref);
				debugLog("- menu item for toolbar", toolbar, activeFile);
				if (toolbar && activeFile) {
					this.renderToolbarAsMenu(toolbar, activeFile).then(menu => {
						let menuPos: MenuPositionDef | undefined = undefined;
						let fabEl = this.getToolbarFabEl();
						let toolbarEl = this.getToolbarEl();
						let clickedItemEl = (event?.targetNode as HTMLLinkElement).closest('.external-link');

						// store menu position for sub-menu positioning
						if (fabEl) {
							let elemRect = fabEl.getBoundingClientRect();	
							menuPos = { x: elemRect.x, y: elemRect.bottom, overlap: true, left: true };
							fabEl.setAttribute('data-menu-pos', JSON.stringify(menuPos));
						}
						else if (toolbarEl && clickedItemEl) {
							let elemRect = clickedItemEl.getBoundingClientRect();
							menuPos = { x: elemRect.x, y: elemRect.bottom, overlap: true, left: false };
							toolbarEl.setAttribute('data-menu-pos', JSON.stringify(menuPos));
						}

						// if we don't have a position yet, try to get it from the previous menu
						if (!menuPos) {
							let previousPosData = fabEl ? fabEl.getAttribute('data-menu-pos') : toolbarEl?.getAttribute('data-menu-pos');
							menuPos = previousPosData ? JSON.parse(previousPosData) : undefined;
						}

						// add class so we can style the menu
						menu.dom.addClass('note-toolbar-menu');

						// position the data and set focus in it if necessary
						menuPos ? menu.showAtPosition(menuPos) : undefined;
						event instanceof KeyboardEvent ? putFocusInMenu() : undefined;
					});
				}
				break;
			case 'uri':
				if (isValidUri(linkHref)) {
					// if actually a url, just open the url
					window.open(linkHref, '_blank');
				}
				else {
					// as fallback, treat it as internal note
					let activeFile = this.app.workspace.getActiveFile()?.path ?? "";
					this.app.workspace.openLinkText(linkHref, activeFile, getLinkDest(event));
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
		let toolbarSettings = toolbarName ? this.settingsManager.getToolbar(toolbarName) : undefined;

		let contextMenu = new Menu();

		if (toolbarSettings !== undefined) {

			contextMenu.addItem((item) => {
				item
					.setTitle("Edit toolbar: " + toolbarName + "...")
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
  
		if (toolbarSettings !== undefined) {

			let currentPosition = this.settingsManager.getToolbarPosition(toolbarSettings);
			if (currentPosition === 'props' || currentPosition === 'top') {
				contextMenu.addSeparator();
				contextMenu.addItem((item) => {
					item
						.setTitle(currentPosition === 'props' ? "Set position: Top (fixed)" : "Set position: Below Properties")
						.setIcon(currentPosition === 'props' ? 'arrow-up-to-line' : 'arrow-down-narrow-wide')
						.onClick((menuEvent) => {
							let newPosition: PositionType = currentPosition === 'props' ? 'top' : 'props';
							if (toolbarSettings?.position) {
								Platform.isDesktop ?
									toolbarSettings.position.desktop = { allViews: { position: newPosition } }
									: toolbarSettings.position.mobile = { allViews: { position: newPosition } };
								toolbarSettings.updated = new Date().toISOString();
								this.settingsManager.save();
							}
						});
				});
			}

		}

		contextMenu.showAtPosition(e);

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

	/**
	 * Get the floating action button, if it exists.
	 * @returns HTMLElement or null, if it doesn't exist.
	 */
	private getToolbarFabEl(): HTMLElement | null {
		let existingToolbarFabEl = activeDocument.querySelector('.cg-note-toolbar-fab-container') as HTMLElement;
		return existingToolbarFabEl;
	}

	/*************************************************************************
	 * TOOLBAR REMOVAL
	 *************************************************************************/

	/**
	 * Remove the toolbar on the active file.
	 */
	async removeActiveToolbar(): Promise<void> {
		let existingToolbar = activeDocument.querySelector('.workspace-leaf.mod-active .cg-note-toolbar-container');
		debugLog("removeActiveToolbar: existingToolbar: ", existingToolbar);
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

}