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

	public display(): void {

		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl("h2", { text: "Toolbars" });

		if (this.plugin.settings.toolbars.length == 0) {
			const message_no_toolbars = document.createDocumentFragment();
			let message_no_toolbars_text = document.createElement("i")
			message_no_toolbars_text.textContent = "Click the button to create a toolbar.";
			message_no_toolbars.append(message_no_toolbars_text);	
			containerEl
				.createEl("div", { text: message_no_toolbars })
				.className = "setting-item-name";
		}
		else {
			const message_empty_items = document.createDocumentFragment();
			let message_empty_items_text = document.createElement("i")
			message_empty_items_text.textContent = "No toolbar items. Click Edit to update this toolbar.";
			message_empty_items.append(message_empty_items_text);	
			this.plugin.settings.toolbars.forEach(
				(toolbar_item, index) => {
					new Setting(containerEl)
						.setName(toolbar_item.name)
						.setDesc(toolbar_item.items.length > 0 ? 
							toolbar_item.items.map(item => item.label).join(' | ') : 
							message_empty_items)
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