import galleryItems from "Gallery/gallery-items.json";
import NoteToolbarPlugin from "main";
import { Notice, PaneType, Platform } from "obsidian";
import { DEFAULT_ITEM_VISIBILITY_SETTINGS, EMPTY_TOOLBAR, EMPTY_TOOLBAR_ID, ItemFocusType, ItemType, t, ToolbarItemSettings, ToolbarSettings } from "Settings/NoteToolbarSettings";
import { confirmWithModal } from "Settings/UI/Modals/ConfirmModal";
import MessageModal from "Settings/UI/Modals/MessageModal";
import ToolbarSuggestModal from "Settings/UI/Modals/ToolbarSuggestModal";
import { URLS } from "Utils/Urls";

export type GalleryItemSettings = {
    id: string;
    commandCheck?: boolean;
    commandId?: string;
    description?: Record<string, string>;
    excludeOn?: string | string[];
    focus?: ItemFocusType;
    icon: string;
    plugin?: string | string[];
    script?: string;
    target?: PaneType | 'modal';
    tooltip?: Record<string, string>;
    type: ItemType;
    uri?: string;
}

export default class GalleryManager {

    private items: ToolbarItemSettings[] = [];

    constructor(
        private ntb: NoteToolbarPlugin
    ) {}

    getItems(): ToolbarItemSettings[] {
        if (this.items.length === 0) this.loadItems();
        return this.items;
    }

    async addItemToToolbar(
        toolbar: ToolbarSettings,
        galleryItem: ToolbarItemSettings | ToolbarItemSettings[],
        position?: number
    ): Promise<ToolbarItemSettings[]> {
        const items = Array.isArray(galleryItem) ? galleryItem : [galleryItem];
        const added: ToolbarItemSettings[] = [];
        let currentPosition = position;
        for (const item of items) {
            const newItem = await this.ntb.settingsManager.duplicateToolbarItem(toolbar, item, currentPosition);
            const isResolved = await this.ntb.settingsManager.resolveGalleryItem(newItem);
            if (!isResolved) continue;
            if (currentPosition !== undefined) currentPosition++;
            added.push(newItem);
        }
        if (added.length) {
            toolbar.updated = new Date().toISOString();
            await this.ntb.settingsManager.save();
        }
        return added;
    }

