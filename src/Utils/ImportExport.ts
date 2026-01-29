import NoteToolbarPlugin from "main";
import { DEFAULT_ITEM_VISIBILITY_SETTINGS, DEFAULT_STYLE_OPTIONS, ExportSettings, ItemType, MOBILE_STYLE_OPTIONS, PositionType, SCRIPT_ATTRIBUTE_MAP, ScriptConfig, t, ToolbarItemSettings, ToolbarSettings } from "Settings/NoteToolbarSettings";
import { getUUID } from "./Utils";
import { getIcon, Notice, TFile, TFolder } from "obsidian";

const toIconizeFormat = (s: string) => 
    `:Li${s.replace(/^lucide-/, '')
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join('')}:`;

/**
 * Exports the given toolbar as a Note Toolbar Callout
 * @param ntb NoteToolbarPlugin
 * @param toolbar ToolbarSettings for the toolbar to export
 * @param options ExportSettings
 * @returns Note Toolbar Callout as a string
 */
export async function exportToCallout(ntb: NoteToolbarPlugin, toolbar: ToolbarSettings, options: ExportSettings): Promise<string> {
    
    // plugin.debug('exportToCallout()');

    // write out callout type + styles
    const defaultStyles = toolbar.defaultStyles.length ? toolbar.defaultStyles.join('-') : '';
    const mobileStyles = toolbar.mobileStyles.length ? toolbar.mobileStyles.join('-') : '';
    const styles = [defaultStyles, mobileStyles].filter(Boolean).join('-');
    let calloutExport = `> [!note-toolbar${styles ? '|' + styles : ''}] ${toolbar.name}`;

    // get the active file to provide context, and to replace vars if requested
    let activeFile = ntb.app.workspace.getActiveFile();

    calloutExport += await exportToCalloutList(ntb, toolbar, activeFile, options) + '\n';

    return calloutExport;

}

/**
 * Exports the items in a given toolbar to a list that can be used in a Note Toolbar Callout
 * @param ntb NoteToolbarPlugin
 * @param toolbar ToolbarSettings for the toolbar to export
 * @param activeFile TFile this export is being run from, for context if needed
 * @param options ExportSettings
 * @param recursions tracks how deep we are to stop recursion
 * @returns Note Toolbar Callout items as a bulleted list string
 */
