/**
 * Displays a list of headings in the current file; once selected, jumps to that line.
 *  
 * Usage:
 * - In the Templater plugin's settings, add the folder this script is in under "User script functions".
 * - Add a Templater item to your toolbar and select "Execute Templater command".
 * - In the "Templater command" field: tp.user.HeadingSelector(tp)
 */

module.exports = async function HeadingSelector(tp) {

    const currentFile = app.workspace.getActiveFile();
    const { headings, sections } = app.metadataCache.getFileCache(currentFile);

    if (headings) {

        // prompt to select a heading
        const headingOptions = headings.map(heading => heading.heading + " (" + heading.position.start.line + ")");
        const chosenHeading = await tp.system.suggester((item) => item, headingOptions, true, "Choose heading:");
        
        // get the line number from the selected value
        const headingLineMatch = chosenHeading.match(/\((\d+)\)$/);
        const headingLine = parseInt(headingLineMatch[1]);
        
        // jump to that line number
        const editor = app.workspace.activeLeaf.view?.editor;
        editor.setSelection({line: headingLine, ch: 0});
        
    }

}