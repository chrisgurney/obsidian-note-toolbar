import { INoteToolbarApi } from "Api/NoteToolbarApi";
import NoteToolbar from "main";

declare global {
    interface Window {
        NoteToolbarApi?: INoteToolbarApi;
        NoteToolbar?: NoteToolbar;
    }
}

declare module "obsidian" {
    // allows access to commands for execution
    interface App {
        commands: {
            executeCommandById: (id: string) => unknown;
            // listCommands: () => [{ id: string; name: string }];
            commands: Record<string, { name: string; id: string }>;
        };
    }
    // allows access to Menu DOM, to add a class for styling
	interface Menu {
		dom: HTMLDivElement
	}
	// interface Workspace {
    //     on(name: "note-toolbar:item-activated", callback: () => void, ctx?: any): EventRef;
    // }
}