/**
 * Creates a new note from the provided templates (user selects if >1), and 
 * puts it in one of the provided output folders (user selects if >1).
 * 
 * Usage:
 * - In the Templater plugin's settings, add the folder this script is in under "User script functions".
 * - Add a Templater item to your toolbar and select "Execute Temlpater command".
 * - In the "Templater command" field use "tp.user.NewNoteFromTemplates" and provide it these parameters:
 *    - A reference to the "tp" object.
 *    - A list of templates for the user to choose from.
 *    - An output filename, or "" to use the template name as the filename.
 *    - (Optional) Provide a list of output folders for the user to select from: ["Folder1", "Folder2"]
 * 
 * Examples:
 * tp.user.NewNoteFromTemplates(tp, ["[[Template1]]", "[[Template2]]"])
 * tp.user.NewNoteFromTemplates(tp, ["[[Design Effort Template]]", "[[Effort Template]]"], "New Effort", ["Efforts", "Portfolio/Efforts"])
 */

module.exports = async function NewNoteFromTemplates(tp, templates, filename = "", folders = null) {

    /* this removes double brackets from template names, if they're provided */
    var templateNames = templates.map(item => item.replace(/\[|\]/g, ''));

    var selectedTemplate
    if (templates.length > 1) {
        /* show templates to user to select */
        selectedTemplate = await tp.system.suggester((item) => item, templateNames, false, "Select a template...");
    }
    else {
        selectedTemplate = templateNames[0]
    }

    if (selectedTemplate !== null) {
        const template = tp.file.find_tfile(selectedTemplate)
        if (template === null) { console.error("Unable to find template: " + selectedTemplate) }

        var outputFolder
        /* if folders array is not provided... */
        if (folders === null) {
            /* ...default to the folder of the calling template */
            outputFolder = app.vault.getAbstractFileByPath(tp.file.path(true)).parent
        }
        /* otherwise... */
        else {
            var selectedFolder
            if (folders.length > 1) {
                /* show folders to the user to select */
                selectedFolder = await tp.system.suggester((item) => item, folders, false, "Where should we put it?");
            }
            else {
                selectedFolder = folders[0]
            }
            outputFolder = app.vault.getAbstractFileByPath(selectedFolder)
        }

        var outputFileName = filename
        if (filename === "") {
            outputFileName = selectedTemplate
        }

        await tp.file.create_new(template, outputFileName, true, outputFolder)
    }

}