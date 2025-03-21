/**
 * The `IItem` interface provides basic API access to toolbar items, with more functions to be added.
 * 
 * @privateRemarks
 * API wrapper for ToolbarItemSettings methods.
 */
export interface IItem {

    /**
     * Unique identifier for the item.
     */
    id?: string;

    /**
     * Updates the icon to the provided one, if it exists.
     *
     * @param iconId The icon ID.
     * @returns nothing
     * 
     * @example
     * const item = ntb.getActiveItem();
     * item.setIcon('circle-alert'); 
     */
    setIcon(iconId: string): void;

}