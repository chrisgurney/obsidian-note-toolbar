import { CachedMetadata, Editor, FrontMatterCache, MarkdownView, MetadataCache, Notice, Plugin, TFile } from 'obsidian';
import { NoteToolbarSettingTab } from './Settings/NoteToolbarSettingTab';
import { DEFAULT_SETTINGS, ToolbarSettings, ToolbarItemSettings, NoteToolbarSettings } from './Settings/NoteToolbarSettings';

export default class NoteToolbarPlugin extends Plugin {

	settings: NoteToolbarSettings;
	public DEBUG: boolean = false;

	async onload() {
		await this.load_settings();

		this.app.workspace.on('file-open', this.file_open_listener);
		this.app.metadataCache.on("changed", this.metadata_cache_listener);

		this.addSettingTab(new NoteToolbarSettingTab(this.app, this));
		await this.render_toolbar();
		this.DEBUG && console.log('LOADED');
	}

	onunload() {
		this.app.workspace.off('file-open', this.file_open_listener);
		this.app.metadataCache.off('changed', this.metadata_cache_listener);
		this.remove_toolbar_from_all();
		this.DEBUG && console.log('UNLOADED');
	}

	async load_settings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async save_settings() {
		await this.saveData(this.settings);
		// TODO: update the toolbar instead of removing and re-adding to the DOM?
		await this.remove_toolbar();
		await this.render_toolbar();
	}

	get_toolbar_settings(name: string | null): ToolbarSettings | undefined {
		return name ? this.settings.toolbars.find(tbar => tbar.name.toLowerCase() === name.toLowerCase()) : undefined;
	}

	get_toolbar_settings_from_props(names: string[] | null): ToolbarSettings | undefined {
		if (!names) return undefined;
		return this.settings.toolbars.find(tbar => names.some(name => tbar.name.toLowerCase() === name.toLowerCase()));
	}

	delete_toolbar_from_settings(name: string) {
		this.settings.toolbars = this.settings.toolbars.filter(tbar => tbar.name !== name);
	}
 
	file_open_listener = (file: TFile) => {
		// make sure we actually opened a file (and not just a new tab)
		if (file != null) {
			this.DEBUG && console.log('file-open: ' + file.name);
			this.check_and_render_toolbar(file, this.app.metadataCache.getFileCache(file)?.frontmatter);
		}
	}

	metadata_cache_listener = (file: TFile, data: any, cache: CachedMetadata) => {
		this.DEBUG && console.log("metadata-changed: " + file.name);
		this.check_and_render_toolbar(file, cache.frontmatter);
	}

	async check_and_render_toolbar(file: TFile, frontmatter: FrontMatterCache | undefined) {

		this.DEBUG && console.log('check_and_render_toolbar()');

		//
		// check: does this note need a toolbar?
		//
		
		let matching_toolbar: ToolbarSettings | undefined = undefined;

		this.DEBUG && console.log('- frontmatter: ' + frontmatter);
		const notetoolbar_prop: string[] = frontmatter?.notetoolbar ?? null;
		if (notetoolbar_prop !== null) {
			// is it valid? (i.e., is there a matching toolbar?)
			matching_toolbar = this.get_toolbar_settings_from_props(notetoolbar_prop);
		}

		// we still don't have a matching toolbar
		if (!matching_toolbar) {

			// check if the note is in a folder that's mapped, and if the mapping is valid
			let mapping;
			for (let index = 0; index < this.settings.folder_mappings.length; index++) {
				mapping = this.settings.folder_mappings[index];
				this.DEBUG && console.log('file-open: checking folder mappings: ' + file.path + ' | ' + mapping.folder);
				if (file.path.startsWith(mapping.folder)) {
					this.DEBUG && console.log('- mapping found -> ' + mapping.toolbar);
					// continue until we get a matching toolbar
					matching_toolbar = this.get_toolbar_settings(mapping.toolbar);
					if (matching_toolbar) {
						this.DEBUG && console.log('  - matched toolbar: ' + matching_toolbar);
						break;
					}
				}
			}

		}
		
		//
		// check: is there already a toolbar to remove?
		//

		let existing_toolbar_el = document.querySelector('.workspace-tab-container > .mod-active .dv-cg-note-toolbar');
		if (existing_toolbar_el) {

			this.DEBUG && console.log('file-open: existing toolbar');

			let existing_toolbar_name = existing_toolbar_el?.getAttribute("data-name");
			let existing_toolbar_updated = existing_toolbar_el.getAttribute("data-updated");

			// if we don't need it, remove it
			if (!matching_toolbar) {
				this.DEBUG && console.log("file-open: toolbar not needed, removing existing toolbar: " + existing_toolbar_name);
				this.remove_toolbar();
				existing_toolbar_el = null;
			}
			// we need a toolbar BUT the name of the existing toolbar doesn't match
			else if (matching_toolbar.name !== existing_toolbar_name) {
				this.DEBUG && console.log("file-open: toolbar needed, removing existing toolbar (name does not match): " + existing_toolbar_name);
				this.remove_toolbar();
				existing_toolbar_el = null;
			}
			// we need a toolbar BUT it needs to be updated
			else if (matching_toolbar.updated !== existing_toolbar_updated) {
				this.DEBUG && console.log("file-open: existing toolbar out of date, removing existing toolbar");
				this.remove_toolbar();
				existing_toolbar_el = null;
			}

		}

		// render the toolbar if we have one, and we don't have an existing toolbar to keep
		if (matching_toolbar && !existing_toolbar_el) {

			this.DEBUG && console.log("file-open: rendering toolbar: " + matching_toolbar.name);
			this.render_toolbar_from_settings(matching_toolbar);

		}

	}

