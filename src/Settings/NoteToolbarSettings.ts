import { getLanguage, PaneType } from "obsidian";
import { SETTINGS_VERSION } from "version";

// *****************************************************************************
// TRANSLATIONS
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

void Locales.init();

export const t: (key: string, ...args: unknown[]) => string = Locales.getFixedT(null, 'plugin-note-toolbar', null); // string translation function

// *****************************************************************************
// CONSTANTS
//******************************************************************************

export const COMMAND_PREFIX_TBAR = 'open-toolbar-';
export const COMMAND_PREFIX_ITEM = 'use-toolbar-item-';
export const VIEW_TYPE_GALLERY = 'ntb-gallery-view';
export const VIEW_TYPE_HELP = 'ntb-help-view';
export const VIEW_TYPE_TIP = 'ntb-tip-view';
export const VIEW_TYPE_WHATS_NEW = 'ntb-whats-new-view';

export const EMPTY_TOOLBAR_ID = 'EMPTY_TOOLBAR';
export const GALLERY_DIVIDER_ID = 'GALLERY_DIVIDER';
export const NONE_TOOLBAR_ID = 'NO_TOOLBAR';

export const CORE_PLUGIN_IDS = ['bookmarks', 'daily-notes', 'file-explorer', 'global-search', 'workspace'];
export const IGNORE_PLUGIN_IDS = ['app', 'bookmarks', 'editor', 'file-explorer', 'global-search', 'link', 'markdown', 'note-toolbar', 'open-with-default-app', 'theme', 'workspace'];

// *****************************************************************************
// TYPES
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
	Additional = 'additional', // used for Gallery items that are provided as examples externally
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
	Spreader = 'spreader',
	Templater = 'templater-obsidian',
	Uri = 'uri'
}
export const enum ViewModeType {
	All = 'all',
	Editing = 'source',
	Reading = 'preview'
}
export type ItemComponentVisibility = 'visible' | 'hidden' | 'icon' | 'label';
export const enum PlatformType {
	All = 'all',
	Desktop = 'desktop',
	Tablet = 'tablet',
	Mobile = 'mobile',
	None = 'none',
	Phone = 'phone'
}
export const enum PositionType {
	Bottom = 'bottom',
	FabLeft = 'fabl',
	FabRight = 'fabr',
	Floating = 'float',
	Hidden = 'hidden',
	Menu = 'menu',
	Props = 'props',
	QuickTools = 'quicktools',
	TabBar = 'tabbar',
	Text = 'text',
	Top = 'top'
}
/** deprecated: In 1.34 replaced with ribbon settings for toolbars and toolbar items */
export const enum RibbonAction {
	ItemSuggester = 'item-suggester',
	ToolbarSelected = 'toolbar-selected',
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
	NoWrap = 'nowrap',
	Right = 'right',
	Between = 'between',
	Even = 'even',
	Sticky = 'sticky',
	Tab = 'tab'
}
export const enum MobileStyleType {
	Autohide = 'mhd',
	NoAutohide = 'mnhd',
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
	NoTab = 'mntb',
	Wrap = 'mwrp'
}
export const MOBILE_STYLE_COMPLIMENTS: MobileStyleType[][] = [
	[MobileStyleType.Left, MobileStyleType.Center, MobileStyleType.Right],
	[MobileStyleType.Wide, MobileStyleType.NoWide],
	[MobileStyleType.Between, MobileStyleType.Even]
];

export const SettingFieldItemMap: Record<ItemType, SettingType> = {
	[ItemType.Additional]: SettingType.Ignore,
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
	[ItemType.Spreader]: SettingType.Ignore,
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
	defaultToolbar: string | null;
	editorMenuAsToolbar: boolean;
	editorMenuToolbar: string | null;
	emptyViewToolbar: string | null;
	export: ExportSettings;
	/** deprecated in 1.35: replaced with rules */
	folderMappings?: Array<FolderMapping>;
	icon: string;
	keepPropsState: boolean;
	lockCallouts: boolean;
	obsidianUiVisibility: Record<string, boolean>;
	onboarding: OnboardingState;
	ribbon: Array<RibbonItem>;
	/** deprecated in 1.34: replaced with ribbon settings for toolbars and toolbar items */
	ribbonAction?: RibbonAction;
	/** deprecated in 1.34: replaced with ribbon settings for toolbars and toolbar items */
	ribbonToolbar?: string | null;
	rules: Array<Rule>;
	scriptingEnabled: boolean;
	showEditInFabMenu: boolean;
	showLaunchpad: boolean;
	showToolbarIn: Record<FileType, boolean>;
	showToolbarInFileMenu: boolean;
	showToolbarInOther: string;
	showWhatsNew: boolean;
	textToolbar: string | null;
	textToolbarOnKeyboard: boolean;
	toolbarProp: string;
	toolbars: Array<ToolbarSettings>;
	version: number;
	webviewerToolbar: string | null;
	whatsnew_version: string;
}

