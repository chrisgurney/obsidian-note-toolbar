import NoteToolbarPlugin from "main";

type Callback = (arg: string) => void;

export async function testCallback(ntb: NoteToolbarPlugin, buttonId: string, callback: Callback): Promise<void> {

    ntb.debug("%c🟡 Experimental: This function will be deleted.", "color: #f00");

    // TODO: get the button based on the buttonId provided
    // TODO: set the callback function when the button's clicked from a toolbar and a menu

    ntb.debug("> plugin = ", ntb);
    ntb.debug("> buttonId = ", buttonId);

    callback('< Hello back from Note Toolbar!');

}