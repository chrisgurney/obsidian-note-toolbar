import { App, ButtonComponent, PluginSettingTab, Setting } from 'obsidian';
import NoteToolbarPlugin from '../main';
import { arraymove } from 'src/Utils/Utils';
import ToolbarSettingsModal from './ToolbarSettingsModal';
import { DEFAULT_TOOLBAR_SETTINGS, ToolbarSettings } from './NoteToolbarSettings';
import { FolderSuggest } from './Suggesters/FolderSuggester';

export class NoteToolbarSettingTab extends PluginSettingTab {

	plugin: NoteToolbarPlugin;

	constructor(app: App, plugin: NoteToolbarPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

    public openSettingsModal(toolbar: ToolbarSettings) {
        const modal = new ToolbarSettingsModal(this, toolbar);
        modal.open();
    }

	heading_fragment(title: string, description: string): DocumentFragment {
		let message_fragment = document.createDocumentFragment();
		let heading_fragment_text = document.createElement("div")
		heading_fragment_text.className = "setting-item-name";
		heading_fragment_text.textContent = title;
		message_fragment.append(heading_fragment_text);
		let desc_fragment_text = document.createElement("div")
		desc_fragment_text.textContent = description;
		desc_fragment_text.className = "setting-item-description";
		desc_fragment_text.style.paddingBottom = "1em";
		message_fragment.append(desc_fragment_text);
		return message_fragment;
	}

	empty_message_fragment(text: string): DocumentFragment {
		let message_fragment = document.createDocumentFragment();
		let message_fragment_text = document.createElement("i")
		message_fragment_text.textContent = text;
		message_fragment.append(message_fragment_text);
		return message_fragment;
	}

	public display(): void {

		const { containerEl } = this;
		containerEl.empty();
		this.display_toolbar_list(containerEl);
		this.display_folder_list(containerEl);

	}

	display_toolbar_list(containerEl: HTMLElement): void {

		containerEl.createEl("h2", { text: "Toolbars" });

		if (this.plugin.settings.toolbars.length == 0) {
			containerEl
				.createEl("div", { text: this.empty_message_fragment("Click the button to create a toolbar.") })
				.className = "setting-item-name";
		}
		else {
			let toolbar_list_div = containerEl.createDiv();
			toolbar_list_div.addClass("note-toolbar-setting-toolbar-list");
			this.plugin.settings.toolbars.forEach(
				(toolbar_item, index) => {
					new Setting(toolbar_list_div)
						.setName(toolbar_item.name)
						.setDesc(toolbar_item.items.length > 0 ? 
							toolbar_item.items.map(item => item.label).join(' | ') : 
							this.empty_message_fragment("No toolbar items. Click Edit to update this toolbar."))
						.addButton((button: ButtonComponent) => {
							button
								.setTooltip("Update this toolbar's items")
								.setButtonText("Edit")
								.setCta()
								.onClick(() => {
									this.openSettingsModal(toolbar_item);
								});
							});
				});
			containerEl.append(toolbar_list_div);
		}

		new Setting(containerEl)
			.setClass("note-toolbar-setting-button")
			.addButton((button: ButtonComponent) => {
				button
					.setTooltip("Add a new toolbar")
					.setButtonText("+ New toolbar")
					.setCta()
					.onClick(() => {
						let new_toolbar = {
							name: "",
							updated: new Date().toISOString(),
							items: []
						};
						this.plugin.settings.toolbars.push(new_toolbar);
						this.plugin.save_settings();
						this.openSettingsModal(new_toolbar);
					});
			});

	}

	display_folder_list(containerEl: HTMLElement): void {

		containerEl
			.createEl("div", { text: this.heading_fragment("Folder mappings", "Have the toolbar appear in notes matching the provided folders.") })
			.className = "setting-item-name";

		if (this.plugin.settings.folder_mappings.length == 0) {
			containerEl
				.createEl("div", { text: this.empty_message_fragment("Click the button to create a mapping.") })
				.className = "setting-item-name";
		}
		else {
			let toolbar_folder_list_div = containerEl.createDiv();
			// toolbar_folder_list_div.addClass("note-toolbar-setting-toolbar-list");

			this.plugin.settings.folder_mappings.forEach(
				(mapping, index) => {

				let text_fields_container = this.containerEl.createEl("div");
				text_fields_container.id = "note-toolbar-setting-item-field-" + index;
				text_fields_container.style.display = "flex";
				text_fields_container.style.flexWrap = "wrap";
				const fs = new Setting(text_fields_container)
					.setClass("note-toolbar-setting-item-field")
					.addSearch((cb) => {
						new FolderSuggest(this.app, cb.inputEl);
						cb.setPlaceholder("Folder")
							.setValue(mapping.folder)
							.onChange((new_folder) => {
                                if (
                                    new_folder &&
                                    this.plugin.settings.folder_mappings.some(
                                        (e) => e.folder == new_folder
                                    )
                                ) {
									new Error("This folder already has a toolbar associated with it");
                                    return;
                                }

                                this.plugin.settings.folder_mappings[
                                    index
                                ].folder = new_folder;
                                this.plugin.save_settings();
                            });
					});
				const s1c = new Setting(text_fields_container)
					.setClass("note-toolbar-setting-item-field")
					.addText(text => text
						.setPlaceholder('Toolbar name')
						.setValue(mapping.toolbar)
						.onChange(async (value) => {
							mapping.toolbar = value;
							await this.plugin.save_settings();
					}));
				let item_controls_div = this.containerEl.createEl("div");
				item_controls_div.style.marginLeft = "auto";
				item_controls_div.className = "note-toolbar-setting-item-controls";
				const s1d = new Setting(item_controls_div)
					.addExtraButton((cb) => {
						cb.setIcon("cross")
							.setTooltip("Delete")
							.onClick(() => {
								this.plugin.settings.folder_mappings.splice(
									index,
									1
								);
								this.plugin.save_settings();
								this.display();
							});
					});
				text_fields_container.append(item_controls_div);
				toolbar_folder_list_div.append(text_fields_container);

			});

			containerEl.append(toolbar_folder_list_div);
		}

		new Setting(containerEl)
			.setClass("note-toolbar-setting-button")
			.addButton((button: ButtonComponent) => {
				button
					.setTooltip("Add a new mapping")
					.setButtonText("+ New mapping")
					.setCta()
					.onClick(() => {
						let new_mapping = {
							folder: "",
							toolbar: ""
						};
						this.plugin.settings.folder_mappings.push(new_mapping);
						this.plugin.save_settings();
						this.display();
					});
			});

	}

}