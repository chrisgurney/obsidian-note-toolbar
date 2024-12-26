/**
 * Swaps toolbars for the current note by letting you select from a list, using the Note Toolbar note property.
 * 
 * Written by @FeralFlora
 * Adapted from https://github.com/chrisgurney/obsidian-note-toolbar/discussions/79 
 *
 * Usage:
 * - In the Templater plugin's settings, add the folder this script is in under "User script functions".
 * - Add a Templater item to your toolbar and select "Execute Templater command".
 * - In the "Templater command" field: tp.user.SwapToolbars(tp)
 */

module.exports = async function SwapToolbars(tp) {

    // Check if anything is selected. If it is, return it, so it's not lost.
    // const selection = tp.file.selection();
    // if (selection.length > 0) {
    //     tR += selection;
    // }
    // tp.hooks.on_all_templates_executed(async () => {
        
        // Get all the configured toolbars and the toolbar property from the plugin settings
        const { toolbars, toolbarProp } = app.plugins.getPlugin("note-toolbar").settings;
        
        // Option to revert to default folder mapping
        const defaultOption = "Default folder mapping";
        
        // Extract only the toolbar names and add the default option
        const toolbarOptions = toolbars.map(toolbar => toolbar.name).concat(defaultOption);
        
        // Prompt the user to pick a toolbar
        const pickedToolbar = await tp.system.suggester((item) => item, toolbarOptions, true, "Swap to toolbar:");
        
        // Get the current file
        const currentFile = app.workspace.getActiveFile();

        // Update the frontmatter of the current file with the selected toolbar option
        await app.fileManager.processFrontMatter(currentFile, (frontmatter) => {
            
            // If the user picked the default option, delete the toolbar property
            if (pickedToolbar === defaultOption) {
                delete frontmatter[toolbarProp];
                return;
            }
            
            // Otherwise, set the toolbar property to the chosen toolbar
            frontmatter[toolbarProp] = pickedToolbar;

        });
        
    // });

}