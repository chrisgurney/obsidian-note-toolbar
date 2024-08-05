import { getUUID } from "Utils/Utils";

/* remember to update when settings structure changes */
export const SETTINGS_VERSION = 20240727.1;

export enum ComponentType {
	Icon = 'icon',
	Label = 'label'
}
export enum ItemType {
	Break = 'break',
	Command = 'command',
	File = 'file',
	Group = 'group',
	Menu = 'menu',
	Separator = 'separator',
	Uri = 'uri'
}
export enum PlatformType {
	All = 'all',
	Desktop = 'desktop',
	Tablet = 'tablet',
	Mobile = 'mobile',
	None = 'none'
}
export enum PositionType {
	FabLeft = 'fabl',
	FabRight = 'fabr',
	Hidden = 'hidden',
	Props = 'props',
	Top = 'top'
}
export enum ViewType {
	All = 'all',
	Preview = 'preview',
	Source = 'source'
}

export enum CalloutAttr {
	Break = 'data-ntb-break',
    Command = 'data-ntb-command',
    Folder = 'data-ntb-folder',
    Menu = 'data-ntb-menu',
	Separator = 'data-ntb-sep'
}

export interface NoteToolbarSettings {
	folderMappings: Array<FolderMapping>;
	icon: string;
	showEditInFabMenu: boolean;
	toolbarProp: string;
	toolbars: Array<ToolbarSettings>;
	version: number;
}

export const DEFAULT_SETTINGS: NoteToolbarSettings = {
	folderMappings: [],
	icon: "circle-ellipsis",
	showEditInFabMenu: false,
	toolbarProp: "notetoolbar",
	toolbars: [],
	version: SETTINGS_VERSION,
}

export interface ToolbarSettings {
	uuid: string;
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
	uuid: getUUID(),
	defaultStyles: ["border","even","sticky"],
	items: [],
	mobileStyles: [],
	name: "",
	position: {
		desktop: { allViews: { position: PositionType.Props } },
		tablet: { allViews: { position: PositionType.Props } },
		mobile: { allViews: { position: PositionType.Props } },
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
	position?: PositionType.Props | PositionType.Top;
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

export interface FolderMapping {
	folder: string;
	toolbar: string;
}

export interface ToolbarItemSettings {
	uuid: string;
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
	type: ItemType;
};

export const LINK_OPTIONS = {
	[ItemType.Command]: "Command",
	[ItemType.File]: "File",
	[ItemType.Menu]: "Item Menu",
	[ItemType.Uri]: "URI"
}

export const POSITION_OPTIONS = {
	desktop: [
		{ top: "Top (fixed)" },
		{ props: "Below Properties" },
		{ fabl: "Floating button: left" },
		{ fabr: "Floating button: right" },
		{ hidden: "Hidden (do not display)" },
	],
	mobile: [
		{ top: "Top (fixed)" },
		{ props: "Below Properties" },
		{ fabl: "Floating button: left" },
		{ fabr: "Floating button: right" },
		{ hidden: "Hidden / Navigation bar" },
	]
}

/**
 * Each of these correlates to (style) metatdata that's matched in styles.css.
 */
export const DEFAULT_STYLE_OPTIONS: { [key: string]: string }[] = [
	{ autohide: "auto-hide*" },
    { border: "border" },
	{ button: "button" },
    { noborder: "no border" },
    { center: "center items" },
	{ between: "space between items" },
    { even: "space items evenly" },
    { left: "left align items" },
    { right: "right align items" },
    { sticky: "sticky*" },
    { nosticky: "not sticky" },
    { floatl: "float left*" },
    { floatr: "float right*" },
    { nofloat: "no float" },
];

export const DEFAULT_STYLE_DISCLAIMERS: { [key: string]: string }[] = [
	{ autohide: "Auto-hide does not apply on mobile." },
	{ floatl: "Float left only works within callouts." },
	{ floatr: "Float right only works within callouts." },
	{ sticky: "Sticky does not apply in Reading mode." },
];

/**
 * Each of these correlates to (style) metatdata that's matched in styles.css.
 */
export const MOBILE_STYLE_OPTIONS: { [key: string]: string }[] = [
    { mbrder: "border" },
	{ mbtn: "button"},
    { mnbrder: "no border" },
    { mctr: "center items" },
	{ mbtwn: "space between items" },
    { mevn: "space items evenly" },
    { mlft: "left align items" },
    { mrght: "right align items" },
    { mstcky: "sticky*" },
    { mnstcky: "not sticky" },
	{ mnwrp: "don't wrap items*" },
    { mfltl: "float left*" },
    { mfltr: "float right*" },
    { mnflt: "no float" },
];

export const MOBILE_STYLE_DISCLAIMERS: { [key: string]: string }[] = [
	{ mfltl: "Float left only works within callouts." },
	{ mfltr: "Float right only works within callouts." },
	{ mnwrp: "Works best if items are not evenly spaced or centered." },
	{ mstcky: "Sticky does not apply in Reading mode." },
];