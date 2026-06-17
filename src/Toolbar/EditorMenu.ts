import NoteToolbarPlugin from "main";
import { Editor, Menu, MenuItem, Notice } from "obsidian";
import { PositionType, t } from "Settings/NoteToolbarSettings";
import { importFromCallout } from "Utils/ImportExport";
import { URLS } from "Utils/Urls";


export default class EditorMenu {

    constructor(
        private ntb: NoteToolbarPlugin
    ) {}

    async render(menu: Menu, editor: Editor) {

		// replace Editor menu with the selected toolbar
		if (this.ntb.settings.editorMenuToolbar) {
			// FIXME? should we check if the active file is what we're viewing? might be confusing otherwise
			const activeFile = this.ntb.app.workspace.getActiveFile();
			const toolbar = this.ntb.settingsManager.getToolbarById(this.ntb.settings.editorMenuToolbar);
			if (toolbar) {
				menu.items = [];
				if (this.ntb.settings.editorMenuAsToolbar) {
					const pointerPos = this.ntb.utils.getPosition('pointer');
					await this.ntb.render.renderFloatingToolbar(toolbar, pointerPos, PositionType.Floating);
				}
				else {
					// not replacing variables here, because we need to call it synchronously
					await this.ntb.render.renderMenuItems(menu, toolbar, activeFile, undefined, false);
				}
				return;
			}
			else {
				new Notice(t('setting.display-locations.option-editor-menu-error')).containerEl.addClass('mod-warning');
			}
		}
		// otherwise, add callout helper items to the standard Editor menu
		else {
			const selection = editor.getSelection().trim();
			const line = editor.getLine(editor.getCursor().line).trim();
			if (selection.includes('[!note-toolbar') || line.includes('[!note-toolbar')) {
				menu.addItem((item: MenuItem) => {
					item
						.setIcon('info')
						.setTitle(t('import.option-help'))
						.onClick(() => {
							window.open(`${URLS.GH_USER_GUIDE}/Note-Toolbar-Callouts`, '_blank');
						});
				});
			}
			if (selection.includes('[!note-toolbar')) {
				menu.addItem((item: MenuItem) => {
					item
						.setIcon('import')
						.setTitle(t('import.option-create'))
						.onClick(async () => {
							const [ toolbar, errorLog ] = importFromCallout(this.ntb, selection);
							if (!errorLog && toolbar) {
								await this.ntb.settingsManager.addToolbar(toolbar);
								this.ntb.commands.openToolbarSettingsForId(toolbar.uuid);
							}
						});
				});
			}
		}

    }

}