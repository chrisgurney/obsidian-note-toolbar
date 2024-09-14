import NoteToolbarPlugin from "main";
import { ButtonComponent, Modal, Setting } from "obsidian";
import { RELEASES_URL, USER_GUIDE_URL } from "Settings/NoteToolbarSettings";
import { iconTextFr } from "../Utils/SettingsUIUtils";

export class HelpModal extends Modal {

	constructor(plugin: NoteToolbarPlugin) {
        super(plugin.app);
        this.modalEl.addClass("note-toolbar-setting-mini-dialog"); 
    }

    public onOpen() {

        this.setTitle('Help');

		new Setting(this.modalEl)
			.setName(iconTextFr('messages-square', 'Get support'))
			.setDesc("Visit the forums on GitHub to ask questions to the community, and to log issues.")
			.addButton((button: ButtonComponent) => {
				button
					.setTooltip('Open github.com')
					.setButtonText('Open ↗')
					.onClick(() => {
						window.open('https://github.com/chrisgurney/obsidian-note-toolbar/discussions', '_blank');
					});
			});

		new Setting(this.modalEl)
			.setName(iconTextFr('pen-box', 'Feedback'))
			.setDesc("Don't have a GitHub account? Use this Google form for any feedback, questions, issues, or ideas you may have.")
			.addButton((button: ButtonComponent) => {
				button
					.setTooltip('Open google.com')
					.setButtonText('Open ↗')
					.onClick(() => {
						window.open('https://docs.google.com/forms/d/e/1FAIpQLSeVWHVnookJr8HVQywk5TwupU-p7vkRkSt83Q5jscR6VwpZEQ/viewform', '_blank');
					});
			})
			.setClass('note-toolbar-setting-no-border');

		new Setting(this.modalEl)
			.setName(iconTextFr('book-open', 'User Guide'))
			.setDesc('Read the detailed user guide, including tips and examples.')
			.addButton((button: ButtonComponent) => {
				button
					.setTooltip('Open github.com')
					.setButtonText('Read ↗')
					.onClick(() => {
						window.open(USER_GUIDE_URL, '_blank');
					});
			});

		new Setting(this.modalEl)
			.setName('Creating toolbar items')
			.setDesc("Learn about the types of items you can use.")
			.addButton((button: ButtonComponent) => {
				button
					.setTooltip('Open github.com')
					.setButtonText('Read ↗')
					.onClick(() => {
						window.open('https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Creating-toolbar-items', '_blank');
					});
			})
			.setClass('note-toolbar-setting-no-border');

		new Setting(this.modalEl)
			.setName('Note Toolbar Callouts')
			.setDesc("Learn how to create toolbars within your notes.")
			.addButton((button: ButtonComponent) => {
				button
					.setTooltip('Open github.com')
					.setButtonText('Read ↗')
					.onClick(() => {
						window.open('https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Note-Toolbar-Callouts', '_blank');
					});
			})
			.setClass('note-toolbar-setting-no-border');

		new Setting(this.modalEl)
			.setName(iconTextFr('heart', 'Donate'))
			.setDesc("If you find this plugin useful, and wish to support me financially, consider donating. Thank you!")
			.addButton((button: ButtonComponent) => {
				button
					.setTooltip('Open buymeacoffee.com')
					.setButtonText('Donate ↗')
					.onClick(() => {
						window.open('https://buymeacoffee.com/cheznine', '_blank');
					});
			});

    }

}