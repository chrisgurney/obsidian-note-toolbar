import NoteToolbarPlugin from "main";
import { ComponentType, DEFAULT_SETTINGS, FolderMapping, ItemType, ItemViewContext, PlatformType, Position, PositionType, SETTINGS_VERSION, t, ToolbarItemSettings, ToolbarSettings, ViewType, Visibility } from "Settings/NoteToolbarSettings";
import { FrontMatterCache, Platform, TFile } from "obsidian";
import { debugLog, getUUID } from "Utils/Utils";

export class SettingsManager {

    public plugin: NoteToolbarPlugin;

    constructor(plugin: NoteToolbarPlugin) {
        this.plugin = plugin;
    }

	/**
	 * Adds the given toolbar to the plugin settings.
	 * @param toolbar ToolbarSettings to add.
	 */
	public async addToolbar(toolbar: ToolbarSettings): Promise<void> {
		this.plugin.settings.toolbars.push(toolbar);
		this.plugin.settings.toolbars.sort((a, b) => a.name.localeCompare(b.name));
		await this.plugin.settingsManager.save();	
	}

	/**
	 * Removes the provided toolbar from settings; does nothing if it does not exist.
	 * @param id UUID of the toolbar to remove.
	 */
	public deleteToolbar(id: string) {
		this.plugin.settings.toolbars = this.plugin.settings.toolbars.filter(tbar => tbar.uuid !== id);
	}

	/**
	 * Duplicates the given toolbar and adds it to the plugin settings.
	 * @param toolbar ToolbarSettings to duplicate.
	 * @returns string UUID of the new toolbar.
	 */
	public async duplicateToolbar(toolbar: ToolbarSettings): Promise<string> {
		debugLog('duplicateToolbar', toolbar);
		let newToolbar = {
			uuid: getUUID(),
			defaultStyles: JSON.parse(JSON.stringify(toolbar.defaultStyles)),
			items: [],
			mobileStyles: JSON.parse(JSON.stringify(toolbar.mobileStyles)),
			name: this.getUniqueToolbarName(toolbar.name, true),
			position: JSON.parse(JSON.stringify(toolbar.position)),
			updated: new Date().toISOString(),
		} as ToolbarSettings;
		toolbar.items.forEach((item) => {
			this.duplicateToolbarItem(newToolbar, item);
		});
		debugLog('duplicateToolbar: duplicated', newToolbar);
		await this.addToolbar(newToolbar);
		return newToolbar.uuid;
	}

	/**
	 * Duplicates the given toolbar item, and adds it to the given toolbar.
	 * @param toolbar ToolbarSettings to duplicate the item within.
	 * @param item ToolbarItemSettings to duplicate.
	 * @returns string UUID of the new item.
	 */
	public duplicateToolbarItem(toolbar: ToolbarSettings, item: ToolbarItemSettings, insertAfter: boolean = false): string {
		debugLog('duplicateToolbarItem', item);
		let newItem = JSON.parse(JSON.stringify(item)) as ToolbarItemSettings;
		newItem.uuid = getUUID();
		debugLog('duplicateToolbarItem: duplicated', newItem);
		if (insertAfter) {
			const index = toolbar.items.indexOf(item);
			if (index !== -1) {
				toolbar.items.splice(index + 1, 0, newItem);
			}
		}
		else {
			toolbar.items.push(newItem);
		}
		return newItem.uuid;
	}

