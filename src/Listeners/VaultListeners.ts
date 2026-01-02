import NoteToolbarPlugin from "main";
import { TFile } from "obsidian";
import { ToolbarItemSettings, ToolbarSettings } from "Settings/NoteToolbarSettings";


export default class VaultListeners {

    constructor(
        private ntb: NoteToolbarPlugin
    ) {}

    register() {
        this.ntb.registerEvent(this.ntb.app.vault.on('rename', this.onFileRename));
    }

    /**
     * On rename of file, update any item links that reference the old name.
     * @param file TFile of the new file.
     * @param oldPath old path.
     */
    onFileRename = async (file: TFile, oldPath: string) => {
        this.ntb.debugGroup('onFileRename');
        let settingsChanged = false;
        this.ntb.settings.toolbars.forEach((toolbar: ToolbarSettings) => {
            toolbar.items.forEach((item: ToolbarItemSettings) => {
                if (item.link === oldPath) {
                    this.ntb.debug('changing', item.link, 'to', file.path);
                    item.link = file.path;
                    settingsChanged = true;
                }
                if (item.scriptConfig?.sourceFile === oldPath) {
                    this.ntb.debug('changing', item.scriptConfig?.sourceFile, 'to', file.path);
                    item.scriptConfig.sourceFile = file.path;
                    settingsChanged = true;
                }
            });
        });
        this.ntb.debugGroupEnd();
        if (settingsChanged) await this.ntb.settingsManager.save();
    }

}