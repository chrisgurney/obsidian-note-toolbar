import { getUUID } from "Utils/Utils";
import { PaneType } from "obsidian";

/* only update when settings structure changes to trigger migrations */
export const SETTINGS_VERSION = 20250313.1;
export const WHATSNEW_VERSION = 1.20;

/******************************************************************************
 * TRANSLATIONS
 * 
 * Language codes used by Obsidian per:
 * https://github.com/obsidianmd/obsidian-translations?tab=readme-ov-file#existing-languages
 ******************************************************************************/

import * as de from 'I18n/de.json';
import * as en from 'I18n/en.json';
import * as uk from 'I18n/uk.json';
import * as zh_CN from 'I18n/zh-CN.json';

i18next.addResourceBundle('de', 'plugin-note-toolbar', de); // load localized strings for German
i18next.addResourceBundle('en', 'plugin-note-toolbar', en); // load localized strings for English
i18next.addResourceBundle('uk', 'plugin-note-toolbar', uk); // load localized strings for Ukrainian
i18next.addResourceBundle('zh', 'plugin-note-toolbar', zh_CN); // load localized strings for Chinese Simplified

export const t = i18next.getFixedT(null, 'plugin-note-toolbar', null); // string translation function

// DOCUMENTATION TRANSLATIONS

import en_whatsnew from "I18n/en-whats-new.md";

i18next.addResourceBundle('en', 'plugin-note-toolbar-docs', { "whats-new": en_whatsnew });

export const tdocs = i18next.getFixedT(null, 'plugin-note-toolbar-docs', null); // string translation function

/******************************************************************************
 CONSTANTS
 ******************************************************************************/

export const COMMAND_PREFIX_TBAR = 'open-toolbar-';
export const COMMAND_PREFIX_ITEM = 'use-toolbar-item-';
export const VIEW_TYPE_GALLERY = 'ntb-gallery-view';
export const VIEW_TYPE_WHATS_NEW = 'ntb-whats-new-view';

export const EMPTY_TOOLBAR_ID = 'EMPTY_TOOLBAR';
export const GALLERY_DIVIDER_ID = 'GALLERY_DIVIDER';

export const IGNORE_PLUGIN_IDS = ['app', 'bookmarks', 'editor', 'file-explorer', 'global-search', 'link', 'markdown', 'note-toolbar', 'open-with-default-app', 'theme', 'workspace'];

/******************************************************************************
 TYPES
 ******************************************************************************/

export enum ComponentType {
	Icon = 'icon',
	Label = 'label'
}
export enum FileType {
	Audio = 'audio',
	Canvas = 'canvas',
	Image = 'image',
	Pdf = 'pdf',
	Video = 'video'
}
export enum ItemType {
	Break = 'break',
	Command = 'command',
	Dataview = 'dataview',
	File = 'file',
	Folder = 'folder',
	Group = 'group',
	JavaScript = 'javascript',
	JsEngine = 'js-engine',
	Menu = 'menu',
	Plugin = 'plugin', // used for Gallery items that rely on plugins
	Separator = 'separator',
	Templater = 'templater-obsidian',
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
	Bottom = 'bottom',
	FabLeft = 'fabl',
	FabRight = 'fabr',
	Hidden = 'hidden',
	Props = 'props',
	Top = 'top'
}
export enum RibbonAction {
	ItemSuggester = 'item-suggester',
	ToolbarSuggester = 'toolbar-suggester',
	Toolbar = 'toolbar'
}
export enum SettingType {
	Args = 'args',
	Command = 'command',
	File = 'file',
	Ignore = 'ignore',
	Script = 'script',
	Text = 'text',
	TextArea = 'textarea',
	Toolbar = 'toolbar',
}
export enum DefaultStyleType {
	Autohide = 'autohide',
	Border = 'border',
	Button = 'button',
	Center = 'center',
	Wide = 'wide',
	Left = 'left',
	Right = 'right',
	Between = 'between',
	Even = 'even',
	Sticky = 'sticky'
}
export enum MobileStyleType {
	Border = 'mbrder',
	NoBorder = 'mnbrder',
	Button = 'mbtn',
	Center = 'mctr',
	NoWide = 'mnwd',
	NoWrap = 'mnwrp',
	Wide = 'mwd',
	Left = 'mlft',
	Right = 'mrght',
	Between = 'mbtwn',
	Even = 'mevn',
	Sticky = 'mstcky',
	NoSticky = 'mnstcky'
}
export const MOBILE_STYLE_COMPLIMENTS: MobileStyleType[][] = [
	[MobileStyleType.Left, MobileStyleType.Center, MobileStyleType.Right],
	[MobileStyleType.Wide, MobileStyleType.NoWide],
	[MobileStyleType.Between, MobileStyleType.Even]
];

