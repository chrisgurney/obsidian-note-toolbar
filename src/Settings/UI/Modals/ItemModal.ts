import NoteToolbarPlugin from "main";
import { ButtonComponent, Modal, Platform, Setting } from "obsidian";
import { t, ToolbarItemSettings, ToolbarSettings } from "Settings/NoteToolbarSettings";
import ToolbarItemUi from "../Components/ToolbarItemUi";
import ToolbarSettingsModal from "./ToolbarSettingsModal";

export default class ItemModal extends Modal {

    private toolbarItemUi: ToolbarItemUi;

    constructor(
        public ntb: NoteToolbarPlugin, 
        toolbar: ToolbarSettings, 
        private toolbarItem: ToolbarItemSettings, 
        private parent?: ToolbarSettingsModal
    ) {
        super(ntb.app);
		this.ntb = ntb;
        this.toolbarItemUi = new ToolbarItemUi(this.ntb, this, toolbar);
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
        this.modalEl.addClass('note-toolbar-setting-modal-container');

		// update status of installed plugins so we can show available plugins and display errors if needed
        this.ntb.adapters.checkPlugins();

        let itemForm = this.toolbarItemUi.generateItemForm(this.toolbarItem);
        this.contentEl.append(itemForm);

        const doneButton = new Setting(this.contentEl)
            .addButton((btn: ButtonComponent) => {
                btn.setButtonText(t('setting.item.button-close'))
                    .setCta()
                    .setTooltip(t('setting.item.button-close-description'))
                    .onClick(async (event) => {
                        this.close();
                    });
            });
        doneButton.settingEl.addClass('note-toolbar-setting-no-border');

        // let user close modal with Cmd/Ctrl + Enter
        this.ntb.registerDomEvent(
            this.modalEl, 'keydown', async (e: KeyboardEvent) => {
                switch (e.key) {
                    case "Enter": {
                        const modifierPressed = (Platform.isWin || Platform.isLinux) ? e?.ctrlKey : e?.metaKey;
                        if (modifierPressed) {
                            this.close();
                        }
                        break;
                    }
                }
            }
        );

        // TODO: set initial keyboard focus?
    }

    getItemRowEl(uuid: string): HTMLElement {
        return this.contentEl;
    }

}