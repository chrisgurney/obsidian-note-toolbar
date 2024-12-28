/** 
 * Shows a list of files in the current folder that link back to the current note.
 * 
 * Usage:
 * - Add a Dataview item to your toolbar and select "Execute JavaScript".
 * - Add the path to this script file.
 * - Requires a Note Toolbar Output callout ID to render.
 */

function LocalBacklinks() {

    /* get all notes that link to this one */
    const pages = dv.pages(`[[${dv.current().file.path}]]`);

    /* filter to only include notes in this note's folder */
    const filteredPages = pages
        .filter(page => page.file.path.startsWith(dv.current().file.folder) && 
            (page.file.path !== dv.current().file.path))
        .sort(page => page.file.name);

    /* display results in a list */
    dv.list(filteredPages.map(page => page.file.link));
}

LocalBacklinks();