async function exportToCalloutList(
    ntb: NoteToolbarPlugin,
    toolbar: ToolbarSettings,
    activeFile: TFile | null,
    options: ExportSettings,
    recursions: number = 0
): Promise<string> {

    if (recursions >= 2) {
        return ''; // stop recursion
    }

    let itemsExport = '';

    const BULLET = '\n> -';
    for (const [index, item] of toolbar.items.entries()) {

        // if Iconize is enabled, add icons; otherwise don't output
        let itemIcon = (options.includeIcons && item.icon) ? toIconizeFormat(item.icon) : '';
        itemIcon = (itemIcon && item.label) ? itemIcon + ' ' : itemIcon; // trailing space if needed

        let itemText = options.replaceVars 
            ? await ntb.vars.replaceVars(item.label, activeFile) 
            : replaceScriptDelimiters(ntb, item.label);
        let itemLink = options.replaceVars 
            ? await ntb.vars.replaceVars(item.link, activeFile) 
            : replaceScriptDelimiters(ntb, item.link);
        let itemTooltip = options.replaceVars 
            ? await ntb.vars.replaceVars(item.tooltip, activeFile) 
            : replaceScriptDelimiters(ntb, item.tooltip);

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
            case ItemType.Dataview:
            case ItemType.JavaScript:
            case ItemType.JsEngine:
            case ItemType.Templater:
                if (item.scriptConfig) {
                    // write out each script data attribute separately
                    const scriptAttributes = Object.entries(item.scriptConfig)
                        .filter(([_, value]) => value !== undefined && value !== null)
                        .map(([key, value]) => {
                            if (key === 'pluginFunction') {
                                return `data-${item.linkAttr.type}="${String(value)}"`;
                            }
                            else {
                                let encodedValue = String(value);
                                if (key === 'outputFile') {
                                    encodedValue = replaceScriptDelimiters(ntb, encodedValue);
                                }
                                encodedValue = escapeAttribute(String(encodedValue));
                                return encodedValue ? `${SCRIPT_ATTRIBUTE_MAP[key]}="${encodedValue}"` : '';
                            }
                        })
                        .join(' ');
                    itemsExport += `${BULLET} [${itemIcon}${itemText}]()<data ${scriptAttributes}/>`;
                }
                break;
            case ItemType.File: {
                // check if the provided file links to a folder, and if so replace with a folder
                let resolvedItemLink = itemLink;
                ntb.vars.replaceVars(itemLink, activeFile).then((resolvedLink) => {
                    resolvedItemLink = resolvedLink;
                });
                let fileOrFolder = ntb.app.vault.getAbstractFileByPath(resolvedItemLink);
                if (fileOrFolder instanceof TFolder) {
                    itemsExport += options.useDataEls
                        ? `${BULLET} [${itemIcon}${itemText}]()<data data-ntb-folder="${itemLink}"/>`
                        : `${BULLET} [${itemIcon}${itemText}](<obsidian://note-toolbar?folder=${itemLink}>)`;
                }
                else {
                    itemsExport += `${BULLET} [[${itemLink}|${itemIcon}${itemText}]]`;
                }
                break;
            }
            case ItemType.Group: {
                let groupToolbar = ntb.settingsManager.getToolbar(item.link);
                itemsExport += groupToolbar ? await exportToCalloutList(ntb, groupToolbar, activeFile, options, recursions + 1) : '';
                // TODO: skipped/ignored message if toolbar not found
                break;
            }
            case ItemType.Menu: {
                let menuLink = itemLink;
                if (!options.useIds) {
                    let menuToolbar = ntb.settingsManager.getToolbar(item.link);
                    menuLink = menuToolbar ? menuToolbar.name : menuLink;
                    // TODO: skipped/ignored message if toolbar not found?
                }
                itemsExport += options.useDataEls
                    ? `${BULLET} [${itemIcon}${itemText}]()<data data-ntb-menu="${menuLink}"/>`
                    : `${BULLET} [${itemIcon}${itemText}](<obsidian://note-toolbar?menu=${menuLink}>)`;
                break;
            }
            case ItemType.Separator:
            case ItemType.Spreader:
                // TODO: possible to display spreaders in callouts?
                itemsExport += `${BULLET} <hr/>`;
                break;
            case ItemType.Uri:
                // item links that start with < such as Templater expressions are left alone
                itemsExport += itemLink ? `${BULLET} [${itemIcon}${itemText}](${itemLink.startsWith('<') ? itemLink : `<${itemLink}>`})` : '';
                break;
        }

        itemsExport += (itemTooltip && (itemText !== itemTooltip)) ? ` <!-- ${itemTooltip} -->` : '';

    }

    return itemsExport;

}

/**
 * Returns a string that shouldn't break an attribute value portion.
 */
