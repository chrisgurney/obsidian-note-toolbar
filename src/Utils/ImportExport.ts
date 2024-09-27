import NoteToolbarPlugin from "main";
import { ItemType, ToolbarSettings } from "Settings/NoteToolbarSettings";
import { debugLog, hasVars, replaceVars } from "./Utils";
import { TFolder } from "obsidian";
import { active } from "sortablejs";

export function exportToCallout(plugin: NoteToolbarPlugin, toolbar: ToolbarSettings): string {
    
    debugLog('exportToCallout()', 'enabled plugins', (plugin.app as any).plugins.plugins);

    // write out callout type + styles
    const defaultStyles = toolbar.defaultStyles.length ? toolbar.defaultStyles.join('-') : '';
    const mobileStyles = toolbar.mobileStyles.length ? toolbar.mobileStyles.join('-') : '';
    const styles = [defaultStyles, mobileStyles].filter(Boolean).join('-');
    let calloutExport = `> [!note-toolbar${styles ? '|' + styles : ''}]\n`;

    // get the active file just to provide context
    let activeFile = plugin.app.workspace.getActiveFile();

    // Iconize - check if plugin is enabled to output icons
    const hasIconize = (plugin.app as any).plugins.plugins['obsidian-icon-folder'];
    const toIconizeFormat = (s: string) => 
        `:Li${s.replace(/^lucide-/, '')
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join('')}:`;
    // TODO: for import code, to undo the above:
    // const toKebabCaseWithPrefix = (s: string) => 
    //     'lucide-' + s.replace(/([A-Z])/g, '-$1').toLowerCase().slice(1);

    toolbar.items.forEach((item, index) => {

        // if Iconize is enabled, add icons; otherwise don't output
        let itemIcon = (hasIconize && item.icon) ? toIconizeFormat(item.icon) : '';
        itemIcon = (itemIcon && item.label) ? itemIcon + ' ' : itemIcon; // add trailing space

        let itemText = encodeForCallout(item.label);
        let itemLink = encodeForCallout(item.link);

        // fallback if no icon or label = tooltip; otherwise use a generic name
        itemText = itemIcon ? itemText : (itemText ? itemText : (item.tooltip ? item.tooltip : `Item${index + 1}`));

        calloutExport += `> - `;
        switch(item.linkAttr.type) {
            case ItemType.Break:
                calloutExport += `<br/>`;
                break;
            case ItemType.Command:
                calloutExport += `[${itemIcon}${itemText}]()<data data-ntb-command="${item.linkAttr.commandId}"/>`;
                // calloutExport += `[${itemIcon}${itemText}](<obsidian://note-toolbar?commandid=${item.linkAttr.commandId}>)`;
                break;
            case ItemType.File:
                // check if the provided file links to a folder, and if so replace with a folder
                let resolvedItemLink = replaceVars(plugin.app, itemLink, activeFile, false);
                let fileOrFolder = this.app.vault.getAbstractFileByPath(resolvedItemLink);
                if (fileOrFolder instanceof TFolder) {
                    calloutExport += `[${itemIcon}${itemText}]()<data data-ntb-folder="${itemLink}"/>`;
                    // calloutExport += `[${itemIcon}${itemText}](<obsidian://note-toolbar?folder=${itemLink}>)`;
                }
                else {
                    calloutExport += `[[${itemLink}|${itemIcon}${itemText}]]`;
                }
                break;
            case ItemType.Group:
                break;
            case ItemType.Menu:
                calloutExport += `[${itemIcon}${itemText}]()<data data-ntb-menu="${itemLink}"/>`;
                // calloutExport += `[${itemIcon}${itemText}](<obsidian://note-toolbar?menu=${itemLink}>)`;
                break;
            case ItemType.Separator:
                calloutExport += `<hr/>`;
                break;
            case ItemType.Uri:
                calloutExport += `[${itemIcon}${itemText}](<${itemLink}>)`;
                break;
        }

        calloutExport += item.tooltip ? ` <!-- ${encodeForCallout(item.tooltip)} -->` : '';

        calloutExport += `\n`;

    });

    return calloutExport;

}

/**
 * Returns a string that shouldn't break the callout markdown.
 * @param str string to encode
 * @returns URI encoded string with certain characters preserved
 */
export function encodeForCallout(str: string): string {
    return encodeURIComponent(str)
        .replace(/%20/g, ' ')
        .replace(/%2F/g, '/')
        .replace(/%3A/g, ':')
        .replace(/%5B/g, '\[')
        .replace(/%5D/g, '\]')
        .replace(/%7B/g, '{')
        .replace(/%7D/g, '}');
}