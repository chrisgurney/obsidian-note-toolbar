import { CachedMetadata, Editor, MarkdownView, MetadataCache, Notice, Plugin, TFile } from 'obsidian';
import { NoteToolbarSettingTab } from './Settings/NoteToolbarSettingTab';
import { DEFAULT_SETTINGS, ToolbarSettings, ToolbarItemSettings, NoteToolbarSettings } from './Settings/NoteToolbarSettings';

export default class NoteToolbarPlugin extends Plugin {

	settings: NoteToolbarSettings;

	async onload() {
		await this.load_settings();

		this.app.workspace.on('file-open', this.file_open_listener);
		this.app.metadataCache.on("changed", this.metadata_cache_listener);

		this.addSettingTab(new NoteToolbarSettingTab(this.app, this));
		await this.render_toolbar();
		// console.log('LOADED');
	}

	onunload() {
		this.app.workspace.off('file-open', this.file_open_listener);
		this.app.metadataCache.off('changed', this.metadata_cache_listener);
		this.remove_toolbar_from_all();
		// console.log('UNLOADED');
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

	get_toolbar_from_settings(name: string | null): ToolbarSettings | undefined {
		return name ? this.settings.toolbars.find(tbar => tbar.name === name) : undefined;
	}

	get_props_toolbar_from_settings(names: string[] | null): ToolbarSettings | undefined {
		// console.log('get_props_toolbar_from_settings: ' + names);
		if (!names) return undefined;
		return this.settings.toolbars.find(tbar => names.some(name => tbar.name === name));
	}

	delete_toolbar_from_settings(name: string) {
		this.settings.toolbars = this.settings.toolbars.filter(tbar => tbar.name !== name);
	}
 
	file_open_listener = (file: TFile) => {

		if (file != null) {

			// console.log('file-open:');
			// let active_file = this.app.workspace.getActiveFile();

			let existing_toolbar = document.querySelector('.workspace-tab-container > .mod-active .dv-cg-note-toolbar');
			// if there's a toolbar in the current file...
			if (existing_toolbar !== null) {
				let name = existing_toolbar.getAttribute("data-name");
				let matching_toolbar = this.get_toolbar_from_settings(name);
				// if we can't find an existing toolbar in our settings that matches the one displayed...
				if (matching_toolbar === undefined) {
					// it shouldn't be there: remove it
					// console.log("toolbar not found: " + name);
					this.remove_toolbar();
				}
				else {
					// otherwise, re-render the toolbar if it's out of date with the configuration
					let updated = existing_toolbar.getAttribute("data-updated");
					// console.log(this.settings.updated);
					if (updated !== matching_toolbar.updated) {
						// console.log("- reloading toolbar");
						// we have the proper toolbar, but it's out of date: re-draw it
						// TODO: update the toolbar instead of removing and re-adding to the DOM
						this.remove_toolbar();
						this.render_toolbar();
						existing_toolbar.setAttribute("data-updated", matching_toolbar.updated);
					}
				}
			}
			else {
				// otherwise, check the frontmatter to see if we need to add a toolbar
				// console.log('file-open: ' + file.name);
				let frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter
				// console.log('- frontmatter: ' + frontmatter);
				const notetoolbar_prop: string[] = frontmatter?.notetoolbar ?? null;
				if (notetoolbar_prop !== null) {
					// console.log('- notetoolbar: ' + notetoolbar_prop);
					this.render_toolbar(notetoolbar_prop);
				}
				else {
					this.remove_toolbar();
				}
			}

		}

	}

	metadata_cache_listener = (file: TFile, data: any, cache: CachedMetadata) => {

		// console.log("metadata-changed: " + file.name);
		// check if there's metadata we're interested in, then...
		const notetoolbar_prop: string[] = cache.frontmatter?.notetoolbar ?? null;
		if (notetoolbar_prop !== null) {
			// check if we're in the active file (otherwise, do nothing)
			let active_file = this.app.workspace.getActiveFile()?.name;
			if (file.name === active_file) {
				// FIXME? this also triggers if *any* metadata changes
				// console.log('- notetoolbar: ' + notetoolbar_prop);
				this.render_toolbar(notetoolbar_prop);
			}
		}
		else {
			this.remove_toolbar();
		}

	}

	async render_toolbar(notetoolbar_prop: string[] | null = null) {

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

		// console.log('render_toolbar: checking for matching toolbar...');
		let matching_toolbar = this.get_props_toolbar_from_settings(notetoolbar_prop);

		// console.log(matching_toolbar);
		if (matching_toolbar) {
			// FIXME: add check if existing toolbar same as matching toolbar; if not, re-render
			// check if we already added the toolbar
			if (existing_toolbar == null) {

				/* create the unordered list of menu items */
				let note_toolbar_ul = document.createElement("ul");
				note_toolbar_ul.setAttribute("role", "menu");
				matching_toolbar.items.map((item: ToolbarItemSettings) => {
		
					let toolbar_item = document.createElement("a");
					toolbar_item.className = "external-link";
					toolbar_item.setAttribute("href", item.url);
					// toolbar_item.setAttribute("data-index", item.index.toString());
					// data.remove_toolbar ? toolbar_item.setAttribute("data-remove-toolbar", "true") : false;
					toolbar_item.setAttribute("data-tooltip-position", "top");
					toolbar_item.setAttribute("aria-label", item.tooltip);
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
				note_toolbar_callout.setAttribute("data-name", matching_toolbar.name);
				note_toolbar_callout.setAttribute("data-updated", matching_toolbar.updated);
				note_toolbar_callout.append(note_toolbar_callout_content);
		
				/* workaround to emulate callout-in-content structure, to use same sticky css */
				let div = document.createElement("div");
				div.append(note_toolbar_callout);
				let embed_block = document.createElement("div");
				embed_block.className = "cm-embed-block cm-callout";
				embed_block.append(div);
		
				/* inject it between the properties and content divs */
				let properties_container = document.querySelector('.workspace-tab-container > .mod-active .metadata-container');
				properties_container?.insertAdjacentElement("afterend", embed_block);
		
			}
		} 
		else {
			this.remove_toolbar();
		}
	
	}

	async toolbar_click_handler(e: MouseEvent) {

		// console.log('in toolbar_click_handler');
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
		let existing_toolbar = document.querySelector('.workspace-tab-container > .mod-active .dv-cg-note-toolbar');
		existing_toolbar?.remove();
	}

	async remove_toolbar_from_all() {
		let existing_toolbars = document.querySelectorAll('.dv-cg-note-toolbar');
		existing_toolbars.forEach((toolbar) => {
			toolbar.remove();
		});
	}

}