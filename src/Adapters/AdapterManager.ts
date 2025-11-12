import NoteToolbarPlugin from "main";
import { ItemType } from "Settings/NoteToolbarSettings";
import { Adapter } from "./Adapter";
import DataviewAdapter from "./DataviewAdapter";
import JavaScriptAdapter from "./JavaScriptAdapter";
import JsEngineAdapter from "./JsEngineAdapter";
import TemplaterAdapter from "./TemplaterAdapter";

export default class AdapterManager {

    private internalPluginsEnabled: { [key: string]: boolean } = {
        'page-preview': false,
        'webviewer': false,
    }

	// for tracking other plugins available (for adapters and rendering edge cases)
	private plugins: { [key: string]: boolean } = {
		'dataview': false,
		'js-engine': false,
		'make-md': false,
		'templater-obsidian': false,
	}

	dv: DataviewAdapter | undefined;
	js: JavaScriptAdapter | undefined;
	jsEngine: JsEngineAdapter | undefined;
	tp: TemplaterAdapter | undefined;

    constructor(
        private ntb: NoteToolbarPlugin
    ) {}

    /** 
     * Updates status of other installed plugins we're interested in.
     */
    checkPlugins() {
        // @ts-ignore
        const appPlugins = this.ntb.app.plugins.plugins;
        // @ts-ignore
        const internalPlugins = this.ntb.app.internalPlugins.plugins;

        Object.keys(this.plugins).forEach(key => {
            this.plugins[key] = key in appPlugins;
        });
        Object.keys(this.internalPluginsEnabled).forEach(key => {
            this.internalPluginsEnabled[key] = internalPlugins[key]?.enabled ?? false;
        });
    }

    /**
     * Returns the Adapter for the provided item type, if the plugin is available and the adapter instance exists.
     * @param type ItemType to get the Adapter for
     * @returns the Adapter or undefined
     */
    getAdapterForItemType(type: ItemType): Adapter | undefined {
        let adapter: Adapter | undefined;
        switch (type) {
            case ItemType.Dataview:
                adapter = this.plugins[ItemType.Dataview] ? this.dv : undefined;
                break;
            case ItemType.JavaScript:
                adapter = this.js; // built-in, doens't rely on plugin
                break;
            case ItemType.JsEngine:
                adapter = this.plugins[ItemType.JsEngine] ? this.jsEngine : undefined;
                break;
            case ItemType.Templater:
                adapter = this.plugins[ItemType.Templater] ? this.tp : undefined;
                break;
        }
        return adapter;
    }
    
    hasPlugin(pluginId: string): boolean {
        return this.plugins[pluginId] ?? false;
    }

	/**
	 * Creates the adapters if scripting, and the plugins, are enabled; otherwise disables all adapters.
	 */
	updateAdapters() {
		if (this.ntb.settings.scriptingEnabled) {
			this.checkPlugins(); // update status of enabled plugins
			this.dv = this.plugins[ItemType.Dataview] ? (this.dv || new DataviewAdapter(this.ntb)) : undefined;
			this.js = this.js || new JavaScriptAdapter(this.ntb);
			this.jsEngine = this.plugins[ItemType.JsEngine] ? (this.jsEngine || new JsEngineAdapter(this.ntb)) : undefined;
			this.tp = this.plugins[ItemType.Templater] ? (this.tp || new TemplaterAdapter(this.ntb)) : undefined;
		}
		else {
			this.dv?.disable();
			this.js?.disable();
			this.jsEngine?.disable();
			this.tp?.disable();
			this.dv = undefined;
			this.js = undefined;
			this.jsEngine = undefined;
			this.tp = undefined;
		}
	}

}