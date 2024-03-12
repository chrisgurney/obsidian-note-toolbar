import { App, ButtonComponent, PluginSettingTab, Setting } from 'obsidian';
import NoteToolbarPlugin from '../main';
import { arraymove } from 'src/Utils/Utils';
import ToolbarSettingsModal from './ToolbarSettingsModal';

export class NoteToolbarSettingTab extends PluginSettingTab {

	plugin: NoteToolbarPlugin;

	constructor(app: App, plugin: NoteToolbarPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

    public openSettingsModal() {
        const modal = new ToolbarSettingsModal(this.plugin);
        modal.open();
    }

	display(): void {

		const { containerEl } = this;

		containerEl.empty();

		new Setting(this.containerEl)
			.setClass("note-toolbar-setting-button")
			.addButton((button: ButtonComponent) => {
				button
					.setTooltip("Add a toolbar")
					.setButtonText("Modal")
					.setCta()
					.onClick(() => {
						this.openSettingsModal();
					});
		});

	}

}