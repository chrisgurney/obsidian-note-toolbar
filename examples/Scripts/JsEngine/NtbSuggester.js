/**
 * Opens a suggester to allow the user to make a selection.
 * Uses the BETA Note Toolbar API:
 * https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Note-Toolbar-API
 * 
 * Usage:
 * - Add a JS Engine item to your toolbar and select "Execute JavaScript".
 * - Add the path to this JavaScript file.
 */

const options = [":LiActivity: option 1 **bold**", ":LiHome: option 2 _italics_"];
// (text_items: string[] | ((item: T) => string), items: T[], placeholder?: string, limit?: number) => Promise<T | null>;
let option = await NoteToolbar.suggester((item) => item, options, "Select an option:");
console.log(option, "selected");