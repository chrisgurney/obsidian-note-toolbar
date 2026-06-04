import INoteToolbarApi from "Api/INoteToolbarApi";

declare const DataAdapter: unknown;
declare const KeymapInfo: unknown;

declare global {
    
    interface Window {
        ntb?: INoteToolbarApi<unknown>;
    }

    // provides access to Obsidian's translation framework
    let i18next: {
        createInstance(options?: object): typeof i18next;
        init(options?: object): Promise<void>;
        getFixedT(lng: string | null, ns: string | null, keyPrefix?: string | null): (key: string, ...args: unknown[]) => string;
        language: string;
        t: (key: string, ...args: unknown[]) => string;
    };

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
            getEnabledPluginById(id: string): Plugin;
            getPluginById(id: string): Plugin;
            plugins: Record<string, { enabled?: boolean }>;
        };
        plugins: {
            plugins: Record<string, Plugin>;
        };
        setting: {
            close(): void;
            open(): void;
            openTabById(id: string): SettingTab;
        }
    }

    // interface CanvasView extends TextFileView {
    //     canvas: {
    //         // allows us to update viewport dimension cache of the CanvasView
    //         onResize: () => void;
    //     }
    // }

    /** internal chooser API used by SuggestModal */
    interface ChooserType<T> {
        values: T[];
        selectedItem: number;
        setSelectedItem(index: number, event: KeyboardEvent | boolean): void;
        useSelectedItem(evt: MouseEvent | KeyboardEvent): void;
    }

    interface Editor {
        cm: unknown;
    }

    interface FileExplorerPlugin extends Plugin {
        revealInFolder(fileFolder: TFile | TFolder): void;
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

    interface SettingTab {
        /** allows setting the search query for the settings tab (e.g., hotkeys) */
        setQuery?: (query: string) => void;
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

    interface WebViewerPlugin extends Plugin {
        instance: Plugin & { options: { openExternalURLs: boolean } };
    }

    interface WorkspaceItem {
        // allows access to leaf's container element, for DOM queries (in current view mode)
        containerEl: HTMLDivElement;
        // allows access to leaf's ID, to help uniquely identify note views
        id: string;
    }

    interface WorkspacesPlugin extends Plugin {
        instance: Plugin & { activeWorkspace: string };
    }

}