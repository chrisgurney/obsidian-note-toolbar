---
plugin: dataview
---

This is the default library provided with Note Toolbar, containing a number of example scripts that can be executed from Dataview.

(Text before the first heading is ignored.)

# Copy

Copies the selected text to the clipboard.

```js
const editor =  app.workspace.activeLeaf.view?.editor;
try {
    await window.navigator.clipboard.writeText(editor.getSelection());
    app.commands.executeCommandById("editor:focus");
} catch (error) {
    console.error("Copy failed:", error);
}
```

# Cut

Cuts the selected text to the clipboard.

```js
const editor =  app.workspace.activeLeaf.view?.editor;
try {
    await window.navigator.clipboard.writeText(editor.getSelection());
    editor.replaceSelection('');
    app.commands.executeCommandById("editor:focus");
} catch (error) {
    console.error("Cut failed:", error);
}
```

# Indent

Increases indentation on the current line.

```js
app.workspace.activeLeaf.view?.editor.indentList();
```

# Next file in folder
`ID: next-file`

Opens the next file in the folder.

```js
const currentFile = app.workspace.getActiveFile();
const currentFolder = app.vault.getAbstractFileByPath(currentFile.parent.path);
const currentFolderFiles = currentFolder.children.filter(f => f.basename !== undefined); // make sure it's a file (vs a folder)
// sort per File explorer: "File name (A to Z)"
const sortFileList = currentFolderFiles.sort((a, b) => a.basename.localeCompare(b.basename, undefined, {numeric: true, sensitivity: 'base'})).map(file => file.path);

const currentIndex = sortFileList.findIndex(e => e == currentFile.path);

if (sortFileList.length > 1) {
    let nextFileToOpen = '';
    if (currentIndex == sortFileList.length - 1)
        // last file, so roll over to start of list
        nextFileToOpen = sortFileList[0];
    else
        nextFileToOpen = sortFileList[currentIndex + 1];
    app.workspace.activeLeaf.openFile(app.vault.getAbstractFileByPath(nextFileToOpen));
}
```

# Paste

Pastes the text on the clipboard.

```js
const editor =  app.workspace.activeLeaf.view?.editor;
try {
    let replaceSelection = editor.replaceSelection;
    let text = await window.navigator.clipboard.readText();
    if (text) replaceSelection.apply(editor, [text]);
    app.commands.executeCommandById("editor:focus");
} catch (error) {
    console.error("Paste failed:", error);
}
```

# Previous file in folder
`ID: previous-file`

Opens the previous file in the folder.

```js
const currentFile = app.workspace.getActiveFile();
const currentFolder = app.vault.getAbstractFileByPath(currentFile.parent.path);
const currentFolderFiles = currentFolder.children.filter(f => f.basename !== undefined); // ensure it's a file

// sort per File Explorer: "File name (A to Z)"
const sortFileList = currentFolderFiles
    .sort((a, b) => a.basename.localeCompare(b.basename, undefined, { numeric: true, sensitivity: 'base' }))
    .map(file => file.path);

const currentIndex = sortFileList.findIndex(e => e === currentFile.path);

if (sortFileList.length > 1) {
    const prevFileToOpen = currentIndex === 0
        ? sortFileList[sortFileList.length - 1] // roll over to end of list
        : sortFileList[currentIndex - 1];

    app.workspace.activeLeaf.openFile(app.vault.getAbstractFileByPath(prevFileToOpen));
}
```

# Redo

Reapplies the last undone action.

```js
app.workspace.activeLeaf.view?.editor.redo();
```

# Swap Toolbars
`ID: swap-toolbar`

Changes the current toolbar with the selected toolbar, by updating the Note Toolbar property.

```js
const { toolbars, toolbarProp } = app.plugins.getPlugin("note-toolbar").settings;
const defaultOption = "Default folder mapping";
const toolbarOptions = toolbars.map(toolbar => toolbar.name).concat(defaultOption);
const pickedToolbar = await ntb.suggester(toolbarOptions);
const currentFile = app.workspace.getActiveFile();
await app.fileManager.processFrontMatter(currentFile, (frontmatter) => {
    if (pickedToolbar === defaultOption) {
        delete frontmatter[toolbarProp];
        return;
    }
    frontmatter[toolbarProp] = pickedToolbar;
});
```

# Undo

Reverts the last action.

```js
app.workspace.activeLeaf.view?.editor.undo();
```

# Unindent

Decreases indentation on the current line.

```js
app.workspace.activeLeaf.view?.editor.unindentList();
```