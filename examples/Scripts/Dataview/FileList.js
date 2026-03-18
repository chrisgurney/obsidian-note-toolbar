/**
 * Shows a list of files in the specified folder (and subfolders).
 * Excludes the current file. Defaults to current folder if folder not provided. Sorts alphabetically.
 * 
 * Arguments = fileFolder: "Scripts"
 * Requires a Note Toolbar Output callout ID to render.
 */

function FileList(input) {
    let fileFolder;

    if (input) {
        ({fileFolder} = input);
    }
    /* if fileFolder is not provided... */
    else {
        /* ...default to the folder of the calling note */
        fileFolder = dv.current().file.folder;
    }
    fileFolder = fileFolder ?? "";

    const files = app.vault.getFiles()
        .filter(file => (fileFolder === ""
            ? !file.path.includes("/")
            : file.path.startsWith(
                fileFolder.endsWith("/") ? fileFolder : fileFolder + "/"))
            && file.path !== dv.current().file.path)
        .sort((a, b) => a.name.localeCompare(b.name));

    dv.paragraph("📂 `" + fileFolder + "`:");
    dv.list(files.map(file => dv.fileLink(file.path)));
}

FileList(input);