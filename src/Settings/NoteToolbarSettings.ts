
export interface NoteToolbarSettings {
	toolbars: Array<ToolbarSettings>;
}

export const DEFAULT_SETTINGS: NoteToolbarSettings = {
	toolbars: []
}

export interface ToolbarSettings {
	name: string;
	updated: string;
	toolbar: Array<ToolbarItemSettings>;
}

export const DEFAULT_TOOLBAR_SETTINGS: ToolbarSettings = {
	name: "",
	updated: new Date().toISOString(),
	toolbar: [{ label: "", url: "", tooltip: "", hide_on_desktop: false, hide_on_mobile: false }]
};

export interface ToolbarItemSettings {
	label: string;
	url: string;
	tooltip: string;
	hide_on_desktop: boolean;
	hide_on_mobile: boolean;
}