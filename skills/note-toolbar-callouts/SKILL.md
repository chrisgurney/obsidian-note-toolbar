---
name: note-toolbar-callouts
description: "Create and edit Note Toolbar Callouts. Use to create toolbars within .md files in Obsidian."
---

# Note Toolbar Callouts

Create and edit valid Note Toolbar Callouts in Obsidian `.md` files.

Full documentation: https://raw.githubusercontent.com/wiki/chrisgurney/obsidian-note-toolbar/Note-Toolbar-Callouts.md

Fetch the full reference before generating any callouts.

## Key constraints

- `<data>` elements must be self-closing (`/>`)
- `folder`, `menu`, and `command` types require empty link targets `()`
- URI colons must be encoded (`:`→ `%3A`) or the URL wrapped in `< >`
- Style metadata is pipe-separated from the callout type; styles are space- or dash-separated