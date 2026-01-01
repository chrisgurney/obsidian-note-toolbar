import NoteToolbarPlugin from "main";
import { Notice } from "obsidian";
import { ScriptConfig } from "Settings/NoteToolbarSettings";
import { AdapterFunction } from "Types/interfaces";

export abstract class Adapter {
    
    abstract readonly FUNCTIONS: AdapterFunction[];

    ntb: NoteToolbarPlugin | null;
    adapterApi: any | null;
    adapterPlugin: any | null;

    /**
     * Creates a new Adapter for the given plugin.
     * @param notetoolbar reference to the NoteToolbar plugin.
     * @param adapterPlugin plugin we're adapting.
     * @param adapterApi API for the provided plugin.
     */
    constructor(notetoolbar: NoteToolbarPlugin, adapterPlugin: any, adapterApi: any) {
        this.ntb = notetoolbar;
        this.adapterApi = adapterApi;
        this.adapterPlugin = adapterPlugin;
    }

    /**
     * Cleans up the adapter when it's no longer needed.
     */ 
    disable() {
        this.adapterApi = null;
        this.adapterPlugin = null;
        this.ntb = null;
    }

    /**
     * Displays the provided scripting error as a console message, and is output to a container, if provided. 
     * @param message 
     * @param error 
     * @param containerEl 
     */
    displayScriptError(message: string, error?: any, containerEl?: HTMLElement) {
        console.error(message)
        console.error(error);
        // output the error to the Note Toolbar Output container, if provided
        if (containerEl) {
            let errorEl = containerEl.createEl('pre');
            errorEl.setText(message + '\n' + error);
        }
        // show notice
        let errorFr = createFragment();
        errorFr.append(message);
        error ? errorFr.append('\n', error) : undefined;
        new Notice(errorFr, 5000).containerEl.addClass('mod-warning');
    }
    
    /**
     * Returns all functions for this adapter.
     */
    getFunctions(): Map<string, AdapterFunction> {
        return new Map(this.FUNCTIONS.map(func => [func.function.name, func]));
    }

    /**
     * Gets the requested setting from the plugin.
     */
    getSetting(settingName: string): string {
        return this.adapterPlugin.settings[settingName] ?? '';
    }

    /**
     * Executes the function with provided config.
     */
    abstract use(config: ScriptConfig): Promise<string | void>; 

}