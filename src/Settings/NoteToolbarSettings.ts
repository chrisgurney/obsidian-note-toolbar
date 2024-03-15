
export interface NoteToolbarSettings {
	toolbars: Array<ToolbarSettings>;
	folder_mappings: Array<FolderMapping>;
}

export const DEFAULT_SETTINGS: NoteToolbarSettings = {
	toolbars: [],
	folder_mappings: []
}

export interface ToolbarSettings {
	name: string;
	updated: string;
	items: Array<ToolbarItemSettings>;
}

export const DEFAULT_TOOLBAR_SETTINGS: ToolbarSettings = {
	name: "",
	updated: new Date().toISOString(),
	items: []
};

export interface FolderMapping {
	folder: string;
	toolbar: string;
}

export interface ToolbarItemSettings {
	label: string;
	url: string;
	tooltip: string;
	hide_on_desktop: boolean;
	hide_on_mobile: boolean;
}