import NoteToolbarPlugin from 'main';
import { Menu, MenuItem, Notice } from 'obsidian';
import { PositionType, RibbonItem, t } from 'Settings/NoteToolbarSettings';
import ItemModal from 'Settings/UI/Modals/ItemModal';
import ToolbarSettingsModal from 'Settings/UI/Modals/ToolbarSettingsModal';

export class RibbonManager {

    constructor(private ntb: NoteToolbarPlugin) {}

	/** 
     * Creates the ribbon icon for a single item and tracks it for removal.
     */
    add(item: RibbonItem): void {
        this.addRibbonItem(item);
        this.ntb.settings.ribbon.push(item);
        void this.ntb.settingsManager.save();
    }

    get(uuid: string): RibbonItem | undefined {
        return this.ntb.settings.ribbon.find(ribbonItem => ribbonItem.uuid === uuid);
    }

	/** 
     * Adds all ribbon items from settings; called on plugin load.
     */
	load() {
        let dneCount = 0;
		this.ntb.settings.ribbon.forEach((ribbonItem: RibbonItem) => {
            const toolbar = this.ntb.settingsManager.getToolbarById(ribbonItem.uuid);
            const item = this.ntb.settingsManager.getToolbarItemById(ribbonItem.uuid);
            const doesRibbonItemExist = toolbar || item;
            if (doesRibbonItemExist) {
                this.addRibbonItem(ribbonItem);
            }
            else {
                this.ntb.error('Ribbon item for toolbar or item not found:', ribbonItem.uuid);
                this.removeFromSettings(ribbonItem.uuid);
                dneCount++;
            }
        });
        if (dneCount > 0) {
            new Notice(t('setting.ribbon.error-not-added'), 10000).containerEl.addClass('mod-warning');
        }
	}

	/**
     * Removes all tracked ribbon icons.
     */
	unload() {
        // TODO: call remove() for all IDs in this.ntb.settings.ribbon
        // this.ntb.settings.ribbon.forEach(item => this.remove(item.uuid));
	}

    update(item: RibbonItem): void {
        const index = this.ntb.settings.ribbon.findIndex(r => r.uuid === item.uuid);
        if (index === -1) return;

        this.remove(item.uuid);
        this.ntb.settings.ribbon.splice(index, 0, item);
        this.addRibbonItem(item);
        void this.ntb.settingsManager.save();
    }

    /**
     * Removes a ribbon item by its internal id, including the registry entry.
     */
    remove(uuid: string): void {
        if (this.get(uuid) === undefined) return;
        this.removeFromSettings(uuid);
        const ribbon = this.ntb.app.workspace.leftRibbon;
        const ribbonEl = ribbon.ribbonItemsEl.querySelector(`#ntb-${uuid}`);
        if (!ribbonEl) return;
        const ribbonLabel = ribbonEl.getAttribute('aria-label');
        // note: this may remove more than one item if multiple items have the same label
        ribbon.removeRibbonAction(`note-toolbar:${ribbonLabel}`);
        ribbonEl.remove();
    }

    private addRibbonItem(item: RibbonItem): void {
        const { icon, label, callback, contextCallback } = this.resolveAction(item);

        const ribbonEl = this.ntb.addRibbonIcon(icon, label, (event) => callback(event));
        ribbonEl.setAttribute('id', `ntb-${item.uuid}`);

        this.ntb.register(() => ribbonEl.remove());
        this.ntb.registerDomEvent(ribbonEl, 'contextmenu', (event: MouseEvent) => {
            contextCallback(event);
        });
    }

    private removeFromSettings(uuid: string): void {
        this.ntb.settings.ribbon = this.ntb.settings.ribbon.filter(ribbonItem => ribbonItem.uuid !== uuid);
        void this.ntb.settingsManager.save();
    }

