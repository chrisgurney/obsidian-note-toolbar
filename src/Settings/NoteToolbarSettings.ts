
export const SETTINGS_VERSION = 20240318.1;

export interface NoteToolbarSettings {
	version: number;
	toolbars: Array<ToolbarSettings>;
	folderMappings: Array<FolderMapping>;
	toolbarProp: string;
}

export const DEFAULT_SETTINGS: NoteToolbarSettings = {
	version: SETTINGS_VERSION,
	toolbars: [],
	folderMappings: [],
	toolbarProp: "notetoolbar"
}

export interface ToolbarSettings {
	name: string;
	updated: string;
	items: Array<ToolbarItemSettings>;
	defaultStyles: string[];
	mobileStyles: string[];
}

export const DEFAULT_TOOLBAR_SETTINGS: ToolbarSettings = {
	name: "",
	updated: new Date().toISOString(),
	items: [],
	defaultStyles: ["border","even","sticky"],
	mobileStyles: [],
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

/**
 * Each of these correlates to (style) metatdata that's matched in styles.css.
 */
export const DEFAULT_STYLE_OPTIONS: { [key: string]: string }[] = [
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

/**
 * Each of these correlates to (style) metatdata that's matched in styles.css.
 */
export const MOBILE_STYLE_OPTIONS: { [key: string]: string }[] = [
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