import galleryItems from "Gallery/gallery-items.json";
import NoteToolbarPlugin from "main";
import { DEFAULT_ITEM_VISIBILITY_SETTINGS, EMPTY_TOOLBAR_ID, ItemType, t, ToolbarItemSettings, ToolbarSettings } from "Settings/NoteToolbarSettings";
import ToolbarSuggestModal from "Settings/UI/Modals/ToolbarSuggestModal";
import { confirmWithModal } from "Settings/UI/Modals/ConfirmModal";
import { Notice, Platform } from "obsidian";
import { openScriptPrompt } from "Settings/UI/Utils/SettingsUIUtils";

export default class GalleryManager {

    private items: ToolbarItemSettings[] = [];

    constructor(
        private ntb: NoteToolbarPlugin
    ) {}

    getItems(): ToolbarItemSettings[] {
        if (this.items.length === 0) this.loadItems();
        return this.items;
    }

	/**
	 * Adds the provided Gallery item, after prompting for the toolbar to add it to.
	 * @param galleryItem Gallery item to add
	 */
	async addItem(galleryItem: ToolbarItemSettings): Promise<void> {
		const toolbarModal = new ToolbarSuggestModal(this.ntb, true, false, true, async (selectedToolbar: ToolbarSettings) => {
			if (selectedToolbar && galleryItem) {
				if (selectedToolbar.uuid === EMPTY_TOOLBAR_ID) {
					selectedToolbar = await this.ntb.settingsManager.newToolbar(t('setting.toolbars.new-tbar-name'));
				}
				let newItem = await this.ntb.settingsManager.duplicateToolbarItem(selectedToolbar, galleryItem);
                const isResolved = await this.ntb.settingsManager.resolveGalleryItem(newItem);
                if (!isResolved) return;
				selectedToolbar.updated = new Date().toISOString();
				await this.ntb.settingsManager.save();
				this.ntb.commands.openToolbarSettingsForId(selectedToolbar.uuid, newItem.uuid);
                new Notice(
                    t('setting.add-item.notice-item-added', { toolbarName: selectedToolbar.name, interpolation: { escapeValue: false } })
                ).containerEl.addClass('mod-success');
			}
		});

        // confirm with user if they would like to enable scripting
        const isScriptingEnabled = await openScriptPrompt(this.ntb, galleryItem);
        if (!isScriptingEnabled) return;

        switch (galleryItem.linkAttr.type) {
            case ItemType.Command: {
                // check if the item's command exists, before displaying toolbar modal
                const command = this.ntb.app.commands.commands[galleryItem.linkAttr.commandId];
                const commandPluginId = galleryItem.linkAttr.commandId.split(':')[0];
                if (!command) {
                    // prompt the user if they'd still like to add it
                    // get plugin name if known, otherwise show command ID
                    const pluginName = t(`plugin.${commandPluginId}`, { defaultValue: '' });
                    confirmWithModal(
                        this.ntb.app, 
                        {
                            title: t('setting.add-item.title-confirm', { itemName: galleryItem.tooltip }),
                            questionLabel: pluginName 
                                ? t('setting.add-item.label-confirm-plugin', { plugin: pluginName })
                                : t('setting.add-item.label-confirm-command', { commandId: galleryItem.linkAttr.commandId }),
                            approveLabel: t('setting.button-proceed'),
                            denyLabel: t('setting.button-cancel')
                        }
                    ).then((isConfirmed: boolean) => {
                        if (isConfirmed) toolbarModal.open();
                    });
                }
                else {
                    toolbarModal.open();
                }
                break;
            }
            case ItemType.JavaScript:
            case ItemType.Uri:
                // on mobile, check if this item uses a `file://` URI, which is not generally supported
                if (Platform.isMobile) {
                    const hasFileUri = galleryItem.link.startsWith('file://') || galleryItem.scriptConfig?.expression?.includes('file://');
                    if (hasFileUri) {
                        // prompt the user if they'd still like to add it
                        confirmWithModal(
                            this.ntb.app, 
                            {
                                title: t('setting.add-item.title-confirm', { itemName: galleryItem.tooltip }),
                                questionLabel: t('setting.add-item.label-confirm-mobile-uri', { uri: galleryItem.link }),
                                approveLabel: t('setting.button-proceed'),
                                denyLabel: t('setting.button-cancel')
                            }
                        ).then((isConfirmed: boolean) => {
                            if (isConfirmed) toolbarModal.open();
                        });
                    }
                    else {
                        toolbarModal.open();
                    }
                }
                else {
                    toolbarModal.open();
                }
                break;
            default:
                toolbarModal.open();
                break;
        }

	}

    private loadItems() {
        const startTime = performance.now();
        
        const language = (typeof i18next.language === 'string' && i18next.language.trim()) || 'en';
        this.items = galleryItems
            .filter((item: any) => {
                const excludeOn = item.excludeOn
                    ? (Array.isArray(item.excludeOn) ? item.excludeOn : [item.excludeOn])
                    : [];
                return !(
                    (excludeOn.includes('mobile') && Platform.isMobile) ||
                    (excludeOn.includes('desktop') && Platform.isDesktop) ||
                    (excludeOn.includes('phone') && Platform.isPhone)
                );
            })
            .map((item: any) => ({
                uuid: item.id ?? '',
                description: item.description ? (item.description[language] || item.description['en']) : '',
                hasCommand: false,
                icon: item.icon ?? '',
                inGallery: true,
                label: item.label ? (item.label[language] || item.label['en']) : '',
                link: item.uri ?? '',
                linkAttr: {
                    commandCheck: item.commandCheck ?? false,
                    commandId: item.commandId ?? '',
                    focus: item.focus || undefined,
                    hasVars: false,
                    target: item.target ?? '',
                    type: item.type
                },
                plugin: item.plugin ?? '',
                scriptConfig: item.script ? {
                    expression: item.script ?? '',
                    pluginFunction: 'TBD'
                } : undefined,
                tooltip: item.tooltip ? (item.tooltip[language] || item.tooltip['en']) : '',
                visibility: DEFAULT_ITEM_VISIBILITY_SETTINGS
            }));
        
        this.items.sort((a, b) => a.tooltip.localeCompare(b.tooltip));

        const endTime = performance.now();
        this.ntb.debug(`Gallery loaded in ${endTime - startTime} ms`);
    }

}