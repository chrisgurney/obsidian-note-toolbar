const uri = new URLSearchParams(window.location.search).get("uri");

if (uri) {
    try {
        const parsedUrl = new URL(uri);
        if (parsedUrl.protocol === "obsidian:" && parsedUrl.hostname === "note-toolbar") {
            const param = parsedUrl.searchParams.get("import");
            if (param) {
                window.location.replace(`obsidian://note-toolbar?import=${encodeURIComponent(param)}`);
            } else {
                console.error("Missing 'import' parameter.");
            }
        } else {
            console.error("Invalid protocol or host.");
        }
    } catch (e) {
        console.error("Invalid URL format.");
    }
}