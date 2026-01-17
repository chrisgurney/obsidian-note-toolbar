import NoteToolbarPlugin from "main";
import { WorkspaceWindow } from "obsidian";


export default class CalloutListeners {

    constructor(
        private ntb: NoteToolbarPlugin
    ) {}

    register() {
        this.ntb.registerEvent(this.ntb.app.workspace.on('window-open', this.onWindowOpen));
        this.ntb.registerDomEvent(activeDocument, 'click', this.onClick);
    }

    onClick = async (event: MouseEvent) => {
        const target = event.target as HTMLElement;
        const isToolbar = (target.closest('.cg-note-toolbar-container') !== null);
        const isNtbCallout = !isToolbar && (target.closest('.callout[data-callout="note-toolbar"]') !== null);
        if (isNtbCallout) {
            this.ntb.render.removeFocusStyle();
            await this.ntb.callouts.calloutLinkHandler(event);
        }
    }

	onWindowOpen = (window: WorkspaceWindow) => {
		this.ntb.registerDomEvent(window.doc, 'click', (event: MouseEvent) => {
			this.ntb.callouts.calloutLinkHandler(event);
		});
	}

}