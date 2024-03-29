import { App, ButtonComponent, PluginSettingTab, Setting, debounce, normalizePath } from 'obsidian';
import NoteToolbarPlugin from '../main';
import { arraymove, emptyMessageFr } from 'src/Utils/Utils';
import ToolbarSettingsModal from './ToolbarSettingsModal';
import { DEFAULT_TOOLBAR_SETTINGS, ToolbarSettings } from './NoteToolbarSettings';
import { FolderSuggest } from './Suggesters/FolderSuggester';
import { ToolbarSuggest } from './Suggesters/ToolbarSuggester';

export class NoteToolbarSettingTab extends PluginSettingTab {

	plugin: NoteToolbarPlugin;

	constructor(app: App, plugin: NoteToolbarPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

    public openSettingsModal(toolbar: ToolbarSettings) {
        const modal = new ToolbarSettingsModal(this, toolbar);
		modal.setTitle("Edit Toolbar");
        modal.open();
    }

	/*************************************************************************
	 * SETTINGS DISPLAY
	 *************************************************************************/

	/**
	 * Displays the main settings.
	 */
	public display(): void {
		const { containerEl } = this;
		containerEl.empty();

		// TODO: playing with Dataview support
		// new Setting(containerEl)
		// 	.addButton((button: ButtonComponent) => {
		// 		button
		// 			.setButtonText("dv test")
		// 			.onClick(async () => {
		// 				debugLog("Trying dataview...");
		// 				let dv = new DataviewAdapter();
		// 				const result = await dv.evaluate("dv.current().file.mtime");
		// 				debugLog("result: " + result);
		// 			});
		// 	});

		this.displayToolbarList(containerEl);

		containerEl.createEl("h2", { text: "Display rules" });
		this.displayPropertySetting(containerEl);
		this.displayFolderMap(containerEl);
	}

	/**
	 * Displays the list of toolbars.
	 * @param containerEl HTMLElement to add the settings to.
	 */
	displayToolbarList(containerEl: HTMLElement): void {

		const toolbarsDesc = document.createDocumentFragment();
		toolbarsDesc.append(
			"Define the toolbars you want to add to your notes. ",
			toolbarsDesc.createEl("a", {
				href: "https://github.com/chrisgurney/obsidian-note-toolbar/wiki",
				text: "User Guide",
			})
		);

		new Setting(containerEl)
			.setName("Toolbars")
			.setDesc(toolbarsDesc)
			.setClass("note-toolbar-setting-no-controls");

		if (this.plugin.settings.toolbars.length == 0) {
			containerEl
				.createEl("div", { text: emptyMessageFr("Click the button to create a toolbar.") })
				.className = "note-toolbar-setting-empty-message";
		}
		else {
			let toolbarListDiv = containerEl.createDiv();
			toolbarListDiv.addClass("note-toolbar-setting-toolbar-list");
			this.plugin.settings.toolbars.forEach(
				(toolbarItem, index) => {
					new Setting(toolbarListDiv)
						.setName(toolbarItem.name)
						.setDesc(toolbarItem.items.length > 0 ? 
							toolbarItem.items.map(item => item.label).join(' | ') : 
							emptyMessageFr("No toolbar items. Click Edit to update this toolbar."))
						.addButton((button: ButtonComponent) => {
							button
								.setTooltip("Update this toolbar's items")
								.setButtonText("Edit")
								.setCta()
								.onClick(() => {
									this.openSettingsModal(toolbarItem);
								});
							});
				});
			containerEl.append(toolbarListDiv);
		}

		new Setting(containerEl)
			.setClass("note-toolbar-setting-button")
			.addButton((button: ButtonComponent) => {
				button
					.setTooltip("Add a new toolbar")
					.setButtonText("+ New toolbar")
					.setCta()
					.onClick(async () => {
						let newToolbar = {
							name: "",
							updated: new Date().toISOString(),
							items: [],
							defaultStyles: ["border","even","sticky"],
							mobileStyles: [],
						};
						this.plugin.settings.toolbars.push(newToolbar);
						await this.plugin.saveSettings();
						this.openSettingsModal(newToolbar);
					});
			});

	}

	/**
	 * Displays the property setting.
	 * @param containerEl HTMLElement to add the settings to.
	 */
	displayPropertySetting(containerEl: HTMLElement): void {

		new Setting(containerEl)
			.setName("Property")
			.setDesc("If a toolbar name is found in this property, the toolbar will be displayed on the note. Takes precedence over any folder mappings.")
			.addText(text => text
				.setPlaceholder('Property')
				.setValue(this.plugin.settings.toolbarProp)
				.onChange(debounce(async (value) => {
					this.plugin.settings.toolbarProp = value;
					// FIXME? set all toolbars to updated?
					// this.plugin.settings.toolbars.updated = new Date().toISOString();
					await this.plugin.saveSettings();	
				}, 750)));

	}

	/**
	 * Displays the folder mappings.
	 * @param containerEl HTMLElement to add the settings to.
	 */
	displayFolderMap(containerEl: HTMLElement): void {

		new Setting(containerEl)
			.setName("Folder mappings")
			.setDesc("Notes in folders below will display the toolbar mapped to it. Precedence is top to bottom.")
			.setClass("note-toolbar-setting-no-controls");

		if (this.plugin.settings.folderMappings.length == 0) {
			containerEl
				.createEl("div", { text: emptyMessageFr("Click the button to create a mapping.") })
				.className = "note-toolbar-setting-empty-message";
		}
		else {
			let toolbarFolderListDiv = containerEl.createDiv();

			let lastItemIndex = 0;
			this.plugin.settings.folderMappings.forEach(
				(mapping, index) => {

				lastItemIndex = index;

				let toolbarFolderListItemDiv = containerEl.createDiv();
				toolbarFolderListItemDiv.style.display = "flex";

				let textFieldsDiv = this.containerEl.createEl("div");
				textFieldsDiv.id = "note-toolbar-setting-item-field-" + index;
				textFieldsDiv.className = "note-toolbar-setting-item-fields";
				const fs = new Setting(textFieldsDiv)
					.setClass("note-toolbar-setting-item-field")
					.addSearch((cb) => {
						new FolderSuggest(this.app, cb.inputEl);
						cb.setPlaceholder("Folder")
							.setValue(mapping.folder)
							.onChange(debounce(async (newFolder) => {
                                if (
                                    newFolder &&
                                    this.plugin.settings.folderMappings.some(
                                        (e) => e.folder.toLowerCase() == newFolder.toLowerCase()
                                    )
                                ) {
									textFieldsDiv.createEl("div", { 
										text: "This folder already has a toolbar associated with it.", 
										attr: { id: "note-toolbar-name-error" }, cls: "note-toolbar-setting-error-message" });
									textFieldsDiv.children[0].addClass("note-toolbar-setting-error");
                                }
								else {
									document.getElementById("note-toolbar-name-error")?.remove();
									textFieldsDiv.children[0].removeClass("note-toolbar-setting-error");
									this.plugin.settings.folderMappings[
										index
									].folder = normalizePath(newFolder);
									await this.plugin.saveSettings();	
								}
                            }, 250));
					});
				const ts = new Setting(textFieldsDiv)
					.setClass("note-toolbar-setting-item-field")
					.addSearch((cb) => {
						new ToolbarSuggest(this.app, this.plugin, cb.inputEl);
						cb.setPlaceholder("Toolbar")
							.setValue(mapping.toolbar)
							.onChange(debounce(async (newToolbar) => {
                                this.plugin.settings.folderMappings[
                                    index
                                ].toolbar = newToolbar;
                                await this.plugin.saveSettings();
                            }, 250));
					});
				let itemControlsDiv = this.containerEl.createEl("div");
				itemControlsDiv.style.marginLeft = "auto";
				itemControlsDiv.className = "note-toolbar-setting-item-controls";
				const s1d = new Setting(itemControlsDiv)
					.addExtraButton((cb) => {
						cb.setIcon("up-chevron-glyph")
							.setTooltip("Move up")
							.onClick(async () => {
								arraymove(
									this.plugin.settings.folderMappings,
									index,
									index - 1
								);
								await this.plugin.saveSettings();
								this.display();
							});
					})
					.addExtraButton((cb) => {
						cb.setIcon("down-chevron-glyph")
							.setTooltip("Move down")
							.onClick(async () => {
								arraymove(
									this.plugin.settings.folderMappings,
									index,
									index + 1
								);
								await this.plugin.saveSettings();
								this.display();
							});
					})
					.addExtraButton((cb) => {
						cb.setIcon("cross")
							.setTooltip("Delete")
							.onClick(async () => {
								this.plugin.settings.folderMappings.splice(
									index,
									1
								);
								await this.plugin.saveSettings();
								this.display();
							});
					});
				toolbarFolderListItemDiv.append(textFieldsDiv);
				toolbarFolderListItemDiv.append(itemControlsDiv);

				toolbarFolderListDiv.append(toolbarFolderListItemDiv);
			});

			containerEl.append(toolbarFolderListDiv);

			// set focus on last thing in the list, if the label is empty
			let inputToFocus = this.containerEl.querySelector(
				'#note-toolbar-setting-item-field-' + lastItemIndex + ' input[type="search"]') as HTMLInputElement;
			if (inputToFocus?.value.length === 0) {
				inputToFocus.focus();
			}

		}

		new Setting(containerEl)
			.setClass("note-toolbar-setting-button")
			.addButton((button: ButtonComponent) => {
				button
					.setTooltip("Add a new mapping")
					.setButtonText("+ New mapping")
					.setCta()
					.onClick(async () => {
						let newMapping = {
							folder: "",
							toolbar: ""
						};
						this.plugin.settings.folderMappings.push(newMapping);
						await this.plugin.saveSettings();
						this.display();
					});
			});

	}

}