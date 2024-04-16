/* remember to update when settings structure changes */
export const SETTINGS_VERSION = 20240416.1;

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
	positions: Array<Position>;
	updated: string;
	// TODO: add setting to force rerender of toolbar? (for label variables)
}

export const DEFAULT_TOOLBAR_SETTINGS: ToolbarSettings = {
	defaultStyles: ["border","even","sticky"],
	items: [],
	mobileStyles: [],
	name: "",
	positions: [{position: 'props', contexts: [{platform: 'all', view: 'all'}]}],
	updated: new Date().toISOString(),
};

export interface Position {
	contexts: Array<ViewContext>;
	position: 'props' | 'top';
}

export interface ViewContext {
	platform: PlatformType;
	view: ViewType;
}

export type PlatformType = 'all' | 'desktop' | 'mobile' | 'none';
export type ViewType = 'all' | 'preview' | 'source';

export interface FolderMapping {
	folder: string;
	toolbar: string;
}

export interface ToolbarItemSettings {
	contexts: ViewContext[];
	icon: string;
	label: string;
	link: string;
	linkAttr: ToolbarItemLinkAttr;
	tooltip: string;
}

/**
 * Used to describe the type of url, for efficiency on toolbar render and click handling.
 */
export interface ToolbarItemLinkAttr {
	commandId: string;
	hasVars: boolean;
	type: LinkType;
};

export type LinkType = 'command' | 'file' | 'uri';

export const POSITION_OPTIONS: { [key: string]: string }[] = [
	{ top: "Top (fixed)" },
	{ props: "Below Properties" },
];

/**
 * Each of these correlates to (style) metatdata that's matched in styles.css.
 */
export const DEFAULT_STYLE_OPTIONS: { [key: string]: string }[] = [
    { border: "border" },
	{ button: "button" },
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
	{ mbtn: "button"},
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