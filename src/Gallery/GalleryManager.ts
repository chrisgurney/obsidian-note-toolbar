import galleryItems from "Gallery/items.json";
import NoteToolbarPlugin from "main";
import { DEFAULT_ITEM_VISIBILITY_SETTINGS, ToolbarItemSettings } from "../Settings/NoteToolbarSettings";
import { debugLog } from "Utils/Utils";

export default class GalleryManager {

    private items: ToolbarItemSettings[] = [];

    constructor(private plugin: NoteToolbarPlugin) {
    }

    getItems(): ToolbarItemSettings[] {
        if (this.items.length === 0) this.loadItems();
        return this.items;
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