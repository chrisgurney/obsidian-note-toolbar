/* remember to update when settings structure changes */
export const SETTINGS_VERSION = 20240322.1;

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
	// TODO: add setting to force rerender of toolbar (for label variables)
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
	/* used to describe the type of url, for efficiency on toolbar render and click handling */
	urlAttr: ToolbarItemUrlAttr;
	tooltip: string;
	hideOnDesktop: boolean;
	hideOnMobile: boolean;
}

export interface ToolbarItemUrlAttr {
	hasVars: boolean;
	isUri: boolean;
};

/**
 * Each of these correlates to (style) metatdata that's matched in styles.css.
 */
export const DEFAULT_STYLE_OPTIONS: { [key: string]: string }[] = [
    { border: "border" },
	{ noborder: "no border" },
    { center: "center items" },
    { even: "evenly space items" },
    { left: "left align items" },
    { right: "right align items" },
    { sticky: "sticky" },
    { nosticky: "not sticky" },
    { floatl: "float left" },
    { floatr: "float right" },
    { nofloat: "no float" },
];

/**
 * Each of these correlates to (style) metatdata that's matched in styles.css.
 */
export const MOBILE_STYLE_OPTIONS: { [key: string]: string }[] = [
    { mbrder: "border" },
    { mnbrder: "no border" },
    { mctr: "center items" },
    { mevn: "evenly space items" },
    { mlft: "left align items" },
    { mrght: "right align items" },
    { mstcky: "sticky" },
    { mnstcky: "not sticky" },
    { mfltl: "float left" },
    { mfltr: "float right" },
    { mnflt: "no float" },
];