
export interface NoteToolbarSettings {
	toolbars: Array<ToolbarSettings>;
}

export const DEFAULT_SETTINGS: NoteToolbarSettings = {
	toolbars: []
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

export interface ToolbarItemSettings {
	label: string;
	url: string;
	tooltip: string;
	hide_on_desktop: boolean;
	hide_on_mobile: boolean;
}