What's new in Note Toolbar v1.22?

## New Features 🎉

### Open files and URIs (if they're files) in non-editable modals

When configuring a File or URI type item, look for the _Where to open file(s)..._ option.

- URIs can also be opened in new tabs, split view, a new window, or modals, as long as they resolve to files.
- Other file types, excluding PDFs (hopefully, for now) can also be opened. Upon opening, the modal attempts to wrap the filename as an embedded wiki link, and display it.
- _Note that I'm also investigating getting modals to be editable, but I may ultimately have to rely on another plugin (like Modal Opener). Thanks @Moyf for the suggestion._

### Toolbars work in Kanban boards

Enable in _File types and views → Kanban boards_.

## Fixes

### Toolbar queries now using getActiveViewOfType()

This was the main reason for releasing this as a beta, as it's a fundamental change to the way the plugin searched for existing toolbars and updated/deleted them.

- This should mean toolbars should _not_ display more than once, as it was in some cases.
- This should hopefully also mean toolbars work as expected when using other plugins, including: Hover Editor, and Modal Opener.

### Other fixes

- Settings: JS items added from Search not immediately appearing in item list. _Thanks @Moyf_ #311
- Settings: Icon select modal now defaults to the previously selected icon for that item.
- Page preview now no longer shows if the item is a folder (versus a file).

---

## Previous releases

[v1.21](https://github.com/chrisgurney/obsidian-note-toolbar/releases/tag/1.21.1): Note Toolbar Gallery; add items more easily; native JavaScript support 

[v1.20](https://github.com/chrisgurney/obsidian-note-toolbar/releases/tag/1.20.0): Swap toolbars; support for audio/images/PDF/video; add a command for any item

[v1.19](https://github.com/chrisgurney/obsidian-note-toolbar/releases/tag/1.19.1): Canvas support, right-click to edit items, default item for floating buttons, toolbar search in settings

[v1.18](https://github.com/chrisgurney/obsidian-note-toolbar/releases/tag/1.18.1): Add a toolbar to the New Tab view; Commands to show individual toolbars

[v1.17](https://github.com/chrisgurney/obsidian-note-toolbar/releases/tag/1.17.0): Bottom toolbars, quick access to styles, API component improvements