	async render_toolbar_from_settings(toolbar: ToolbarSettings) {

		/* create the unordered list of menu items */
		let note_toolbar_ul = document.createElement("ul");
		note_toolbar_ul.setAttribute("role", "menu");
		toolbar.items.map((item: ToolbarItemSettings) => {

			let toolbar_item = document.createElement("a");
			toolbar_item.className = "external-link";
			toolbar_item.setAttribute("href", item.url);
			toolbar_item.setAttribute("data-tooltip-position", "top");
			toolbar_item.setAttribute("aria-label", item.tooltip ? item.tooltip : item.url);
			toolbar_item.setAttribute("rel", "noopener");
			toolbar_item.onclick = (e) => this.toolbar_click_handler(e);
			toolbar_item.innerHTML = item.label;

			let note_toolbar_li = document.createElement("li");
			item.hide_on_mobile ? note_toolbar_li.className = "hide-on-mobile" : false;
			item.hide_on_desktop ? note_toolbar_li.className += "hide-on-desktop" : false;
			item.hide_on_desktop ? note_toolbar_li.style.display = "none" : false;
			note_toolbar_li.append(toolbar_item);

			note_toolbar_ul.appendChild(note_toolbar_li);
		});

		let note_toolbar_callout_content = document.createElement("div");
		note_toolbar_callout_content.className = "callout-content";
		note_toolbar_callout_content.append(note_toolbar_ul);

		let note_toolbar_callout = document.createElement("div");
		note_toolbar_callout.className = "callout dv-cg-note-toolbar";
		note_toolbar_callout.setAttribute("tabindex", "0");
		note_toolbar_callout.setAttribute("data-callout", "note-toolbar");
		note_toolbar_callout.setAttribute("data-callout-metadata", "border-even-sticky");
		note_toolbar_callout.setAttribute("data-name", toolbar.name);
		note_toolbar_callout.setAttribute("data-updated", toolbar.updated);
		note_toolbar_callout.append(note_toolbar_callout_content);

		/* workaround to emulate callout-in-content structure, to use same sticky css */
		let div = document.createElement("div");
		div.append(note_toolbar_callout);
		let embed_block = document.createElement("div");
		embed_block.className = "cm-embed-block cm-callout cg-note-toolbar-container";
		embed_block.append(div);

		/* inject it between the properties and content divs */
		let properties_container = document.querySelector('.workspace-tab-container > .mod-active .metadata-container');
		properties_container?.insertAdjacentElement("afterend", embed_block);

	}

	/* TODO: auto-detect and render toolbar */
	async render_toolbar() {

		let existing_toolbar = document.querySelector('.workspace-tab-container > .mod-active .dv-cg-note-toolbar');

		let notetoolbar_prop;

		// if provided prop is null, get the prop from the file
		let active_file = this.app.workspace.getActiveFile();
		if (active_file != null) {
			let frontmatter = this.app.metadataCache.getFileCache(active_file)?.frontmatter
			notetoolbar_prop = frontmatter?.notetoolbar ?? null;
		}

		let matching_toolbar = this.get_toolbar_settings_from_props(notetoolbar_prop);

		if (matching_toolbar) {

			// if existing toolbar not same as matching toolbar; re-render
			// (addresses case where adding a prop and removing an old one does not update)
			if (existing_toolbar?.getAttribute("data-name") !== matching_toolbar.name) {
				this.remove_toolbar();
				existing_toolbar = null;
			}

			// check if we already added the toolbar
			if (existing_toolbar == null) {
				this.render_toolbar_from_settings(matching_toolbar);
			}

		} 
		else {
			this.remove_toolbar();
		}
	
	}

	async render_toolbar_from_props(notetoolbar_prop: string[]) {

		let existing_toolbar = document.querySelector('.workspace-tab-container > .mod-active .dv-cg-note-toolbar');

		// make sure we have the frontmatter prop before continuing
		if (notetoolbar_prop === null) {
			// if provided prop is null, get the prop from the file
			let active_file = this.app.workspace.getActiveFile();
			if (active_file != null) {
				let frontmatter = this.app.metadataCache.getFileCache(active_file)?.frontmatter
				notetoolbar_prop = frontmatter?.notetoolbar ?? null;
			}
		}

		let matching_toolbar = this.get_toolbar_settings_from_props(notetoolbar_prop);

		if (matching_toolbar) {

			// if existing toolbar not same as matching toolbar; re-render
			// (addresses case where adding a prop and removing an old one does not update)
			if (existing_toolbar?.getAttribute("data-name") !== matching_toolbar.name) {
				this.remove_toolbar();
				existing_toolbar = null;
			}

			// check if we already added the toolbar
			if (existing_toolbar == null) {
				this.render_toolbar_from_settings(matching_toolbar);
			}

		} 
		else {
			this.remove_toolbar();
		}
	
	}

	async toolbar_click_handler(e: MouseEvent) {

		this.DEBUG && console.log('toolbar_click_handler');
		/* since we might be on a different page now, on click, check if the url needs the date appended */
		let clicked_element = e.currentTarget as HTMLLinkElement;
		let url = clicked_element.getAttribute("href");
		let note_title = this.app.workspace.getActiveFile()?.basename;
		if (url != null) {
			if (note_title != null) {
				url = url.replace('{{note_title}}', encodeURIComponent(note_title));
			}
			window.open(url, '_blank');
			e.preventDefault();
		}

	}
	
	async remove_toolbar() {
		let existing_toolbar = document.querySelector('.workspace-tab-container > .mod-active .cg-note-toolbar-container');
		existing_toolbar?.remove();
	}

	async remove_toolbar_from_all() {
		let existing_toolbars = document.querySelectorAll('.cg-note-toolbar-container');
		existing_toolbars.forEach((toolbar) => {
			toolbar.remove();
		});
	}

}