export const DEFAULT_SETTINGS: NoteToolbarSettings = {
	debugEnabled: false,
	defaultToolbar: null,
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
	ribbon: [],
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
	showWhatsNew: true,
	textToolbar: null,
	textToolbarOnKeyboard: true,
	toolbarProp: "notetoolbar",
	toolbars: [],
	version: SETTINGS_VERSION,
	webviewerToolbar: null,
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
	name: string;
	commandPosition: PositionType;
	customClasses: string;
	defaultItem: string | null;
	defaultStyles: string[];
	description?: string;
	hasCommand: boolean;
	icon?: string;
	items: Array<ToolbarItemSettings>;
	mobileStyles: string[];
	/** deprecated: positions property as of v1.7 (settings v20240426.1) and moved to desktop, tablet, mobile properties (in migration) */
	positions?: Array<Position>;
	position: Position;
	updated: string;
}

export interface RibbonItem {
	uuid: string;
	showAt?: PositionType;
}

export const EMPTY_TOOLBAR: ToolbarSettings = {
	uuid: EMPTY_TOOLBAR_ID,
	name: '',
	commandPosition: PositionType.Floating,
	customClasses: '',
	defaultItem: null,
	defaultStyles: [],
	hasCommand: false,
	items: [], 
	mobileStyles: [],
	position: {},
	updated: ''
}

export const NONE_TOOLBAR: ToolbarSettings = {
	uuid: NONE_TOOLBAR_ID,
	name: t('setting.toolbar-suggest-modal.option-none'),
	commandPosition: PositionType.Floating,
	customClasses: '',
	defaultItem: null,
	defaultStyles: [],
	hasCommand: false,
	items: [], 
	mobileStyles: [],
	position: {},
	updated: ''
}

export const DEFAULT_ITEM_VISIBILITY_SETTINGS: Visibility = {
	desktop: { components: [ComponentType.Icon, ComponentType.Label] },
	mobile: { components: [ComponentType.Icon, ComponentType.Label] },
	tablet: { components: [ComponentType.Icon, ComponentType.Label] },
	viewMode: ViewModeType.All
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
	/** deprecated: contexts property as of v1.7 (settings v20240426.1) and moved to desktop, tablet, mobile properties (in migration) */
	contexts?: Array<ViewContext>;
	/** deprecated: position property as of v1.7 (settings v20240426.1) and moved to desktop, tablet, mobile properties (in migration) */
	position?: PositionType.Props | PositionType.Top;
}

export interface ViewContext {
	platform: PlatformType;
	view: ViewType;
}

export interface Visibility {
	desktop: {
		components: ComponentType[]
	},
	tablet: {
		components: ComponentType[]
	},
	mobile: {
		components: ComponentType[]
	},
	viewMode: ViewModeType
}

export interface ItemViewContext extends ViewContext {
	component: ComponentType;
}

// TODO: deprecate and replace with Rules
export interface FolderMapping {
	folder: string;
	toolbar: string;
}

// *****************************************************************************
// RULES
//******************************************************************************

/**
 * Logical operator used to combine all conditions in a rule.
 */
export const enum RuleConjunction {
    And = 'and',
    Or = 'or'
}

/**
 * The underlying field being evaluated.
 * Note: This can't be const as it's used in Object.entries()
 */
export enum RuleField {
	EditorMode = 'editormode',
    FileName = 'filename',
    FileType = 'filetype',
    Folder = 'folder',
    Platform = 'platform',
    Tag = 'tag',
}

/**
 * Comparison operation available for a selected operand.
 */
export const enum RuleOperator {
    Is = 'is',
    IsNot = 'isNot',

    Contains = 'contains',
    DoesNotContain = 'doesNotContain',

    StartsWith = 'startsWith',
    EndsWith = 'endsWith',

    IsEmpty = 'empty',
    IsNotEmpty = 'notEmpty',
}

export interface RuleOperatorDefinition {
    op: RuleOperator;
	label: string;
    editor: RuleValueEditor;
}

/**
 * Value stored by a condition.
 */
export type RuleValue = string | string[] | number | boolean;

