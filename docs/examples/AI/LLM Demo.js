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
 * 6. Note Toolbar 1.35: Provide a "scriptPath" argument to let this script know where the libraries are located
 */

let scriptPath = input?.scriptPath ?? '/AI';
if (input?._scriptFile) {
    // Note Toolbar 1.36 or later: path is provided automatically 
    scriptPath = input._scriptFile.parent?.path ?? scriptPath;
}

// CHANGE: if needed
const PROMPTS_FOLDER = `${scriptPath}/Prompts/`;
const LLM = await ntb.loadScript(`${scriptPath}/Lib/Gemini.js`);
const UTILS = await ntb.loadScript(`${scriptPath}/Lib/Utils.js`);
const RESPONSE_FOLDER = `${scriptPath}/Responses`; // optional, if outputting to files

// ask the user which prompt file to use (or to manually enter one)
const prompt = await UTILS.getPrompt(PROMPTS_FOLDER);
if (!prompt) return;

// gets the selected text, or the active file's contents, or nothing (i.e., use the prompt)
const { content, file } = await UTILS.getContent();

// send the request
try {
    new Notice(`AI: Request sent...`);
    const response = await LLM.generate(
        prompt, content, { file: file }
    );
    new Notice('AI: Response received');

    // CHANGE: use one of several options below to display the response
    if (response) {
        const headingContext = file ? `[[${file.path}|${file.basename}]]\n\n` : content === '' ? `${prompt}\n\n` : '';
        const heading = `${headingContext}_✨ AI response:_`;

        // option 1: append to the end of the originating note
        // ntb.append(response.text, { linePrefix: '> ', file: file } );
    
        // option 2: replace currently selected text, or insert at the cursor if there's no selection
        // (not feasible if response takes a while and you've moved on to other notes)
        // ntb.setSelection(response.text);
        
        // option 3: display in a modal
        // await ntb.modal(response.text, {
        //     title: heading, editable: true
        // });
    
        // option 4: display in a sidebar
        ntb.sidebar(`${heading}\n\n${response.text}`, {
            viewIcon: 'astroid', viewTitle: 'Gemini'
        });

        // option 5: save to a new Markdown file
        // const responseFile = await UTILS.saveResponse(response, file, heading, RESPONSE_FOLDER);
        // void ntb.app.workspace.getLeaf().openFile(responseFile);
        // await ntb.sidebar(responseFile, {
        //     viewIcon: 'astroid', viewTitle: 'Gemini'
        // });
    }
}
catch (error) {
    new Notice(
        `AI: Request failed: ${error.message}`, 10000
    ).containerEl.addClass('mod-warning');
    console.error('AI: Request failed:', error);
}