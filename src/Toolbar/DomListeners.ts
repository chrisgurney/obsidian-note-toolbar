import NoteToolbarPlugin from "main";
import { WorkspaceWindow } from "obsidian";


export default class DomListeners {

    constructor(
        private ntb: NoteToolbarPlugin
    ) {}

    onClick = (event: MouseEvent) => {
        const target = event.target as HTMLElement;
        if (!target.matches('.cg-note-toolbar-container')) {
            this.ntb.render.removeFocusStyle();
        }
        this.ntb.items.calloutLinkHandler(event);
    }

    onMouseMove = (event: MouseEvent) => {
        this.ntb.render.pointerX = event.clientX;
        this.ntb.render.pointerY = event.clientY;
    }

	onWindowOpen = (window: WorkspaceWindow) => {
		this.ntb.registerDomEvent(window.doc, 'click', (event: MouseEvent) => {
			this.ntb.items.calloutLinkHandler(event);
		});
	}

}