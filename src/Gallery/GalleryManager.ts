import galleryItems from "Gallery/items.json";
import NoteToolbarPlugin from "main";
import { DEFAULT_ITEM_VISIBILITY_SETTINGS, EMPTY_TOOLBAR_ID, ItemType, t, ToolbarItemSettings, ToolbarSettings } from "../Settings/NoteToolbarSettings";
import { debugLog } from "Utils/Utils";
import { ToolbarSuggestModal } from "Settings/UI/Modals/ToolbarSuggestModal";

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
				if (newItem.linkAttr.type === ItemType.Plugin) {
					const pluginType = await this.plugin.settingsManager.resolvePluginType(newItem);
					if (!pluginType) return;
				}
				selectedToolbar.updated = new Date().toISOString();
				await this.plugin.settingsManager.save();
				this.plugin.commands.openToolbarSettingsForId(selectedToolbar.uuid, newItem.uuid);
			}
		});
		toolbarModal.open();
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