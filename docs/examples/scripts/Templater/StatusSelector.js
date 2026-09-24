/**
 * Updates the note's status property based on a hard-coded list of statuses.
 *
 * Usage:
 * - In the Templater plugin's settings, add the folder this script is in under "User script functions".
 * - Add a Templater item to your toolbar and select "Execute Templater command".
 * - In the "Templater command" field: tp.user.StatusSelector(tp, "colour")
 */

module.exports = async function StatusSelector(tp, statusCategory) {

    // define status options here for each category
    const statusOptions = {
        colour: ['red', 'orange', 'yellow', 'green', 'blue', 'indigo', 'violet'],
        vegetable: ['root vegetables', 'cruciferous vegetables', 'greens', 'nightshades'],
    };

    const validStatusOptions = statusOptions[statusCategory];

    if (validStatusOptions) {

        // prompt the user to pick a status
        const selectedStatus = await tp.system.suggester((item) => item, validStatusOptions, true, "Select a status:");

        // get the current file
        const currentFile = app.workspace.getActiveFile();
        await app.fileManager.processFrontMatter(currentFile, async (frontmatter) => {
            // update the status with the selected value
            frontmatter["status"] = selectedStatus;
        });
        
    }
    else {

        new Notice("Invalid status category: " + statusCategory);

    }

}