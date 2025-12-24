import { getUUID } from "Utils/Utils";
import { getLanguage, PaneType } from "obsidian";

/* updates link to plugin's release notes and displays What's New view */
export const WHATSNEW_VERSION = '1.27';

/* only update when settings structure changes to trigger migrations */
export const SETTINGS_VERSION = 20250313.1;

// *****************************************************************************
// #region TRANSLATIONS
// 
// Language codes used by Obsidian per:
// https://github.com/obsidianmd/obsidian-translations?tab=readme-ov-file#existing-languages
// *****************************************************************************

import * as de from 'I18n/de.json';
import * as en from 'I18n/en.json';
import * as ja from 'I18n/ja.json';
import * as uk from 'I18n/uk.json';
import * as zh_CN from 'I18n/zh-CN.json';

/* create a new i18next instance that will be garbage-collected once the plugin was unloaded */
const Locales = i18next.createInstance({
	lng: getLanguage(),
	fallbackLng: 'en',
	resources: {
		de: { 'plugin-note-toolbar': de }, // German
		en: { 'plugin-note-toolbar': en }, // English
		ja: { 'plugin-note-toolbar': ja }, // Japanese
		uk: { 'plugin-note-toolbar': uk }, // Ukrainian
		zh: { 'plugin-note-toolbar': zh_CN } // Chinese Simplified
	}
});

Locales.init();

export const t = Locales.getFixedT(null, 'plugin-note-toolbar', null); // string translation function

//#endregion

// *****************************************************************************
// #region CONSTANTS
//******************************************************************************

export const COMMAND_PREFIX_TBAR = 'open-toolbar-';
export const COMMAND_PREFIX_ITEM = 'use-toolbar-item-';
export const VIEW_TYPE_GALLERY = 'ntb-gallery-view';
export const VIEW_TYPE_HELP = 'ntb-help-view';
export const VIEW_TYPE_TIP = 'ntb-tip-view';
export const VIEW_TYPE_WHATS_NEW = 'ntb-whats-new-view';

export const EMPTY_TOOLBAR_ID = 'EMPTY_TOOLBAR';
export const GALLERY_DIVIDER_ID = 'GALLERY_DIVIDER';

export const CORE_PLUGIN_IDS = ['bookmarks', 'daily-notes', 'file-explorer', 'global-search', 'workspace'];
export const IGNORE_PLUGIN_IDS = ['app', 'bookmarks', 'editor', 'file-explorer', 'global-search', 'link', 'markdown', 'note-toolbar', 'open-with-default-app', 'theme', 'workspace'];

// #endregion

// *****************************************************************************
// #region TYPES
// *****************************************************************************