/**
 * Editor used to enter a value.
 */
export type RuleValueEditor =
	| 'boolean'
	| 'editormode'
	| 'file'
	| 'filetype'
	| 'folder'
    | 'number'
	| 'none'
    | 'platform'
    | 'string'
	| 'tags';

export type RuleMatchType = 'default' | 'prop' | Rule | undefined;

/**
 * A single ordered rule. The first matching rule determines the toolbar.
 */
export interface Rule {
    id: string;
    toolbar: string;
    conjunction: RuleConjunction;
    conditions: RuleCondition[];
}

/**
 * A persisted condition within a rule.
 */
export interface RuleCondition {
	id: string;
    field?: RuleField;
    operator?: RuleOperator;
    value?: RuleValue;
	otherValue?: string;

    // property name when field === Property
    key?: string;
}

export const RULE_VALUE_TYPE_OTHER = 'ntb-other';

/**
 * A selectable operand returned by the first suggester.
 * May represent either a built-in field or a specific property.
 */
export interface RuleOperand {
	id: string;
    field: RuleField;
	icon: string;
    label: string;
    operators: RuleOperatorDefinition[];

    // property name when field === Property
    key?: string;
}

export const RULE_OPERANDS: RuleOperand[] = [
    {
        id: 'editormode',
        field: RuleField.EditorMode,
		icon: 'note-toolbar-pen-book',
        label: t('setting.rules.option-field-editormode'),
        operators: [
            { op: RuleOperator.Is, label: t('setting.rules.operator-is'), editor: 'editormode' },
            { op: RuleOperator.IsNot, label: t('setting.rules.operator-isNot'), editor: 'editormode' },
        ]
    },
    {
        id: 'filename',
        field: RuleField.FileName,
		icon: 'file-text',
        label: t('setting.rules.option-field-filename'),
        operators: [
            { op: RuleOperator.Is, label: t('setting.rules.operator-is'), editor: 'file' },
            { op: RuleOperator.IsNot, label: t('setting.rules.operator-isNot'), editor: 'file' },
            { op: RuleOperator.Contains, label: t('setting.rules.operator-contains'), editor: 'string' },
            { op: RuleOperator.DoesNotContain, label: t('setting.rules.operator-doesNotContain'), editor: 'string' },
            { op: RuleOperator.StartsWith, label: t('setting.rules.operator-startsWith'), editor: 'string' },
            { op: RuleOperator.EndsWith, label: t('setting.rules.operator-endsWith'), editor: 'string' },
        ]
    },
    {
        id: 'folder',
        field: RuleField.Folder,
		icon: 'folder-closed',
        label: t('setting.rules.option-field-folder'),
        operators: [
            { op: RuleOperator.Is, label: t('setting.rules.operator-is'), editor: 'folder' },
            { op: RuleOperator.IsNot, label: t('setting.rules.operator-isNot'), editor: 'folder' },
            { op: RuleOperator.Contains, label: t('setting.rules.operator-contains'), editor: 'string' },
            { op: RuleOperator.DoesNotContain, label: t('setting.rules.operator-doesNotContain'), editor: 'string' },
            { op: RuleOperator.StartsWith, label: t('setting.rules.operator-startsWith'), editor: 'string' },
            { op: RuleOperator.EndsWith, label: t('setting.rules.operator-endsWith'), editor: 'string' },
        ]
    },
    {
        id: 'filetype',
        field: RuleField.FileType,
		icon: 'file-type',
        label: t('setting.rules.option-field-filetype'),
        operators: [
            { op: RuleOperator.Is, label: t('setting.rules.operator-is'), editor: 'filetype' },
            { op: RuleOperator.IsNot, label: t('setting.rules.operator-isNot'), editor: 'filetype' },
        ]
    },
    {
        id: 'platform',
        field: RuleField.Platform,
		icon: 'monitor-smartphone',
        label: t('setting.rules.option-field-platform'),
        operators: [
            { op: RuleOperator.Is, label: t('setting.rules.operator-is'), editor: 'platform' },
            { op: RuleOperator.IsNot, label: t('setting.rules.operator-isNot'), editor: 'platform' },
        ]
    },
    {
        id: 'tags',
        field: RuleField.Tag,
		icon: 'tags',
        label: t('setting.rules.option-field-tags'),
        operators: [
            { op: RuleOperator.Contains, label: t('setting.rules.operator-contains'), editor: 'tags' },
            { op: RuleOperator.DoesNotContain, label: t('setting.rules.operator-doesNotContain'), editor: 'tags' },
            { op: RuleOperator.IsEmpty, label: t('setting.rules.operator-isEmpty'), editor: 'none' },
            { op: RuleOperator.IsNotEmpty, label: t('setting.rules.operator-isNotEmpty'), editor: 'none' },
        ]
    }
];