	/**
	 * Get toolbar for the given frontmatter (based on a toolbar prop), and failing that the file (based on folder mappings).
	 * @param frontmatter FrontMatterCache to check if there's a prop for the toolbar.
	 * @param file The note to check if we have a toolbar for.
	 * @returns ToolbarSettings or undefined, if there is no matching toolbar.
	 */
	public getMappedToolbar(frontmatter: FrontMatterCache | undefined, file: TFile): ToolbarSettings | undefined {

		debugLog('getMappedToolbar()');

		let matchingToolbar: ToolbarSettings | undefined = undefined;

		// debugLog('- frontmatter: ', frontmatter);
		const propName = this.plugin.settings.toolbarProp;
		let ignoreToolbar = false;

		const notetoolbarProp: string[] = frontmatter?.[propName] ?? null;
		if (notetoolbarProp !== null) {
			// if any prop = 'none' then don't return a toolbar
			notetoolbarProp.includes('none') ? ignoreToolbar = true : false;
			// is it valid? (i.e., is there a matching toolbar?)
			ignoreToolbar ? undefined : matchingToolbar = this.getToolbarFromProps(notetoolbarProp);
		}

		// we still don't have a matching toolbar
		if (!matchingToolbar && !ignoreToolbar) {

			// check if the note is in a folder that's mapped, and if the mapping is valid
			let mapping: FolderMapping;
			let filePath: string;
			for (let index = 0; index < this.plugin.settings.folderMappings.length; index++) {
				mapping = this.plugin.settings.folderMappings[index];
				filePath = file.parent?.path === '/' ? '/' : file.path.toLowerCase();
				// debugLog('getMatchingToolbar: checking folder mappings: ', filePath, ' startsWith? ', mapping.folder.toLowerCase());
				if (['*'].includes(mapping.folder) || filePath.toLowerCase().startsWith(mapping.folder.toLowerCase())) {
					// continue until we get a matching toolbar
					matchingToolbar = this.getToolbarById(mapping.toolbar);
					if (matchingToolbar) {
						// debugLog('  - matched toolbar:', matchingToolbar);
						break;
					}
				}
			}

		}

		return matchingToolbar;

	}

	/**
	 * Gets toolbar from settings, using the provided UUID.
	 * @param id UUID of toolbar to get settings for.
	 * @returns ToolbarSettings for the provided matched toolbar ID, undefined otherwise.
	 */
	public getToolbarById(uuid: string | null): ToolbarSettings | undefined {
		return uuid ? this.plugin.settings.toolbars.find(tbar => tbar.uuid === uuid) : undefined;
	}

	/**
	 * Gets toolbar from settings, using the provided name.
	 * @param name Name of toolbar to get settings for (case-insensitive).
	 * @returns ToolbarSettings for the provided matched toolbar name, undefined otherwise.
	 */
	public getToolbarByName(name: string | null): ToolbarSettings | undefined {
		return name ? this.plugin.settings.toolbars.find(tbar => tbar.name.toLowerCase() === name.toLowerCase()) : undefined;
	}

	/**
	 * Gets toolbar from settings, using the provided array of strings (which will come from note frontmatter).
	 * @param names List of potential toolbars to get settings for (case-insensitive); only the first match is returned.
	 * @returns ToolbarSettings for the provided matched toolbar name, undefined otherwise.
	 */
	public getToolbarFromProps(names: string[] | null): ToolbarSettings | undefined {
		if (!names) return undefined;
		if (typeof names === "string") {
			return this.getToolbarByName(names);
		}
		return this.plugin.settings.toolbars.find(tbar => names.some(name => tbar.name.toLowerCase() === name.toLowerCase()));
	}

	/**
	 * Gets toolbar item from settings, using the provided UUID.
	 * @param id UUID of toolbar item to get settings for.
	 * @returns ToolbarItemSettings for the provided matched toolbar ID, undefined otherwise.
	 */
	public getToolbarItemById(uuid: string | null): ToolbarItemSettings | undefined {
		if (!uuid) return undefined;
		for (const toolbar of this.plugin.settings.toolbars) {
			const item = toolbar.items.find((item: ToolbarItemSettings) => item.uuid === uuid);
			if (item) {
				return item;
			}
		}
		return undefined;
	}

	/**
	 * Gets the name of the toolbar based on its UUID.
	 * @param uuid 
	 * @returns Name of the toolbar; empty string otherwise.
	 */
	public getToolbarName(uuid: string): string {
		let toolbarName = this.plugin.settings.toolbars.find(tbar => tbar.uuid === uuid)?.name;
		return toolbarName ? toolbarName : "";
	}

