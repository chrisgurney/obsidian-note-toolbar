import { CachedMetadata, FrontMatterCache, MarkdownView, Menu, MenuItem, Plugin, TFile, TextFileView, debounce, setIcon, setTooltip } from 'obsidian';
import { NoteToolbarSettingTab } from './Settings/NoteToolbarSettingTab';
import { DEFAULT_SETTINGS, ToolbarSettings, ToolbarItemSettings, NoteToolbarSettings, SETTINGS_VERSION, FolderMapping, Position } from './Settings/NoteToolbarSettings';
import { calcItemVisPlatform, calcItemVisToggles, debugLog, isValidUri } from './Utils/Utils';

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
		this.addCommand({ id: 'show-properties', name: 'Show Properties', callback: async () => this.togglePropsCommand('show') });
		this.addCommand({ id: 'hide-properties', name: 'Hide Properties', callback: async () => this.togglePropsCommand('hide') });
		this.addCommand({ id: 'toggle-properties', name: 'Toggle Properties', callback: async () => this.togglePropsCommand('toggle') });

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
			this.renderToolbarFromSettings(matchingToolbar);
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

		const notetoolbarProp: string[] = frontmatter?.[propName] ?? null;
		if (notetoolbarProp !== null) {
			// is it valid? (i.e., is there a matching toolbar?)
			matchingToolbar = this.getToolbarSettingsFromProps(notetoolbarProp);
		}

		// we still don't have a matching toolbar
		if (!matchingToolbar) {

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
	async renderToolbarFromSettings(toolbar: ToolbarSettings): Promise<void> {

		debugLog("renderToolbarFromSettings: ", toolbar);

		/* create the unordered list of menu items */
		let noteToolbarUl = document.createElement("ul");
		noteToolbarUl.setAttribute("role", "menu");

		toolbar.items.filter((item: ToolbarItemSettings) => {

			// filter out empty items on display
			return ((item.label === "" && item.icon === "") ? false : true);

		}).map((item: ToolbarItemSettings) => {

			let toolbarItem = document.createElement("a");
			toolbarItem.className = "external-link";
			toolbarItem.setAttribute("href", item.link);
			Object.entries(item.linkAttr).forEach(([key, value]) => {
				toolbarItem.setAttribute(`data-toolbar-link-attr-${key}`, value);
			});
			item.tooltip ? setTooltip(toolbarItem, item.tooltip, { placement: "top" }) : undefined;
			toolbarItem.setAttribute("rel", "noopener");
			toolbarItem.onclick = (e) => this.toolbarClickHandler(e);

			if (item.label) {
				if (item.icon) {
					let itemIcon = toolbarItem.createSpan();
					setIcon(itemIcon, item.icon);
					let itemLabel = toolbarItem.createSpan();
					itemLabel.innerText = item.label;
				}
				else {
					toolbarItem.innerText = item.label;
				}
			}
			else {
				setIcon(toolbarItem, item.icon);
			}

			let noteToolbarLi = document.createElement("li");
			const [hideOnDesktop, hideOnMobile] = calcItemVisToggles(item.contexts[0].platform);
			hideOnMobile ? noteToolbarLi.addClass('hide-on-mobile') : false;
			hideOnDesktop ? noteToolbarLi.addClass('hide-on-desktop') : false;
			noteToolbarLi.append(toolbarItem);

			noteToolbarUl.appendChild(noteToolbarLi);
		});		

		let noteToolbarCalloutContent = document.createElement("div");
		noteToolbarCalloutContent.className = "callout-content";
		noteToolbarCalloutContent.append(noteToolbarUl);

		let noteToolbarCallout = document.createElement("div");
		noteToolbarCallout.className = "callout cg-note-toolbar-callout";
		noteToolbarCallout.setAttribute("data-callout", "note-toolbar");
		noteToolbarCallout.setAttribute("data-callout-metadata", [...toolbar.defaultStyles, ...toolbar.mobileStyles].join('-'));
		noteToolbarCallout.append(noteToolbarCalloutContent);

		/* workaround to emulate callout-in-content structure, to use same sticky css */
		let div = document.createElement("div");
		div.append(noteToolbarCallout);
		let embedBlock = document.createElement("div");
		embedBlock.className = "cm-embed-block cm-callout cg-note-toolbar-container";
		embedBlock.setAttribute("data-name", toolbar.name);
		embedBlock.setAttribute("data-updated", toolbar.updated);
		embedBlock.oncontextmenu = (e) => this.toolbarContextMenuHandler(e);
		embedBlock.append(div);

		this.registerDomEvent(embedBlock, 'keydown', (e) => this.toolbarKeyboardHandler(e));

		switch(toolbar.positions[0].position) {
			case 'top':
				embedBlock.addClass('cg-note-toolbar-position-top');
				let viewHeader = document.querySelector('.workspace-leaf.mod-active .view-header') as HTMLElement;
				if (!viewHeader) {
					debugLog("🛑 renderToolbarFromSettings: Unable to find .view-header to insert toolbar");
				}
				viewHeader.insertAdjacentElement("afterend", embedBlock);
				break;
			case 'props':
			default:
				/* inject it between the properties and content divs */
				let propsEl = this.getPropsEl();
				if (!propsEl) {
					debugLog("🛑 renderToolbarFromSettings: Unable to find .metadata-container to insert toolbar");
				}
				propsEl?.insertAdjacentElement("afterend", embedBlock);
				break;
		}

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
			const link = visibleItems[0] ? visibleItems[0].querySelector('a') : null;
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
	 * Handles keyboard navigation within the toolbar.
	 * @param e KeyboardEvent
	 */
	async toolbarKeyboardHandler(e: KeyboardEvent) {

		debugLog("toolbarKeyboardHandler: ", e);

		let itemsUl: HTMLElement | null = this.getToolbarListEl();
		if (itemsUl) {

			// not preventing default from 'Escape' for now (I think this helps)
			e.key ? (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', ' '].includes(e.key) ? e.preventDefault() : undefined) : undefined

			// remove any items that are not visible (i.e., hidden on desktop/mobile) as they are not navigable
			let items = Array.from(itemsUl.children);
			const visibleItems = items.filter(item => {
				return window.getComputedStyle(item).getPropertyValue('display') !== 'none';
			});
			let currentIndex = visibleItems.indexOf(document.activeElement?.parentElement as HTMLElement);

			// only use preventDefault within these cases, as we want to allow for tabbing out of the toolbar
			switch (e.key) {
				case 'ArrowRight':
				case 'ArrowDown':
					const nextIndex = (currentIndex + 1) % visibleItems.length;
					visibleItems[nextIndex].querySelector('a')?.focus();
					break;
				case 'ArrowLeft':
				case 'ArrowUp':
					const prevIndex = (currentIndex - 1 + visibleItems.length) % visibleItems.length;
					visibleItems[prevIndex].querySelector('a')?.focus();
					break;
				case ' ':
					(document?.activeElement as HTMLElement).click();
					break;
				case 'Escape':
					// need this implemented for Reading mode, as escape does nothing
					let currentView = this.app.workspace.getActiveViewOfType(MarkdownView);
					let viewMode = currentView?.getMode();
					if (viewMode === 'preview') {
						(document?.activeElement as HTMLElement).blur();
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
		let url = clickedEl.getAttribute("href");

		if (url != null) {
			
			let linkType = clickedEl.getAttribute("data-toolbar-link-attr-type");
			linkType ? (['command', 'file', 'uri'].includes(linkType) ? e.preventDefault() : undefined) : undefined

			debugLog('toolbarClickHandler: ', e, 'clickedEl: ', clickedEl);

			// default to true if it doesn't exist, treating the url as though it is a URI with vars
			let linkHasVars = clickedEl.getAttribute("data-toolbar-link-attr-hasVars") ? 
							 clickedEl.getAttribute("data-toolbar-link-attr-hasVars") === "true" : true;

			if (linkHasVars) {
				let activeFile = this.app.workspace.getActiveFile();
				// only replace vars in URIs; might consider other substitution in future
				url = this.replaceVars(url, activeFile, linkType === "uri");
				debugLog('- url vars replaced: ', url);
			}

			// remove the focus effect if clicked with a mouse
			if ((e as PointerEvent)?.pointerType === "mouse") {
				clickedEl.blur();
			}

			switch (linkType) {
				case 'command':
					let linkCommandId = clickedEl.getAttribute("data-toolbar-link-attr-commandid");
					debugLog("- executeCommandById: ", linkCommandId);
					linkCommandId ? this.app.commands.executeCommandById(linkCommandId) : undefined;
					break;
				case 'file':
					// it's an internal link (note); try to open it
					let activeFile = this.app.workspace.getActiveFile()?.path ?? "";
					debugLog("- openLinkText: ", url, " from: ", activeFile);
					this.app.workspace.openLinkText(url, activeFile);
					break;
				case 'uri':
					if (isValidUri(url)) {
						// if actually a url, just open the url
						window.open(url, '_blank');
					}
					else {
						// as fallback, treat it as internal note
						let activeFile = this.app.workspace.getActiveFile()?.path ?? "";
						this.app.workspace.openLinkText(url, activeFile);
					}
					break;
			}
		
			// archiving for later
			if (false) {
				// if it's a js function that exists, call it without any parameters
				// @ts-ignore
				if (url.toLowerCase().startsWith('onclick:')) {
					// @ts-ignore
					let functionName = url.slice(8); // remove 'onclick:'
					if (typeof (window as any)[functionName] === 'function') {
						(window as any)[functionName]();
					}
				}
			}

		}

	}
	
	/**
	 * Shows a context menu with a link to settings, for convenience.
	 * @param e MouseEvent
	 */
	async toolbarContextMenuHandler(e: MouseEvent) {

		e.preventDefault();

		let contextMenu = new Menu();
		contextMenu.addItem((item) => {
		  item
			.setTitle("Note Toolbar settings...")
			.setIcon("lucide-wrench")
			.onClick((e) => {
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
		// let propertiesContainer = document.querySelector('.workspace-tab-container > .mod-active .metadata-container');
		// let propertiesContainer = this.app.workspace.activeEditor?.contentEl.querySelector('.metadata-container');
		// let propertiesContainer = currentView?.contentEl.querySelector('.metadata-container');
		// let propertiesContainer = this.app.workspace.containerEl.querySelector('.cm-editor > .metadata-container');
		let propertiesContainer = document.querySelector('.workspace-leaf.mod-active .markdown-' + currentView?.getMode() + '-view .metadata-container') as HTMLElement;
		debugLog("getPropsEl: ", '.workspace-leaf.mod-active .markdown-' + currentView?.getMode() + '-view .metadata-container');
		return propertiesContainer;
	}

	/**
	 * Get the toolbar element, in the current view.
	 * @param positionsToCheck 
	 * @returns HTMLElement or null, if it doesn't exist.
	 */
	private getToolbarEl(): HTMLElement | null {
		let existingToolbarEl = document.querySelector('.workspace-leaf.mod-active .cg-note-toolbar-container') as HTMLElement;
		debugLog("getToolbarEl: ", existingToolbarEl);
		return existingToolbarEl;
	}

	/**
	 * Get the toolbar element's <ul> element, in the current view.
	 * @returns HTMLElement or null, if it doesn't exist.
	 */
	private getToolbarListEl(): HTMLElement | null {
		let itemsUl = document.querySelector('.workspace-leaf.mod-active .cg-note-toolbar-container .callout-content > ul') as HTMLElement;
		return itemsUl;
	}

	/*************************************************************************
	 * TOOLBAR REMOVAL
	 *************************************************************************/

	/**
	 * Remove the toolbar on the active file.
	 */
	async removeActiveToolbar(): Promise<void> {
		let existingToolbar = document.querySelector('.workspace-leaf.mod-active .cg-note-toolbar-container');
		existingToolbar?.remove();
	}

	/**
	 * Remove any toolbars in all open files.
	 */
	async removeAllToolbars(): Promise<void> {
		let existingToolbars = document.querySelectorAll('.cg-note-toolbar-container');
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
							platform: calcItemVisPlatform(item.hideOnDesktop, item.hideOnMobile), 
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