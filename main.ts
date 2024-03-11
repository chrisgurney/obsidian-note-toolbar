import { App, ButtonComponent, CachedMetadata, Editor, MarkdownView, MetadataCache, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile } from 'obsidian';

export interface ToolbarItem {
	label: string;
	url: string;
	tooltip: string;
	hide_on_desktop: boolean;
	hide_on_mobile: boolean;
}

export interface NoteToolbarSettings {
	updated: string;
	toolbar: Array<ToolbarItem>;
}

export const DEFAULT_SETTINGS: NoteToolbarSettings = {
	updated: new Date().toISOString(),
	toolbar: [{ label: "", url: "", tooltip: "", hide_on_desktop: false, hide_on_mobile: false }]
}

// TODO: create configuration to get this from settings
const toolbar_items = [
	{ index: 0, text: "←", url: "obsidian://advanced-uri?vault=Design&commandid=periodic-notes%253Aprev-daily-note", label: "Previous daily note" },
	{ index: 1, text: "Today", url: "obsidian://advanced-uri?vault=Design&commandid=periodic-notes%253Aopen-daily-note", label: "Today's daily note", hide_on_desktop: "true" },
	{ index: 2, text: "TODO", url: "obsidian://shell-commands/?vault=Design&execute=zg60qq8r6h", label: "Insert tasks", hide_on_mobile: "true" },
	{ index: 3, text: "@focus", url: "obsidian://shell-commands/?vault=Design&execute=jttqryu9sd", label: "Insert tasks to focus on", hide_on_mobile: "true" },
	{ index: 4, text: "✪ Events", url: "obsidian://shell-commands/?vault=Design&execute=r0qcncyump&_task_date=", append_date: true, label: "Insert today's events", hide_on_mobile: "true" },
	{ index: 5, text: "> Insert...", url: "obsidian://advanced-uri?vault=Design&commandid=templater-obsidian%253Ainsert-templater", label: "Choose template to insert" },
	{ index: 6, text: "Blocked?", url: "obsidian://advanced-uri?vault=Design&filepath=Atlas%252FNotes%252FWhat%2520to%2520do%2520if%2520I'm%2520Blocked.md" , remove_toolbar: true, label: "What to do if I'm blocked" },
	{ index: 7, text: "☑︎ Done", url: "obsidian://shell-commands/?vault=Design&execute=um5sony1zn&_task_date=", append_date: true, label: "Insert items done on this day", hide_on_mobile: "true" },
	{ index: 8, text: "⏀ Activity", url: "obsidian://shell-commands/?vault=Design&execute=41451u5h99&_task_date=", append_date: true, label: "Insert Git activity for this day", hide_on_mobile: "true" },
	{ index: 9, text: "→", url: "obsidian://advanced-uri?vault=Design&commandid=periodic-notes%253Anext-daily-note", label: "Next daily note" },
];

export default class MyPlugin extends Plugin {
	settings: NoteToolbarSettings;

	async onload() {
		await this.load_settings();

		this.app.workspace.on('file-open', this.file_open_listener);
		this.app.metadataCache.on("changed", this.metadata_cache_listener);

		this.addSettingTab(new SampleSettingTab(this.app, this));
		console.log('LOADED');

	}

	onunload() {
		this.app.workspace.off('file-open', this.file_open_listener);
		this.app.metadataCache.off('changed', this.metadata_cache_listener);
		console.log('UNLOADED');
	}

	async load_settings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async save_settings() {
		this.settings.updated = new Date().toISOString();
		await this.saveData(this.settings);
		// TODO: update the toolbar instead of removing and re-adding to the DOM
		await this.remove_toolbar();
		await this.render_toolbar();
	}

	file_open_listener = () => {
		// console.log('file-open:');
		let file = this.app.workspace.getActiveFile();
		
		// if toolbar on current file
		let existing_toolbar = document.querySelector('.workspace-tab-container > .mod-active .dv-cg-note-toolbar');
		if (existing_toolbar != null) {
			let updated = existing_toolbar.getAttribute("data-updated");
			// console.log(this.settings.updated);
			if (updated !== this.settings.updated) {
				// console.log("- reloading toolbar");
				// TODO: update the toolbar instead of removing and re-adding to the DOM
				this.remove_toolbar();
				this.render_toolbar();
				existing_toolbar.setAttribute("data-updated", this.settings.updated);
			}
		}

		if (file != null) {
			console.log('file-open: ' + file.name);
			let frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter
			// console.log('- frontmatter: ' + frontmatter);
			const notetoolbar_prop = frontmatter?.notetoolbar ?? null;
			if (notetoolbar_prop !== null) {
				console.log('- notetoolbar: ' + notetoolbar_prop);
				this.render_toolbar();
			}
			else {
				this.remove_toolbar();
			}
		}
	}

	metadata_cache_listener = (file: TFile, data: any, cache: CachedMetadata) => {
		console.log("metadata-changed: " + file.name);
		// check if there's metadata we're interested in, then...
		const notetoolbar_prop = cache.frontmatter?.notetoolbar ?? null;
		if (notetoolbar_prop !== null) {
			// check if we're in the active file
			let active_file = this.app.workspace.getActiveFile()?.name;
			if (file.name === active_file) {
				// FIXME? this also triggers if *any* metadata changes
				console.log('- notetoolbar: ' + notetoolbar_prop);
				this.render_toolbar();
			}
		}
		else {
			this.remove_toolbar();
		}
	}

