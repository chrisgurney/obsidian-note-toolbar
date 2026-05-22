import NoteToolbarPlugin from "main";
import { RibbonAction, ToolbarSettings } from "Settings/NoteToolbarSettings";


export default class RibbonMenu {

    constructor(
        private ntb: NoteToolbarPlugin
    ) {}

    async render(event: MouseEvent) {

        switch (this.ntb.settings.ribbonAction) {
            case (RibbonAction.ItemSuggester): {
                this.ntb.commands.openQuickTools();
                break;
            }
            case (RibbonAction.ToolbarSelected): {
                if (this.ntb.settings.ribbonToolbar) {
                    const toolbar = this.ntb.settingsManager.getToolbarById(this.ntb.settings.ribbonToolbar);
                    const activeFile = this.ntb.app.workspace.getActiveFile();
                    if (toolbar && activeFile) {
                        await this.ntb.render.renderAsMenu(toolbar, activeFile, this.ntb.settings.showEditInFabMenu).then(menu => { 
                            menu.showAtPosition(event); 
                        });
                    }
                }
                break;
            }
            case (RibbonAction.ToolbarSuggester): {
                this.ntb.commands.openToolbarSuggester();
                break;
            }
            case (RibbonAction.Toolbar): {
                const activeFile = this.ntb.app.workspace.getActiveFile();
                if (activeFile) {
                    const frontmatter = activeFile ? this.ntb.app.metadataCache.getFileCache(activeFile)?.frontmatter : undefined;
                    const toolbar: ToolbarSettings | undefined = this.ntb.settingsManager.getMappedToolbar(frontmatter, activeFile);
                    if (toolbar) {
                        await this.ntb.render.renderAsMenu(toolbar, activeFile, this.ntb.settings.showEditInFabMenu).then(menu => { 
                            menu.showAtPosition(event); 
                        });
                    }
                }
                break;
            }
        }
        
    }

}