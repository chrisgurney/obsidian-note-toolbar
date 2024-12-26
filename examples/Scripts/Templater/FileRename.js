/**
 * Adds a date stamp to the filename of the current file.
 * 
 * Usage:
 * - In the Templater plugin's settings, add the folder this script is in under "User script functions".
 * - Use tp.user.FileRename(tp) in "Execute Templater command".
 */

module.exports = async function FileRename(tp) {
    tp.file.rename(tp.file.title + ' ' + tp.date.now());
}