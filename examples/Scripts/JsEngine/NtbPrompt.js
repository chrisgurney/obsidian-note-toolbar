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
new Notice(result1);
const result2 = await NoteToolbar.prompt("Enter some text:");
new Notice(result2);
const result3 = await NoteToolbar.prompt("", true);
new Notice(result3);
const result4 = await NoteToolbar.prompt("Enter lots of text:", true);
new Notice(result4);
const result5 = await NoteToolbar.prompt("Enter some text:", false, "Placeholder");
new Notice(result5);
const result6 = await NoteToolbar.prompt("Enter some text:", false, "Placeholder", "Default value");
new Notice(result6);