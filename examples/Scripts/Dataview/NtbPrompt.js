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
    // https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Note-Toolbar-API#prompt

    // default (one-line) prompt with default placeholder message
    const result1 = await ntb.prompt();
    new Notice(result1);

    // same as previous, with text above input field added
    const result2 = await ntb.prompt({
        label: "Enter some text"
    });
    new Notice(result2);

    // same as previous, with default placeholder text overridden 
    const result3 = await ntb.prompt({
        label: "Enter some text",
        placeholder: ""
    });
    new Notice(result3);

    // default (one-line) prompt with message, overridden placeholder, and default value 
    const result4 = await ntb.prompt({
        label: "Enter some text",
        placeholder: "Placeholder",
        default: "Default"
    });
    new Notice(result4);

    // multi-line prompt
    const result5 = await ntb.prompt({
        large: true
    });
    new Notice(result5);

    // same as previous, but with text above input field (markdown is supported)
    const result6 = await ntb.prompt({
        large: true,
        label: "Enter _lots_ of text:"
    });
    new Notice(result6);
    
})();