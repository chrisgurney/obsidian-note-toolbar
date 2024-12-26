/**
 * Functions for the copy, cut, and paste commands.
 * Can be used with JS Engine.
 * 
 * Usage:
 * - Add a JS Engine item to your toolbar and select "Import and execute JavaScript"
 * - Add the path to this JavaScript file.
 * - Under function type: "copy", "cut", or "paste".
 */

export async function copy() {
	const editor =  app.workspace.activeLeaf.view?.editor;
	try {
	  await window.navigator.clipboard.writeText(editor.getSelection());
	  app.commands.executeCommandById("editor:focus");
	} catch (error) {
	  console.error("Copy failed:", error);
	}
}

export async function cut() {
	const editor =  app.workspace.activeLeaf.view?.editor;
	try {
	  await window.navigator.clipboard.writeText(editor.getSelection());
	  editor.replaceSelection('');
	  app.commands.executeCommandById("editor:focus");
	} catch (error) {
	  console.error("Cut failed:", error);
	}
}

export async function paste() {
	const editor =  app.workspace.activeLeaf.view?.editor;
	try {
	  let replaceSelection = editor.replaceSelection;
	  let text = await window.navigator.clipboard.readText();
	  if (text) replaceSelection.apply(editor, [text]);
	  app.commands.executeCommandById("editor:focus");
	} catch (error) {
	  console.error("Paste failed:", error);
	}
}