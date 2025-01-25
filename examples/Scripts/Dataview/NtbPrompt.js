/**
 * Opens a prompt to allow the user to enter information.
 * Uses the BETA Note Toolbar API:
 * https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Note-Toolbar-API
 * 
 * Usage:
 * - Add a Dataview item to your toolbar and select "Execute JavaScript".
 * - Add the path to this JavaScript file.
 */

(async () => {
    // (prompt_text: string, multiline?: boolean, placeholder?: string, default_value?: string) => Promise<string | null>;
    const result = await NoteToolbar.prompt("Enter some text:", false, "Example: text", "Default value");
    console.log(result);
})();