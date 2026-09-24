/**
 * LLM Demo:
 * Use a prompt file to send instructions to an LLM along with the current note.
 * The LLM's response is returned directly to Obsidian, and displayed how you like.
 *
 * INSTALLATION:
 * 1. Copy all of these files to your vault.
 * 2. Review the library for the LLM you want to use (e.g., Gemini.js)
 * 3. Review the paths below.
 * 4. Review how you would like the response to be displayed.
 * 5. In a toolbar, add an item: **JavaScript → Execute JavaScript file** select this file.
 */

// CHANGE: if needed
const LLM = await ntb.loadScript('AI/Lib/Gemini.js');
const PROMPTS_FOLDER = 'AI/Prompts/';
const UTILS = await ntb.loadScript('AI/Lib/Utils.js');

// ask the user which prompt file to use
const prompt = await UTILS.getPrompt(PROMPTS_FOLDER);
if (!prompt) return;

// send the text selected by default
let content = ntb.getSelection({ wordAtCursor: false });
let file = await UTILS.getActiveFile();
if (!content) {
    if (!file) return;
    content = await ntb.app.vault.cachedRead(file);
}

// send the request
const response = await LLM.generate(
    prompt, content, { file: file }
);

// CHANGE: use one of several options below to display the response
if (response) {
    const heading = `✨ AI response for [[${file.path}|${file.basename}]]:`;

    // option 1: append to the end of the originating note
    // ntb.append(response, { linePrefix: '> ', file: file } );

    // option 2: replace currently selected text, or insert at the cursor if there's no selection
    // (not feasible if response takes a while and you've moved on to other notes)
    // ntb.setSelection(response);
    
    // option 3: display in a modal
    // await ntb.modal(response, {
    //     title: heading, editable: true
    // });

    // option 4: display in a sidebar
    ntb.sidebar(`_${heading}_\n\n${response}`);
}