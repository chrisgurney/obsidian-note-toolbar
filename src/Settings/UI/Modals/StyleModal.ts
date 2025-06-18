import NoteToolbarPlugin from "main";
import { App, ButtonComponent, Modal, Platform, Setting } from "obsidian";
import { t, ToolbarSettings } from "Settings/NoteToolbarSettings";
import ToolbarStyleUi from "../ToolbarStyleUi";


export default class StyleModal extends Modal {

    public plugin: NoteToolbarPlugin;
    public toolbar: ToolbarSettings;

    constructor(app: App, plugin: NoteToolbarPlugin, toolbar: ToolbarSettings) {
        super(app);
		this.plugin = plugin;
		this.toolbar = toolbar;
    }

	/**
	 * Displays the toolbar's Style UI within the modal window.
	 */
	onOpen() {
        this.setTitle(t('setting.styles.title', { toolbar: this.toolbar.name }));
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
	 * Displays the toolbar's Style UI.
	 */
	public display() {

        this.contentEl.empty();
		this.modalEl.addClass('note-toolbar-setting-modal-container');
		this.modalEl.addClass('note-toolbar-setting-modal-phone-inset-fix');
		
        const toolbarStyleUi = new ToolbarStyleUi(this.plugin, this, this.toolbar);
        toolbarStyleUi.displayStyleSetting(this.contentEl);

		new Setting(this.contentEl)
			.addButton((btn: ButtonComponent) => {
				btn.setButtonText(t('setting.styles.button-close'))
					.setCta()
					.setTooltip(t('setting.styles.button-close-description'))
					.onClick(async (event) => {
						this.close();
					});
			});
			
		// set initial keyboard focus on the relvant dropdown
		if (Platform.isDesktop) {
			setTimeout(() => {
				const dropdown = this.contentEl.querySelector(`#default-style-dropdown > select`) as HTMLElement;
				dropdown.focus();
			}, 50);
		}
    }

}