import NoteToolbarPlugin from "main";
import { WorkspaceWindow } from "obsidian";


export default class DomListeners {

    constructor(
        private ntb: NoteToolbarPlugin
    ) {}

    onClick = async (event: MouseEvent) => {
        const target = event.target as HTMLElement;
        if (!target.matches('.cg-note-toolbar-container')) {
            this.ntb.render.removeFocusStyle();
        }
        await this.ntb.items.calloutLinkHandler(event);
    }

	onWindowOpen = (window: WorkspaceWindow) => {
		this.ntb.registerDomEvent(window.doc, 'click', (event: MouseEvent) => {
			this.ntb.items.calloutLinkHandler(event);
		});
	}

}