// *****************************************************************************
// TOOLBAR SETTINGS
//******************************************************************************

export interface ToolbarItemSettings {
	uuid: string;
	icon: string;
	label: string;
	tooltip: string;
	/**	deprecated: contexts property as of v1.7 (settings v20240426.1) and moved to visibility property (in migration) */
	contexts?: ViewContext[];
	description?: string;
	hasCommand: boolean;	
	inGallery: boolean;
	link: string;
	linkAttr: ToolbarItemLinkAttr;
	/** Used for importing Gallery items that rely on plugins */
	plugin?: string | string[];
	scriptConfig?: ScriptConfig;
	visibility: Visibility;
}

export const DEFAULT_ITEM_SETTINGS: ToolbarItemSettings = {
	uuid: '',
	icon: '',
	label: '',
	tooltip: '',
	hasCommand: false,
	inGallery: false,
	link: '',
	linkAttr: {
		commandCheck: false,
		commandId: '',
		hasVars: false,
		type: ItemType.Command
	},
	visibility: { ...DEFAULT_ITEM_VISIBILITY_SETTINGS },
}

export const ITEM_GALLERY_DIVIDER: ToolbarItemSettings = {
	uuid: GALLERY_DIVIDER_ID,
	icon: '',
	label: '',
	tooltip: '',
	hasCommand: false,
	inGallery: true,
	link: '',
	linkAttr: {
		commandCheck: false,
		commandId: '',
		hasVars: false,
		type: ItemType.Separator
	},
	visibility: { ...DEFAULT_ITEM_VISIBILITY_SETTINGS }
}

export type ItemFileContextType = 'opened' | 'origin';
export type ItemFocusType = 'editor' | 'none';

/**
 * Used to describe the type of url, for efficiency on toolbar render and click handling.
 */
