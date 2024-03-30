/* remember to update when settings structure changes */
export const SETTINGS_VERSION = 20240330.1;

export interface NoteToolbarSettings {
	folderMappings: Array<FolderMapping>;
	toolbarProp: string;
	toolbars: Array<ToolbarSettings>;
	version: number;
}

export const DEFAULT_SETTINGS: NoteToolbarSettings = {
	folderMappings: [],
	toolbarProp: "notetoolbar",
	toolbars: [],
	version: SETTINGS_VERSION,
}

export interface ToolbarSettings {
	defaultStyles: string[];
	items: Array<ToolbarItemSettings>;
	mobileStyles: string[];
	name: string;
	updated: string;
	// TODO: add setting to force rerender of toolbar? (for label variables)
}

export const DEFAULT_TOOLBAR_SETTINGS: ToolbarSettings = {
	defaultStyles: ["border","even","sticky"],
	items: [],
	mobileStyles: [],
	name: "",
	updated: new Date().toISOString(),
};

export interface FolderMapping {
	folder: string;
	toolbar: string;
}

export interface ToolbarItemSettings {
	hideOnDesktop: boolean;
	hideOnMobile: boolean;
	icon: string;
	label: string;
	link: string;
	linkAttr: ToolbarItemLinkAttr;
	/* used to describe the type of url, for efficiency on toolbar render and click handling */
	tooltip: string;
}

export interface ToolbarItemLinkAttr {
	commandId: string;
	hasVars: boolean;
	type: 'command' | 'note' | 'uri';
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