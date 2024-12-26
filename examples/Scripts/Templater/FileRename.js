/**
 * Adds a date stamp to the filename of the current file.
 * 
 * Usage:
 * - In the Templater plugin's settings, add the folder this script is in under "User script functions".
 * - Add a Templater item to your toolbar and select "Execute Templater command".
 * - In the "Templater command" field: tp.user.FileRename(tp)
 */

module.exports = async function FileRename(tp) {
    tp.file.rename(tp.file.title + ' ' + tp.date.now());
}