export interface ToolbarItemLinkAttr {
	commandCheck: boolean;
	commandId: string;
	fileContext?: ItemFileContextType;
	focus?: ItemFocusType;
	/**	deprecated: use the hasVars() method instead */
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

export const COMMAND_DOES_NOT_EXIST = 'COMMAND_DOES_NOT_EXIST';

export const SCRIPT_ATTRIBUTE_MAP: Record<string, string> = {
    'expression': 'data-expr',
    'sourceFile': 'data-src',
    'sourceFunction': 'data-func',
    'sourceArgs': 'data-args',
    'outputContainer': 'data-callout',
    'outputFile': 'data-dest'
};

export interface UiSelectOption<T extends string> {
    type: T;
    label: string;
}

export const FILE_TYPE_OPTIONS: UiSelectOption<FileType>[] = [
    { type: FileType.Audio, label: t('setting.display-contexts.option-audio') },
    { type: FileType.Bases, label: t('setting.display-contexts.option-bases') },
    { type: FileType.Canvas, label: t('setting.display-contexts.option-canvas') },
    { type: FileType.Image, label: t('setting.display-contexts.option-image') },
    { type: FileType.Kanban, label: t('setting.display-contexts.option-kanban') },
    { type: FileType.Pdf, label: t('setting.display-contexts.option-pdf') },
    { type: FileType.Video, label: t('setting.display-contexts.option-video') }
].sort((a, b) => a.label.localeCompare(b.label));

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

export const PLATFORM_OPTIONS: UiSelectOption<PlatformType>[] = [
    { type: PlatformType.Desktop, label: t('setting.rules.option-platform-desktop') },
    { type: PlatformType.Tablet, label: t('setting.rules.option-platform-tablet') },
    { type: PlatformType.Mobile, label: t('setting.rules.option-platform-mobile') },
    { type: PlatformType.Phone, label: t('setting.rules.option-platform-phone') }
].sort((a, b) => a.label.localeCompare(b.label));

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

export const TARGET_OPTIONS = {
	'default': t('setting.item.option-target-default'),
	'modal': t('setting.item.option-target-modal'),
	'tab': t('setting.item.option-target-tab'),
	'window': t('setting.item.option-target-window'),
	'split': t('setting.item.option-target-split')
}

export const TOOLBAR_SHOW_POSITION_OPTIONS = {
	[PositionType.Floating]: t('setting.position.option-floating'),
	[PositionType.Menu]: t('setting.position.option-menu'),
	[PositionType.QuickTools]: t('setting.position.option-quicktools')
}

export const VIEW_MODE_OPTIONS: UiSelectOption<ViewModeType>[] = [
    { type: ViewModeType.Editing, label: t('setting.rules.option-editormode-editing') },
    { type: ViewModeType.Reading, label: t('setting.rules.option-editormode-reading') }
].sort((a, b) => a.label.localeCompare(b.label));

/**
 * Each of these correlates to (style) metatdata that's matched in styles.css.
 */
export const DEFAULT_STYLE_OPTIONS: { [key: string]: string }[] = [
	{ [DefaultStyleType.Autohide]: t('setting.styles.option-autohide') },
    { [DefaultStyleType.Border]: t('setting.styles.option-border') },
	{ [DefaultStyleType.Button]: t('setting.styles.option-button') },
    { [DefaultStyleType.Center]: t('setting.styles.option-center') },
	{ [DefaultStyleType.Wide]: t('setting.styles.option-wide') },
	{ [DefaultStyleType.Glass]: t('setting.styles.option-glass') },
	{ [DefaultStyleType.Inactive]: t('setting.styles.option-inactive') },
    { [DefaultStyleType.Left]: t('setting.styles.option-left') },
	{ [DefaultStyleType.NoWrap]: t('setting.styles.option-nowrap') },
    { [DefaultStyleType.Right]: t('setting.styles.option-right') },
	{ [DefaultStyleType.Between]: t('setting.styles.option-between') },
    { [DefaultStyleType.Even]: t('setting.styles.option-even') },
    { [DefaultStyleType.Sticky]: t('setting.styles.option-sticky') },
	{ [DefaultStyleType.Tab ]: t('setting.styles.option-tab') }
];

export const DEFAULT_STYLE_DISCLAIMERS: { [key: string]: string }[] = [
	{ [DefaultStyleType.Autohide]: t('setting.styles.option-autohide-disclaimer') },
	{ [DefaultStyleType.NoWrap]: t('setting.styles.option-nowrap-disclaimer') },
	{ [DefaultStyleType.Sticky]: t('setting.styles.option-sticky-disclaimer') },
];

/**
 * Each of these correlates to (style) metatdata that's matched in styles.css.
 */
export const MOBILE_STYLE_OPTIONS: { [key: string]: string }[] = [
	{ [MobileStyleType.Autohide]: t('setting.styles.option-autohide') },
    { [MobileStyleType.Border]: t('setting.styles.option-border') },
	{ [MobileStyleType.Button]: t('setting.styles.option-button') },
    { [MobileStyleType.Center]: t('setting.styles.option-center') },
	{ [MobileStyleType.NoWide]: t('setting.styles.option-nowide') },
	{ [MobileStyleType.NoWrap]: t('setting.styles.option-nowrap') },
	{ [MobileStyleType.Wide]: t('setting.styles.option-wide') },
	{ [MobileStyleType.Glass]: t('setting.styles.option-glass') },
    { [MobileStyleType.Left]: t('setting.styles.option-left') },
    { [MobileStyleType.NoAutohide]: t('setting.styles.option-noautohide') },
    { [MobileStyleType.NoBorder]: t('setting.styles.option-noborder') },
	{ [MobileStyleType.NoTab ]: t('setting.styles.option-notab') },
    { [MobileStyleType.NoSticky]: t('setting.styles.option-notsticky') },
    { [MobileStyleType.Right]: t('setting.styles.option-right') },
	{ [MobileStyleType.Between]: t('setting.styles.option-between') },
    { [MobileStyleType.Even]: t('setting.styles.option-even') },
    { [MobileStyleType.Sticky]: t('setting.styles.option-sticky') },
	{ [MobileStyleType.Tab ]: t('setting.styles.option-tab') },
	{ [MobileStyleType.Wrap]: t('setting.styles.option-wrap') },
];

export const MOBILE_STYLE_DISCLAIMERS: { [key: string]: string }[] = [
	{ [MobileStyleType.Autohide]: t('setting.styles.option-autohide-disclaimer') },
	{ [MobileStyleType.NoWrap]: t('setting.styles.option-nowrap-disclaimer') },
	{ [MobileStyleType.Sticky]: t('setting.styles.option-sticky-disclaimer') },
];

export const SETTINGS_DISCLAIMERS: { [key: string]: string }[] = [
	{ 'nativeMenus': t('setting.position.option-fab-desktop-native-menus-disclaimer') },
	{ 'sourceProperties': t('setting.position.option-below-properties-source-disclaimer') }
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