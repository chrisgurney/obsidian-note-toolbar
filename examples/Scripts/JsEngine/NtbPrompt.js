/**
 * Opens a prompt to allow the user to enter information.
 * Uses the BETA Note Toolbar API:
 * https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Note-Toolbar-API
 * 
 * Usage:
 * - Add a JS Engine item to your toolbar and select "Execute JavaScript".
 * - Add the path to this JavaScript file.
 */

// (prompt_text: string, multiline?: boolean, placeholder?: string, default_value?: string) => Promise<string | null>;
// all of these work:
const result1 = await NoteToolbar.prompt();
console.log(result1);
const result2 = await NoteToolbar.prompt("Enter some text:");
console.log(result2);
const result3 = await NoteToolbar.prompt("", true);
console.log(result3);
const result4 = await NoteToolbar.prompt("Enter lots of text:", true);
console.log(result4);
const result5 = await NoteToolbar.prompt("Enter some text:", false, "Placeholder");
console.log(result5);
const result6 = await NoteToolbar.prompt("Enter some text:", false, "Placeholder", "Default value");
console.log(result6);