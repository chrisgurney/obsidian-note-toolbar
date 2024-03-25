import { CachedMetadata, Editor, FrontMatterCache, MarkdownView, Plugin, TFile, debounce } from 'obsidian';
import { NoteToolbarSettingTab } from './Settings/NoteToolbarSettingTab';
import { DEFAULT_SETTINGS, ToolbarSettings, ToolbarItemSettings, NoteToolbarSettings, SETTINGS_VERSION } from './Settings/NoteToolbarSettings';

export default class NoteToolbarPlugin extends Plugin {

	settings: NoteToolbarSettings;
	public DEBUG: boolean = true;

	/**
	 * When this plugin is loaded (e.g., on Obsidian startup, or plugin is enabled in settings):
	 * adds listeners, settings, and renders the toolbar for the active file.
	 */
	async onload() {
		await this.loadSettings();

		// this.app.workspace.on('file-open', this.fileOpenListener);
		this.app.metadataCache.on('changed', this.metadataCacheListener);
		this.app.workspace.on('layout-change', this.layoutChangeListener);

		this.addSettingTab(new NoteToolbarSettingTab(this.app, this));
		await this.renderToolbarForActiveFile();
		this.DEBUG && console.log('LOADED');
	}

	/**
	 * When this plugin is unloaded (e.g., disabled in settings, or Obsidian is restarted):
	 * removes listeners and all toolbars.
	 */
	async onunload() {
		// this.app.workspace.off('file-open', this.fileOpenListener);
		this.app.metadataCache.off('changed', this.metadataCacheListener);
		this.app.workspace.off('layout-change', this.layoutChangeListener);
		this.removeAllToolbars();
		this.DEBUG && console.log('UNLOADED');
	}

	/*************************************************************************
	 * SETTINGS LOADERS
	 *************************************************************************/

	/**
	 * Loads settings, and migrates from old versions if needed.
	 * 
	 * No need to update version number in this function; just update in NoteToolbarSettings,
	 * and don't forget to update user-facing version in manifest.json on release.
	 * 
	 * Credit to Fevol on Discord for the sample code to migrate.
	 * @link https://discord.com/channels/686053708261228577/840286264964022302/1213507979782127707
	 */
	async loadSettings(): Promise<void> {

		const loaded_settings = await this.loadData();
		this.DEBUG && console.log("loadSettings: loaded settings: ", loaded_settings);
		this.settings = Object.assign({}, DEFAULT_SETTINGS, loaded_settings);
	
		let old_version = loaded_settings?.version as number;
		let new_version: number;

		// if we actually have existing settings for this plugin, and the old version does not match the current...
		if (loaded_settings && (old_version !== SETTINGS_VERSION)) {

			this.DEBUG && console.log("loadSettings: versions do not match: ", old_version, " <> ", SETTINGS_VERSION);
			this.DEBUG && console.log("running migrations...");

			// first version without update (i.e., version is `undefined`)
			// MIGRATION: moved styles to defaultStyles (and introduced mobileStyles) 
			if (!old_version) {
				new_version = 20240318.1;
				console.log("- starting migration: " + old_version + " -> " + new_version);
				// for each: double-check setting to migrate is there
				loaded_settings.toolbars?.forEach((tb: any, index: number) => {
					if (tb.styles) {
						console.log("\t- OLD SETTING: " + tb.styles);
						console.log("\t\t- SETTING: this.settings.toolbars[index].defaultStyles: " + this.settings.toolbars[index].defaultStyles);
						this.settings.toolbars[index].defaultStyles = tb.styles;
						console.log("\t\t- SET: " + this.settings.toolbars[index].defaultStyles);
						console.log("\t\t- SETTING: this.settings.toolbars[index].mobileStyles = []");
						this.settings.toolbars[index].mobileStyles = [];
						delete tb.styles;
					}
				});
				old_version = new_version;
			}

			// MIGRATION: added urlAttr setting
			if (old_version === 20240318.1) {
				new_version = 20240322.1;
				console.log("- starting migration: " + old_version + " -> " + new_version);
				loaded_settings.toolbars?.forEach((tb: any, index: number) => {
					tb.items.forEach((item: any, item_index: number) => {
						if (!item?.urlAttr) {
							console.log("  - add urlAttr for: ", tb.name, item.label);
							// assume old urls are indeed urls and have variables
							item.urlAttr = {
								hasVars: true,
								isUri: true
							};
						}
					});
				});
				old_version = new_version;
			}

			this.settings.version = SETTINGS_VERSION;
			console.log("updated settings:", this.settings);

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

		this.DEBUG && console.log("SETTINGS SAVED: " + new Date().getTime());
	}

	/**
	 * Loads settings if the data file is changed externally (e.g., by Obsidian Sync).
	 */
	async onExternalSettingsChange(): Promise<void> {
		this.DEBUG && console.log("onExternalSettingsChange()");
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
			this.DEBUG && console.log('file-open: ' + file.name);
			// TODO: remove; leave this here until rendering issues are sorted
			// this.app.workspace.onLayoutReady(() => {
			// 	console.log("LAYOUT READY");
			// 	this.checkAndRenderToolbar(file, this.app.metadataCache.getFileCache(file)?.frontmatter);
			// });
			this.checkAndRenderToolbar(file, this.app.metadataCache.getFileCache(file)?.frontmatter);
		}
	};

