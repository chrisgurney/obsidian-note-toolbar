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

async function generate(prompt, content, context = {}) {
    const apiKey = ntb.app.secretStorage.getSecret(GEMINI_SECRET);

    if (!apiKey) {
        throw new Error(`Gemini: API key not found in Obsidian Keychain settings: ${GEMINI_SECRET}`);
    }

    const body = {
        model: GEMINI_MODEL,
        input: content?.trim() || prompt,
        ...(prompt && content?.trim()
            ? { system_instruction: prompt }
            : {}),
        ...(context.conversationId
            ? { previous_interaction_id: context.conversationId }
            : {})
    };

    console.log('Gemini: Sending request:', body, 'for file:', context.file);

    try {
        const res = await requestUrl({
            url: `${GEMINI_API_URL}/interactions`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': apiKey
            },
            body: JSON.stringify(body)
        });

        const data = res.json;
        const text = data.steps
            ?.filter(step => step.type === 'model_output')
            .flatMap(step => step.content ?? [])
            .filter(part => part.type === 'text')
            .map(part => part.text)
            .join('');

        if (!text) {
            throw new Error(
                data.status === 'failed'
                    ? 'Gemini: Interaction failed'
                    : 'Gemini: Returned no text'
            );
        }

        return {
            text,
            conversationId: data.id,
            history: undefined
        };
    }
    catch (error) {
        console.error('Gemini: Request failed:', error);
        throw error;
    }
}

// make these functions available to scripts
return {
    generate
};