export const enum ComponentType {
	Icon = 'icon',
	Label = 'label'
}
export const enum FileType {
	Audio = 'audio',
	Bases = 'bases',
	Canvas = 'canvas',
	Image = 'image',
	Kanban = 'kanban',
	Pdf = 'pdf',
	Video = 'video'
}
// note: can't make this a constant as it's used in Object.values()
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
export const enum PlatformType {
	All = 'all',
	Desktop = 'desktop',
	Tablet = 'tablet',
	Mobile = 'mobile',
	None = 'none'
}
export const enum PositionType {
	Bottom = 'bottom',
	FabLeft = 'fabl',
	FabRight = 'fabr',
	Hidden = 'hidden',
	Props = 'props',
	TabBar = 'tabbar',
	Text = 'text',
	Top = 'top'
}
export const enum RibbonAction {
	ItemSuggester = 'item-suggester',
	ToolbarSuggester = 'toolbar-suggester',
	Toolbar = 'toolbar'
}
export const enum SettingType {
	Args = 'args',
	Command = 'command',
	File = 'file',
	Ignore = 'ignore',
	Script = 'script',
	Text = 'text',
	TextArea = 'textarea',
	Toolbar = 'toolbar',
}
export const enum DefaultStyleType {
	Autohide = 'autohide',
	Border = 'border',
	Button = 'button',
	Center = 'center',
	Glass = 'glass',
	Inactive = 'inactive',
	Wide = 'wide',
	Left = 'left',
	Right = 'right',
	Between = 'between',
	Even = 'even',
	Sticky = 'sticky',
	Tab = 'tab'
}
export const enum MobileStyleType {
	Border = 'mbrder',
	NoBorder = 'mnbrder',
	Button = 'mbtn',
	Center = 'mctr',
	Glass = 'mgls',
	NoWide = 'mnwd',
	NoWrap = 'mnwrp',
	Wide = 'mwd',
	Left = 'mlft',
	Right = 'mrght',
	Between = 'mbtwn',
	Even = 'mevn',
	Sticky = 'mstcky',
	NoSticky = 'mnstcky',
	Tab = 'mtb',
	NoTab = 'mntb'
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
export const enum ViewType {
	All = 'all',
	Preview = 'preview',
	Source = 'source'
}

export const enum LocalVar {
	ActiveItem = 'note-toolbar-active-item',
	LoadSettings = 'note-toolbar-load-settings-changes',
	MenuPos = 'note-toolbar-menu-pos',
	RecentFiles = 'note-toolbar-recent-files',
	RecentItems = 'note-toolbar-recent-items',
	RecentToolbars = 'note-toolbar-recent-toolbars',
	TogglePropsState = 'note-toolbar-toggle-props-state'
}

export type ToggleUiStateType = 'show' | 'hide' | 'fold' | 'toggle';

// note: can't make this a constant as it's used in Object.values()
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

export const enum ToolbarStyle {
	ItemFocused = 'tbar-item-focused'
}

export const enum ErrorBehavior {
	Display = 'display',
	Report = 'report',
	Ignore = 'ignore'
}

export interface NoteToolbarSettings {
	debugEnabled: boolean;
	editorMenuAsToolbar: boolean;
	editorMenuToolbar: string | null;
	emptyViewToolbar: string | null;
	export: ExportSettings;
	folderMappings: Array<FolderMapping>;
	icon: string;
	keepPropsState: boolean;
	lockCallouts: boolean;
	obsidianUiVisibility: Record<string, boolean>;
	onboarding: OnboardingState;
	ribbonAction: RibbonAction;
	rules: Array<ToolbarRule>;
	scriptingEnabled: boolean;
	showEditInFabMenu: boolean;
	showLaunchpad: boolean;
	showToolbarIn: Record<FileType, boolean>;
	showToolbarInFileMenu: boolean;
	showToolbarInOther: string;
	textToolbar: string | null;
	toolbarProp: string;
	toolbars: Array<ToolbarSettings>;
	version: number;
	whatsnew_version: string;
}

export const DEFAULT_SETTINGS: NoteToolbarSettings = {
	debugEnabled: false,
	editorMenuAsToolbar: false,
	editorMenuToolbar: null,
	emptyViewToolbar: null,
	export: {
		includeIcons: true,
		replaceVars: true,
		useDataEls: true,
		useIds: true,
	},
	folderMappings: [],
	icon: "circle-ellipsis",
	keepPropsState: false,
	lockCallouts: false,
	obsidianUiVisibility: {},
	onboarding: {},
	ribbonAction: RibbonAction.Toolbar,
	rules: [],
	scriptingEnabled: false,
	showEditInFabMenu: false,
	showLaunchpad: false,
	showToolbarIn: {
		audio: false,
		bases: false,
		canvas: false,
		image: false,
		kanban: false,
		pdf: false,
		video: false
	},
	showToolbarInFileMenu: false,
	showToolbarInOther: "",
	textToolbar: null,
	toolbarProp: "notetoolbar",
	toolbars: [],
	version: SETTINGS_VERSION,
	whatsnew_version: '0'
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

export const enum RuleConjunctionType {
	And = 'and',
	Or = 'or'
}
// note: can't make this a constant as it's used in Object.entries()
export enum RuleConditionType {
	Folder = 'folder'
}
export const enum RuleOperatorType {
	Is = 'is',
	IsNot = 'isNot',
	StartsWith = 'startsWith'
}

export interface ToolbarRule {
	toolbar: string;
	conjunction: RuleConjunctionType;
	conditions: Array<ToolbarRuleCondition>;
}

export interface ToolbarRuleCondition {
	id: string;
	type: RuleConditionType;
	key: string;
	operator: RuleOperatorType;
	value: string;
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
		commandCheck: false,
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
		commandCheck: false,
		commandId: '',
		hasVars: false,
		type: ItemType.Separator
	},
	tooltip: '',
	visibility: { ...DEFAULT_ITEM_VISIBILITY_SETTINGS }
}

export type ItemFocusType = 'editor' | 'none';

/**
 * Used to describe the type of url, for efficiency on toolbar render and click handling.
 */
export interface ToolbarItemLinkAttr {
	commandCheck: boolean;
	commandId: string;
	focus?: ItemFocusType;
	hasVars: boolean;
	target?: PaneType | 'modal';
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

// #endregion

// ****************************************************************************
// #region UI STRINGS
// ****************************************************************************

export const URL_FEEDBACK_FORM = 'https://docs.google.com/forms/d/e/1FAIpQLSeVWHVnookJr8HVQywk5TwupU-p7vkRkSt83Q5jscR6VwpZEQ/viewform';
export const URL_ISSUE_FORM = 'https://docs.google.com/forms/d/e/1FAIpQLSf_cABJLmNqPm-2DjH6vcxyuYKNoP-mmeyk8_vph8KMZHDSyg/viewform';
export const URL_RELEASE_NOTES = 'https://raw.githubusercontent.com/chrisgurney/obsidian-note-toolbar/master/docs/releases';
export const URL_RELEASES = 'https://github.com/chrisgurney/obsidian-note-toolbar/releases';
export const URL_TIPS = 'https://raw.githubusercontent.com/chrisgurney/obsidian-note-toolbar/master/docs/tips';
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
		{ [PositionType.TabBar]: t('setting.position.option-tabbar') },
		{ [PositionType.Top]: t('setting.position.option-top') },
		{ [PositionType.Props]: t('setting.position.option-props') },
		{ [PositionType.Bottom]: t('setting.position.option-bottom') },
		{ [PositionType.FabLeft]: t('setting.position.option-fabl') },
		{ [PositionType.FabRight]: t('setting.position.option-fabr') },
		{ [PositionType.Hidden]: t('setting.position.option-hidden') },
	],
	mobile: [
		{ [PositionType.TabBar]: t('setting.position.option-tabbar') },
		{ [PositionType.Top]: t('setting.position.option-top') },
		{ [PositionType.Props]: t('setting.position.option-props') },
		{ [PositionType.Bottom]: t('setting.position.option-bottom') },
		{ [PositionType.FabLeft]: t('setting.position.option-fabl') },
		{ [PositionType.FabRight]: t('setting.position.option-fabr') },
		{ [PositionType.Hidden]: t('setting.position.option-hidden-mobile') },
	]
}

