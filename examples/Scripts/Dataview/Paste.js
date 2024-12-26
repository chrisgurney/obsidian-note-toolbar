/**
 * Pastes whatever text is currently on the clipboard.
 * 
 * Usage:
 * - Add a Dataview item to your toolbar and select "Execute JavaScript".
 * - Add the path to this JavaScript file.
 */

(async () => {
	const editor =  app.workspace.activeLeaf.view?.editor;
	try {
	  let replaceSelection = editor.replaceSelection;
	  let text = await window.navigator.clipboard.readText();
	  if (text) replaceSelection.apply(editor, [text]);
	  app.commands.executeCommandById("editor:focus");
	} catch (error) {
	  console.error("Paste failed:", error);
	}
})();