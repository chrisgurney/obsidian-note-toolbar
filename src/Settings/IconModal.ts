import { Modal, Setting, debounce } from "obsidian";
import ToolbarSettingsModal from "./ToolbarSettingsModal";
import NoteToolbarPlugin from "src/main";
import { ToolbarItemSettings, ToolbarSettings } from "./NoteToolbarSettings";
import { IconSuggester } from "./Suggesters/IconSuggester";
import { debugLog } from "src/Utils/Utils";

export class IconModal extends Modal {

	private parent: ToolbarSettingsModal;
    public plugin: NoteToolbarPlugin;
    private toolbarItem: ToolbarItemSettings;

	constructor(parent: ToolbarSettingsModal, toolbarItem: ToolbarItemSettings) {
        super(parent.plugin.app);
        this.modalEl.addClass("note-toolbar-setting-mini-dialog"); 
        this.parent = parent;
        this.plugin = parent.plugin;
        this.toolbarItem = toolbarItem;
    }

    public onOpen() {

        this.setTitle("Select icon");

		let iconSuggesterDiv = this.containerEl.createDiv();
        let selectedIcon = "";
		new Setting(iconSuggesterDiv)
            .setDesc("Select an icon for this item")
			.addSearch((cb) => {
				new IconSuggester(this.app, cb.inputEl);
				cb.setPlaceholder("Icon")
					.setValue("")
					.onChange(debounce(async (icon) => {
                        selectedIcon = icon;
					}, 0))
                this.plugin.registerDomEvent(
                    cb.inputEl, 'keydown', (e) => {
                        switch (e.key) {
                            case "Enter":
                                this.save(selectedIcon);
                        }
                    });        
            }),
		this.contentEl.appendChild(iconSuggesterDiv);

        let actionButtons = this.contentEl.createDiv();
        actionButtons.addClass("note-toolbar-icon-action-button-container");

        const removeButton = actionButtons.createEl("button", {text: "Remove"});
        removeButton.onclick = async () => this.save("");

        const selectButton = actionButtons.createEl("button", {text: "Select"});
        selectButton.type = "submit";
        selectButton.onclick = async () => this.save(selectedIcon);

        this.contentEl.append(actionButtons);

    }

    /**
     * Saves the selected icon to settings, closes the modal, refreshes the parent.
     * @param selectedIcon Icon to save.
     */
    async save(selectedIcon: string): Promise<void> {

        this.toolbarItem.icon = selectedIcon;
        await this.plugin.saveSettings();
        this.close();
        this.parent.display();

    }

}