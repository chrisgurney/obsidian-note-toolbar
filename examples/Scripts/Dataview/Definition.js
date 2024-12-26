/**
 * Shows the dictionary definition of the selected word in a notification, using DictionaryAPI.dev
 * Adapted from https://stackoverflow.com/questions/71443632/how-can-i-use-free-dictionary-api-to-get-the-top-definition-of-a-word
 *
 * Usage:
 * - Add a Dataview item to your toolbar and select "Execute JavaScript".
 * - Add the path to this script file.
 * - Select a word in a note, and then click the button; a definition should appear in a notification. 
 */

function Definition() {

    const editor =  app.workspace.activeLeaf.view?.editor;
    const selectedText = editor.getSelection();

    if (selectedText) {
        fetch('https://api.dictionaryapi.dev/api/v2/entries/en/' + selectedText)
        .then(response => {
            return response.json();
        })
        .then(word => {
            let definition = '';

            definition += '📖 ' + word[0].word + ' ' + (word[0].phonetic ?? '') + '\n\n';

            const wordDefinitionArr = word[0].meanings;
            wordDefinitionArr.forEach(wordDefinition => {
                definition += '- ' + wordDefinition.definitions[0].definition + '\n';
            });

            definition += '\nSource(s):\n' + word[0].sourceUrls.join(' ');

            // increase the delay if needed
            new Notice(definition, 5000);
        });
    }
    else {
        new Notice('Definition: Select a word to define.');
    }

};

Definition();