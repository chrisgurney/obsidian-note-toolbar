import NoteToolbarPlugin from "main";
import { Notice } from "obsidian";
import { ScriptConfig } from "Settings/NoteToolbarSettings";
import { AdapterFunction } from "Types/interfaces";

export abstract class Adapter {
    
    abstract readonly FUNCTIONS: AdapterFunction[];

    ntb: NoteToolbarPlugin | null;

    /** used to create async functions from strings at runtime */
    protected static readonly AsyncFunction = (Object.getPrototypeOf(async function(){}) as { constructor: typeof Function }).constructor;

    /**
     * Creates a new Adapter for the given plugin.
     * @param notetoolbar reference to the NoteToolbar plugin.
     */
    constructor(notetoolbar: NoteToolbarPlugin) {
        this.ntb = notetoolbar;
    }

    /**
     * Cleans up the adapter when it's no longer needed.
     */ 
    abstract disable(): void;

    /**
     * Displays the provided scripting error as a console message, and is output to a container, if provided. 
     * @param message 
     * @param error 
     * @param containerEl 
     */
    displayScriptError(error: unknown, context?: string, containerEl?: HTMLElement) {
        const message = error instanceof Error ? error.message : String(error);
        const fullMessage = context ? `${context}\n${message}` : message;
        console.error(fullMessage);
        console.error(error);
        // output the error to the Note Toolbar Output container, if provided
        if (containerEl) {
            const errorEl = containerEl.createEl('pre');
            errorEl.setText(fullMessage);
        }
        // show notice
        const errorFr = createFragment();
        errorFr.append(fullMessage);
        new Notice(errorFr, 10000).containerEl.addClass('mod-warning');
    }
    
    /**
     * Returns all functions for this adapter.
     */
    getFunctions(): Map<string, AdapterFunction> {
        return new Map(this.FUNCTIONS.map(func => [func.name, func]));
    }

    /**
     * Gets the requested setting from the plugin.
     */
    abstract getSetting(settingName: string): string;

    /**
     * Executes the function with provided config.
     */
    abstract use(config: ScriptConfig): Promise<string | void>; 

}