export const SettingFieldItemMap: Record<ItemType, SettingType> = {
	[ItemType.Break]: SettingType.Ignore,
	[ItemType.Command]: SettingType.Command,
	[ItemType.Dataview]: SettingType.Script,
	[ItemType.File]: SettingType.File,
	[ItemType.Folder]: SettingType.File,
	[ItemType.Group]: SettingType.Toolbar,
	[ItemType.JavaScript]: SettingType.Script,
	[ItemType.JsEngine]: SettingType.Script,
	[ItemType.Menu]: SettingType.Toolbar,
	[ItemType.Plugin]: SettingType.Ignore,
	[ItemType.Separator]: SettingType.Ignore,
	[ItemType.Uri]: SettingType.Text,
	[ItemType.Templater]: SettingType.Script
}
export enum ViewType {
	All = 'all',
	Preview = 'preview',
	Source = 'source'
}

export enum CalloutAttr {
    Command = 'data-command',
    CommandNtb = 'data-ntb-command', // for backwards-compatibility
	Dataview = 'data-dataview',
    Folder = 'data-folder',
    FolderNtb = 'data-ntb-folder', // for backwards-compatibility
	JavaScript = 'data-javascript',
	JsEngine = 'data-js-engine',
    Menu = 'data-menu',
    MenuNtb = 'data-ntb-menu', // for backwards-compatibility
	Templater = 'data-templater-obsidian',
}

export interface OnboardingState {
    [id: string]: boolean;
}

export enum ToolbarStyle {
	ItemFocused = 'tbar-item-focused'
}

export enum ErrorBehavior {
	Display = 'display',
	Report = 'report',
	Ignore = 'ignore'
}

export interface NoteToolbarSettings {
	emptyViewToolbar: string | null;
	export: ExportSettings;
	folderMappings: Array<FolderMapping>;
	icon: string;
	onboarding: OnboardingState;
	ribbonAction: RibbonAction;
	scriptingEnabled: boolean;
	showEditInFabMenu: boolean;
	showToolbarIn: Record<FileType, boolean>;
	showToolbarInFileMenu: boolean;
	toolbarProp: string;
	toolbars: Array<ToolbarSettings>;
	version: number;
	whatsnew_version: number;
}

export const DEFAULT_SETTINGS: NoteToolbarSettings = {
	emptyViewToolbar: null,
	export: {
		includeIcons: true,
		replaceVars: true,
		useDataEls: true,
		useIds: true,
	},
	folderMappings: [],
	icon: "circle-ellipsis",
	onboarding: {},
	ribbonAction: RibbonAction.Toolbar,
	scriptingEnabled: false,
	showEditInFabMenu: false,
	showToolbarIn: {
		audio: false,
		canvas: false,
		image: false,
		pdf: false,
		video: false
	},
	showToolbarInFileMenu: false,
	toolbarProp: "notetoolbar",
	toolbars: [],
	version: SETTINGS_VERSION,
	whatsnew_version: 0
}

export interface ExportSettings {
    includeIcons: boolean;
    replaceVars: boolean;
	useDataEls: boolean;
    useIds: boolean;
}

export interface ToolbarSettings {
	uuid: string;
	customClasses: string;
	defaultItem: string | null;
	defaultStyles: string[];
	hasCommand: boolean;
	items: Array<ToolbarItemSettings>;
	mobileStyles: string[];
	name: string;
	/**
	 * @deprecated positions property as of v1.7 (settings v20240426.1) and moved to desktop, tablet, mobile properties (in migration)
	 */
	positions?: Array<Position>;
	position: Position;
	updated: string;
}

