const uri = new URLSearchParams(window.location.search).get("uri");
if (uri && uri.startsWith("obsidian://note-toolbar")) {
    window.location.replace(encodeURI(uri));
}