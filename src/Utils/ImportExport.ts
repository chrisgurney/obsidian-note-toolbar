import NoteToolbarPlugin from "main";
import { DEFAULT_ITEM_VISIBILITY_SETTINGS, DEFAULT_STYLE_OPTIONS, ExportSettings, ItemType, MOBILE_STYLE_OPTIONS, t, ToolbarItemSettings, ToolbarSettings } from "Settings/NoteToolbarSettings";
import { debugLog, getUUID, replaceVars } from "./Utils";
import { Command, getIcon, Notice, TFile, TFolder } from "obsidian";

const toIconizeFormat = (s: string) => 
    `:Li${s.replace(/^lucide-/, '')
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join('')}:`;

/**
 * Exports the given toolbar as a Note Toolbar Callout
 * @param plugin NoteToolbarPlugin
 * @param toolbar ToolbarSettings for the toolbar to export
 * @param options ExportSettings
 * @returns Note Toolbar Callout as a string
 */
export async function exportToCallout(plugin: NoteToolbarPlugin, toolbar: ToolbarSettings, options: ExportSettings): Promise<string> {
    
    debugLog('exportToCallout()', 'enabled plugins', (plugin.app as any).plugins.plugins);

    // write out callout type + styles
    const defaultStyles = toolbar.defaultStyles.length ? toolbar.defaultStyles.join('-') : '';
    const mobileStyles = toolbar.mobileStyles.length ? toolbar.mobileStyles.join('-') : '';
    const styles = [defaultStyles, mobileStyles].filter(Boolean).join('-');
    let calloutExport = `> [!note-toolbar${styles ? '|' + styles : ''}] ${toolbar.name}`;

    // get the active file to provide context, and to replace vars if requested
    let activeFile = plugin.app.workspace.getActiveFile();

    calloutExport += exportToCalloutList(plugin, toolbar, activeFile, options) + '\n';

    return calloutExport;

}

/**
 * Exports the items in a given toolbar to a list that can be used in a Note Toolbar Callout
 * @param plugin NoteToolbarPlugin
 * @param toolbar ToolbarSettings for the toolbar to export
 * @param activeFile TFile this export is being run from, for context if needed
 * @param options ExportSettings
 * @param recursions tracks how deep we are to stop recursion
 * @returns Note Toolbar Callout items as a bulleted list string
 */
function exportToCalloutList(
    plugin: NoteToolbarPlugin,
    toolbar: ToolbarSettings,
    activeFile: TFile | null,
    options: ExportSettings,
    recursions: number = 0
): string {

    if (recursions >= 2) {
        return ''; // stop recursion
    }

    let itemsExport = '';

    const BULLET = '\n> -';
    toolbar.items.forEach((item, index) => {

        // if Iconize is enabled, add icons; otherwise don't output
        let itemIcon = (options.includeIcons && item.icon) ? toIconizeFormat(item.icon) : '';
        itemIcon = (itemIcon && item.label) ? itemIcon + ' ' : itemIcon; // trailing space if needed

        let itemText = options.replaceVars ? replaceVars(plugin.app, item.label, activeFile, false) : item.label;
        let itemLink = options.replaceVars ? replaceVars(plugin.app, item.link, activeFile, false) : item.link;
        let itemTooltip = options.replaceVars ? replaceVars(plugin.app, item.tooltip, activeFile, false) : item.tooltip;

        itemText = escapeTextForCallout(itemText);
        itemLink = escapeLinkForCallout(itemLink);
        itemTooltip = escapeTextForCallout(itemTooltip);

        // fallback if no icon or label = tooltip; otherwise use a generic name
        itemText = itemIcon ? itemText : (itemText ? itemText : (itemTooltip ? itemTooltip : t('export.item-generic', { number: index + 1 })));

        switch(item.linkAttr.type) {
            case ItemType.Break:
                itemsExport += `${BULLET} <br/>`;
                break;
            case ItemType.Command:
                itemsExport += options.useDataEls 
                    ? `${BULLET} [${itemIcon}${itemText}]()<data data-ntb-command="${item.linkAttr.commandId}"/>`
                    : `${BULLET} [${itemIcon}${itemText}](<obsidian://note-toolbar?commandid=${item.linkAttr.commandId}>)`;
                break;
            case ItemType.File:
                // check if the provided file links to a folder, and if so replace with a folder
                let resolvedItemLink = replaceVars(plugin.app, itemLink, activeFile, false);
                let fileOrFolder = this.app.vault.getAbstractFileByPath(resolvedItemLink);
                if (fileOrFolder instanceof TFolder) {
                    itemsExport += options.useDataEls
                        ? `${BULLET} [${itemIcon}${itemText}]()<data data-ntb-folder="${itemLink}"/>`
                        : `${BULLET} [${itemIcon}${itemText}](<obsidian://note-toolbar?folder=${itemLink}>)`;
                }
                else {
                    itemsExport += `${BULLET} [[${itemLink}|${itemIcon}${itemText}]]`;
                }
                break;
            case ItemType.Group:
                let groupToolbar = plugin.settingsManager.getToolbar(item.link);
                itemsExport += groupToolbar ? exportToCalloutList(plugin, groupToolbar, activeFile, options, recursions + 1) : '';
                // TODO: skipped/ignored message if toolbar not found
                break;
            case ItemType.Menu:
                let menuLink = itemLink;
                if (!options.useIds) {
                    let menuToolbar = plugin.settingsManager.getToolbar(item.link);
                    menuLink = menuToolbar ? menuToolbar.name : menuLink;
                    // TODO: skipped/ignored message if toolbar not found?
                }
                itemsExport += options.useDataEls
                    ? `${BULLET} [${itemIcon}${itemText}]()<data data-ntb-menu="${menuLink}"/>`
                    : `${BULLET} [${itemIcon}${itemText}](<obsidian://note-toolbar?menu=${menuLink}>)`;
                break;
            case ItemType.Separator:
                itemsExport += `${BULLET} <hr/>`;
                break;
            case ItemType.Uri:
                itemsExport += itemLink ? `${BULLET} [${itemIcon}${itemText}](<${itemLink}>)` : '';
                break;
        }

        itemsExport += (itemTooltip && (itemText !== itemTooltip)) ? ` <!-- ${itemTooltip} -->` : '';

    });

    return itemsExport;

}

