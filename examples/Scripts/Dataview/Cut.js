/**
 * Cuts whatever text is currently selected to the clipboard.
 * 
 * Usage:
 * - Add a Dataview item to your toolbar and select "Execute JavaScript".
 * - Add the path to this JavaScript file.
 */

(async () => {
	const editor =  app.workspace.activeLeaf.view?.editor;
	try {
	  await window.navigator.clipboard.writeText(editor.getSelection());
	  editor.replaceSelection('');
	  app.commands.executeCommandById("editor:focus");
	} catch (error) {
	  console.error("Cut failed:", error);
	}
})();