import NoteToolbarPlugin from "main";
import { Menu, TFile, Platform, MenuItem } from "obsidian";


export default class FileMenu {

    constructor(
        private ntb: NoteToolbarPlugin
    ) {}

    render(menu: Menu, file: TFile) {

		if (this.ntb.settings.showToolbarInFileMenu) {
			// don't bother showing in the file menu for the active file
			const activeFile = this.ntb.app.workspace.getActiveFile();
			if (activeFile && file !== activeFile) {
				const cache = this.ntb.app.metadataCache.getFileCache(file);
				if (cache) {
					const toolbar = this.ntb.settingsManager.getMappedToolbar(cache.frontmatter, file);
					if (toolbar) {
						// the submenu UI doesn't appear to work on mobile, render items in menu
						if (Platform.isMobile) {
							if (toolbar) void this.ntb.render.renderMenuItems(menu, toolbar, file, 1);
						}
						else {
							menu.addItem((item: MenuItem) => {
								item
									.setIcon(this.ntb.settings.icon)
									.setTitle(toolbar ? toolbar.name : '');
								const subMenu = item.setSubmenu();
								if (toolbar) void this.ntb.render.renderMenuItems(subMenu, toolbar, file);
							});
						}
					}
				}
			}
		}
		
    }

}