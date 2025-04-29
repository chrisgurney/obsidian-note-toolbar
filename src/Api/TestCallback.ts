import NoteToolbarPlugin from "main";

type Callback = (arg: string) => void;

export async function testCallback(plugin: NoteToolbarPlugin, buttonId: string, callback: Callback): Promise<void> {

    plugin.debug("%c🟡 Experimental: This function will be deleted.", "color: #f00");

    // TODO: get the button based on the buttonId provided
    // TODO: set the callback function when the button's clicked from a toolbar and a menu

    plugin.debug("> plugin = ", plugin);
    plugin.debug("> buttonId = ", buttonId);

    callback('< Hello back from Note Toolbar!');

}