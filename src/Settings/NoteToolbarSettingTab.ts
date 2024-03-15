import { App, ButtonComponent, PluginSettingTab, Setting } from 'obsidian';
import NoteToolbarPlugin from '../main';
import { arraymove } from 'src/Utils/Utils';
import ToolbarSettingsModal from './ToolbarSettingsModal';
import { DEFAULT_TOOLBAR_SETTINGS, ToolbarSettings } from './NoteToolbarSettings';

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

}