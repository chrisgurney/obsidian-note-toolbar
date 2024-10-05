import NoteToolbarPlugin from "main";
import { DEFAULT_ITEM_VISIBILITY_SETTINGS, DEFAULT_STYLE_OPTIONS, ItemType, MOBILE_STYLE_OPTIONS, t, ToolbarItemSettings, ToolbarSettings } from "Settings/NoteToolbarSettings";
import { debugLog, getUUID, replaceVars, toolbarHasVars } from "./Utils";
import { TFile, TFolder } from "obsidian";
import { confirmWithModal } from "Settings/UI/Modals/ConfirmModal";

/**
 * Exports the given toolbar as a Note Toolbar Callout
 * @param plugin NoteToolbarPlugin
 * @param toolbar ToolbarSettings for the toolbar to export
 * @returns Note Toolbar Callout as a string
 */
export async function exportToCallout(plugin: NoteToolbarPlugin, toolbar: ToolbarSettings): Promise<string> {
    
    debugLog('exportToCallout()', 'enabled plugins', (plugin.app as any).plugins.plugins);

    // write out callout type + styles
    const defaultStyles = toolbar.defaultStyles.length ? toolbar.defaultStyles.join('-') : '';
    const mobileStyles = toolbar.mobileStyles.length ? toolbar.mobileStyles.join('-') : '';
    const styles = [defaultStyles, mobileStyles].filter(Boolean).join('-');
    let calloutExport = `> [!note-toolbar${styles ? '|' + styles : ''}]`;

    // get the active file to provide context, and to replace vars if requested
    let activeFile = plugin.app.workspace.getActiveFile();

    // if there are variables, as user if they should be replaced
    if (toolbarHasVars(toolbar)) {
        const isConfirmed = await confirmWithModal(plugin.app, { 
            title: t('export.confirm-vars-title'),
            questionLabel: t('export.confirm-vars-question'),
            approveLabel: t('export.confirm-vars-approve'),
            denyLabel: t('export.confirm-vars-deny')
        });
        calloutExport += exportToCalloutList(plugin, toolbar, activeFile, isConfirmed) + '\n';
    }
    else {
        calloutExport += exportToCalloutList(plugin, toolbar, activeFile, false) + '\n';
    }

    return calloutExport;

}

/**
 * Exports the items in a given toolbar to a list that can be used in a Note Toolbar Callout
 * @param plugin NoteToolbarPlugin
 * @param toolbar ToolbarSettings for the toolbar to export
 * @param activeFile TFile this export is being run from, for context if needed
 * @param resolveVars true if variables should be resolved, based on the activeFile
 * @param recursions tracks how deep we are to stop recursion
 * @returns Note Toolbar Callout items as a bulleted list string
 */
function exportToCalloutList(plugin: NoteToolbarPlugin, toolbar: ToolbarSettings, activeFile: TFile | null, resolveVars: boolean, recursions: number = 0): string {

    if (recursions >= 2) {
        return ''; // stop recursion
    }

    let itemsExport = '';

    // Iconize - check if plugin is enabled to output icons
    const hasIconize = (plugin.app as any).plugins.plugins['obsidian-icon-folder'];
    const toIconizeFormat = (s: string) => 
        `:Li${s.replace(/^lucide-/, '')
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join('')}:`;

    const BULLET = '\n> -';
    toolbar.items.forEach((item, index) => {

        // if Iconize is enabled, add icons; otherwise don't output
        let itemIcon = (hasIconize && item.icon) ? toIconizeFormat(item.icon) : '';
        itemIcon = (itemIcon && item.label) ? itemIcon + ' ' : itemIcon; // trailing space if needed

        let itemText = resolveVars ? replaceVars(plugin.app, item.label, activeFile, false) : item.label;
        let itemLink = resolveVars ? replaceVars(plugin.app, item.link, activeFile, false) : item.link;
        let itemTooltip = resolveVars ? replaceVars(plugin.app, item.tooltip, activeFile, false) : item.tooltip;

        itemText = encodeTextForCallout(itemText);
        itemLink = encodeLinkForCallout(itemLink);
        itemTooltip = encodeTextForCallout(itemTooltip);

        // fallback if no icon or label = tooltip; otherwise use a generic name
        itemText = itemIcon ? itemText : (itemText ? itemText : (itemTooltip ? itemTooltip : t('export.item-generic', { number: index + 1 })));

        switch(item.linkAttr.type) {
            case ItemType.Break:
                itemsExport += `${BULLET} <br/>`;
                break;
            case ItemType.Command:
                itemsExport += `${BULLET} [${itemIcon}${itemText}]()<data data-ntb-command="${item.linkAttr.commandId}"/>`;
                // calloutExport += `${BULLET} [${itemIcon}${itemText}](<obsidian://note-toolbar?commandid=${item.linkAttr.commandId}>)`;
                break;
            case ItemType.File:
                // check if the provided file links to a folder, and if so replace with a folder
                let resolvedItemLink = replaceVars(plugin.app, itemLink, activeFile, false);
                let fileOrFolder = this.app.vault.getAbstractFileByPath(resolvedItemLink);
                if (fileOrFolder instanceof TFolder) {
                    itemsExport += `${BULLET} [${itemIcon}${itemText}]()<data data-ntb-folder="${itemLink}"/>`;
                    // calloutExport += `${BULLET} [${itemIcon}${itemText}](<obsidian://note-toolbar?folder=${itemLink}>)`;
                }
                else {
                    itemsExport += `${BULLET} [[${itemLink}|${itemIcon}${itemText}]]`;
                }
                break;
            case ItemType.Group:
                let groupToolbar = plugin.settingsManager.getToolbarById(item.link);
                itemsExport += groupToolbar ? exportToCalloutList(plugin, groupToolbar, activeFile, resolveVars, recursions + 1) : '';
                break;
            case ItemType.Menu:
                itemsExport += `${BULLET} [${itemIcon}${itemText}]()<data data-ntb-menu="${itemLink}"/>`;
                // calloutExport += `${BULLET} [${itemIcon}${itemText}](<obsidian://note-toolbar?menu=${itemLink}>)`;
                break;
            case ItemType.Separator:
                itemsExport += `${BULLET} <hr/>`;
                break;
            case ItemType.Uri:
                itemsExport += `${BULLET} [${itemIcon}${itemText}](<${itemLink}>)`;
                break;
        }

        itemsExport += (itemTooltip && (itemText !== itemTooltip)) ? ` <!-- ${itemTooltip} -->` : '';

    });

    return itemsExport;

}

