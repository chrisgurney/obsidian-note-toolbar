import NoteToolbarPlugin from "main";
import { Notice } from "obsidian";
import { CalloutAttr, ItemType, SCRIPT_ATTRIBUTE_MAP, ScriptConfig, ToolbarSettings, t } from "Settings/NoteToolbarSettings";


export default class CalloutHandler {

    // track the last used callout link, for the menu URI
    lastCalloutLink: Element | null = null;

    constructor(
        private ntb: NoteToolbarPlugin
    ) {}

    /**
     * Handles links followed from Note Toolbar Callouts, including handling commands, folders, and menus.
     * Links take the form [Tools]()<data data-ntb-menu="Tools"/>
     * @param MouseEvent 
     */
    async calloutLinkHandler(e: MouseEvent) {

        const target = e.target as HTMLElement | null;
        const clickedCalloutEl = target?.closest('.callout[data-callout="note-toolbar"]');
        
        // only process clicks inside of Note Toolbar callouts
        if (clickedCalloutEl) {

            // remove any active item attributes from the main toolbar, so the API doesn't fetch the wrong item
            // (not supported for Note Toolbar Callouts)
            this.ntb.render.updateActiveItem();

            // prevent expansion of callouts if setting is enabled
            if (this.ntb.settings.lockCallouts) {
                if (clickedCalloutEl.hasAttribute('data-callout-fold')) {
                    e.preventDefault();
                }
            }

            const clickedItemEl = target?.closest('.callout[data-callout="note-toolbar"] a.external-link');
            if (clickedItemEl) {
                // this.debug('calloutLinkHandler:', target, clickedItemEl);
                this.lastCalloutLink = clickedItemEl as HTMLLinkElement;
                let dataEl = clickedItemEl?.nextElementSibling;
                if (dataEl) {
                    // make sure it's a valid attribute, and get its value
                    const attribute = Object.values(CalloutAttr).find(attr => dataEl?.hasAttribute(attr));
                    attribute ? e.preventDefault() : undefined; // prevent callout code block from opening
                    const value = attribute ? dataEl?.getAttribute(attribute) : null;
                    
                    switch (attribute) {
                        case CalloutAttr.Command:
                        case CalloutAttr.CommandNtb:
                            this.ntb.items.handleLinkCommand(value);
                            break;
                        case CalloutAttr.Dataview:
                        case CalloutAttr.JavaScript:
                        case CalloutAttr.JsEngine:
                        case CalloutAttr.Templater: {
                            const scriptConfig = {
                                pluginFunction: value,
                                expression: dataEl?.getAttribute(SCRIPT_ATTRIBUTE_MAP['expression']) ?? undefined,
                                sourceFile: dataEl?.getAttribute(SCRIPT_ATTRIBUTE_MAP['sourceFile']) ?? undefined,
                                sourceFunction: dataEl?.getAttribute(SCRIPT_ATTRIBUTE_MAP['sourceFunction']) ?? undefined,
                                sourceArgs: dataEl?.getAttribute(SCRIPT_ATTRIBUTE_MAP['sourceArgs']) ?? undefined,
                                outputContainer: dataEl?.getAttribute(SCRIPT_ATTRIBUTE_MAP['outputContainer']) ?? undefined,
                                outputFile: dataEl?.getAttribute(SCRIPT_ATTRIBUTE_MAP['outputFile']) ?? undefined,
                            } as ScriptConfig;
                            switch (attribute) {
                                case CalloutAttr.Dataview:
                                    this.ntb.items.handleLinkScript(ItemType.Dataview, scriptConfig);
                                    break;
                                case CalloutAttr.JavaScript:
                                    this.ntb.items.handleLinkScript(ItemType.JavaScript, scriptConfig);
                                    break;
                                case CalloutAttr.JsEngine:
                                    this.ntb.items.handleLinkScript(ItemType.JsEngine, scriptConfig);
                                    break;
                                case CalloutAttr.Templater:
                                    this.ntb.items.handleLinkScript(ItemType.Templater, scriptConfig);
                                    break;	
                            }
                            break;
                        }
                        case CalloutAttr.Folder:
                        case CalloutAttr.FolderNtb:
                            this.ntb.items.handleLinkFolder(value);
                            break;
                        case CalloutAttr.Menu:
                        case CalloutAttr.MenuNtb: {
                            const activeFile = this.ntb.app.workspace.getActiveFile();
                            const toolbar: ToolbarSettings | undefined = this.ntb.settingsManager.getToolbar(value);
                            if (activeFile) {
                                if (toolbar) {
                                    this.ntb.render.renderAsMenu(toolbar, activeFile).then(menu => {
                                        this.ntb.render.showMenuAtElement(menu, this.lastCalloutLink);
                                    });
                                }
                                else {
                                    new Notice(
                                        t('notice.error-item-menu-not-found', { toolbar: value })
                                    ).containerEl.addClass('mod-warning');
                                }
                            }
                            break;
                        }
                    }
                }
            }

        }

    }

}