function escapeAttribute(str: string): string {
    return str
        .replace(/\"/g, '&quot;')
        .replace(/\>/g, '&gt;')
        .replace(/\</g, '&lt;')
        .replace(/\s+/g, ' '); // replace newlines with spaces
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

function unescapeLinkForCallout(str: string): string {
    return str
        .replace(/\\\[/g, '[')
        .replace(/\\\]/g, '[')
        .replace(/\\\)/g, ')')
        .replace(/\\\(/g, '(')
        .replace(/^<(?!%)/g, '')  // replace < but not <%
        // replace > but not %> (without using regex lookbehinds)
        .replace(/>$/g, (match, offset, fullString) => {
            // check if the character before the match is '%'
            const charBefore = fullString[offset - 1];
            return charBefore === '%' ? match : '';
        });
}

/**
 * Returns a string that replaces Dataview + Templater delimeters with
 * Note Toolbar's agnostic {{ }} script delimiters.
 */
function replaceScriptDelimiters(ntb: NoteToolbarPlugin, input: string): string {
    if (ntb.adapters.hasPlugin(ItemType.Templater)) {
        input = input.replace(/<%\s*(.*?)\s*%?>/g, '{{tp: $1}}');
    }
    if (ntb.adapters.hasPlugin(ItemType.Dataview)) {
        const dvPrefix = ntb.adapters.dv?.getSetting('inlineQueryPrefix') || '=';
        const regex = new RegExp(`^${dvPrefix}\\s*(.*)`, 'gm');
        input = input.replace(regex, '{{dv: $1}}');
    }
    return input;
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

function unescapeTextForCallout(str: string): string {
    return str
        .replace(/\\\[/g, '[')
        .replace(/\\\]/g, ']');
}

/**
 * Imports items from a callout string, adding them to a new toolbar, or the toolbar provided.
 * @param ntb NoteToolbarPlugin
 * @param callout Note Toolbar Calllout string to import
 * @param toolbar optional ToolbarSettings for existing toolbar to import into
 * @returns ToolbarSettings
 */
export async function importFromCallout(
    ntb: NoteToolbarPlugin, 
    callout: string, 
    toolbar?: ToolbarSettings, 
    fromShareUri: boolean = false
): Promise<ToolbarSettings> {

    ntb.debugGroup('importFromCallout');

    const lines = callout.trim().split('\n');
    const isToolbarProvided = toolbar ? true : false;
    let errorLog = '';

    // get the active file to provide context
    let activeFile = ntb.app.workspace.getActiveFile();

    // create a new toolbar to return, if one wasn't provided
    if (!toolbar) {
        toolbar = {
            uuid: getUUID(),
            name: '',
            commandPosition: PositionType.Floating,
            customClasses: '',
            defaultItem: null,
            defaultStyles: ['border', 'even', 'sticky'],
            hasCommand: false,
            items: [],
            mobileStyles: [],
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
                const validDefaultStyles = styles.filter(style => DEFAULT_STYLE_KEYS.includes(style));
                const validMobileStyles = styles.filter(style => MOBILE_STYLE_KEYS.includes(style));
                const invalidStyles = styles.filter(style => 
                    style && !DEFAULT_STYLE_KEYS.includes(style) && !MOBILE_STYLE_KEYS.includes(style)
                );
    
                ntb.debug('• name?', name);
                ntb.debug('• styles?', validDefaultStyles, validMobileStyles);
                if (invalidStyles.length > 0) {
                    ntb.debug('  • invalid:', invalidStyles);
                    errorLog += `${t('import.errorlog-invalid-styles', { styles: invalidStyles })}\n`;
                }
            
                toolbar.name = ntb.settingsManager.getUniqueToolbarName(name ? name : t('setting.toolbars.new-tbar-name'), false);
                toolbar.defaultStyles = validDefaultStyles;
                toolbar.mobileStyles = validMobileStyles;
            }
        }
        // remove line from the list to process next
        lines.shift();
    }

    // parse the rest
    lines.map((line, index) => {

        ntb.debugGroup(index + 1);
        
        let itemType: ItemType | undefined = undefined;

        let icon = '';
        let label = '';
        let link = '';
        let tooltip = '';
        let commandId = '';
        let scriptConfig;

        if (/<br\s*\/?>/.test(line)) {
            itemType = ItemType.Break;
        }
        else if (/<hr\s*\/?>/.test(line)) {
            itemType = ItemType.Separator;
        }
        else {

            const dataMatch = line.match(/data-(?:ntb-)?(command|dataview|folder|javascript|js-engine|menu|templater-obsidian)="(.*?)"(.*?)(\/?>|$)/);
            const uriMatch = line.match(/obsidian:\/\/note-toolbar\?(command|folder|menu)=(.*?)>?\)/);
            const tooltipMatch = line.match(/<!--\s*(.*?)\s*-->/);

            // remove the data element and tooltip to ensure the whole link is included in the match
            let linkText = line.replace(/<data[\s\S]*$|<!--[\s\S]*?-->$/g, '');
            // get the components of the external or internal link
            const linkMatch = linkText.match(/\[(.*?)\]\((.*?)\)$|\[\[(.*?)(?:\|(.*?))?\]\]/);

            ntb.debug(line);
            ntb.debug('dataMatch:', dataMatch);
            ntb.debug('linkMatch:', linkMatch);

            if (linkMatch) {

                // for external links
                if (linkMatch[1]) {
                    // default to URI, but change if data elements or Note Toolbar URI is used
                    itemType = ItemType.Uri;
                    label = unescapeTextForCallout(linkMatch[1]);
                    link = unescapeLinkForCallout(linkMatch[2]);
                }
                // for wikilinks
                else if (linkMatch[3]) {
                    itemType = ItemType.File;

                    label = unescapeTextForCallout(linkMatch[4] || linkMatch[3]);
                    link = unescapeLinkForCallout(linkMatch[3]);
                    // resolve the filename provided to one in this vault, if it exists
                    if (activeFile) {
                        const linkFile = ntb.app.metadataCache.getFirstLinkpathDest(link, activeFile?.path);
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

                if (dataMatch || uriMatch) {
                    const dataUriType = dataMatch ? dataMatch[1] : (uriMatch ? uriMatch[1] : '');
                    const dataUriValue = dataMatch ? dataMatch[2] : (uriMatch ? uriMatch[2] : '');
                    ntb.debug('• data?', dataUriType, link);
        
                    switch (dataUriType) {
                        case ItemType.Command: {
                            itemType = ItemType.Command;
                            commandId = dataUriValue;
                            const commandName = ntb.utils.getCommandNameById(commandId);
                            // if the command name doesn't exist, show the command ID and an error
                            link = commandName ? commandName : commandId;
                            errorLog += commandName ? '' : `${t('import.errorlog-item', { number: index + 1 })} ${t('import.errorlog-command-not-recognized', { command: commandId })}\n`;
                            // TODO: link needs to trigger field error style somehow
                            break;
                        }
                        case ItemType.Dataview:
                        case ItemType.JavaScript:
                        case ItemType.JsEngine:
                        case ItemType.Templater: {
                            itemType = dataUriType;
                            const dataEl = line.match(/<data\s[^>]*\/?>/);
                            ntb.debug(dataUriType, dataEl);
                            
                            if (dataEl) {
                                const parser = new DOMParser();
                                const doc = parser.parseFromString(dataEl[0], 'text/html');
                                const element = doc.body.firstElementChild;
                                scriptConfig = {
                                    pluginFunction: dataUriValue,
                                    expression: element?.getAttribute(SCRIPT_ATTRIBUTE_MAP['expression']) ?? undefined,
                                    sourceFile: element?.getAttribute(SCRIPT_ATTRIBUTE_MAP['sourceFile']) ?? undefined,
                                    sourceFunction: element?.getAttribute(SCRIPT_ATTRIBUTE_MAP['sourceFunction']) ?? undefined,
                                    sourceArgs: element?.getAttribute(SCRIPT_ATTRIBUTE_MAP['sourceArgs']) ?? undefined,
                                    outputContainer: element?.getAttribute(SCRIPT_ATTRIBUTE_MAP['outputContainer']) ?? undefined,
                                    outputFile: element?.getAttribute(SCRIPT_ATTRIBUTE_MAP['outputFile']) ?? undefined,
                                } as ScriptConfig;
                            }
                            break;
                        }
                        case ItemType.Folder:
                            itemType = ItemType.File;
                            link = dataUriValue;
                            break;
                        case ItemType.Menu: {
                            itemType = ItemType.Menu;
                            let menuToolbar = ntb.settingsManager.getToolbar(dataUriValue);
                            link = menuToolbar ? menuToolbar.uuid : dataUriValue;
                            errorLog += menuToolbar ? '' : `${t('import.errorlog-item', { number: index + 1 })} ${t('import.errorlog-menu-not-found', { menu: dataUriValue })}\n`;
                            // TODO: link needs to trigger field error style somehow
                            break;
                        }
                    }

                }

            }

        }

        ntb.debugGroup('RESULT →');
        ntb.debug('icon?', icon);
        ntb.debug('label?', label);
        ntb.debug('tooltip?', tooltip);
        ntb.debug('link?', link);
        ntb.debug('commandId?', commandId);
        ntb.debug('scriptConfig?', scriptConfig);
        ntb.debug(`=> ${itemType?.toUpperCase()}`);
        ntb.debugGroupEnd();

        errorLog += itemType ? '' : `${t('import.errorlog-item', { number: index + 1 })} ${t('import.errorlog-invalid-format', { line: line })}\n`;

        // create the toolbar item and add it to the toolbar
        if (itemType) {

            let toolbarItem: ToolbarItemSettings =
			{
				uuid: getUUID(),
				icon: icon.trim(),
				label: label.trim(),
                tooltip: tooltip,
                hasCommand: false,
                inGallery: false,
				link: link.trim(),
				linkAttr: {
                    commandCheck: false,
					commandId: itemType === ItemType.Command ? commandId.trim() : '',
					hasVars: false,
					type: itemType
				},
                scriptConfig: scriptConfig,
				visibility: JSON.parse(JSON.stringify(DEFAULT_ITEM_VISIBILITY_SETTINGS)),
			};

            toolbar?.items.push(toolbarItem);

        }

        ntb.debugGroupEnd();

    });

    // show errors to the user
    if (!fromShareUri && errorLog) {
        errorLog = `${t('import.errorlog-heading')}\n${errorLog}`;
        new Notice(errorLog, 10000).containerEl.addClass('mod-warning');
    }

    ntb.debugGroupEnd();

    return toolbar;

}