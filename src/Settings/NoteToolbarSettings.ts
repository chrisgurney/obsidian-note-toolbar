/* remember to update when settings structure changes */
export const SETTINGS_VERSION = 20240426.1;

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
	/**
	 * @deprecated positions property as of v1.7 (settings v20240426.1) and moved to desktop, tablet, mobile properties (in migration)
	 */
	positions?: Array<Position>;
	position: Position;
	updated: string;
	// TODO: add setting to force rerender of toolbar? (for label variables)
}

export const DEFAULT_TOOLBAR_SETTINGS: ToolbarSettings = {
	defaultStyles: ["border","even","sticky"],
	items: [],
	mobileStyles: [],
	name: "",
	position: {
		desktop: { allViews: { position: 'props' } },
		tablet: { allViews: { position: 'props' } },
		mobile: { allViews: { position: 'props' } },
	},
	updated: new Date().toISOString(),
};

export interface Position {
	desktop?: {
		allViews?: { position: PositionType },
		editingView?: { position: PositionType },
		readingView?: { position: PositionType },
	},
	tablet?: {
		allViews?: { position: PositionType },
		editingView?: { position: PositionType },
		readingView?: { position: PositionType },
	},
	mobile?: {
		allViews?: { position: PositionType },
		editingView?: { position: PositionType },
		readingView?: { position: PositionType },
	},
	/**
	 * @deprecated contexts property as of v1.7 (settings v20240426.1) and moved to desktop, tablet, mobile properties (in migration)
	 */
	contexts?: Array<ViewContext>;
	/**
	 * @deprecated position property as of v1.7 (settings v20240426.1) and moved to desktop, tablet, mobile properties (in migration)
	 */
	position?: 'props' | 'top';
}

export interface ViewContext {
	platform: PlatformType;
	view: ViewType;
}

export interface Visibility {
	desktop: {
		allViews?: { components: ComponentType[] }
		editingView?: { components: ComponentType[] },
		readingView?: { components: ComponentType[] }
	},
	tablet: {
		allViews?: { components: ComponentType[] }
		editingView?: { components: ComponentType[] },
		readingView?: { components: ComponentType[] }
	},
	mobile: {
		allViews?: { components: ComponentType[] }
		editingView?: { components: ComponentType[] },
		readingView?: { components: ComponentType[] }
	}
}

export interface ItemViewContext extends ViewContext {
	component: ComponentType;
}

export type PlatformType = 'all' | 'desktop' | 'tablet' | 'mobile' | 'none';
export type PositionType = 'hidden' | 'props' | 'top';
export type ViewType = 'all' | 'preview' | 'source';
export type ComponentType = 'icon' | 'label';

export interface FolderMapping {
	folder: string;
	toolbar: string;
}

export interface ToolbarItemSettings {
	/**
	 * @deprecated contexts property as of v1.7 (settings v20240426.1) and moved to visibility property (in migration)
	 */
	contexts?: ViewContext[];
	icon: string;
	label: string;
	link: string;
	linkAttr: ToolbarItemLinkAttr;
	tooltip: string;
	visibility: Visibility;
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
	{ hidden: "Hidden (do not display)" },
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