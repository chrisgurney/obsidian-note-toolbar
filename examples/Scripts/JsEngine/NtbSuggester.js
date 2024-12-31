/**
 * Opens a suggester to allow the user to make a selection.
 * Uses the BETA Note Toolbar API.
 * 
 * Usage:
 * - Add a JS Engine item to your toolbar and select "Execute JavaScript".
 * - Add the path to this JavaScript file.
 */

const options = ["option 1", "option 2"];
let option = await NoteToolbarApi.suggester((item) => item, options, true, "Select an option:");
console.log(option, "selected");