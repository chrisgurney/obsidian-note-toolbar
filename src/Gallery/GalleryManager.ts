import gallery from "Gallery/gallery.json";
import NoteToolbarPlugin from "main";
import { DEFAULT_ITEM_VISIBILITY_SETTINGS, ToolbarItemSettings } from "../Settings/NoteToolbarSettings";
import { debugLog } from "Utils/Utils";

export default class GalleryManager {

    private items: ToolbarItemSettings[] | undefined;

    constructor(private plugin: NoteToolbarPlugin) {
    }

    load() {
        const lang = i18next.language || 'en';
        this.items = gallery.map((item: any) => ({
            uuid: '',
            description: item.description?.[lang],
            hasCommand: false,
            icon: item.icon,
            isGalleryItem: true,
            label: item.label[lang],
            link: item.link ?? '',
            linkAttr: {
                commandId: item.commandId,
                hasVars: false,
                type: item.type
            },
            scriptConfig: item.scriptConfig,
            tooltip: item.tooltip[lang],
            visibility: DEFAULT_ITEM_VISIBILITY_SETTINGS
        }));
    }

    getItems(): ToolbarItemSettings[] | undefined {
        debugLog(this.items);
        return this.items;
    }

}