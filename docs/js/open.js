/**
 * This script opens links shared from Note Toolbar directly in Obsidian.
 * Learn more: https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Sharing-toolbars
 *
 * What It Does:
 * 1. Reads a special link passed into the page (from the URL query string).
 * 2. Gets the Note Toolbar Callout value from the "import" parameter in the link.
 * 3. Redirects the browser to Obsidian.
 */
document.addEventListener("DOMContentLoaded", () => {
    const uri = new URLSearchParams(window.location.search).get("uri");
    if (uri && uri.startsWith("obsidian://note-toolbar")) {
        const [baseUri, param] = uri.split("?import=");
        window.location.replace("obsidian://note-toolbar?import=" + encodeURIComponent(param));
    }
});
