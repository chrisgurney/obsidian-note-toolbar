/**
 * Utilities for LLM scripts.
 */

/**
 * Returns the contents of the text selection, active file, or nothing.
 * @returns { content, context }
 */
async function getContent() {
    let content = ntb.getSelection({ wordAtCursor: false });
    if (content) return { content, file: null };

    const file = ntb.app.workspace.getActiveFile();
    if (!file) return { content: '', file: null };

    content = await ntb.app.vault.cachedRead(file);
    return { content, file };
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
        placeholder: 'Type or choose a prompt (uses open note for content)'
    });

    if (!promptFile) return null;
    if (typeof promptFile === 'string') return promptFile;
    return await ntb.app.vault.cachedRead(promptFile);
}

/**
 * Saves the provided response to a file at the given path.
 */
async function saveResponse(response, sourceFile, heading, responsePath) {
    if (!ntb.app.vault.getAbstractFileByPath(responsePath)) {
        await ntb.app.vault.adapter.mkdir(responsePath);
    }

    const properties = [
        '---',
        ...(response.conversationId
            ? [`conversation_id: "${response.conversationId}"`]
            : []),
        ...(sourceFile ? [`source: "[[${sourceFile.path}]]"`] : []),
        '---'
    ].join('\n');

    const output = `${properties}\n\n${heading}\n\n${response.text}`;
    const filename = sourceFile
        ? `${sourceFile.basename} - ${window.moment().format('YYYYMMDD-HHmmss')}.md`
        : `${window.moment().format('YYYYMMDD-HHmmss')}.md`;

    const responseFile = await app.vault.create(`${responsePath}/${filename}`, output);

    return responseFile;
}

// make these functions available to scripts
return {
    getContent,
    getPrompt,
    saveResponse
};