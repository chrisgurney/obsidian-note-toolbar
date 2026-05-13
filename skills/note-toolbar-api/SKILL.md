---
name: note-toolbar-api
description: "Write, edit, or debug JavaScript that uses the Note Toolbar `ntb` API inside Obsidian. Use this skill whenever the user wants to script a toolbar item, use ntb.prompt / ntb.suggester / ntb.fileSuggester / ntb.menu / ntb.modal, read or write note properties via ntb.getProperty / ntb.setProperty, work with toolbar items via ntb.getItem / ntb.getToolbars, or combine the ntb API with Dataview JS, JS Engine, or Templater. Also trigger for any script that references `ntb`, `NtbSuggester`, or 'Note Toolbar API'."
---

# Note Toolbar API

Full reference: https://raw.githubusercontent.com/wiki/chrisgurney/obsidian-note-toolbar/Note-Toolbar-API.md

Fetch the full reference before writing or editing any script.

## Code conventions

- Comments start with a lower-case character.
- Use `activeWindow.navigator` (not bare `navigator`) for clipboard/permission-sensitive APIs.
- Use `normalizePath()` for vault paths.
- Keep scripts minimal; avoid unnecessary variables.
- Null-check all UI method results — every `ntb` UI call returns `null` if dismissed: `if (!result) return;`
- Inline scripts are plain JS; no type annotations.