/**
 * Opens a suggester to allow the user to make a selection.
 * Uses the BETA Note Toolbar API:
 * https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Note-Toolbar-API
 * 
 * Usage:
 * - Add a JS Engine item to your toolbar and select "Execute JavaScript".
 * - Add the path to this JavaScript file.
 */

// https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Note-Toolbar-API#notetoolbarsuggester

// values are shown in the selector; optionally mix in Obsidian and 
// plugin markdown (e.g., Iconize) to have it rendered
const values = ["value `1`", "value `2`"];
// keys are optional, but can be used to return a key corresponding to the selected value
const keys = ["key1", "key2"];

// returns value of selection
const selected1 = await ntb.suggester(values);
new Notice(selected1);

// same as previous, but also overrides the default placeholder text (note that keys = null)
const selected2 = await ntb.suggester(values, null, {
    placeholder: "Your placeholder"
}); 
new Notice(selected2);

// returns a key corresponding to the selected value
const selected3 = await ntb.suggester(values, keys);
new Notice(selected3);

// same as previous, but also overrides placeholder text, and adds a limit
const selected4 = await ntb.suggester(values, keys, {
    placeholder: "Your placeholder", 
    limit: 1
});
new Notice(selected4);