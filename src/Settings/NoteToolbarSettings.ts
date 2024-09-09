import { getUUID } from "Utils/Utils";
import * as en from 'I18n/en.json';
import * as uk from 'I18n/uk.json';
import * as zh_CN from 'I18n/zh-CN.json';
import * as de from 'I18n/de.json';

/* only update when settings structure changes to trigger migrations */
export const SETTINGS_VERSION = 20240727.1;

export const USER_GUIDE_URL = 'https://github.com/chrisgurney/obsidian-note-toolbar/wiki/';
export const RELEASES_URL = 'https://github.com/chrisgurney/obsidian-note-toolbar/releases';

/**
 * Setup translations
 * 
 * Language codes used by Obsidian per:
 * https://github.com/obsidianmd/obsidian-translations?tab=readme-ov-file#existing-languages
 */
export const t = i18next.getFixedT(null, 'plugin-note-toolbar', null); // string translation function
i18next.addResourceBundle('en', 'plugin-note-toolbar', en); // load localized strings for English
i18next.addResourceBundle('uk', 'plugin-note-toolbar', uk); // load localized strings for Ukrainian
i18next.addResourceBundle('zh', 'plugin-note-toolbar', zh_CN); // load localized strings for Chinese Simplified
i18next.addResourceBundle('de', 'plugin-note-toolbar', de); // load localized strings for German

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

/******************************************************************************
 UI STRINGS
 ******************************************************************************/

export const LINK_OPTIONS = {
	[ItemType.Command]: t('setting.item.option-command'),
	[ItemType.File]: t('setting.item.option-file'),
	[ItemType.Group]: t('setting.item.option-item-group'),
	[ItemType.Menu]: t('setting.item.option-item-menu'),
	[ItemType.Uri]: t('setting.item.option-uri')
}

export const POSITION_OPTIONS = {
	desktop: [
		{ top: t('setting.position.option-top') },
		{ props: t('setting.position.option-props') },
		{ fabl: t('setting.position.option-fabl') },
		{ fabr: t('setting.position.option-fabr') },
		{ hidden: t('setting.position.option-hidden') },
	],
	mobile: [
		{ top: t('setting.position.option-top') },
		{ props: t('setting.position.option-props') },
		{ fabl: t('setting.position.option-fabl') },
		{ fabr: t('setting.position.option-fabr') },
		{ hidden: t('setting.position.option-hidden-mobile') },
	]
}

/**
 * Each of these correlates to (style) metatdata that's matched in styles.css.
 */
export const DEFAULT_STYLE_OPTIONS: { [key: string]: string }[] = [
	{ autohide: t('setting.styles.option-autohide') },
    { border: t('setting.styles.option-border') },
	{ button: t('setting.styles.option-button') },
    { center: t('setting.styles.option-center') },
	{ wide: t('setting.styles.option-wide') },
    { floatl: t('setting.styles.option-floatl') },
    { floatr: t('setting.styles.option-floatr') },
    { left: t('setting.styles.option-left') },
    { right: t('setting.styles.option-right') },
	{ between: t('setting.styles.option-between') },
    { even: t('setting.styles.option-even') },
    { sticky: t('setting.styles.option-sticky') },
];

export const DEFAULT_STYLE_DISCLAIMERS: { [key: string]: string }[] = [
	{ autohide: t('setting.styles.option-autohide-disclaimer') },
	{ floatl: t('setting.styles.option-floatl-disclaimer') },
	{ floatr: t('setting.styles.option-floatr-disclaimer') },
	{ sticky: t('setting.styles.option-sticky-disclaimer') },
	{ wide: t('setting.styles.option-wide-disclaimer') },
];

/**
 * Each of these correlates to (style) metatdata that's matched in styles.css.
 */
export const MOBILE_STYLE_OPTIONS: { [key: string]: string }[] = [
    { mbrder: t('setting.styles.option-border') },
    { mnbrder: t('setting.styles.option-noborder') },
	{ mbtn: t('setting.styles.option-button') },
    { mctr: t('setting.styles.option-center') },
	{ mnwd: t('setting.styles.option-nowide') },
	{ mnwrp: t('setting.styles.option-nowrap') },
	{ mwd: t('setting.styles.option-wide') },
    { mfltl: t('setting.styles.option-floatl') },
    { mfltr: t('setting.styles.option-floatr') },
    { mnflt: t('setting.styles.option-nofloat') },
    { mlft: t('setting.styles.option-left') },
    { mrght: t('setting.styles.option-right') },
	{ mbtwn: t('setting.styles.option-between') },
    { mevn: t('setting.styles.option-even') },
    { mstcky: t('setting.styles.option-sticky') },
    { mnstcky: t('setting.styles.option-notsticky') },
];

export const MOBILE_STYLE_DISCLAIMERS: { [key: string]: string }[] = [
	{ mfltl: t('setting.styles.option-floatl-disclaimer') },
	{ mfltr: t('setting.styles.option-floatr-disclaimer') },
	{ mnwrp: t('setting.styles.option-nowrap-disclaimer') },
	{ mstcky: t('setting.styles.option-sticky-disclaimer') },
	{ mnwd:  t('setting.styles.option-nowide-disclaimer') },
	{ mwd: t('setting.styles.option-wide-disclaimer') },
];