export const DEFAULT_TOOLBAR_SETTINGS: ToolbarSettings = {
	uuid: getUUID(),
	customClasses: "",
	defaultItem: null,
	defaultStyles: [DefaultStyleType.Border, DefaultStyleType.Even, DefaultStyleType.Sticky],
	hasCommand: false,
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

export const EMPTY_TOOLBAR: ToolbarSettings = {
	uuid: EMPTY_TOOLBAR_ID,
	customClasses: '',
	defaultItem: null,
	defaultStyles: [],
	hasCommand: false,
	items: [], 
	mobileStyles: [],
	name: '',
	position: {},
	updated: ''
}

export const DEFAULT_ITEM_VISIBILITY_SETTINGS = {
	desktop: { allViews: { components: [ComponentType.Icon, ComponentType.Label] } },
	mobile: { allViews: { components: [ComponentType.Icon, ComponentType.Label] } },
	tablet: { allViews: { components: [ComponentType.Icon, ComponentType.Label] } }
}

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
	/**	@deprecated contexts property as of v1.7 (settings v20240426.1) and moved to visibility property (in migration) */
	contexts?: ViewContext[];
	description?: string;
	hasCommand: boolean;	
	icon: string;
	inGallery: boolean;
	label: string;
	link: string;
	linkAttr: ToolbarItemLinkAttr;
	/** Used for importing Gallery items that rely on plugins */
	plugin?: string | string[];
	scriptConfig?: ScriptConfig;
	tooltip: string;
	visibility: Visibility;
}

export const DEFAULT_ITEM_SETTINGS: ToolbarItemSettings = {
	uuid: '',
	hasCommand: false,
	icon: '',
	inGallery: false,
	label: '',
	link: '',
	linkAttr: {
		commandId: '',
		hasVars: false,
		type: ItemType.Command
	},
	tooltip: '',
	visibility: { ...DEFAULT_ITEM_VISIBILITY_SETTINGS },
}

export const ITEM_GALLERY_DIVIDER: ToolbarItemSettings = {
	uuid: GALLERY_DIVIDER_ID,
	hasCommand: false,
	icon: '',
	inGallery: true,
	label: '',
	link: '',
	linkAttr: {
		commandId: '',
		hasVars: false,
		type: ItemType.Separator
	},
	tooltip: '',
	visibility: DEFAULT_ITEM_VISIBILITY_SETTINGS
}

/**
 * Used to describe the type of url, for efficiency on toolbar render and click handling.
 */
export interface ToolbarItemLinkAttr {
	commandId: string;
	hasVars: boolean;
	target?: PaneType;
	type: ItemType;
};

/**
 * Describes the configuration for various script-type items. 
 */
export interface ScriptConfig {
	pluginFunction: string;
	libraryScriptId?: string;
	expression?: string;
	sourceFile?: string;
	sourceFunction?: string;
	sourceArgs?: string;
	outputContainer?: string;
	outputFile?: string;
	postCommand?: string;
};

/******************************************************************************
 UI STRINGS
 ******************************************************************************/

export const URL_FEEDBACK_FORM = 'https://docs.google.com/forms/d/e/1FAIpQLSeVWHVnookJr8HVQywk5TwupU-p7vkRkSt83Q5jscR6VwpZEQ/viewform';
export const URL_ISSUE_FORM = 'https://docs.google.com/forms/d/e/1FAIpQLSf_cABJLmNqPm-2DjH6vcxyuYKNoP-mmeyk8_vph8KMZHDSyg/viewform';
export const URL_RELEASES = 'https://github.com/chrisgurney/obsidian-note-toolbar/releases';
export const URL_USER_GUIDE = 'https://github.com/chrisgurney/obsidian-note-toolbar/wiki/';

export const COMMAND_DOES_NOT_EXIST = 'COMMAND_DOES_NOT_EXIST';

export const SCRIPT_ATTRIBUTE_MAP: Record<string, string> = {
    'expression': 'data-expr',
    'sourceFile': 'data-src',
    'sourceFunction': 'data-func',
    'sourceArgs': 'data-args',
    'outputContainer': 'data-callout',
    'outputFile': 'data-dest'
};

export const LINK_OPTIONS = {
	[ItemType.Command]: t('setting.item.option-command'),
	[ItemType.Dataview]: "Dataview",
	[ItemType.File]: t('setting.item.option-file'),
	[ItemType.Group]: t('setting.item.option-item-group'),
	[ItemType.Menu]: t('setting.item.option-item-menu'),
	[ItemType.JavaScript]: "JavaScript",
	[ItemType.JsEngine]: "JS Engine",
	[ItemType.Templater]: "Templater",
	[ItemType.Uri]: t('setting.item.option-uri')
}

