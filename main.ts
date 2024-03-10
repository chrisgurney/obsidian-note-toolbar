import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default'
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

function toolbar_item_handler(e: MouseEvent) {
	/* since we might be on a different page now, on click, check if the url needs the date appended */
	var clicked_element = e.currentTarget as HTMLLinkElement;
	if (clicked_element?.getAttribute("data-append-date")) {
		var note_title = this.app.workspace.getActiveFile().basename;
		// get the original url
		// TODO: perhaps further optimize this to not need the array (just replace the date in the existing url)
		var menu_index = clicked_element?.getAttribute("data-index");
		var new_url = menu_index ? toolbar_items[parseInt(menu_index)].url : "";
		// FIXME? do nothing(?) if index is bad?
		// append the date (the note's title)
		new_url += note_title;
		clicked_element?.setAttribute("href", new_url);
	}
	if (clicked_element?.getAttribute("data-remove-toolbar")) {
		remove_toolbar();
	}
}

function remove_toolbar() {
	let existing_toolbar = document.querySelector('.workspace-tab-container > .mod-active .dv-cg-note-toolbar');
	existing_toolbar?.remove();
}

function render_toolbar() {

    // check if we already added the toolbar
    let existing_toolbar = document.querySelector('.workspace-tab-container > .mod-active .dv-cg-note-toolbar');
    if (existing_toolbar == null) {

        /* create the unordered list of menu items */
        let note_toolbar_ul = document.createElement("ul");
        note_toolbar_ul.setAttribute("role", "menu");
        toolbar_items.map(function(data) {

            let toolbar_item = document.createElement("a");
            toolbar_item.className = "external-link";
            toolbar_item.setAttribute("href", data.url);
            toolbar_item.setAttribute("data-index", data.index.toString());
            data.append_date ? toolbar_item.setAttribute("data-append-date", "true") : false;
            data.remove_toolbar ? toolbar_item.setAttribute("data-remove-toolbar", "true") : false;
            toolbar_item.setAttribute("data-tooltip-position", "top");
            toolbar_item.setAttribute("aria-label", data.label);
            toolbar_item.setAttribute("rel", "noopener");
            toolbar_item.onclick = (e) => toolbar_item_handler(e);
            toolbar_item.innerHTML = data.text;

            let note_toolbar_li = document.createElement("li");
            data.hide_on_mobile ? note_toolbar_li.className = "hide-on-mobile" : false;
            data.hide_on_desktop ? note_toolbar_li.className += "hide-on-desktop" : false;
            data.hide_on_desktop ? note_toolbar_li.style.display = "none" : false;
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

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		await this.loadSettings();

		this.app.workspace.on('file-open', () => {
			// console.log('file-open:');
			var file = this.app.workspace.getActiveFile();
			if (file != null) {
				console.log('file-open: ' + file.name);
				var frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter
				// console.log('- frontmatter: ' + frontmatter);
				const notetoolbar_prop = frontmatter?.notetoolbar ?? null;
				if (notetoolbar_prop !== null) {
					console.log('- notetoolbar: ' + notetoolbar_prop);
					render_toolbar();
				}
				else {
					remove_toolbar();
				}
			}
		});

		this.app.metadataCache.on("changed", (file, data, cache) => {
			console.log("metadata-changed: " + file.name);
			// check if there's metadata we're interested in, then...
			const notetoolbar_prop = cache.frontmatter?.notetoolbar ?? null;
			if (notetoolbar_prop !== null) {
				// check if we're in the active file
				var active_file = this.app.workspace.getActiveFile()?.name;
				if (file.name === active_file) {
					// FIXME? this also triggers if *any* metadata changes
					console.log('- notetoolbar: ' + notetoolbar_prop);
					render_toolbar();
				}
			}
			else {
				remove_toolbar();
			}
		});

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('scroll', 'Sample Plugin', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice('This is a notice!');
		});
		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text');

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'open-sample-modal-simple',
			name: 'Open sample modal (simple)',
			callback: () => {
				new SampleModal(this.app).open();
			}
		});
		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'sample-editor-command',
			name: 'Sample editor command',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				console.log(editor.getSelection());
				editor.replaceSelection('Sample Editor Command');
			}
		});
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: 'open-sample-modal-complex',
			name: 'Open sample modal (complex)',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new SampleModal(this.app).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			// console.log('click', evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		// this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
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

		new Setting(containerEl)
			.setName('Setting #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}
