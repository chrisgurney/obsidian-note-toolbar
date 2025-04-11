import NoteToolbarPlugin from "main";
import { App, ButtonComponent, Modal, Setting } from "obsidian";
import { t, ToolbarItemSettings, ToolbarSettings } from "Settings/NoteToolbarSettings";
import ToolbarItemUi from "../ToolbarItemUi";
import ToolbarSettingsModal from "./ToolbarSettingsModal";

export default class ItemModal extends Modal {

    public plugin: NoteToolbarPlugin;
    private toolbarItemUi: ToolbarItemUi;

    constructor(
        plugin: NoteToolbarPlugin, 
        toolbar: ToolbarSettings, 
        private toolbarItem: ToolbarItemSettings, 
        private parent?: ToolbarSettingsModal
    ) {
        super(plugin.app);
		this.plugin = plugin;
        this.toolbarItemUi = new ToolbarItemUi(this.plugin, this, toolbar);
    }

    /**
     * Displays the item UI within the modal window.
     */
    onOpen() {
        this.setTitle(t('setting.item.title'));
        this.display();
    }

	/**
	 * Removes modal window and refreshes the parent settings window if provided.
	 */
	onClose() {
		const { contentEl } = this;
		contentEl.empty();
        if (this.parent) this.parent.display();
	}

	/**
	 * Displays the item UI.
	 */
	public display() {
        this.contentEl.empty();
        let itemForm = this.toolbarItemUi.generateItemForm(this.toolbarItem);
        this.contentEl.append(itemForm);

        new Setting(this.contentEl)
            .addButton((btn: ButtonComponent) => {
                btn.setButtonText(t('setting.item.button-close'))
                    .setCta()
                    .setTooltip(t('setting.item.button-close-description'))
                    .onClick(async (event) => {
                        this.close();
                    });
            });

        // TODO: set initial keyboard focus?
    }

    getItemRowEl(uuid: string): HTMLElement {
        return this.contentEl;
    }

}