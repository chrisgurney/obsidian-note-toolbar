---
name: note-toolbar-callouts
description: "Create and edit Note Toolbar Callouts. Use to create toolbars within .md files in Obsidian."
---

# Note Toolbar Callouts

Create and edit valid Note Toolbar Callouts in Obsidian `.md` files.

Read `references/callouts-reference.md` before generating any callouts. Do not fetch the wiki version instead: the included reference is the version matched to this checkout.

## Key constraints

- `<data>` elements must be self-closing (`/>`)
- `folder`, `menu`, and `command` types require empty link targets `()`
- URI colons must be encoded (`:`→ `%3A`) or the URL wrapped in `< >`
- Style metadata is pipe-separated from the callout type; styles are space- or dash-separated