/**
 * Returns a string that shouldn't break URL portion of a callout markdown link.
 * @param str string to encode
 * @returns URI encoded string with certain characters preserved
 */
function encodeLinkForCallout(str: string): string {
    return encodeURIComponent(str)
        .replace(/%20/g, ' ')
        .replace(/%2F/g, '/')
        .replace(/%3A/g, ':')
        .replace(/%3F/g, '?')
        .replace(/%5B/g, '\\[')
        .replace(/%5D/g, '\\]')
        .replace(/%7B/g, '{')
        .replace(/%7D/g, '}');
}

/**
 * Returns a string that shouldn't break the text portion of a callout markdown link.
 * @param str string to encode
 * @returns URI encoded string with certain characters preserved
 */
function encodeTextForCallout(str: string): string {
    return encodeURIComponent(str)
        .replace(/%20/g, ' ')
        .replace(/%2F/g, '/')
        .replace(/%3A/g, ':')
        .replace(/%3F/g, '?')
        .replace(/%5B/g, '\\[')
        .replace(/%5D/g, '\\]')
        .replace(/%7B/g, '{')
        .replace(/%7D/g, '}');
}

/**
 * Imports items from a callout string, adding them to a new toolbar, or the toolbar provided.
 * @param plugin NoteToolbarPlugin
 * @param callout Note Toolbar Calllout string to import
 * @param toolbar optional ToolbarSettings for existing toolbar to import into
 * @returns ToolbarSettings
 */