	/**
	 * Gets the current position of the toolbar based on the provided settings.
	 * @param ToolbarSettings to check for a position.
	 * @returns PositionType | undefined
	 */
	public getToolbarPosition(settings: ToolbarSettings): PositionType | undefined {
		let currentPosition: PositionType | undefined;
		if (Platform.isDesktop) {
			currentPosition = settings.position.desktop?.allViews?.position;
		}
		else if (Platform.isMobile) {
			currentPosition = settings.position.mobile?.allViews?.position;
		}
		return currentPosition;
	}

	/**
	 * Gets a unique name for a new toolbar copy, using the provided name.
	 * @param name name of the toolbar to generate a unique copy name for
	 * @param isCopy true if this is a copy, appending word "copy"; false otherwise
	 * @returns unique toolbar name
	 */
	public getUniqueToolbarName(name: string, isCopy: boolean): string {
		let uniqueName = name;
		let counter = 1;
	
		const existingNames = this.plugin.settings.toolbars.map(toolbar => toolbar.name);
	
		while (existingNames.includes(uniqueName)) {
			uniqueName = `${name}`;
			uniqueName += isCopy ? ` t('setting.toolbars.duplicated-tbar-suffix')` : '';
			uniqueName += (counter > 1) ? counter : '';
			counter++;
		}
	
		return uniqueName;
	}