export const POSITION_OPTIONS = {
	desktop: [
		{ [PositionType.Top]: t('setting.position.option-top') },
		{ [PositionType.Props]: t('setting.position.option-props') },
		{ [PositionType.Bottom]: t('setting.position.option-bottom') },
		{ [PositionType.FabLeft]: t('setting.position.option-fabl') },
		{ [PositionType.FabRight]: t('setting.position.option-fabr') },
		{ [PositionType.Hidden]: t('setting.position.option-hidden') },
	],
	mobile: [
		{ [PositionType.Top]: t('setting.position.option-top') },
		{ [PositionType.Props]: t('setting.position.option-props') },
		{ [PositionType.Bottom]: t('setting.position.option-bottom') },
		{ [PositionType.FabLeft]: t('setting.position.option-fabl') },
		{ [PositionType.FabRight]: t('setting.position.option-fabr') },
		{ [PositionType.Hidden]: t('setting.position.option-hidden-mobile') },
	]
}

export const RIBBON_ACTION_OPTIONS = {
	[RibbonAction.ItemSuggester]: t('setting.other.ribbon-action.option-item-suggester'),
	[RibbonAction.ToolbarSuggester]: t('setting.other.ribbon-action.option-toolbar-suggester'),
	[RibbonAction.Toolbar]: (t('setting.other.ribbon-action.option-toolbar')),
}

export const TARGET_OPTIONS = {
	'default': t('setting.item.option-target-default'),
	'tab': t('setting.item.option-target-tab'),
	'split': t('setting.item.option-target-split'),
	'window': t('setting.item.option-target-window')
}

/**
 * Each of these correlates to (style) metatdata that's matched in styles.css.
 */
export const DEFAULT_STYLE_OPTIONS: { [key: string]: string }[] = [
	{ [DefaultStyleType.Autohide]: t('setting.styles.option-autohide') },
    { [DefaultStyleType.Border]: t('setting.styles.option-border') },
	{ [DefaultStyleType.Button]: t('setting.styles.option-button') },
    { [DefaultStyleType.Center]: t('setting.styles.option-center') },
	{ [DefaultStyleType.Wide]: t('setting.styles.option-wide') },
    { [DefaultStyleType.Left]: t('setting.styles.option-left') },
    { [DefaultStyleType.Right]: t('setting.styles.option-right') },
	{ [DefaultStyleType.Between]: t('setting.styles.option-between') },
    { [DefaultStyleType.Even]: t('setting.styles.option-even') },
    { [DefaultStyleType.Sticky]: t('setting.styles.option-sticky') },
];

export const DEFAULT_STYLE_DISCLAIMERS: { [key: string]: string }[] = [
	{ [DefaultStyleType.Autohide]: t('setting.styles.option-autohide-disclaimer') },
	{ [DefaultStyleType.Sticky]: t('setting.styles.option-sticky-disclaimer') },
];

/**
 * Each of these correlates to (style) metatdata that's matched in styles.css.
 */
export const MOBILE_STYLE_OPTIONS: { [key: string]: string }[] = [
    { [MobileStyleType.Border]: t('setting.styles.option-border') },
    { [MobileStyleType.NoBorder]: t('setting.styles.option-noborder') },
	{ [MobileStyleType.Button]: t('setting.styles.option-button') },
    { [MobileStyleType.Center]: t('setting.styles.option-center') },
	{ [MobileStyleType.NoWide]: t('setting.styles.option-nowide') },
	{ [MobileStyleType.NoWrap]: t('setting.styles.option-nowrap') },
	{ [MobileStyleType.Wide]: t('setting.styles.option-wide') },
    { [MobileStyleType.Left]: t('setting.styles.option-left') },
    { [MobileStyleType.Right]: t('setting.styles.option-right') },
	{ [MobileStyleType.Between]: t('setting.styles.option-between') },
    { [MobileStyleType.Even]: t('setting.styles.option-even') },
    { [MobileStyleType.Sticky]: t('setting.styles.option-sticky') },
    { [MobileStyleType.NoSticky]: t('setting.styles.option-notsticky') },
];

export const MOBILE_STYLE_DISCLAIMERS: { [key: string]: string }[] = [
	{ [MobileStyleType.NoWrap]: t('setting.styles.option-nowrap-disclaimer') },
	{ [MobileStyleType.Sticky]: t('setting.styles.option-sticky-disclaimer') },
];