export const RIBBON_ACTION_OPTIONS = {
	[RibbonAction.ItemSuggester]: t('setting.display-locations.ribbon-action.option-item-suggester'),
	[RibbonAction.ToolbarSuggester]: t('setting.display-locations.ribbon-action.option-toolbar-suggester'),
	[RibbonAction.Toolbar]: (t('setting.display-locations.ribbon-action.option-toolbar')),
}

export const TARGET_OPTIONS = {
	'default': t('setting.item.option-target-default'),
	'modal': t('setting.item.option-target-modal'),
	'tab': t('setting.item.option-target-tab'),
	'window': t('setting.item.option-target-window'),
	'split': t('setting.item.option-target-split')
}

/**
 * Each of these correlates to (style) metatdata that's matched in styles.css.
 */
export const DEFAULT_STYLE_OPTIONS: { [key: string]: string }[] = [
	{ [DefaultStyleType.Autohide]: t('setting.styles.option-autohide') },
    { [DefaultStyleType.Border]: t('setting.styles.option-border') },
	{ [DefaultStyleType.Button]: t('setting.styles.option-button') },
    { [DefaultStyleType.Center]: t('setting.styles.option-center') },
    { [DefaultStyleType.Glass]: t('setting.styles.option-glass') },
	{ [DefaultStyleType.Wide]: t('setting.styles.option-wide') },
	{ [DefaultStyleType.Inactive]: t('setting.styles.option-inactive') },
    { [DefaultStyleType.Left]: t('setting.styles.option-left') },
    { [DefaultStyleType.Right]: t('setting.styles.option-right') },
	{ [DefaultStyleType.Between]: t('setting.styles.option-between') },
    { [DefaultStyleType.Even]: t('setting.styles.option-even') },
    { [DefaultStyleType.Sticky]: t('setting.styles.option-sticky') },
	{ [DefaultStyleType.Tab ]: t('setting.styles.option-tab') }
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
	{ [MobileStyleType.Button]: t('setting.styles.option-button') },
    { [MobileStyleType.Center]: t('setting.styles.option-center') },
	{ [MobileStyleType.NoWide]: t('setting.styles.option-nowide') },
	{ [MobileStyleType.NoWrap]: t('setting.styles.option-nowrap') },
	{ [MobileStyleType.Wide]: t('setting.styles.option-wide') },
	{ [MobileStyleType.Glass]: t('setting.styles.option-glass') },
    { [MobileStyleType.Left]: t('setting.styles.option-left') },
    { [MobileStyleType.NoBorder]: t('setting.styles.option-noborder') },
	{ [MobileStyleType.NoTab ]: t('setting.styles.option-notab') },
    { [MobileStyleType.NoSticky]: t('setting.styles.option-notsticky') },
    { [MobileStyleType.Right]: t('setting.styles.option-right') },
	{ [MobileStyleType.Between]: t('setting.styles.option-between') },
    { [MobileStyleType.Even]: t('setting.styles.option-even') },
    { [MobileStyleType.Sticky]: t('setting.styles.option-sticky') },
	{ [MobileStyleType.Tab ]: t('setting.styles.option-tab') }
];

