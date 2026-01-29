import NoteToolbarPlugin from "main";
import { getUUID } from "Utils/Utils";
import { ItemType, ItemViewContext, PlatformType, Position, PositionType, SETTINGS_VERSION, ViewType, Visibility } from "./NoteToolbarSettings";


export default class SettingsMigrator {
    
    constructor(
        private ntb: NoteToolbarPlugin
    ) {}

    run(loaded_settings: any, old_version: number) {

        let new_version: number;

        this.ntb.debugGroup("SettingsMigrator: running migrations...");

        // first version without update (i.e., version is `undefined`)
        // MIGRATION: moved styles to defaultStyles (and introduced mobileStyles) 
        if (!old_version) {
            new_version = 20240318.1;
            this.ntb.debug("- starting migration: " + old_version + " -> " + new_version);
            // for each: double-check setting to migrate is there
            loaded_settings.toolbars?.forEach((tb: any, index: number) => {
                if (tb.styles) {
                    this.ntb.debug("\t- OLD SETTING: " + tb.styles);
                    this.ntb.debug("\t\t- SETTING: this.plugin.settings.toolbars[index].defaultStyles: " + this.ntb.settings.toolbars[index].defaultStyles);
                    this.ntb.settings.toolbars[index].defaultStyles = tb.styles;
                    this.ntb.debug("\t\t- SET: " + this.ntb.settings.toolbars[index].defaultStyles);
                    this.ntb.debug("\t\t- SETTING: this.plugin.settings.toolbars[index].mobileStyles = []");
                    this.ntb.settings.toolbars[index].mobileStyles = [];
                    delete tb.styles;
                }
            });
            // for the next migration to run
            old_version = new_version;
        }

        // MIGRATION: added urlAttr setting
        if (old_version === 20240318.1) {
            new_version = 20240322.1;
            this.ntb.debug("- starting migration: " + old_version + " -> " + new_version);
            loaded_settings.toolbars?.forEach((tb: any, index: number) => {
                tb.items.forEach((item: any, item_index: number) => {
                    if (!item?.urlAttr) {
                        this.ntb.debug("  - add urlAttr for: ", tb.name, item.label);
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
            this.ntb.debug("- starting migration: " + old_version + " -> " + new_version);
            loaded_settings.toolbars?.forEach((tb: any, index: number) => {
                tb.items.forEach((item: any, item_index: number) => {
                    this.ntb.settings.toolbars[index].items[item_index].icon = "";
                    if (item.url) {
                        this.ntb.settings.toolbars[index].items[item_index].link = item.url;
                        delete item.url;
                    }
                    if (item.urlAttr) {
                        this.ntb.settings.toolbars[index].items[item_index].linkAttr = {
                            commandCheck: false,
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
            this.ntb.debug("- starting migration: " + old_version + " -> " + new_version);
            loaded_settings.toolbars?.forEach((tb: any, index: number) => {
                tb.items.forEach((item: any, item_index: number) => {
                    // convert hideOnDesktop + hideOnMobile to contexts
                    this.ntb.settings.toolbars[index].items[item_index].contexts = [{
                        platform: this.migrateItemVisPlatform(item.hideOnDesktop, item.hideOnMobile), 
                        view: ViewType.All}];
                    delete item.hideOnDesktop;
                    delete item.hideOnMobile;
                });
                this.ntb.settings.toolbars[index].positions = [{
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
            this.ntb.debug("- starting migration: " + old_version + " -> " + new_version);
            loaded_settings.toolbars?.forEach((tb: any, index: number) => {
                // toolbar position -> platform-specific positions
                if (this.ntb.settings.toolbars[index].positions) {
                    this.ntb.settings.toolbars[index].positions?.forEach((pos, posIndex) => {
                        this.ntb.settings.toolbars[index].position = {} as Position;
                        if (pos.contexts) {
                            pos.contexts?.forEach((ctx: ItemViewContext, ctxIndex) => {
                                if (pos.position) {
                                    switch (ctx.platform) {
                                        case PlatformType.Desktop:
                                            this.ntb.settings.toolbars[index].position.desktop = {
                                                allViews: { position: pos.position }
                                            }
                                            break;
                                        case PlatformType.Mobile:
                                            this.ntb.settings.toolbars[index].position.mobile = {
                                                allViews: { position: pos.position }
                                            }
                                            this.ntb.settings.toolbars[index].position.tablet = {
                                                allViews: { position: pos.position }
                                            }
                                            break;
                                        case PlatformType.All:
                                            this.ntb.settings.toolbars[index].position.desktop = {
                                                allViews: { position: pos.position }
                                            }
                                            this.ntb.settings.toolbars[index].position.mobile = {
                                                allViews: { position: pos.position }
                                            }
                                            this.ntb.settings.toolbars[index].position.tablet = {
                                                allViews: { position: pos.position }
                                            }
                                            break;
                                    }
                                }
                            });
                        }
                    });
                    delete this.ntb.settings.toolbars[index].positions;
                }
                // item contexts -> item / component visibility
                tb.items.forEach((item: any, item_index: number) => {
                    if (this.ntb.settings.toolbars[index].items[item_index].contexts) {							
                        this.ntb.settings.toolbars[index].items[item_index].contexts?.forEach((ctx: ItemViewContext, ctxIndex) => {
                            if (!this.ntb.settings.toolbars[index].items[item_index].visibility) {
                                this.ntb.settings.toolbars[index].items[item_index].visibility = {} as Visibility;
                                // OLD MIGRATION CODE REMOVED AS TYPES CHANGED FOR 202601XX
                                // switch (ctx.platform) {
                                // 	case PlatformType.Desktop:
                                // 		this.ntb.settings.toolbars[index].items[item_index].visibility.desktop = {
                                // 			allViews: {	components: [ComponentType.Icon, ComponentType.Label] }
                                // 		}
                                // 		break;
                                // 	case PlatformType.Mobile:
                                // 		this.ntb.settings.toolbars[index].items[item_index].visibility.mobile = {
                                // 			allViews: {	components: [ComponentType.Icon, ComponentType.Label] }
                                // 		}
                                // 		this.ntb.settings.toolbars[index].items[item_index].visibility.tablet = {
                                // 			allViews: {	components: [ComponentType.Icon, ComponentType.Label] }
                                // 		}
                                // 		break;
                                // 	case PlatformType.All:
                                // 		this.ntb.settings.toolbars[index].items[item_index].visibility.desktop = {
                                // 			allViews: {	components: [ComponentType.Icon, ComponentType.Label] }
                                // 		}
                                // 		this.ntb.settings.toolbars[index].items[item_index].visibility.mobile = {
                                // 			allViews: {	components: [ComponentType.Icon, ComponentType.Label] }
                                // 		}
                                // 		this.ntb.settings.toolbars[index].items[item_index].visibility.tablet = {
                                // 			allViews: {	components: [ComponentType.Icon, ComponentType.Label] }
                                // 		}
                                // 		break;
                                // 	case PlatformType.None:
                                // 	default:
                                // 		break;
                                // }
                            }
                        });
                        delete this.ntb.settings.toolbars[index].items[item_index].contexts;
                    }
                });
            });
            // for the next migration to run
            old_version = new_version;
        }

        // MIGRATION: add and use IDs for toolbars and items
        if (old_version === 20240426.1) {
            new_version = 20240727.1;
            this.ntb.debug("- starting migration: " + old_version + " -> " + new_version);
            loaded_settings.toolbars?.forEach((tb: any, index: number) => {
                // add UUIDs to toolbars first
                this.ntb.settings.toolbars[index].uuid = this.ntb.settings.toolbars[index].uuid 
                    ? this.ntb.settings.toolbars[index].uuid
                    : getUUID();
            });
            loaded_settings.toolbars?.forEach((tb: any, index: number) => {
                tb.items.forEach((item: any, item_index: number) => {
                    // add UUIDs to items
                    this.ntb.settings.toolbars[index].items[item_index].uuid = this.ntb.settings.toolbars[index].items[item_index].uuid
                        ? this.ntb.settings.toolbars[index].items[item_index].uuid
                        : getUUID();
                    // update item menu type references to use toolbar UUIDs
                    if (item.linkAttr.type === ItemType.Menu) {
                        let menuToIdToolbar = this.ntb.settingsManager.getToolbarByName(item.link);
                        // just skip if we can't find it
                        menuToIdToolbar 
                            ? this.ntb.settings.toolbars[index].items[item_index].link = menuToIdToolbar?.uuid
                            : undefined;
                    }
                });
            });
            // update folder mappings to use toolbar UUIDs
            loaded_settings.folderMappings?.forEach((mapping: any, index: number) => {
                let mapToIdToolbar = this.ntb.settingsManager.getToolbarByName(mapping.toolbar);
                // just skip if we can't find it
                mapToIdToolbar ? this.ntb.settings.folderMappings[index].toolbar = mapToIdToolbar.uuid : undefined;
            });
            // for the next migration to run
            old_version = new_version;
        }

        // MIGRATION: add and use IDs for toolbars and items
        if (old_version === 20240727.1) {
            new_version = 20250302.1;
            this.ntb.debug("- starting migration: " + old_version + " -> " + new_version);
            // don't show onboarding for new toolbars if user's already mapped stuff 
            if (loaded_settings.folderMappings.length > 0) {
                this.ntb.settings.onboarding['new-toolbar-mapping'] = true;
            }
            // for the next migration to run
            old_version = new_version;
        }

        // MIGRATION: set gallery flag on existing items
        if (old_version === 20250302.1) {
            new_version = 20250313.1;
            this.ntb.debug("- starting migration: " + old_version + " -> " + new_version);
            loaded_settings.toolbars?.forEach((tb: any, index: number) => {
                tb.items.forEach((item: any, item_index: number) => {
                    this.ntb.settings.toolbars[index].items[item_index].inGallery = false;
                });
            });
            // for the next migration to run
            old_version = new_version;
        }

        // MIGRATION: separated view `mode` visibility setting (remove "allViews" level)
        if (old_version === 20250313.1) {
            new_version = 20260122.1;
            this.ntb.debug("starting migration: " + old_version + " -> " + new_version);
            loaded_settings.toolbars?.forEach((tb: any, index: number) => {
                tb.items.forEach((item: any, item_index: number) => {
                    // @ts-ignore
                    let desktop = this.ntb.settings.toolbars[index].items[item_index].visibility.desktop?.allViews;
                    // @ts-ignore
                    let mobile = this.ntb.settings.toolbars[index].items[item_index].visibility.mobile?.allViews;
                    // @ts-ignore
                    let tablet = this.ntb.settings.toolbars[index].items[item_index].visibility.tablet?.allViews;
                    if (desktop) this.ntb.settings.toolbars[index].items[item_index].visibility.desktop = desktop;
                    if (mobile) this.ntb.settings.toolbars[index].items[item_index].visibility.mobile = mobile;
                    if (tablet) this.ntb.settings.toolbars[index].items[item_index].visibility.tablet = tablet;
                });
            });
            // for the next migration to run
            old_version = new_version;
        }

        // COMMENT THIS OUT while testing new migration code
        this.ntb.settings.version = SETTINGS_VERSION;

        this.ntb.debug("migrated settings:", this.ntb.settings);
        this.ntb.debugGroupEnd();

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