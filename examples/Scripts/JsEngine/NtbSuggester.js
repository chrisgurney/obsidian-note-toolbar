/**
 * Opens a suggester to allow the user to make a selection.
 * Uses the BETA Note Toolbar API:
 * https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Note-Toolbar-API
 * 
 * Usage:
 * - Add a JS Engine item to your toolbar and select "Execute JavaScript".
 * - Add the path to this JavaScript file.
 */

const keys = ["key1", "key2"];
// mix in Obsidian and plugin markdown (e.g., Iconize) to have it rendered in the suggester
const values = [":LiHome: value1", ":LiActivity: value2"];

// suggester(text_items: string[] | ((item: T) => string), items?: T[], placeholder?: string, limit?: number)
// all of these work:
const selected1 = await NoteToolbar.suggester(values); // returns value of selection
new Notice(selected1);
const selected2 = await NoteToolbar.suggester(values, null, "Placeholder"); // overrides placeholder text (without keys)
new Notice(selected2);
const selected3 = await NoteToolbar.suggester(values, keys); // returns key corresponding to selection
new Notice(selected3);
const selected4 = await NoteToolbar.suggester(values, keys, "Placeholder"); // overrides placeholder text
new Notice(selected4);