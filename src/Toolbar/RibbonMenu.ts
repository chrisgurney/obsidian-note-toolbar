import NoteToolbarPlugin from "main";
import { RibbonAction, ToolbarSettings } from "Settings/NoteToolbarSettings";


export default class RibbonMenu {

    constructor(
        private ntb: NoteToolbarPlugin
    ) {}

    async render(event: MouseEvent) {

        switch (this.ntb.settings.ribbonAction as RibbonAction) {
            case (RibbonAction.ItemSuggester): {
                await this.ntb.commands.openQuickTools();
                break;
            }
            case (RibbonAction.ToolbarSelected): {
                if (this.ntb.settings.ribbonToolbar) {
                    let toolbar = this.ntb.settingsManager.getToolbarById(this.ntb.settings.ribbonToolbar);
                    let activeFile = this.ntb.app.workspace.getActiveFile();
                    if (toolbar && activeFile) {
                        this.ntb.render.renderAsMenu(toolbar, activeFile, this.ntb.settings.showEditInFabMenu).then(menu => { 
                            menu.showAtPosition(event); 
                        });
                    }
                }
                break;
            }
            case (RibbonAction.ToolbarSuggester): {
                await this.ntb.commands.openToolbarSuggester();
                break;
            }
            case (RibbonAction.Toolbar): {
                let activeFile = this.ntb.app.workspace.getActiveFile();
                if (activeFile) {
                    let frontmatter = activeFile ? this.ntb.app.metadataCache.getFileCache(activeFile)?.frontmatter : undefined;
                    let toolbar: ToolbarSettings | undefined = this.ntb.settingsManager.getMappedToolbar(frontmatter, activeFile);
                    if (toolbar) {
                        this.ntb.render.renderAsMenu(toolbar, activeFile, this.ntb.settings.showEditInFabMenu).then(menu => { 
                            menu.showAtPosition(event); 
                        });
                    }
                }
                break;
            }
        }
        
    }

}