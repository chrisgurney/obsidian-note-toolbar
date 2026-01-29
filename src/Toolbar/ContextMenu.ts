import NoteToolbarPlugin from "main";
import { ItemView, Menu, MenuItem, Notice, Platform } from "obsidian";
import { ItemType, PositionType, t, ToolbarSettings } from "Settings/NoteToolbarSettings";
import ItemModal from "Settings/UI/Modals/ItemModal";
import ShareModal from "Settings/UI/Modals/ShareModal";
import StyleModal from "Settings/UI/Modals/StyleModal";
import ToolbarSettingsModal from "Settings/UI/Modals/ToolbarSettingsModal";
import { learnMoreFr, openItemSuggestModal } from "Settings/UI/Utils/SettingsUIUtils";
import { exportToCallout } from "Utils/ImportExport";
import { TbarData } from "./ToolbarRenderer";


export default class ContextMenu {

    constructor(
        private ntb: NoteToolbarPlugin
    ) {}

    async render(event: MouseEvent) {

		event.preventDefault();

		// figure out what toolbar we're in
		let toolbarEl = (event.target as Element).closest('.cg-note-toolbar-container') as HTMLElement;
		let toolbarSettings = toolbarEl?.id ? this.ntb.settingsManager.getToolbarById(toolbarEl.id) : undefined;
		const isFloatingToolbar = 
			toolbarEl.getAttribute(TbarData.Position) === PositionType.Floating || 
			toolbarEl.getAttribute(TbarData.Position) === PositionType.Text;

		// figure out what item was clicked on (if any)
		let toolbarItemEl: Element | null = null;
		if (event.target instanceof HTMLLIElement) {
			toolbarItemEl = (event.target as Element).querySelector('.cg-note-toolbar-item');
		}
		else {
			toolbarItemEl = (event.target as Element).closest('.cg-note-toolbar-item');
		}
		let toolbarItem = toolbarItemEl?.id ? this.ntb.settingsManager.getToolbarItemById(toolbarItemEl.id) : undefined;

		let contextMenu = new Menu();

		const currentView = this.ntb.app.workspace.getActiveViewOfType(ItemView);
		const currentPosition = toolbarSettings ? this.ntb.settingsManager.getToolbarPosition(toolbarSettings) : undefined;

		if (toolbarSettings !== undefined) {

			if (Platform.isPhone) {
				contextMenu.addItem((item: MenuItem) => {
					item
						.setTitle(toolbarSettings.name)
						.setIsLabel(true)
				});
			}

			//
			// position
			//

			if (!isFloatingToolbar) {

				// workaround: sub-menus only work on non-tablet devices
				let positionMenu = contextMenu;
				if (!Platform.isTablet) {
					contextMenu.addItem((item: MenuItem) => {
						item.setTitle(t('toolbar.menu-position'));
						item.setIcon('move');
						positionMenu = item.setSubmenu() as Menu;
					});
				}

				if (currentView?.getViewType() === 'empty') {
					if (this.ntb.settings.showLaunchpad) {
						if (currentPosition !== PositionType.Top && currentPosition !== PositionType.Props) {
							positionMenu.addItem((item: MenuItem) => {
								item.setTitle(t('setting.position.option-centered'))
									.setIcon('layout-grid')
									.onClick(async (menuEvent) => {
										await this.ntb.settingsManager.updatePosition(toolbarSettings, PositionType.Props);
										contextMenu.close();
									});
							});
						}
					}
					else {
						if (currentPosition !== PositionType.Top) {
							positionMenu.addItem((item: MenuItem) => {
								item.setTitle(t('setting.position.option-top'))
									.setIcon('arrow-up-to-line')
									.onClick(async (menuEvent) => {
										await this.ntb.settingsManager.updatePosition(toolbarSettings, PositionType.Top);
										contextMenu.close();
									});
							});
						}
					}
				} 
				else {
					const positions = [
						{ type: PositionType.TabBar, titleKey: 'setting.position.option-tabbar', icon: 'panel-top' },
						{ type: PositionType.Top, titleKey: 'setting.position.option-top', icon: 'arrow-up-to-line' },
						{ type: PositionType.Props, titleKey: 'setting.position.option-props', icon: 'arrow-down-narrow-wide' },
						{ type: PositionType.Bottom, titleKey: 'setting.position.option-bottom', icon: 'arrow-down-to-line' }
					];

					positions.forEach(({ type, titleKey, icon }) => {
						if (currentPosition !== type) {
							positionMenu.addItem((item: MenuItem) => {
								item.setTitle(t(titleKey))
									.setIcon(icon)
									.onClick(async () => {
										await this.ntb.settingsManager.updatePosition(toolbarSettings, type);
										contextMenu.close();
									});
							});
						}
					});
				}

				const fabPositions = [
					{ type: PositionType.FabLeft, titleKey: 'setting.position.option-fabl', icon: 'circle-chevron-left' },
					{ type: PositionType.FabRight, titleKey: 'setting.position.option-fabr', icon: 'circle-chevron-right' }
				];

				fabPositions.forEach(({ type, titleKey, icon }) => {
					if (currentPosition !== type) {
						positionMenu.addItem((item: MenuItem) => {
							item.setTitle(t(titleKey))
								.setIcon(icon)
								.onClick(async () => {
									await this.ntb.settingsManager.updatePosition(toolbarSettings, type);
									contextMenu.close();
								});
						});
					}
				});

				if (Platform.isTablet) contextMenu.addSeparator();

			}

			//
			// style toolbar
			//

			// no need to show it for the tab bar position, as it can't be styled there
			if (currentPosition !== PositionType.TabBar) {
				contextMenu.addItem((item: MenuItem) => {
					item
						.setIcon('palette')
						.setTitle(t('toolbar.menu-style'))
						.onClick(async () => {
							if (toolbarSettings) {
								const styleModal = new StyleModal(this.ntb, toolbarSettings);
								styleModal.open();
							}
						});
				});
			}

			//
			// show/hide properties + bases toolbars
			//

			if (this.ntb.utils.hasView('markdown')) {
				const propsEl = this.ntb.el.getPropsEl();
				if (propsEl) {
					const propsDisplayStyle = getComputedStyle(propsEl).getPropertyValue('display');
					const uiHidden = propsDisplayStyle === 'none';
					contextMenu.addItem((item: MenuItem) => {
						item.setTitle(uiHidden ? t('toolbar.menu-show-properties') : t('toolbar.menu-hide-properties'))
							.setIcon(uiHidden ? 'captions' : 'captions-off')
							.onClick(async (menuEvent) => this.ntb.commands.toggleUi('props', uiHidden ? 'show' : 'hide'));
					});
				}
			}
			else if (this.ntb.utils.hasView('bases')) {
				const baseToolbarEl = activeDocument.querySelector('.bases-header');
				if (baseToolbarEl) {
					const baseToolbarDisplayStyle = getComputedStyle(baseToolbarEl).getPropertyValue('display');
					const uiHidden = baseToolbarDisplayStyle === 'none';
					contextMenu.addItem((item: MenuItem) => {
						item.setTitle(uiHidden ? t('toolbar.menu-show-base-toolbar') : t('toolbar.menu-hide-base-toolbar'))
							.setIcon(uiHidden ? 'panel-top-open' : 'panel-top-close')
							.onClick(async (menuEvent) => this.ntb.commands.toggleUi('baseToolbar', uiHidden ? 'show' : 'hide'));
					});
				}
			}

		}
		
		contextMenu.addSeparator();

		//
		// add item
		//

		contextMenu.addItem((item: MenuItem) => {
			item
				.setIcon('plus')
				.setTitle(t('toolbar.menu-add-item'))
				.onClick(async () => {
					const toolbarItemIndex = this.ntb.utils.calcToolbarItemIndex(event);
					if (toolbarSettings) openItemSuggestModal(this.ntb, toolbarSettings, 'New', undefined, toolbarItemIndex);
				});
		});

		//
		// edit item
		//

		if (toolbarItem) {
			const activeFile = this.ntb.app.workspace.getActiveFile();
			let itemText = await this.ntb.items.getItemText(toolbarItem, activeFile, true);
			if (toolbarItem.linkAttr.type === ItemType.Separator) itemText = t('setting.item.option-separator');
			if (toolbarItem.linkAttr.type === ItemType.Spreader) itemText = t('setting.item.option-spreader');
			contextMenu.addItem((item: MenuItem) => {
				item
					.setIcon('lucide-pen-box')
					.setTitle(itemText 
						? t('toolbar.menu-edit-item', { text: itemText, interpolation: { escapeValue: false } }) 
						: t('toolbar.menu-edit-item_none'))
					.onClick(async () => {
						if (toolbarSettings) {
							const itemModal = new ItemModal(this.ntb, toolbarSettings, toolbarItem);
							itemModal.open();
						}
					});
			});

			if (toolbarItem.linkAttr.type === ItemType.Menu) {
				const menuToolbar = this.ntb.settingsManager.getToolbar(toolbarItem.link);
				if (menuToolbar) {
					contextMenu.addItem((item: MenuItem) => {
						item
							.setIcon('square-menu')
							.setTitle(t('toolbar.menu-edit-menu', { toolbar: menuToolbar.name, interpolation: { escapeValue: false } }))
							.onClick(async () => {
								const modal = new ToolbarSettingsModal(this.ntb.app, this.ntb, null, menuToolbar as ToolbarSettings);
								modal.setTitle(t('setting.title-edit-toolbar', { toolbar: menuToolbar.name, interpolation: { escapeValue: false } }));
								modal.open();
							});
					});					
				}
			}
		}

		contextMenu.addSeparator();

		//
		// edit toolbar
		//

		if (toolbarSettings !== undefined) {
			contextMenu.addItem((item: MenuItem) => {
				item
					.setTitle(t('toolbar.menu-edit-toolbar', { toolbar: toolbarSettings?.name, interpolation: { escapeValue: false } }))
					.setIcon('rectangle-ellipsis')
					.onClick((menuEvent) => {
						const modal = new ToolbarSettingsModal(this.ntb.app, this.ntb, null, toolbarSettings as ToolbarSettings);
						modal.setTitle(t('setting.title-edit-toolbar', { toolbar: toolbarSettings?.name, interpolation: { escapeValue: false } }));
						modal.open();
					});
			  });
		}

		//
		// swap toolbar
		//

		// (if filetype is markdown, and prop != 'tags' so we don't accidentally remove them)
		if (!isFloatingToolbar && currentView?.getViewType() === 'markdown' && this.ntb.settings.toolbarProp !== 'tags') {
			contextMenu.addItem((item: MenuItem) => {
				item
					.setIcon('repeat')
					.setTitle(t('toolbar.menu-swap-toolbar'))
					.onClick(() => this.ntb.commands.swapToolbar());
			});
		}

		if (toolbarSettings !== undefined) {

			contextMenu.addSeparator();

			// share
			contextMenu.addItem((item: MenuItem) => {
				item
					.setIcon('share')
					.setTitle(t('export.label-share'))
					.onClick(async () => {
						if (toolbarSettings) {
							const shareUri = await this.ntb.protocolManager.getShareUri(toolbarSettings);
							let shareModal = new ShareModal(this.ntb, shareUri, toolbarSettings);
							shareModal.open();
						}
					});
			});

			// copy as callout
			contextMenu.addItem((item: MenuItem) => {
				item
					.setTitle(t('export.label-callout'))
					.setIcon('copy')
					.onClick(async (menuEvent) => {
						if (toolbarSettings) {
							let calloutExport = await exportToCallout(this.ntb, toolbarSettings, this.ntb.settings.export);
							navigator.clipboard.writeText(calloutExport);
							new Notice(
								learnMoreFr(t('export.notice-completed'), 'Creating-callouts-from-toolbars')
							).containerEl.addClass('mod-success');
						}
					})
				});

			contextMenu.addSeparator();

		}

		contextMenu.addItem((item: MenuItem) => {
			item
			  .setTitle(t('toolbar.menu-toolbar-settings'))
			  .setIcon('gear')
			  .onClick(async (menuEvent) => {
				  await this.ntb.commands.openSettings();
			  });
		  });

		navigator.vibrate(50);
		contextMenu.showAtPosition(event);

    }

}