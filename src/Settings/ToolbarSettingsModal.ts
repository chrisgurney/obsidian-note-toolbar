import { App, Modal } from 'obsidian';
import NoteToolbarPlugin from 'src/main';

export default class ToolbarSettingsModal extends Modal {

	private plugin: NoteToolbarPlugin;

	constructor(plugin: NoteToolbarPlugin) {
		super(plugin.app);
		this.plugin = plugin;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}

}