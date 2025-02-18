/**
 * Toolbar API.
 * 
 * @privateRemarks
 * API wrapper for ToolbarSettings methods.
 */
export interface IToolbar {

    /**
     * Unique identifier for the toolbar.
     */
    id: string;

    /**
     * Exports this toolbar to a [Note Toolbar callout](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Note-Toolbar-Callouts).
     * 
     * @returns Toolbar as a callout or `null` if the toolbar is undefined.
     */
    export(): Promise<string | null>;
    
}