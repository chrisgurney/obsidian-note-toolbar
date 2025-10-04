import { INoteToolbarApi } from "Api/INoteToolbarApi";

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

    // TODO: remove in next version; looks like it's now in official API
    // interface Command {
    //     checkCallback?: (checking: boolean) => boolean | void;
    //     editorCheckCallback?: (checking: boolean, editor: Editor, ctx: MarkdownView | MarkdownFileInfo) => boolean | void;
    // }

    // allows access to the path of the vault, for the {{vault_path}} var
    interface FileSystemAdapter extends DataAdapter{
        getBasePath(): string;
    }

    // allows access to Menu DOM, to add a class for styling
	interface Menu {
		dom: HTMLDivElement
	}

    // allows access to sub-menus, and setting warning style
    interface MenuItem {
        setSubmenu: () => Menu;
        // TODO: remove in next version; looks like it's now in official API
        // setWarning(warning: boolean): void;
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