export const MOBILE_STYLE_DISCLAIMERS: { [key: string]: string }[] = [
	{ [MobileStyleType.NoWrap]: t('setting.styles.option-nowrap-disclaimer') },
	{ [MobileStyleType.Sticky]: t('setting.styles.option-sticky-disclaimer') },
];

export const SETTINGS_DISCLAIMERS: { [key: string]: string }[] = [
	{ 'nativeMenus': t('setting.position.option-fab-desktop-native-menus-disclaimer') }
];

export interface ObsidianUIElement {
	key: string;
	icon?: string;
	label: string;
	selector: string;
}

export const OBSIDIAN_UI_ELEMENTS: ObsidianUIElement[] = [
	{
		key: 'mobile.navbar.back',
		icon: 'chevron-left',
		label: t('setting.navbar.option-back'),
		selector: '.mobile-navbar-action-back'
	},
	{
		key: 'mobile.navbar.forward',
		icon: 'chevron-right',
		label: t('setting.navbar.option-forward'),
		selector: '.mobile-navbar-action-forward'
	},
	{
		key: 'mobile.navbar.quickswitcher',
		icon: 'search',
		label: t('setting.navbar.option-quick-switcher'),
		selector: '.mobile-navbar-action-quick-switcher'
	},
	{
		key: 'mobile.navbar.newtab',
		icon: 'plus',
		label: t('setting.navbar.option-new-tab'),
		selector: '.mobile-navbar-action-new-tab'
	},
	{
		key: 'mobile.navbar.tabs',
		icon: 'tab-frame',
		label: t('setting.navbar.option-tabs'),
		selector: '.mobile-navbar-action-tabs'
	},
	{
		key: 'mobile.navbar.menu',
		icon: 'menu',
		label: t('setting.navbar.option-menu'),
		selector: '.mobile-navbar-action-menu'
	},
];

// order to display UI options in the settings UI
export const OBSIDIAN_UI_MOBILE_NAVBAR_OPTIONS = [
	'mobile.navbar.back',
	'mobile.navbar.forward',
	'mobile.navbar.quickswitcher',
	'mobile.navbar.newtab',
	'mobile.navbar.tabs',
	'mobile.navbar.menu'
];

// #endregion