/**
 * Utilities for LLM scripts.
 */

/**
 * Returns the contents of the active file.
 */
async function getActiveFile() {
    const file = ntb.app.workspace.getActiveFile();

    if (!file) throw new Error('No active file');
    return file;
}

/**
 * Prompts the user to select a prompt file from the provided folder. 
 */
async function getPrompt(promptsFolder) {
    const prompts = ntb.app.vault
        .getMarkdownFiles()
        .filter(file => file.path.startsWith(promptsFolder));

    const promptFile = await ntb.fileSuggester(prompts, {
        allowCustomInput: true,
        placeholder: 'Choose a prompt'
    });

    if (!promptFile) return null;
    if (typeof promptFile === 'string') return promptFile;
    return await ntb.app.vault.cachedRead(promptFile);
}

// make these functions available to scripts
return {
    getActiveFile,
    getPrompt
};