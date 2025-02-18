/**
 * Writes a backup file containing all toolbars as callouts.
 * Uses the BETA Note Toolbar API:
 * https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Note-Toolbar-API
 * 
 * Usage:
 * - Add a Dataview item to your toolbar and select "Execute JavaScript".
 * - Add the path to this JavaScript file.
 */

(async () => {
    const toolbars = ntb.getToolbars();
    let callouts = '';
    for (let toolbar of toolbars) {
        callouts += `## ${toolbar.getName()}\n\n`;
        callouts += await toolbar.export();
        callouts += '\n';
    }
    const datestamp = new Date().toISOString().replace(/[:.]/g, '').replace('T', '-').split('Z')[0];
    const filename = `BACKUP ${datestamp}.md`;
    await app.vault.create(filename, callouts);
})();