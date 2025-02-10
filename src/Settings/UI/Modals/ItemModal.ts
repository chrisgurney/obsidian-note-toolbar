import NoteToolbarPlugin from "main";
import { App, Modal } from "obsidian";
import { t, ToolbarItemSettings, ToolbarSettings } from "Settings/NoteToolbarSettings";
import ToolbarItemUi from "../ToolbarItemUi";

export default class ItemModal extends Modal {

    public plugin: NoteToolbarPlugin;

    private toolbarItem: ToolbarItemSettings;
    private toolbarItemUi: ToolbarItemUi;

    constructor(app: App, plugin: NoteToolbarPlugin, toolbar: ToolbarSettings, toolbarItem: ToolbarItemSettings) {
        super(app);
		this.plugin = plugin;
        this.toolbarItem = toolbarItem;
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
	 * Removes modal window and refreshes the parent settings window.
	 */
	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}

	/**
	 * Displays the item UI.
	 */
	public display() {
        this.contentEl.empty();
        let itemForm = this.toolbarItemUi.generateItemForm(this.toolbarItem);
        this.contentEl.append(itemForm);

        // TODO: set initial keyboard focus?
    }

    getItemRowEl(uuid: string): HTMLElement {
        return this.contentEl;
    }

}