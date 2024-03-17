import { CachedMetadata, Editor, FrontMatterCache, MarkdownView, MetadataCache, Notice, Plugin, TFile } from 'obsidian';
import { NoteToolbarSettingTab } from './Settings/NoteToolbarSettingTab';
import { DEFAULT_SETTINGS, ToolbarSettings, ToolbarItemSettings, NoteToolbarSettings } from './Settings/NoteToolbarSettings';

export default class NoteToolbarPlugin extends Plugin {

	settings: NoteToolbarSettings;
	public DEBUG: boolean = false;

	async onload() {
		await this.loadSettings();

		this.app.workspace.on('file-open', this.fileOpenListener);
		this.app.metadataCache.on("changed", this.metadataCacheListener);

		this.addSettingTab(new NoteToolbarSettingTab(this.app, this));
		await this.renderToolbarForActiveFile();
		this.DEBUG && console.log('LOADED');
	}

	onunload() {
		this.app.workspace.off('file-open', this.fileOpenListener);
		this.app.metadataCache.off('changed', this.metadataCacheListener);
		this.removeAllToolbars();
		this.DEBUG && console.log('UNLOADED');
	}

	/*************************************************************************
	 * SETTINGS LOADERS
	 *************************************************************************/

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
		// TODO: update the toolbar instead of removing and re-adding to the DOM?
		await this.removeActiveToolbar();
		await this.renderToolbarForActiveFile();
	}

	getToolbarSettings(name: string | null): ToolbarSettings | undefined {
		return name ? this.settings.toolbars.find(tbar => tbar.name.toLowerCase() === name.toLowerCase()) : undefined;
	}

	getToolbarSettingsFromProps(names: string[] | null): ToolbarSettings | undefined {
		if (!names) return undefined;
		return this.settings.toolbars.find(tbar => names.some(name => tbar.name.toLowerCase() === name.toLowerCase()));
	}

	deleteToolbarFromSettings(name: string) {
		this.settings.toolbars = this.settings.toolbars.filter(tbar => tbar.name !== name);
	}
 
	/*************************************************************************
	 * LISTENERS
	 *************************************************************************/

	fileOpenListener = (file: TFile) => {
		// make sure we actually opened a file (and not just a new tab)
		if (file != null) {
			this.DEBUG && console.log('file-open: ' + file.name);
			this.checkAndRenderToolbar(file, this.app.metadataCache.getFileCache(file)?.frontmatter);
		}
	}

	metadataCacheListener = (file: TFile, data: any, cache: CachedMetadata) => {
		this.DEBUG && console.log("metadata-changed: " + file.name);
		this.checkAndRenderToolbar(file, cache.frontmatter);
	}

	/*************************************************************************
	 * TOOLBAR RENDERERS
	 *************************************************************************/

	async checkAndRenderToolbar(file: TFile, frontmatter: FrontMatterCache | undefined) {

		this.DEBUG && console.log('checkAndRenderToolbar()');

		//
		// check: does this note need a toolbar?
		//
		
		let matchingToolbar: ToolbarSettings | undefined = undefined;

		this.DEBUG && console.log('- frontmatter: ' + frontmatter);
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
				this.DEBUG && console.log('file-open: checking folder mappings: ' + file.path + ' | ' + mapping.folder);
				if (file.path.toLowerCase().startsWith(mapping.folder.toLowerCase())) {
					this.DEBUG && console.log('- mapping found -> ' + mapping.toolbar);
					// continue until we get a matching toolbar
					matchingToolbar = this.getToolbarSettings(mapping.toolbar);
					if (matchingToolbar) {
						this.DEBUG && console.log('  - matched toolbar: ' + matchingToolbar);
						break;
					}
				}
			}

		}
		
		//
		// check: is there already a toolbar to remove?
		//

		let existingToolbarEl = document.querySelector('.workspace-tab-container > .mod-active .dv-cg-note-toolbar');
		if (existingToolbarEl) {

			this.DEBUG && console.log('file-open: existing toolbar');

			let existingToolbarName = existingToolbarEl?.getAttribute("data-name");
			let existingToolbarUpdated = existingToolbarEl.getAttribute("data-updated");

			// if we don't need it, remove it
			if (!matchingToolbar) {
				this.DEBUG && console.log("file-open: toolbar not needed, removing existing toolbar: " + existingToolbarName);
				this.removeActiveToolbar();
				existingToolbarEl = null;
			}
			// we need a toolbar BUT the name of the existing toolbar doesn't match
			else if (matchingToolbar.name !== existingToolbarName) {
				this.DEBUG && console.log("file-open: toolbar needed, removing existing toolbar (name does not match): " + existingToolbarName);
				this.removeActiveToolbar();
				existingToolbarEl = null;
			}
			// we need a toolbar BUT it needs to be updated
			else if (matchingToolbar.updated !== existingToolbarUpdated) {
				this.DEBUG && console.log("file-open: existing toolbar out of date, removing existing toolbar");
				this.removeActiveToolbar();
				existingToolbarEl = null;
			}

		}

		// render the toolbar if we have one, and we don't have an existing toolbar to keep
		if (matchingToolbar && !existingToolbarEl) {

			this.DEBUG && console.log("file-open: rendering toolbar: " + matchingToolbar.name);
			this.renderToolbarFromSettings(matchingToolbar);

		}

	}

	async renderToolbarFromSettings(toolbar: ToolbarSettings) {

		/* create the unordered list of menu items */
		let noteToolbarUl = document.createElement("ul");
		noteToolbarUl.setAttribute("role", "menu");
		toolbar.items.map((item: ToolbarItemSettings) => {

			let toolbarItem = document.createElement("a");
			toolbarItem.className = "external-link";
			toolbarItem.setAttribute("href", item.url);
			toolbarItem.setAttribute("data-tooltip-position", "top");
			toolbarItem.setAttribute("aria-label", item.tooltip ? item.tooltip : item.url);
			toolbarItem.setAttribute("rel", "noopener");
			toolbarItem.onclick = (e) => this.toolbarClickHandler(e);
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
		noteToolbarCallout.setAttribute("data-callout-metadata", "border-even-sticky");
		noteToolbarCallout.setAttribute("data-name", toolbar.name);
		noteToolbarCallout.setAttribute("data-updated", toolbar.updated);
		noteToolbarCallout.append(noteToolbarCalloutContent);

		/* workaround to emulate callout-in-content structure, to use same sticky css */
		let div = document.createElement("div");
		div.append(noteToolbarCallout);
		let embedBlock = document.createElement("div");
		embedBlock.className = "cm-embed-block cm-callout cg-note-toolbar-container";
		embedBlock.append(div);

		/* inject it between the properties and content divs */
		let propertiesContainer = document.querySelector('.workspace-tab-container > .mod-active .metadata-container');
		propertiesContainer?.insertAdjacentElement("afterend", embedBlock);

	}

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

	async toolbarClickHandler(e: MouseEvent) {

		this.DEBUG && console.log('toolbarClickHandler');
		let clickedEl = e.currentTarget as HTMLLinkElement;
		let url = clickedEl.getAttribute("href");
		let noteTitle = this.app.workspace.getActiveFile()?.basename;
		if (url != null) {
			if (noteTitle != null) {
				url = url.replace('{{note_title}}', encodeURIComponent(noteTitle));
			}
			window.open(url, '_blank');
			e.preventDefault();
		}

	}
	
	/*************************************************************************
	 * TOOLBAR REMOVAL
	 *************************************************************************/

	async removeActiveToolbar() {
		let existingToolbar = document.querySelector('.workspace-tab-container > .mod-active .cg-note-toolbar-container');
		existingToolbar?.remove();
	}

	async removeAllToolbars() {
		let existingToolbars = document.querySelectorAll('.cg-note-toolbar-container');
		existingToolbars.forEach((toolbar) => {
			toolbar.remove();
		});
	}

}