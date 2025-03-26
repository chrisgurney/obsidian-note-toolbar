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
     * Replaces the item's icon to the provided one, if it exists.
     *
     * @param iconId The icon ID.
     * @returns nothing
     * 
     * @example
     * const item = ntb.getActiveItem();
     * item.setIcon('circle-alert'); 
     */
    setIcon(iconId: string): void;

    /**
     * Replaces the item's label with the provided text.
     *
     * @param text The label text.
     * @returns nothing
     * 
     * @example
     * const item = ntb.getActiveItem();
     * item.setLabel('My Label'); 
     */
    setLabel(text: string): void;

    /**
     * Replaces the item's tooltip with the provided text.
     *
     * @param text The tooltip text.
     * @returns nothing
     * 
     * @example
     * const item = ntb.getActiveItem();
     * item.setTooltip('My Tooltip'); 
     */
    setTooltip(text: string): void;

}