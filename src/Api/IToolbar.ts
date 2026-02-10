/**
 * The `IToolbar` interface provides basic API access to toolbars, with more functions to be added.
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
    
}