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
	add(item: RibbonItem) {
		const { icon, label, callback, contextCallback } = this.resolveAction(item);
		const ribbonEl = this.ntb.addRibbonIcon(icon, label, (event) => callback(event));
        ribbonEl.setAttribute('id', `ntb-${item.uuid}`);
		this.ntb.register(() => ribbonEl.remove());
        this.ntb.registerDomEvent(ribbonEl, 'contextmenu', (event: MouseEvent) => {
            contextCallback(event);
        });
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
                this.add(ribbonItem);
            }
            else {
                this.ntb.error('Ribbon item for toolbar or item not found:', ribbonItem.uuid);
                dneCount++;
            }
        });
        if (dneCount > 0) {
            new Notice(t('setting.ribbon.error-not-found'), 10000).containerEl.addClass('mod-warning');
        }
	}

	/**
     * Removes all tracked ribbon icons.
     */
	unload() {
        // TODO: call remove() for all IDs in this.ntb.settings.ribbon
        // this.ntb.settings.ribbon.forEach(item => this.remove(item.uuid));
	}

    // removes a ribbon icon by its internal id, including the registry entry;
    // uses internal API as there's no public equivalent
    remove(uuid: string): void {
        this.ntb.settings.ribbon = this.ntb.settings.ribbon.filter(item => item.uuid !== uuid);
        const ribbon = this.ntb.app.workspace.leftRibbon;
        const ribbonEl = ribbon.ribbonItemsEl.querySelector(`#ntb-${uuid}`);
        if (!ribbonEl) return; // TODO: error
        ribbonEl.remove();
        ribbon.removeRibbonAction(uuid);
    }

	/**
     * Maps a RibbonItem to the icon/label/callback addRibbonIcon needs.
     */
	private resolveAction(item: RibbonItem): {
        icon: string; label: string; callback: (event: MouseEvent) => Promise<void>; contextCallback: (event: MouseEvent) => void } 
    {
        const resolvedToolbar = this.ntb.settingsManager.getToolbarById(item.uuid);
        if (resolvedToolbar) {
            return { 
                icon: resolvedToolbar.icon || this.ntb.settings.icon, 
                label: resolvedToolbar.name || t('plugin.note-toolbar'), 
                callback: async (event: MouseEvent) => { 
                    if (event.button !== 0) return; // let right-clicks go to the context menu handler
                    await this.ntb.render.showToolbarAtPosition(resolvedToolbar, item.showAt, 'pointer');
                },
                contextCallback: (event: MouseEvent) => {
                    const contextMenu = new Menu();
                    contextMenu.addItem((item: MenuItem) => {
                        item
                            .setIcon('lucide-pen-box')
                            .setTitle(t('toolbar.menu-edit-toolbar', { toolbar: resolvedToolbar.name, interpolation: { escapeValue: false } }))
                            .onClick(() => {
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
                                if (resolvedToolbar) {
                                    const itemToolbar = this.ntb.settingsManager.getToolbarByItemId(resolvedItem.uuid);
                                    if (!itemToolbar) return;
                                    const itemModal = new ItemModal(this.ntb, itemToolbar, resolvedItem);
                                    itemModal.open();
                                }
                            });
					});
                    contextMenu.showAtMouseEvent(event);                
                }
            }
        }
        throw new Error(`Note Toolbar: Ribbon toolbar or item not found: ${item.uuid}`);
	}

}