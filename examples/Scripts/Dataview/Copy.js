/**
 * Copies whatever text is currently selected to the clipboard.
 * 
 * Usage:
 * - Add a Dataview item to your toolbar and select "Execute JavaScript".
 * - Add the path to this JavaScript file.
 */

(async () => {
	const editor =  app.workspace.activeLeaf.view?.editor;
	try {
	  await window.navigator.clipboard.writeText(editor.getSelection());
	  app.workspace.activeEditor?.editor?.focus();
	} catch (error) {
	  console.error("Copy failed:", error);
	}
})();