export async function importFromCallout(plugin: NoteToolbarPlugin, callout: string, toolbar?: ToolbarSettings): Promise<ToolbarSettings> {

    debugLog('importFromCallout()', callout);

    // TODO? double-check provided text is a Note Toolbar Callout; may not have this line in import
    //const isNoteToolbarCallout = /^[>\s]*\[\!\s*note-toolbar\s*\|\s*/.test(callout);

    // TODO: if ToolbarSettings undefined, create a new ToolbarSettings object
    if (!toolbar) {
        toolbar = {
            uuid: getUUID(),
            defaultStyles: ["border", "even", "sticky"],
            items: [],
            mobileStyles: [],
            name: plugin.settingsManager.getUniqueToolbarName(t('setting.toolbars.imported-tbar-name'), false),
            position: { 
                desktop: { allViews: { position: 'props' } }, 
                mobile: { allViews: { position: 'props' } }, 
                tablet: { allViews: { position: 'props' } } },
            updated: new Date().toISOString(),
        } as ToolbarSettings;
    }

    const lines = callout.trim().split('\n');

    // parse the callout type and styles if present
    if (lines[0].includes('[!note-toolbar')) {
        const metadataMatch = lines[0].match(/\[!(.*?)\|\s*(.*?)\]/);
        if (metadataMatch) {
            let styles = metadataMatch[2].split(/[^a-zA-Z0-9]+/);

            const DEFAULT_STYLE_KEYS = DEFAULT_STYLE_OPTIONS.map(style => Object.keys(style)[0]);
            const MOBILE_STYLE_KEYS = MOBILE_STYLE_OPTIONS.map(style => Object.keys(style)[0]);
            const validStyles = styles.filter(style => 
                DEFAULT_STYLE_KEYS.includes(style) || MOBILE_STYLE_KEYS.includes(style)
            );
            const invalidStyles = styles.filter(style => 
                !DEFAULT_STYLE_KEYS.includes(style) && !MOBILE_STYLE_KEYS.includes(style)
            );

            debugLog('• styles?', validStyles);
            if (invalidStyles.length > 0) {
                debugLog('  • invalid:', invalidStyles);
            }

            // TODO: if there are styles and toolbar is provided, prompt to ignore styles
            toolbar.defaultStyles = validStyles;
        }
        lines.shift();
    }

    // parse the rest
    const toolbarItems = lines.map((line, index) => {

        debugLog(index + 1);
        
        var itemType: ItemType | undefined = undefined;

        let icon = '';
        let label = '';
        let link = '';
        let tooltip = '';
        let dataValue = '';

        if (/<br\s*\/?>/.test(line)) {
            itemType = ItemType.Break;
        }
        else if (/<hr\s*\/?>/.test(line)) {
            itemType = ItemType.Separator;
        }
        else {

            // FIXME? decode URLs not in angle brackets <>
            const linkMatch = line.match(/\[(.*?)\]\(<?(.*?)>?\)|\[\[(.*?)(?:\|(.*?))?\]\]/);
            const tooltipMatch = line.match(/<!--\s*(.*?)\s*-->/);
            const dataUriMatch = line.match(/data-ntb-(command|folder|menu)="(.*?)"|obsidian:\/\/note-toolbar\?(command|folder|menu)=(.*?)>?\)/);

            if (linkMatch) {

                // for external links
                if (linkMatch[1]) {
                    // default to URI, but change if data elements or Note Toolbar URI is used
                    itemType = ItemType.Uri;
                    label = linkMatch[1];
                    link = linkMatch[2];
                }
                // for wikilinks
                else if (linkMatch[3]) {
                    itemType = ItemType.File;
                    label = linkMatch[4] || linkMatch[3];
                    link = linkMatch[3];
                }
    
                const iconMatch = label?.match(/(:Li\w+:)/);
                if (iconMatch) {
                    // translate Iconize strings to Lucide icon strings
                    const iconName = label?.match(/:Li(\w+):/);
                    if (iconName) {
                        icon = 'lucide-' + iconName[1]
                            .replace(/([a-z])([A-Z])/g, '$1-$2')
                            .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
                            .toLowerCase();
                    }
                    // remove the icon from the label string
                    label = label?.replace(iconMatch[1], '').trim();
                }
            }

            tooltip = tooltipMatch ? tooltipMatch[1] : '';
    
            debugLog('• icon?', icon);
            debugLog('• label?', label);
            debugLog('• link?', link);
            debugLog('• tooltip?', tooltip);
    
            if (dataUriMatch) {
                const dataUriType = dataUriMatch[1] || dataUriMatch[3] || '';
                debugLog('• data?', dataUriType, link);
    
                switch (dataUriType) {
                    case 'command':
                        itemType = ItemType.Command;
                        link = dataUriMatch[2] || dataUriMatch[4] || '';
                        break;
                    case 'folder':
                        itemType = ItemType.File;
                        link = dataUriMatch[2] || dataUriMatch[4] || '';
                        break;
                    case 'menu':
                        itemType = ItemType.Menu;
                        let menuToolbar = plugin.settingsManager.getToolbar(link);
                        link = menuToolbar ? menuToolbar.uuid : '';
                        break;
                }
            }

        }

        debugLog(`=> ${itemType?.toUpperCase()}`);
        !itemType ? debugLog('importFromCallout: Unknown type') : undefined;

        // create the toolbar item and add it to the toolbar
        if (itemType) {

            let toolbarItem: ToolbarItemSettings =
			{
				uuid: getUUID(),
				label: label.trim(),
				icon: icon.trim(),
				link: link.trim(),
				linkAttr: {
					commandId: itemType === ItemType.Command ? dataValue.trim() : '',
					hasVars: false,
					type: itemType
				},
				tooltip: tooltip,
				visibility: DEFAULT_ITEM_VISIBILITY_SETTINGS,
			};

            toolbar.items.push(toolbarItem);

        }

    });

    return toolbar;

}