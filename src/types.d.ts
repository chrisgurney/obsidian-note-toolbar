import { INoteToolbarApi } from "Api/NoteToolbarApi";
import NoteToolbar from "main";

declare global {
    
    interface Window {
        NoteToolbar?: INoteToolbarApi<any>;
    }

    // provides access to Obsidian's translation framework
    let i18next: any;

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

    // allows access to sub-menus, and setting warning style
    interface MenuItem {
        setSubmenu: () => Menu;
        setWarning(warning: boolean): void;
    }

    interface Vault {
        getConfig(setting: string): string;
    }

	// interface Workspace {
    //     on(name: "note-toolbar:item-activated", callback: () => void, ctx?: any): EventRef;
    // }

    // allows access to leaf's ID, to help uniquely identify note views
    interface WorkspaceItem {
        id: string;
    }

}