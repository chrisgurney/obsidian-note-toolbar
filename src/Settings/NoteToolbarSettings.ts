
export interface NoteToolbarSettings {
	toolbars: Array<ToolbarSettings>;
	folderMappings: Array<FolderMapping>;
	toolbarProp: string;
}

export const DEFAULT_SETTINGS: NoteToolbarSettings = {
	toolbars: [],
	folderMappings: [],
	toolbarProp: "notetoolbar"
}

export interface ToolbarSettings {
	name: string;
	updated: string;
	items: Array<ToolbarItemSettings>;
	styles: string[];
}

export const DEFAULT_TOOLBAR_SETTINGS: ToolbarSettings = {
	name: "",
	updated: new Date().toISOString(),
	items: [],
	styles: ["border","even","sticky"]
};

export interface FolderMapping {
	folder: string;
	toolbar: string;
}

export interface ToolbarItemSettings {
	label: string;
	url: string;
	tooltip: string;
	hideOnDesktop: boolean;
	hideOnMobile: boolean;
}