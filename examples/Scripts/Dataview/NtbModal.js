/**
 * Opens a modal to present the user with a note or provided string content.
 * Uses the BETA Note Toolbar API:
 * https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Note-Toolbar-API
 * 
 * Usage:
 * - Add a Dataview item to your toolbar and select "Execute JavaScript".
 * - Add the path to this JavaScript file.
 */

(async () => {
    // https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Note-Toolbar-API#modal

    // modal with a string
    // await ntb.modal("_Hello_ modal!");

    // modal with a string and title
    // await ntb.modal("_Hello_ world!", {
    //     title: "# Window title"
    // });

    // same, but with content from a file
    const filename = "Welcome.md";
    const file = app.vault.getAbstractFileByPath(filename);
    if (file) {
        await ntb.modal(file, {
            title: `**${file.basename}**`
        });
    }
    else {
        new Notice(`File not found: ${filename}`);
    }
})();