/**
 * The `IItem` interface provides basic API access to toolbar items, with more functions to be added.
 * 
 * @privateRemarks
 * API wrapper for ToolbarItemSettings methods.
 */
export default interface IItem {

    /**
     * Unique identifier for the item.
     */
    id?: string;

    /**
     * Returns the item's icon (ID).
     * 
     * @returns The item's icon ID, or an empty string if there isn't one set.
     */
    getIcon(): string;

    /**
     * Returns the item's label.
     * 
     * @returns The item's label, or an empty string if there isn't one set.
     */
    getLabel(): string;

    /**
     * Returns the item's tooltip.
     * 
     * @returns The item's tooltip, or an empty string if there isn't one set.
     */
    getTooltip(): string;

    /**
     * Replaces the item's icon to the provided one, if it exists.
     *
     * @param iconId The icon ID. To remove the icon, provide an empty string.
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