	/**
	 * On layout changes, check and render toolbar if necessary. 
	 */
	layoutChangeListener = () => {
		let currentView = this.app.workspace.getActiveViewOfType(MarkdownView);
		let viewMode = currentView?.getMode();
		this.DEBUG && console.log('layout-change: ', viewMode);
		switch(viewMode) {
			case "source":
			case "preview":
				// if we're in editing or reading mode...
				this.DEBUG && console.log("layout-change: ", viewMode, " -> re-rendering toolbar");
				this.removeActiveToolbar();
				this.app.workspace.onLayoutReady(debounce(() => {
					console.log("LAYOUT READY");
					this.renderToolbarForActiveFile();
				}, (viewMode === "preview" ? 200 : 0)));
				break;
			default:
				return;
		}
	};

	/**
	 * On changes to metadata, trigger the checks and rendering of a toolbar if necessary.
	 * @param file TFile in which metadata changed.
	 * @param data ???
	 * @param cache CachedMetadata, from which we look at the frontmatter.
	 */
	metadataCacheListener = (file: TFile, data: any, cache: CachedMetadata) => {
		this.DEBUG && console.log("metadata-changed: " + file.name);
		this.checkAndRenderToolbar(file, cache.frontmatter);
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
	async checkAndRenderToolbar(file: TFile, frontmatter: FrontMatterCache | undefined) {

		this.DEBUG && console.log('checkAndRenderToolbar()');

		//
		// check: does this note need a toolbar?
		//
		
		let matchingToolbar: ToolbarSettings | undefined = undefined;

		// this.DEBUG && console.log('- frontmatter: ', frontmatter);
		const propName = this.settings.toolbarProp;
		const notetoolbarProp: string[] = frontmatter?.[propName] ?? null;
		if (notetoolbarProp !== null) {
			// is it valid? (i.e., is there a matching toolbar?)
			matchingToolbar = this.getToolbarSettingsFromProps(notetoolbarProp);
		}

		// we still don't have a matching toolbar
		if (!matchingToolbar) {

			// check if the note is in a folder that's mapped, and if the mapping is valid
			let mapping;
			for (let index = 0; index < this.settings.folderMappings.length; index++) {
				mapping = this.settings.folderMappings[index];
				// this.DEBUG && console.log('checkAndRenderToolbar: checking folder mappings: ' + file.path + ' | ' + mapping.folder);
				if (file.path.toLowerCase().startsWith(mapping.folder.toLowerCase())) {
					// this.DEBUG && console.log('- mapping found -> ' + mapping.toolbar);
					// continue until we get a matching toolbar
					matchingToolbar = this.getToolbarSettings(mapping.toolbar);
					if (matchingToolbar) {
						// this.DEBUG && console.log('  - matched toolbar:', matchingToolbar);
						break;
					}
				}
			}

		}
		
		//
		// check: is there already a toolbar to remove?
		//
		let currentView = this.app.workspace.getActiveViewOfType(MarkdownView);
		let existingToolbarEl = document.querySelector('.workspace-leaf.mod-active .markdown-' + currentView?.getMode() + '-view .cg-note-toolbar-container');
		console.log("- view mode: ", currentView?.getMode(), " existingToolbarEl: ", existingToolbarEl);
		if (existingToolbarEl) {

			// this.DEBUG && console.log('checkAndRenderToolbar: existing toolbar');

			let existingToolbarName = existingToolbarEl?.getAttribute("data-name");
			let existingToolbarUpdated = existingToolbarEl.getAttribute("data-updated");
			let existingToolbarHasSibling = existingToolbarEl.nextElementSibling;

			// if we don't need it, remove it
			if (!matchingToolbar) {
				this.DEBUG && console.log("- toolbar not needed, removing existing toolbar: " + existingToolbarName);
				existingToolbarEl.remove();
				existingToolbarEl = null;
			}
			// we need a toolbar BUT the name of the existing toolbar doesn't match
			else if (matchingToolbar.name !== existingToolbarName) {
				this.DEBUG && console.log("- toolbar needed, removing existing toolbar (name does not match): " + existingToolbarName);
				existingToolbarEl.remove();
				existingToolbarEl = null;
			}
			// we need a toolbar BUT it needs to be updated
			else if (matchingToolbar.updated !== existingToolbarUpdated) {
				this.DEBUG && console.log("- existing toolbar out of date, removing existing toolbar");
				existingToolbarEl.remove();
				existingToolbarEl = null;
			}
			// existingToolbarEl is not in the correct position: can happen when switching layouts
			else if (existingToolbarHasSibling) {
				this.DEBUG && console.log("- not in the correct position (has next sibling), removing existing toolbar");
				existingToolbarEl.remove();
				existingToolbarEl = null;
			}

			// TODO: if there's a setting to rerender the matchingToolbar (e.g., the names have vars), we can removeActiveToolbar

		}

		// render the toolbar if we have one, and we don't have an existing toolbar to keep
		if (matchingToolbar && !existingToolbarEl) {
			this.DEBUG && console.log("-- RENDERING TOOLBAR: ", matchingToolbar, " for file: ", file);
			this.renderToolbarFromSettings(matchingToolbar);
		}

	}

	/**
	 * Renders the toolbar for the provided toolbar settings.
	 * @param toolbar ToolbarSettings
	 */
	async renderToolbarFromSettings(toolbar: ToolbarSettings) {

		this.DEBUG && console.log("renderToolbarFromSettings: ", toolbar);

		/* create the unordered list of menu items */
		let noteToolbarUl = document.createElement("ul");
		noteToolbarUl.setAttribute("role", "menu");
		toolbar.items.map((item: ToolbarItemSettings) => {

			let toolbarItem = document.createElement("a");
			toolbarItem.className = "external-link";
			toolbarItem.setAttribute("href", item.url);
			Object.entries(item.urlAttr).forEach(([key, value]) => {
				toolbarItem.setAttribute(`data-toolbar-url-attr-${key}`, value);
			});
			toolbarItem.setAttribute("data-tooltip-position", "top");
			toolbarItem.setAttribute("aria-label", item.tooltip ? item.tooltip : "");
			toolbarItem.setAttribute("rel", "noopener");
			toolbarItem.onclick = (e) => this.toolbarClickHandler(e);
			// TODO: if the label has variables, replace them
			toolbarItem.innerHTML = item.label;

			let noteToolbarLi = document.createElement("li");
			item.hideOnMobile ? noteToolbarLi.className = "hide-on-mobile" : false;
			item.hideOnDesktop ? noteToolbarLi.className += "hide-on-desktop" : false;
			item.hideOnDesktop ? noteToolbarLi.style.display = "none" : false;
			noteToolbarLi.append(toolbarItem);

			noteToolbarUl.appendChild(noteToolbarLi);
		});		
		let noteToolbarCalloutContent = document.createElement("div");
		noteToolbarCalloutContent.className = "callout-content";
		noteToolbarCalloutContent.append(noteToolbarUl);

		let noteToolbarCallout = document.createElement("div");
		noteToolbarCallout.className = "callout dv-cg-note-toolbar";
		noteToolbarCallout.setAttribute("tabindex", "0");
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
		embedBlock.append(div);

		/* inject it between the properties and content divs */
		// TODO: remove; leaving here until rendering issues are fully sorted
		// let propertiesContainer = document.querySelector('.workspace-tab-container > .mod-active .metadata-container');
		// let propertiesContainer = this.app.workspace.activeEditor?.contentEl.querySelector('.metadata-container');
		// let propertiesContainer = currentView?.contentEl.querySelector('.metadata-container');
		// let propertiesContainer = this.app.workspace.containerEl.querySelector('.cm-editor > .metadata-container');
		let currentView = this.app.workspace.getActiveViewOfType(MarkdownView);
		let propertiesContainer = document.querySelector('.workspace-leaf.mod-active .markdown-' + currentView?.getMode() + '-view .metadata-container');
		if (!propertiesContainer) {
			console.error("Unable to find propertiesContainer to insert toolbar");
			console.log(document.readyState);
			// debugger;
		}
		propertiesContainer?.insertAdjacentElement("afterend", embedBlock);

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
	 * HANDLERS
	 *************************************************************************/

	/**
	 * On click of an item in the toolbar, we replace any variables that might
	 * be in the URL, and then open it.
	 * @param e MouseEvent
	 */
	async toolbarClickHandler(e: MouseEvent) {

		this.DEBUG && console.log('toolbarClickHandler');
		let clickedEl = e.currentTarget as HTMLLinkElement;
		let url = clickedEl.getAttribute("href");

		if (url != null) {
			this.DEBUG && console.log('- url clicked: ', url);

			// default these to true if they don't exist, treating the url as though it is a URI with vars
			let urlHasVars = clickedEl.getAttribute("data-toolbar-url-attr-hasVars") ? 
							 clickedEl.getAttribute("data-toolbar-url-attr-hasVars") === "true" : true;
			let urlIsUri = clickedEl.getAttribute("data-toolbar-url-attr-isUri") ? 
						   clickedEl.getAttribute("data-toolbar-url-attr-isUri") === "true" : true;
			this.DEBUG && console.log("- hasVars: ", urlHasVars, " isUri: ", urlIsUri);

			if (urlHasVars) {
				let activeFile = this.app.workspace.getActiveFile();
				url = this.replaceVars(url, activeFile, urlIsUri);
				this.DEBUG && console.log('- url vars replaced: ', url);
			}

			// if it's a js function that exists, call it without any parameters
			if (url.toLowerCase().startsWith('onclick:')) {
				let functionName = url.slice(8); // remove 'onclick:'
				if (typeof (window as any)[functionName] === 'function') {
					(window as any)[functionName]();
					e.preventDefault();
				}
			}
			// if it's a url, just open the url
			else if (urlIsUri) {
				window.open(url, '_blank');
				e.preventDefault();	
			}
			// otherwise assume it's an internal link (note) and try to open it
			else {
				let activeFile = this.app.workspace.getActiveFile()?.path ?? "";
				console.log("- openLinkText: ", url, " from: ", activeFile);
				this.app.workspace.openLinkText(url, activeFile);
				e.preventDefault();
			}

		}

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
				const linkWrap = /\[\[|\]\]/g; // remove [[ and ]] in case an internal link was passed
				return frontmatter && frontmatter[key] !== undefined 
					? (encode ? encodeURIComponent(frontmatter[key].replace(linkWrap,'')) : frontmatter[key].replace(linkWrap,'')) 
					: '';
			});
		}
		return s;

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

}