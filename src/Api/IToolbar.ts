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
    id?: string;

    /**
     * Gets the name of this toolbar.
     * 
     * @returns Name of the toolbar or `undefined` if the toolbar is invalid.
     */
    getName(): string | undefined;

    /**
     * Exports this toolbar to a [Note Toolbar callout](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Note-Toolbar-Callouts).
     * 
     * @returns Toolbar as a callout or `null` if the toolbar is undefined.
     * 
     * @example
     * const toolbars = ntb.getToolbars();
     * for (let toolbar of toolbars) {
     *     console.log(`\n## ${toolbar.getName()}\n\n`);
     *     console.log(await toolbar.export());
     * }
     * 
     * @see `NtbExport.js` in the [examples/Scripts folder](https://github.com/chrisgurney/obsidian-note-toolbar/tree/master/examples/Scripts).
     */
    export(): Promise<string | null>;
    
}