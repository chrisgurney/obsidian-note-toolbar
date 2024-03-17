import { App, ButtonComponent, PluginSettingTab, Setting } from 'obsidian';
import NoteToolbarPlugin from '../main';
import { arraymove } from 'src/Utils/Utils';
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
        modal.open();
    }

	headingFragment(title: string, description: string): DocumentFragment {
		let messageFragment = document.createDocumentFragment();
		let headingFragmentText = document.createElement("div")
		headingFragmentText.className = "setting-item-name";
		headingFragmentText.textContent = title;
		messageFragment.append(headingFragmentText);

		let descFragmentText = document.createElement("div")
		descFragmentText.textContent = description;
		descFragmentText.className = "setting-item-description";
		descFragmentText.style.paddingBottom = "1em";
		messageFragment.append(descFragmentText);

		return messageFragment;
	}

	emptyMessageFragment(text: string): DocumentFragment {
		let message_fragment = document.createDocumentFragment();
		let message_fragment_text = document.createElement("i")
		message_fragment_text.textContent = text;
		message_fragment.append(message_fragment_text);
		return message_fragment;
	}

	public display(): void {
		const { containerEl } = this;
		containerEl.empty();
		this.displayToolbarList(containerEl);
		this.displayFolderMap(containerEl);
	}

	displayToolbarList(containerEl: HTMLElement): void {

		containerEl.createEl("h2", { text: "Toolbars" });

		if (this.plugin.settings.toolbars.length == 0) {
			containerEl
				.createEl("div", { text: this.emptyMessageFragment("Click the button to create a toolbar.") })
				.className = "setting-item-name";
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
							this.emptyMessageFragment("No toolbar items. Click Edit to update this toolbar."))
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
					.onClick(() => {
						let newToolbar = {
							name: "",
							updated: new Date().toISOString(),
							items: []
						};
						this.plugin.settings.toolbars.push(newToolbar);
						this.plugin.save_settings();
						this.openSettingsModal(newToolbar);
					});
			});

	}

	displayFolderMap(containerEl: HTMLElement): void {

		containerEl
			.createEl("div", { text: this.headingFragment(
				"Folder mappings", 
				"Have the toolbar appear in notes matching the provided folders. Matching is done in order of this list, from top to bottom.") })
			.className = "setting-item-name";

		if (this.plugin.settings.folder_mappings.length == 0) {
			containerEl
				.createEl("div", { text: this.emptyMessageFragment("Click the button to create a mapping.") })
				.className = "setting-item-name";
		}
		else {
			let toolbarFolderListDiv = containerEl.createDiv();

			let lastItemIndex = 0;
			this.plugin.settings.folder_mappings.forEach(
				(mapping, index) => {

				lastItemIndex = index;

				let toolbarFolderListItemDiv = containerEl.createDiv();
				toolbarFolderListItemDiv.style.display = "flex";

				let textFieldsDiv = this.containerEl.createEl("div");
				textFieldsDiv.id = "note-toolbar-setting-item-field-" + index;
				textFieldsDiv.style.display = "flex";
				textFieldsDiv.style.flexWrap = "wrap";
				const fs = new Setting(textFieldsDiv)
					.setClass("note-toolbar-setting-item-field")
					.addSearch((cb) => {
						new FolderSuggest(this.app, cb.inputEl);
						cb.setPlaceholder("Folder")
							.setValue(mapping.folder)
							.onChange((newFolder) => {
                                if (
                                    newFolder &&
                                    this.plugin.settings.folder_mappings.some(
                                        (e) => e.folder.toLowerCase() == newFolder.toLowerCase()
                                    )
                                ) {
									textFieldsDiv.createEl("div", { 
										text: "This folder already has a toolbar associated with it", 
										attr: { id: "note-toolbar-name-error" }, cls: "note-toolbar-setting-error-message" });
									textFieldsDiv.children[0].addClass("note-toolbar-setting-error");
                                }
								else {
									document.getElementById("note-toolbar-name-error")?.remove();
									textFieldsDiv.children[0].removeClass("note-toolbar-setting-error");
									this.plugin.settings.folder_mappings[
										index
									].folder = newFolder;
									this.plugin.save_settings();	
								}
                            });
					});
				const ts = new Setting(textFieldsDiv)
					.setClass("note-toolbar-setting-item-field")
					.addSearch((cb) => {
						new ToolbarSuggest(this.app, this.plugin, cb.inputEl);
						cb.setPlaceholder("Toolbar")
							.setValue(mapping.toolbar)
							.onChange((newToolbar) => {
                                this.plugin.settings.folder_mappings[
                                    index
                                ].toolbar = newToolbar;
                                this.plugin.save_settings();
                            });
					});
				let itemControlsDiv = this.containerEl.createEl("div");
				itemControlsDiv.style.marginLeft = "auto";
				itemControlsDiv.className = "note-toolbar-setting-item-controls";
				const s1d = new Setting(itemControlsDiv)
					.addExtraButton((cb) => {
						cb.setIcon("up-chevron-glyph")
							.setTooltip("Move up")
							.onClick(() => {
								arraymove(
									this.plugin.settings.folder_mappings,
									index,
									index - 1
								);
								this.plugin.save_settings();
								this.display();
							});
					})
					.addExtraButton((cb) => {
						cb.setIcon("down-chevron-glyph")
							.setTooltip("Move down")
							.onClick(() => {
								arraymove(
									this.plugin.settings.folder_mappings,
									index,
									index + 1
								);
								this.plugin.save_settings();
								this.display();
							});
					})
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
				toolbarFolderListItemDiv.append(textFieldsDiv);
				toolbarFolderListItemDiv.append(itemControlsDiv);

				toolbarFolderListDiv.append(toolbarFolderListItemDiv);
			});

			containerEl.append(toolbarFolderListDiv);

			// set focus on last thing in the list, if the label is empty
			let inputToFocus = this.containerEl.querySelector('#note-toolbar-setting-item-field-' + lastItemIndex + ' input[type="search"]') as HTMLInputElement;
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
					.onClick(() => {
						let newMapping = {
							folder: "",
							toolbar: ""
						};
						this.plugin.settings.folder_mappings.push(newMapping);
						this.plugin.save_settings();
						this.display();
					});
			});

	}

}