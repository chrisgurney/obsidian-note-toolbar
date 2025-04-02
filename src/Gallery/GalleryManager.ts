import galleryItems from "Gallery/items.json";
import NoteToolbarPlugin from "main";
import { DEFAULT_ITEM_VISIBILITY_SETTINGS, EMPTY_TOOLBAR_ID, ItemType, t, ToolbarItemSettings, ToolbarSettings } from "../Settings/NoteToolbarSettings";
import { debugLog } from "Utils/Utils";
import { ToolbarSuggestModal } from "Settings/UI/Modals/ToolbarSuggestModal";
import { confirmWithModal } from "Settings/UI/Modals/ConfirmModal";
import { Platform } from "obsidian";

export default class GalleryManager {

    private items: ToolbarItemSettings[] = [];

    constructor(private plugin: NoteToolbarPlugin) {
    }

    getItems(): ToolbarItemSettings[] {
        if (this.items.length === 0) this.loadItems();
        return this.items;
    }

	/**
	 * Adds the provided Gallery item, after prompting for the toolbar to add it to.
	 * @param galleryItem Gallery item to add
	 */
	addItem(galleryItem: ToolbarItemSettings): void {
		const toolbarModal = new ToolbarSuggestModal(this.plugin, true, false, true, async (selectedToolbar: ToolbarSettings) => {
			if (selectedToolbar && galleryItem) {
				if (selectedToolbar.uuid === EMPTY_TOOLBAR_ID) {
					selectedToolbar = await this.plugin.settingsManager.newToolbar(t('setting.toolbars.new-tbar-name'));
				}
				let newItem = await this.plugin.settingsManager.duplicateToolbarItem(selectedToolbar, galleryItem);
                const isResolved = await this.plugin.settingsManager.resolveGalleryItem(newItem);
                if (!isResolved) return;
				selectedToolbar.updated = new Date().toISOString();
				await this.plugin.settingsManager.save();
				this.plugin.commands.openToolbarSettingsForId(selectedToolbar.uuid, newItem.uuid);
			}
		});

        switch (galleryItem.linkAttr.type) {
            case ItemType.Command:
                // check if the item's command exists, before displaying toolbar modal
                const command = this.plugin.app.commands.commands[galleryItem.linkAttr.commandId];
                if (!command) {
                    // prompt the user if they'd still like to add it
                    confirmWithModal(
                        this.plugin.app, 
                        {
                            title: t('setting.add-item.title-confirm', { itemName: galleryItem.tooltip }),
                            questionLabel: t('setting.add-item.label-confirm-command', { commandId: galleryItem.linkAttr.commandId }),
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
            case ItemType.JavaScript:
            case ItemType.Uri:
                // on mobile, check if this item uses a `file://` URI, which is not generally supported
                if (Platform.isMobile) {
                    const hasFileUri = galleryItem.link.startsWith('file://') || galleryItem.scriptConfig?.expression?.includes('file://');
                    if (hasFileUri) {
                        // prompt the user if they'd still like to add it
                        confirmWithModal(
                            this.plugin.app, 
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
        
        const lang = i18next.language || 'en';
        this.items = galleryItems.map((item: any) => ({
            uuid: item.id ?? '',
            description: item.description ? (item.description[lang] || item.description['en']) : '',
            hasCommand: false,
            icon: item.icon ?? '',
            inGallery: true,
            label: item.label ? (item.label[lang] || item.label['en']) : '',
            link: item.uri ?? '',
            linkAttr: {
                commandId: item.commandId ?? '',
                hasVars: false,
                target: item.target ?? '',
                type: item.type
            },
            plugin: item.plugin ?? '',
            scriptConfig: item.script ? {
                expression: item.script ?? '',
                pluginFunction: 'TBD'
            } : undefined,
            tooltip: item.tooltip ? (item.tooltip[lang] || item.tooltip['en']) : '',
            visibility: DEFAULT_ITEM_VISIBILITY_SETTINGS
        }));

        const endTime = performance.now();
        debugLog(`Gallery loaded in ${endTime - startTime} ms`);
    }

}