	/**
	 * Adds the provided Gallery item, after prompting for the toolbar to add it to.
	 * @param galleryItem Gallery item to add
	 */
	async addItemWithPrompt(galleryItem: ToolbarItemSettings): Promise<void> {

        const addItemToToolbar = async (toolbar: ToolbarSettings): Promise<void> => {
			if (toolbar && galleryItem) {
				if (toolbar.uuid === EMPTY_TOOLBAR_ID) {
					toolbar = await this.ntb.settingsManager.newToolbar();
				}
				const [newItem] = await this.addItemToToolbar(toolbar, galleryItem);
                if (!newItem) return;
				this.ntb.commands.openToolbarSettingsForId(toolbar.uuid, newItem.uuid);
                new Notice(
                    t('setting.add-item.notice-item-added', { toolbarName: toolbar.name, interpolation: { escapeValue: false } })
                ).containerEl.addClass('mod-success');
			}
        }
        
        const toolbarSuggester = new ToolbarSuggestModal(this.ntb, true, false, true, (toolbar: ToolbarSettings) => void addItemToToolbar(toolbar));

        const doNextStep = async () => {
            if (this.ntb.settings.toolbars.length > 0) toolbarSuggester.open()
                else await addItemToToolbar(EMPTY_TOOLBAR);
        }

        // prompt: confirm with user if they would like to enable scripting
        const isScriptingEnabled = await this.ntb.settingsUtils.openScriptPrompt(galleryItem);
        if (!isScriptingEnabled) return;

        // prompts for certain item types
        switch (galleryItem.linkAttr.type) {
			case ItemType.Additional: {
				const messageModal = new MessageModal(
					this.ntb, 
					t('gallery.label-additional-title', { item: galleryItem.tooltip }), 
					t('gallery.label-additional-description'),
					URLS.GH_USER_GUIDE + '/Additional-Gallery-items', 
					t('gallery.label-additional-cta')
				);
				messageModal.open();
				break;
			}
            case ItemType.Command: {
                // check if the item's command exists, before displaying toolbar modal
                const command = this.ntb.app.commands.commands[galleryItem.linkAttr.commandId];
                const commandPluginId = galleryItem.linkAttr.commandId.split(':')[0];
                if (!command) {
                    // prompt the user if they'd still like to add it
                    // get plugin name if known, otherwise show command ID
                    const pluginName = t(`plugin.${commandPluginId}`, { defaultValue: '' });
                    const proceedWithoutCommand = await confirmWithModal(this.ntb.app, {
                        title: t('setting.add-item.title-confirm', { itemName: galleryItem.tooltip }),
                        questionLabel: pluginName 
                            ? t('setting.add-item.label-confirm-plugin', { plugin: pluginName })
                            : t('setting.add-item.label-confirm-command', { commandId: galleryItem.linkAttr.commandId }),
                        approveLabel: t('setting.button-proceed'),
                        denyLabel: t('setting.button-cancel')
                    });
                    if (proceedWithoutCommand) await doNextStep();
                }
                else await doNextStep();
                break;
            }
            case ItemType.JavaScript:
            case ItemType.Uri:
                // on mobile, check if this item uses a `file://` URI, which is not generally supported
                if (Platform.isMobile) {
                    const hasFileUri = galleryItem.link.startsWith('file://') || galleryItem.scriptConfig?.expression?.includes('file://');
                    if (hasFileUri) {
                        // prompt the user if they'd still like to add it
                        const proceedWithFileUri = await confirmWithModal(this.ntb.app, {
                            title: t('setting.add-item.title-confirm', { itemName: galleryItem.tooltip }),
                            questionLabel: t('setting.add-item.label-confirm-mobile-uri', { uri: galleryItem.link }),
                            approveLabel: t('setting.button-proceed'),
                            denyLabel: t('setting.button-cancel')
                        });
                        if (proceedWithFileUri) await doNextStep();
                    }
                    else await doNextStep();
                }
                else await doNextStep();
                break;
            default:
                await doNextStep();
                break;
        }

	}

    getItemById(id: string): ToolbarItemSettings | undefined {
        return this.getItems().find((item) => item.uuid === id);
    }

    private loadItems() {
        const startTime = performance.now();
        
        const language = (typeof i18next.language === 'string' && i18next.language.trim()) || 'en';
        const typedGalleryItems = galleryItems as GalleryItemSettings[];
        this.items = typedGalleryItems
            .filter((item) => {
                const excludeOn = item.excludeOn
                    ? (Array.isArray(item.excludeOn) ? item.excludeOn : [item.excludeOn])
                    : [];
                return !(
                    (excludeOn.includes('mobile') && Platform.isMobile) ||
                    (excludeOn.includes('desktop') && Platform.isDesktop) ||
                    (excludeOn.includes('phone') && Platform.isPhone)
                );
            })
            .map((item) => ({
                uuid: item.id ?? '',
                description: item.description ? (item.description[language] || item.description['en']) : '',
                hasCommand: false,
                icon: item.icon ?? '',
                inGallery: true,
                label: '',
                link: item.uri ?? '',
                linkAttr: {
                    commandCheck: item.commandCheck ?? false,
                    commandId: item.commandId ?? '',
                    focus: item.focus || undefined,
                    hasVars: false,
                    target: item.target ?? undefined,
                    type: item.type
                },
                plugin: item.plugin ?? '',
                scriptConfig: item.script ? {
                    expression: item.script ?? '',
                    pluginFunction: 'TBD'
                } : undefined,
                tooltip: item.tooltip ? (item.tooltip[language] || item.tooltip['en']) : '',
                visibility: { ...DEFAULT_ITEM_VISIBILITY_SETTINGS }
            }));
        
        this.items.sort((a, b) => a.tooltip.localeCompare(b.tooltip));

        const endTime = performance.now();
        this.ntb.debug(`Gallery loaded in ${endTime - startTime} ms`);
    }

}