	async render_toolbar() {

		// check if we already added the toolbar
		let existing_toolbar = document.querySelector('.workspace-tab-container > .mod-active .dv-cg-note-toolbar');
		if (existing_toolbar == null) {

			/* create the unordered list of menu items */
			let note_toolbar_ul = document.createElement("ul");
			note_toolbar_ul.setAttribute("role", "menu");
			// toolbar_items.map(function(data) {
			this.settings.toolbar.map((item: ToolbarItem) => {
	
				let toolbar_item = document.createElement("a");
				toolbar_item.className = "external-link";
				toolbar_item.setAttribute("href", item.url);
				// toolbar_item.setAttribute("data-index", item.index.toString());
				// data.append_date ? toolbar_item.setAttribute("data-append-date", "true") : false;
				// data.remove_toolbar ? toolbar_item.setAttribute("data-remove-toolbar", "true") : false;
				toolbar_item.setAttribute("data-tooltip-position", "top");
				toolbar_item.setAttribute("aria-label", item.tooltip);
				toolbar_item.setAttribute("rel", "noopener");
				toolbar_item.onclick = (e) => this.toolbar_item_handler(e);
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
			note_toolbar_callout.setAttribute("data-updated", this.settings.updated);
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

	async toolbar_item_handler(e: MouseEvent) {

		/* since we might be on a different page now, on click, check if the url needs the date appended */
		let clicked_element = e.currentTarget as HTMLLinkElement;
		if (clicked_element?.getAttribute("data-append-date")) {
			let note_title = this.app.workspace.getActiveFile()?.basename;
			// get the original url
			// TODO: perhaps further optimize this to not need the array (just replace the date in the existing url)
			let menu_index = clicked_element?.getAttribute("data-index");
			let new_url = menu_index ? toolbar_items[parseInt(menu_index)].url : "";
			// FIXME? do nothing(?) if index is bad?
			// append the date (the note's title)
			new_url += note_title;
			clicked_element?.setAttribute("href", new_url);
		}

		if (clicked_element?.getAttribute("data-remove-toolbar")) {
			this.remove_toolbar();
		}

	}
	
	async remove_toolbar() {
		let existing_toolbar = document.querySelector('.workspace-tab-container > .mod-active .dv-cg-note-toolbar');
		existing_toolbar?.remove();
	}

}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		// new Setting(containerEl)
		// 	.setName('Setting #1')
		// 	.setDesc('It\'s a secret')
		// 	.addText(text => text
		// 		.setPlaceholder('Enter your secret')
		// 		.setValue(this.plugin.settings.mySetting)
		// 		.onChange(async (value) => {
		// 			this.plugin.settings.mySetting = value;
		// 			await this.plugin.saveSettings();
		// 		}));

		this.containerEl.createEl("h2", { text: "Menu Items" });

		// const descHeading = document.createDocumentFragment();
        // descHeading.append(
        //     "Add items to this menu."
        // );
		// new Setting(this.containerEl).setDesc(descHeading);

        new Setting(this.containerEl)
            .setName("Add New")
            .setDesc("Add new menu item")
            .addButton((button: ButtonComponent) => {
                button
                    .setTooltip("Add menu item")
                    .setButtonText("+")
                    .setCta()
                    .onClick(() => {
                        this.plugin.settings.toolbar.push({
                            label: "",
                            url: "",
							tooltip: "",
							hide_on_desktop: false,
							hide_on_mobile: false
                        });
                        this.plugin.save_settings();
                        this.display();
                    });
            });

		
		// let div = this.containerEl.createEl("div");

		this.plugin.settings.toolbar.forEach(
			(toolbar_item, index) => {
				const s = new Setting(this.containerEl)
					.addText(text => text
						.setPlaceholder('Label')
						.setValue(this.plugin.settings.toolbar[index].label)
						.onChange(async (value) => {
							this.plugin.settings.toolbar[index].label = value;
							await this.plugin.save_settings();
						}))
					.addText(text => text
						.setPlaceholder('URL')
						.setValue(this.plugin.settings.toolbar[index].url)
						.onChange(async (value) => {
							this.plugin.settings.toolbar[index].url = value;
							await this.plugin.save_settings();
						}))
					.addText(text => text
						.setPlaceholder('Tooltip')
						.setValue(this.plugin.settings.toolbar[index].tooltip)
						.onChange(async (value) => {
							this.plugin.settings.toolbar[index].tooltip = value;
							await this.plugin.save_settings();
						}))
					.addExtraButton((cb) => {
						cb.setIcon("cross")
							.setTooltip("Delete")
							.onClick(() => {
								this.plugin.settings.toolbar.splice(
									index,
									1
								);
								this.plugin.save_settings();
								this.display();
							});
					});
		});

		// .addToggle((toggle) => {
		// 	toggle
		// 		.setValue(this.plugin.settings.toolbar[index].hide_on_mobile)
		// 		.onChange((hide_on_mobile) => {
		// 			this.plugin.settings.toolbar[index].hide_on_mobile =
		// 				hide_on_mobile;
		// 			this.plugin.save_settings();
		// 		});
		// })

	}
}
