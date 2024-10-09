const r = new URLSearchParams(window.location.search).get("r");
if (r && r.startsWith("obsidian://note-toolbar")) {
    window.location.replace(encodeURI(r));
}