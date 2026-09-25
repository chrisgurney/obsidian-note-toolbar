import NoteToolbarPlugin from "main";
import { ScriptConfig } from "Settings/NoteToolbarSettings";
import { AdapterFunction } from "Types/interfaces";

export abstract class Adapter {
    
    abstract readonly FUNCTIONS: AdapterFunction[];

    /** used to create async functions from strings at runtime */
    protected static readonly AsyncFunction = (Object.getPrototypeOf(async function(){}) as { constructor: typeof Function }).constructor;

    /**
     * Creates a new Adapter for the given plugin.
     * @param notetoolbar reference to the NoteToolbar plugin.
     */
    constructor(
        public ntb: NoteToolbarPlugin
    ) {}

    /**
     * Cleans up the adapter when it's no longer needed.
     */ 
    abstract disable(): void;
    
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