	/**
	 * Loads settings, and migrates from old versions if needed.
	 * 
	 * 1. Update SETTINGS_VERSION in NoteToolbarSettings.
	 * 2. Add MIGRATION block below.
	 * 
	 * Credit to Fevol on Discord for the sample code to migrate.
	 * @link https://discord.com/channels/686053708261228577/840286264964022302/1213507979782127707
	 */
	async load(): Promise<void> {

		const loaded_settings = await this.plugin.loadData();
		debugLog("loadSettings: loaded settings: ", loaded_settings);
		this.plugin.settings = Object.assign({}, DEFAULT_SETTINGS, loaded_settings);
	
		let old_version = loaded_settings?.version as number;
		let new_version: number;

		// if we actually have existing settings for this plugin, and the old version does not match the current...
		if (loaded_settings && (old_version !== SETTINGS_VERSION)) {

			debugLog("loadSettings: versions do not match: data.json: ", old_version, " !== latest: ", SETTINGS_VERSION);
			debugLog("running migrations...");

			// first version without update (i.e., version is `undefined`)
			// MIGRATION: moved styles to defaultStyles (and introduced mobileStyles) 
			if (!old_version) {
				new_version = 20240318.1;
				debugLog("- starting migration: " + old_version + " -> " + new_version);
				// for each: double-check setting to migrate is there
				loaded_settings.toolbars?.forEach((tb: any, index: number) => {
					if (tb.styles) {
						debugLog("\t- OLD SETTING: " + tb.styles);
						debugLog("\t\t- SETTING: this.plugin.settings.toolbars[index].defaultStyles: " + this.plugin.settings.toolbars[index].defaultStyles);
						this.plugin.settings.toolbars[index].defaultStyles = tb.styles;
						debugLog("\t\t- SET: " + this.plugin.settings.toolbars[index].defaultStyles);
						debugLog("\t\t- SETTING: this.plugin.settings.toolbars[index].mobileStyles = []");
						this.plugin.settings.toolbars[index].mobileStyles = [];
						delete tb.styles;
					}
				});
				// for the next migration to run
				old_version = new_version;
			}

			// MIGRATION: added urlAttr setting
			if (old_version === 20240318.1) {
				new_version = 20240322.1;
				debugLog("- starting migration: " + old_version + " -> " + new_version);
				loaded_settings.toolbars?.forEach((tb: any, index: number) => {
					tb.items.forEach((item: any, item_index: number) => {
						if (!item?.urlAttr) {
							debugLog("  - add urlAttr for: ", tb.name, item.label);
							// assume old urls are indeed urls and have variables
							item.urlAttr = {
								hasVars: true,
								isUri: true
							};
						}
					});
				});
				// for the next migration to run
				old_version = new_version;
			}

			// MIGRATION: support for icons + generic links with types
			if (old_version === 20240322.1) {
				new_version = 20240330.1;
				debugLog("- starting migration: " + old_version + " -> " + new_version);
				loaded_settings.toolbars?.forEach((tb: any, index: number) => {
					tb.items.forEach((item: any, item_index: number) => {
						this.plugin.settings.toolbars[index].items[item_index].icon = "";
						if (item.url) {
							this.plugin.settings.toolbars[index].items[item_index].link = item.url;
							delete item.url;
						}
						if (item.urlAttr) {
							this.plugin.settings.toolbars[index].items[item_index].linkAttr = {
								commandId: "",
								hasVars: item.urlAttr.hasVars,
								type: item.urlAttr.isUri ? ItemType.Uri : ItemType.File
							};
							delete item.urlAttr;
						}
					});
				});
				// for the next migration to run
				old_version = new_version;
			}

			// MIGRATION: support for position + contexts
			if (old_version === 20240330.1) {
				new_version = 20240416.1;
				debugLog("- starting migration: " + old_version + " -> " + new_version);
				loaded_settings.toolbars?.forEach((tb: any, index: number) => {
					tb.items.forEach((item: any, item_index: number) => {
						// convert hideOnDesktop + hideOnMobile to contexts
						this.plugin.settings.toolbars[index].items[item_index].contexts = [{
							platform: this.migrateItemVisPlatform(item.hideOnDesktop, item.hideOnMobile), 
							view: ViewType.All}];
						delete item.hideOnDesktop;
						delete item.hideOnMobile;
					});
					this.plugin.settings.toolbars[index].positions = [{
						position: PositionType.Props, 
						contexts: [{
							platform: PlatformType.All, 
							view: ViewType.All
						}]
					}]
				});
				// for the next migration to run
				old_version = new_version;
			}

			// MIGRATION: platform-specific positions + item/component visibiility
			if (old_version === 20240416.1) {
				new_version = 20240426.1;
				debugLog("- starting migration: " + old_version + " -> " + new_version);
				loaded_settings.toolbars?.forEach((tb: any, index: number) => {
					// toolbar position -> platform-specific positions
					if (this.plugin.settings.toolbars[index].positions) {
						this.plugin.settings.toolbars[index].positions?.forEach((pos, posIndex) => {
							this.plugin.settings.toolbars[index].position = {} as Position;
							if (pos.contexts) {
								pos.contexts?.forEach((ctx: ItemViewContext, ctxIndex) => {
									if (pos.position) {
										switch (ctx.platform) {
											case PlatformType.Desktop:
												this.plugin.settings.toolbars[index].position.desktop = {
													allViews: { position: pos.position }
												}
												break;
											case PlatformType.Mobile:
												this.plugin.settings.toolbars[index].position.mobile = {
													allViews: { position: pos.position }
												}
												this.plugin.settings.toolbars[index].position.tablet = {
													allViews: { position: pos.position }
												}
												break;
											case PlatformType.All:
												this.plugin.settings.toolbars[index].position.desktop = {
													allViews: { position: pos.position }
												}
												this.plugin.settings.toolbars[index].position.mobile = {
													allViews: { position: pos.position }
												}
												this.plugin.settings.toolbars[index].position.tablet = {
													allViews: { position: pos.position }
												}
												break;
										}
									}
								});
							}
						});
						delete this.plugin.settings.toolbars[index].positions;
					}
					// item contexts -> item / component visibility
					tb.items.forEach((item: any, item_index: number) => {
						if (this.plugin.settings.toolbars[index].items[item_index].contexts) {							
							this.plugin.settings.toolbars[index].items[item_index].contexts?.forEach((ctx: ItemViewContext, ctxIndex) => {
								if (!this.plugin.settings.toolbars[index].items[item_index].visibility) {
									this.plugin.settings.toolbars[index].items[item_index].visibility = {} as Visibility;
									switch (ctx.platform) {
										case PlatformType.Desktop:
											this.plugin.settings.toolbars[index].items[item_index].visibility.desktop = {
												allViews: {	components: [ComponentType.Icon, ComponentType.Label] }
											}
											break;
										case PlatformType.Mobile:
											this.plugin.settings.toolbars[index].items[item_index].visibility.mobile = {
												allViews: {	components: [ComponentType.Icon, ComponentType.Label] }
											}
											this.plugin.settings.toolbars[index].items[item_index].visibility.tablet = {
												allViews: {	components: [ComponentType.Icon, ComponentType.Label] }
											}
											break;
										case PlatformType.All:
											this.plugin.settings.toolbars[index].items[item_index].visibility.desktop = {
												allViews: {	components: [ComponentType.Icon, ComponentType.Label] }
											}
											this.plugin.settings.toolbars[index].items[item_index].visibility.mobile = {
												allViews: {	components: [ComponentType.Icon, ComponentType.Label] }
											}
											this.plugin.settings.toolbars[index].items[item_index].visibility.tablet = {
												allViews: {	components: [ComponentType.Icon, ComponentType.Label] }
											}
											break;
										case PlatformType.None:
										default:
											break;
									}
								}
							});
							delete this.plugin.settings.toolbars[index].items[item_index].contexts;
						}
					});
				});
				// for the next migration to run
				old_version = new_version;
			}

			// MIGRATION: add and use IDs for toolbars and items
			if (old_version === 20240426.1) {
				new_version = 20240727.1;
				debugLog("- starting migration: " + old_version + " -> " + new_version);
				loaded_settings.toolbars?.forEach((tb: any, index: number) => {
					// add UUIDs to toolbars first
					this.plugin.settings.toolbars[index].uuid = this.plugin.settings.toolbars[index].uuid 
						? this.plugin.settings.toolbars[index].uuid
						: getUUID();
				});
				loaded_settings.toolbars?.forEach((tb: any, index: number) => {
					tb.items.forEach((item: any, item_index: number) => {
						// add UUIDs to items
						this.plugin.settings.toolbars[index].items[item_index].uuid = this.plugin.settings.toolbars[index].items[item_index].uuid
							? this.plugin.settings.toolbars[index].items[item_index].uuid
							: getUUID();
						// update item menu type references to use toolbar UUIDs
						if (item.linkAttr.type === ItemType.Menu) {
							let menuToIdToolbar = this.getToolbarByName(item.link);
							// just skip if we can't find it
							menuToIdToolbar 
								? this.plugin.settings.toolbars[index].items[item_index].link = menuToIdToolbar?.uuid
								: undefined;
						}
					});
				});
				// update folder mappings to use toolbar UUIDs
				loaded_settings.folderMappings?.forEach((mapping: any, index: number) => {
					let mapToIdToolbar = this.getToolbarByName(mapping.toolbar);
					// just skip if we can't find it
					mapToIdToolbar ? this.plugin.settings.folderMappings[index].toolbar = mapToIdToolbar.uuid : undefined;
				});
				// for the next migration to run
				old_version = new_version;
			}

			// COMMENT THIS OUT while testing new migration code
			this.plugin.settings.version = SETTINGS_VERSION;
			debugLog("updated settings:", this.plugin.settings);

			// ensure that migrated settings are saved 
			await this.save();

		}

	}

	/**
	 * Saves settings.
	 * Sorts the toolbar list (by name) first.
	 */
	async save(): Promise<void> {
		await this.plugin.saveData(this.plugin.settings);

		await this.plugin.removeActiveToolbar();
		await this.plugin.renderToolbarForActiveFile();

		debugLog("SETTINGS SAVED: " + new Date().getTime());
	}

	/*************************************************************************
	 * HELPERS
	 *************************************************************************/

	/**
	 * Migration: Returns the platform visibility value corresponding to the UI flags set for hideOnDesktop, hideOnMobile;
	 * Platform value should be the opposite of these flags.
	 * @param hideOnDesktop 
	 * @param hideOnMobile 
	 * @returns PlatformType
	 */
	migrateItemVisPlatform(hideOnDesktop: boolean, hideOnMobile: boolean): PlatformType {
		if (!hideOnDesktop && !hideOnMobile) {
			return PlatformType.All;
		} else if (hideOnDesktop && hideOnMobile) {
			return PlatformType.None;
		} else if (hideOnMobile) {
			return PlatformType.Desktop;
		} else if (hideOnDesktop) {
			return PlatformType.Mobile;
		} else {
			// this case should never occur
			return PlatformType.All;
		}
	}

}