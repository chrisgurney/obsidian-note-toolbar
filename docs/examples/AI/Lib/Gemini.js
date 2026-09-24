/**
 * Makes requests to, and handles the response from Gemini. 
 * 
 * INSTALLATION:
 * 1. Get a Gemini API key: https://aistudio.google.com/api-keys
 * 2. Add it to **Obsidian Settings → Keychain** as 'gemini-api-key'
 * 3. Confirm the model below, and check docs to confirm API URL if necessary.
 */

// CHANGE: if needed
const GEMINI_MODEL = 'gemini-3.5-flash-lite';
const GEMINI_SECRET = 'gemini-api-key';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta';

async function generate(prompt, content, context) {
    const apiKey = ntb.app.secretStorage.getSecret(GEMINI_SECRET);

    if (!apiKey) {
        throw new Error(`Gemini: API key not found in Secret Storage: ${GEMINI_SECRET}`);
    }

    const res = await geminiRequest(apiKey, prompt, content, GEMINI_MODEL, context);
    return res && getGeminiResponseText(res);
}

/**
 * Submits the provided prompt + content to the given model.
 */
async function geminiRequest(apiKey, prompt, content, model, context) {

    const body = { 
        systemInstruction: { parts: [{ text: prompt }] },
        ...(content && { contents: [{ parts: [{ text: content }] }] }) 
    };
    
    new Notice('Gemini: Request sent…');
    console.log('Gemini: Sending request:', body, 'for file:', context);

    try {
        const res = await requestUrl({
            url: `${GEMINI_API_URL}/models/${model}:generateContent`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': apiKey
            },
            body: JSON.stringify(body)
        });

        new Notice('Gemini: Response received');
        return res.json;
    }
    catch (error) {
        new Notice(`Gemini: Request failed: ${error.message}`);
        console.error('Gemini: Request failed:', error);
        throw error;
    }
}

/**
 * Parses the JSON response from Gemini to get the result text. 
 */
function getGeminiResponseText(data) {
    //console.log('getResponseText:', data);

    if (!data.candidates?.length) {
        if (data.promptFeedback?.blockReason) {
            throw new Error(`Gemini: Blocked the prompt: ${data.promptFeedback.blockReason}`);
        }
        throw new Error('Gemini: Returned no response');
    }

    const text = data.candidates[0].content?.parts
        ?.map(part => part.text)
        .filter(Boolean)
        .join('');

    if (!text) {
        throw new Error('Gemini: Returned no text');
    }

    return text;
}

// make these functions available to scripts
return { 
    generate 
};