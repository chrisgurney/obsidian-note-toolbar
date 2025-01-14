/**
 * Opens a prompt to allow the user to enter information.
 * Uses the BETA Note Toolbar API:
 * https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Note-Toolbar-API
 * 
 * Usage:
 * - Add a JS Engine item to your toolbar and select "Execute JavaScript".
 * - Add the path to this JavaScript file.
 */

const result = await NoteToolbar.prompt("Enter something:", null, false, false);
console.log(result);