	/**
     * Maps a RibbonItem to the icon/label/callback addRibbonIcon needs.
     */
	private resolveAction(item: RibbonItem): {
        icon: string; label: string; callback: (event: MouseEvent) => Promise<void>; contextCallback: (event: MouseEvent) => void } 
    {
        const checkToolbarExists = (uuid: string): boolean => {
            const itemToolbar = this.ntb.settingsManager.getToolbarById(uuid);
            if (!itemToolbar) {
                new Notice(t('setting.ribbon.error-toolbar-not-found'), 10000).containerEl.addClass('mod-warning');
                return false;
            }
            return true;
        }

        const checkItemExists = (uuid: string): boolean => {
            const toolbarItem = this.ntb.settingsManager.getToolbarItemById(uuid);
            if (!toolbarItem) {
                new Notice(t('setting.ribbon.error-item-not-found'), 10000).containerEl.addClass('mod-warning');
                return false;
            }
            const itemToolbar = this.ntb.settingsManager.getToolbarByItemId(uuid);
            if (!itemToolbar) {
                new Notice(t('setting.ribbon.error-toolbar-not-found'), 10000).containerEl.addClass('mod-warning');
                return false;
            }
            return true;
        }

        const resolvedToolbar = this.ntb.settingsManager.getToolbarById(item.uuid);
        if (resolvedToolbar) {
            return { 
                icon: resolvedToolbar.icon || this.ntb.settings.icon, 
                label: resolvedToolbar.name || t('plugin.note-toolbar'),
                callback: async (event: MouseEvent) => { 
                    if (event.button !== 0) return; // let right-clicks go to the context menu handler
                    // sanity check: in case toolbar was deleted but still exists in ribbon settings
                    if (!checkToolbarExists(resolvedToolbar.uuid)) return;
                    await this.ntb.render.showToolbarAtPosition(resolvedToolbar, item.showAt ?? PositionType.Menu, 'pointer');
                },
                contextCallback: (event: MouseEvent) => {
                    const contextMenu = new Menu();
                    contextMenu.addItem((item: MenuItem) => {
                        item
                            .setIcon('lucide-pen-box')
                            .setTitle(t('toolbar.menu-edit-toolbar', { toolbar: resolvedToolbar.name, interpolation: { escapeValue: false } }))
                            .onClick(() => {
                                // sanity check: in case toolbar was deleted but still exists in ribbon settings
                                if (!checkToolbarExists(resolvedToolbar.uuid)) return;
                                const modal = new ToolbarSettingsModal(this.ntb.app, this.ntb, undefined, resolvedToolbar);
                                modal.setTitle(t('setting.title-edit-toolbar', { toolbar: resolvedToolbar.name, interpolation: { escapeValue: false } }));
                                modal.open();
                            });
                    });
                    contextMenu.showAtMouseEvent(event);
                }
            }
        }
        const resolvedItem = this.ntb.settingsManager.getToolbarItemById(item.uuid);
        if (resolvedItem) {
            const itemText = resolvedItem.label || resolvedItem.tooltip || 'Note Toolbar: Item label or tooltip not set.';
            return {
                icon: resolvedItem.icon || this.ntb.settings.icon,
                label: itemText,
                callback: async (event: MouseEvent) => {
                    if (event.button !== 0) return; // let right-clicks go to the context menu handler 
                    // sanity check: in case toolbar was deleted but still exists in ribbon settings
                    if (!checkItemExists(resolvedItem.uuid)) return;
                    const activeFile = this.ntb.app.workspace.getActiveFile();
                    await this.ntb.items.handleItemLink(resolvedItem, undefined, activeFile);
                },
                contextCallback: (event: MouseEvent) => {
                    const contextMenu = new Menu();
                    contextMenu.addItem((item: MenuItem) => {
                        item
                            .setIcon('lucide-pen-box')
                            .setTitle(itemText 
                                ? t('toolbar.menu-edit-item', { text: itemText, interpolation: { escapeValue: false } }) 
                                : t('toolbar.menu-edit-item_none'))
                            .onClick(() => {
                                // sanity check: in case item was deleted but still exists in ribbon settings
                                if (!checkItemExists(resolvedItem.uuid)) return;
                                const itemToolbar = this.ntb.settingsManager.getToolbarByItemId(resolvedItem.uuid);
                                if (!itemToolbar) return;
                                const itemModal = new ItemModal(this.ntb, itemToolbar, resolvedItem);
                                itemModal.open();
                            });
					});
                    contextMenu.showAtMouseEvent(event);                
                }
            }
        }
        throw new Error(`Note Toolbar: Ribbon toolbar or item not found: ${item.uuid}`);
	}

}