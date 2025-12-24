import INoteToolbarApi from "Api/INoteToolbarApi";
/* globals DataAdapter, KeymapInfo */

declare global {
    
    interface Window {
        ntb?: INoteToolbarApi<any>;
    }

    // provides access to Obsidian's translation framework
    let i18next: any;

}

declare module "obsidian" {

    export function getLanguage(): string;

    // allows access to commands for execution
    interface App {
        commands: {
            executeCommandById: (id: string) => unknown;
            // listCommands: () => [{ id: string; name: string }];
            commands: Record<string, { name: string; id: string }>;
        };
        hotkeyManager: {
            getHotkeys(command: string): KeymapInfo[];
        };
    }

    // allows access to the path of the vault, for the {{vault_path}} var
    interface FileSystemAdapter extends DataAdapter {
        getBasePath(): string;
    }

    // allows access to Menu DOM, to add a class for styling
	interface Menu {
		dom: HTMLDivElement
	}

    // allows access to sub-menus, and setting warning style
    interface MenuItem {
        setSubmenu: () => Menu;
    }

    interface Vault {
        getConfig(setting: string): string;
    }

	// interface Workspace {
    //     on(name: "note-toolbar:item-activated", callback: () => void, ctx?: any): EventRef;
    // }

    interface WorkspaceItem {
        // allows access to leaf's container element, for DOM queries (in current view mode)
        containerEl: HTMLDivElement;
        // allows access to leaf's ID, to help uniquely identify note views
        id: string;
    }

}