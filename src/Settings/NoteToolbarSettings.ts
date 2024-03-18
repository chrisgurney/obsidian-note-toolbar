
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

export const DEFAULT_STYLE_OPTIONS = [
    { border: "border" },
	{ noborder: "no border" },
    { center: "center" },
    { even: "even" },
    { floatl: "float left" },
    { floatr: "float right" },
    { nofloat: "no float" },
    { left: "left" },
    { right: "right" },
    { sticky: "sticky" },
    { nosticky: "not sticky" },
];

export const MOBILE_STYLE_OPTIONS = [
    { mbrder: "border" },
    { mnbrder: "no border" },
    { mctr: "center" },
    { mevn: "even" },
    { mfltl: "float left" },
    { mfltr: "float right" },
    { mnflt: "no float" },
    { mlft: "left" },
    { mrght: "right" },
    { mstcky: "sticky" },
    { mnstcky: "not sticky" },
];