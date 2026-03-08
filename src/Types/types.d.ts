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
        internalPlugins: {
            getEnabledPluginById(id: string): any;
            getPluginById(id: string): any;
            plugins: Record<string, any>;
        };
        plugins: {
            plugins: Record<string, any>;
        };
        setting: {
            close(): void;
            open(): void;
            openTabById(id: string): void;
        }
    }

    /** internal chooser API used by SuggestModal */
    interface ChooserType<T> {
        values: T[];
        selectedItem: number;
        setSelectedItem(index: number, event: KeyboardEvent | boolean): void;
    }

    // allows access to the path of the vault, for the {{vault_path}} var
    interface FileSystemAdapter extends DataAdapter {
        getBasePath(): string;
    }

    // allows us to check if current view is in source mode
    interface ItemView {
        editMode: {
            sourceMode: boolean;
        }
    }

	interface Menu {
        // allows access to Menu DOM, to add a class for styling
		dom: HTMLDivElement
        // alows us to clear the Editor menu to replace it with a toolbar
        items: MenuItem[];
	}

    interface MenuItem {
        // allows access to MenuItem DOM, to set item IDs for styling
		dom: HTMLDivElement;
        // allows access to sub-menus, and setting warning style
        setSubmenu: () => Menu;
    }

    /** allows access to SuggestModal chooser, so keyboard navigation can skip Gallery divider */
    interface SuggestModal<T> {
        chooser: ChooserType<T>;
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