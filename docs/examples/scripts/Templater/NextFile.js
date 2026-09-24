
/**
 * Opens the next file in the current folder, according to the File explorer's default sorting ("File name (A to Z)").
 * Adapted from: https://gist.github.com/thomasvs/343c740825407f0a84f350e4e40bedd0
 *
 * Usage: 
 * - In the Templater plugin's settings, add the folder this script is in under "User script functions".
 * - Add a Templater item to your toolbar and select "Execute Templater command".
 * - In the "Templater command" field: tp.user.NextFile()
 */

module.exports = async function NextFile() {

	// get a sorted list of file names in the current path
	const currentFile = app.workspace.getActiveFile();
	const currentFolder = app.vault.getAbstractFileByPath(currentFile.parent.path);
	const currentFolderFiles = currentFolder.children.filter(f => f.basename !== undefined); // make sure it's a file (vs a folder)
	// sort per File explorer: "File name (A to Z)"
	const sortFileList = currentFolderFiles.sort((a, b) => a.basename.localeCompare(b.basename, undefined, {numeric: true, sensitivity: 'base'})).map(file => file.path);

	const currentIndex = sortFileList.findIndex(e => e == currentFile.path);

	if (sortFileList.length > 1) {
		// open next file in folder, if one exists
		let nextFileToOpen = '';
		if (currentIndex == sortFileList.length - 1)
			// last file, so roll over to start of list
			nextFileToOpen = sortFileList[0];
		else
			nextFileToOpen = sortFileList[currentIndex + 1];
		//console.log('Advancing explorer from ' + currentFile.path + ' to ' + nextFileToOpen);
		app.workspace.activeLeaf.openFile(app.vault.getAbstractFileByPath(nextFileToOpen));
	}

}