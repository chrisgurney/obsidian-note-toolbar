document.addEventListener("DOMContentLoaded", () => {
    const uri = new URLSearchParams(window.location.search).get("uri");
    if (uri && uri.startsWith("obsidian://note-toolbar")) {
        const [baseUri, param] = uri.split("?import=");
        window.location.replace("obsidian://note-toolbar?import=" + encodeURIComponent(param));
    }
});