/**
 * Returns a string that shouldn't break URL portion of a callout markdown link.
 * @param str string to escape
 * @returns escaped string
 */
function escapeLinkForCallout(str: string): string {
    return str
        .replace(/\[/g, '\\[')
        .replace(/\]/g, '\\]')
        .replace(/\)/g, '\\)')
        .replace(/\(/g, '\\(');
}

/**
 * Returns a string that shouldn't break the text portion of a callout markdown link.
 * @param str string to escape
 * @returns escaped string
 */
function escapeTextForCallout(str: string): string {
    return str
        .replace(/\[/g, '\\[')
        .replace(/\]/g, '\\]');
}

/**
 * Imports items from a callout string, adding them to a new toolbar, or the toolbar provided.
 * @param plugin NoteToolbarPlugin
 * @param callout Note Toolbar Calllout string to import
 * @param toolbar optional ToolbarSettings for existing toolbar to import into
 * @returns ToolbarSettings
 */
export async function importFromCallout(
    plugin: NoteToolbarPlugin, 
    callout: string, 
    toolbar?: ToolbarSettings, 
    fromShareUri: boolean = false
): Promise<ToolbarSettings> {

    const lines = callout.trim().split('\n');
    const isToolbarProvided = toolbar ? true : false;
    var errorLog = '';

    // get the active file to provide context
    let activeFile = plugin.app.workspace.getActiveFile();

    // create a new toolbar to return, if one wasn't provided
    if (!toolbar) {
        toolbar = {
            uuid: getUUID(),
            defaultStyles: ["border", "even", "sticky"],
            items: [],
            mobileStyles: [],
            name: "",
            position: { 
                desktop: { allViews: { position: 'props' } }, 
                mobile: { allViews: { position: 'props' } }, 
                tablet: { allViews: { position: 'props' } } },
            updated: new Date().toISOString(),
        } as ToolbarSettings;
    }

    // parse the callout type and styles if present
    if (lines[0].includes('[!note-toolbar')) {
        // don't create a toolbar if we're importing into one
        if (!isToolbarProvided) {
            const metadataMatch = lines[0].match(/\[!note-toolbar\|?\s*([^\]]*)\](.*)/);
            if (metadataMatch) {
                let styles = metadataMatch[1].split(/[^a-zA-Z0-9]+/);
                let name = metadataMatch[2].trim();
    
                const DEFAULT_STYLE_KEYS = DEFAULT_STYLE_OPTIONS.map(style => Object.keys(style)[0]);
                const MOBILE_STYLE_KEYS = MOBILE_STYLE_OPTIONS.map(style => Object.keys(style)[0]);
                const validStyles = styles.filter(style => 
                    DEFAULT_STYLE_KEYS.includes(style) || MOBILE_STYLE_KEYS.includes(style)
                );
                const invalidStyles = styles.filter(style => 
                    style && !DEFAULT_STYLE_KEYS.includes(style) && !MOBILE_STYLE_KEYS.includes(style)
                );
    
                debugLog('• name?', name);
                debugLog('• styles?', validStyles);
                if (invalidStyles.length > 0) {
                    debugLog('  • invalid:', invalidStyles);
                    errorLog += `${t('import.errorlog-invalid-styles', { styles: invalidStyles })}\n`;
                }
            
                toolbar.name = plugin.settingsManager.getUniqueToolbarName(name ? name : t('setting.toolbars.imported-tbar-name'), false);
                toolbar.defaultStyles = validStyles;
            }
        }
        // remove line from the list to process next
        lines.shift();
    }

    // parse the rest
    lines.map((line, index) => {

        debugLog(index + 1);
        
        var itemType: ItemType | undefined = undefined;

        let icon = '';
        let label = '';
        let link = '';
        let tooltip = '';
        let commandId = '';

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
                    // resolve the filename provided to one in this vault, if it exists
                    if (activeFile) {
                        const linkFile = plugin.app.metadataCache.getFirstLinkpathDest(link, activeFile?.path);
                        link = linkFile ? linkFile.path : link;
                    }
                }
    
                const iconMatch = label?.match(/(:Li\w+:)/);
                if (iconMatch) {
                    // translate Iconize strings to Lucide icon strings
                    const iconName = label?.match(/:Li(\w+):/);
                    if (iconName) {
                        let iconImported = iconName[1]
                            .replace(/([a-z])([A-Z0-9])/g, '$1-$2')
                            .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
                            .toLowerCase();
                        // check the Lucide set first, and then the icon's name by itself (for custom icons, like Templater's)
                        icon = getIcon('lucide-' + iconImported) ? 'lucide-' + iconImported : (getIcon(iconImported) ? iconImported : '');
                        errorLog += icon ? '' : `${t('import.errorlog-item', { number: index + 1 })} ${t('import.errorlog-icon-not-found', { icon: iconImported })}\n`;
                    }
                    // remove the icon from the label string
                    label = label?.replace(iconMatch[1], '').trim();
                }

                tooltip = tooltipMatch ? tooltipMatch[1] : '';
        
                if (dataUriMatch) {
                    const dataUriType = dataUriMatch[1] || dataUriMatch[3] || '';
                    const dataUriValue = dataUriMatch[2] || decodeURIComponent(dataUriMatch[4]) || '';
                    debugLog('• data?', dataUriType, link);
        
                    switch (dataUriType) {
                        case 'command':
                            itemType = ItemType.Command;
                            commandId = dataUriValue;
                            const commandName = getCommandNameById(commandId);
                            // if the command name doesn't exist, show the command ID and an error
                            link = commandName ? commandName : commandId;
                            errorLog += commandName ? '' : `${t('import.errorlog-item', { number: index + 1 })} ${t('import.errorlog-command-not-recognized', { command: commandId })}\n`;
                            // TODO: link needs to trigger field error style somehow
                            break;
                        case 'folder':
                            itemType = ItemType.File;
                            link = dataUriValue;
                            break;
                        case 'menu':
                            itemType = ItemType.Menu;
                            let menuToolbar = plugin.settingsManager.getToolbar(dataUriValue);
                            link = menuToolbar ? menuToolbar.uuid : dataUriValue;
                            errorLog += menuToolbar ? '' : `${t('import.errorlog-item', { number: index + 1 })} ${t('import.errorlog-menu-not-found', { menu: dataUriValue })}\n`;
                            // TODO: link needs to trigger field error style somehow
                            break;
                    }

                }

            }

        }

        debugLog('• icon?', icon);
        debugLog('• label?', label);
        debugLog('• tooltip?', tooltip);
        debugLog('• link?', link);
        debugLog('• commandId?', commandId);
        debugLog(`=> ${itemType?.toUpperCase()}`);

        errorLog += itemType ? '' : `${t('import.errorlog-item', { number: index + 1 })} ${t('import.errorlog-invalid-format', { line: line })}\n`;

        // create the toolbar item and add it to the toolbar
        if (itemType) {

            let toolbarItem: ToolbarItemSettings =
			{
				uuid: getUUID(),
				label: label.trim(),
				icon: icon.trim(),
				link: link.trim(),
				linkAttr: {
					commandId: itemType === ItemType.Command ? commandId.trim() : '',
					hasVars: false,
					type: itemType
				},
				tooltip: tooltip,
				visibility: DEFAULT_ITEM_VISIBILITY_SETTINGS,
			};

            toolbar?.items.push(toolbarItem);

        }

    });

    // show errors to the user
    if (!fromShareUri && errorLog) {
        errorLog = `${t('import.errorlog-heading')}\n${errorLog}`;
        new Notice(errorLog, 10000);
    }

    return toolbar;

}

/**
 * Returns the name of a command based on its ID, if known.
 * @param commandId command ID to look up
 * @returns name of command; undefined otherwise
 */
function getCommandNameById(commandId: string): string | undefined {

    const availableCommands: Command[] = Object.values(this.app.commands.commands);
    const matchedCommand = availableCommands.find(command => command.id === commandId);
    return matchedCommand ? matchedCommand.name : undefined;

}