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
			new Setting(containerEl)
			.setName("No toolbars configured")
			.setDesc(""); // TODO: show items in list here?
		}
		else {
			this.plugin.settings.toolbars.forEach(
				(toolbar_item, index) => {
					new Setting(containerEl)
						.setName(toolbar_item.name)
						.setDesc("")
						.addButton((button: ButtonComponent) => {
							button
								.setTooltip("Update this toolbar")
								.setButtonText("Update")
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
						let new_toolbar = DEFAULT_TOOLBAR_SETTINGS;
						this.plugin.settings.toolbars.push(new_toolbar);
						this.plugin.save_settings();
						this.openSettingsModal(new_toolbar);
					});
			});
	}

}