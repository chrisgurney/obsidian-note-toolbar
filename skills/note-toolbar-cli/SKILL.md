---
name: note-toolbar-cli
description: "Interact with the Obsidian Note Toolbar plugin using the Obsidian CLI to create, list, and manage toolbars; add, move, copy, or remove items (commands, links, scripts, separators, and more); use/execute items; list Note Toolbar Gallery items and mapping rules; and open Note Toolbar settings. Use when the user asks to create, update, query, or interact with Note Toolbar toolbars or items in their Obsidian vault."
---

# Note Toolbar CLI

> **Important:** Do NOT make changes to the plugin's data file (`data.json`) directly, or by using a workaround such as Obsidian's `eval` command.

Use the `obsidian` CLI to interact with a running Obsidian instance. Requires Obsidian to be open, with the Note Toolbar plugin installed and enabled.

Run `obsidian note-toolbar:help` to see all available commands. This is always up to date.

Full docs: https://raw.githubusercontent.com/wiki/chrisgurney/obsidian-note-toolbar/Note-Toolbar-CLI.md

## Quick syntax reference

- **Parameters** take a value with `=`. Quote values with spaces. **Flags** are boolean switches with no value.
- **File targeting**: use `file=<name>` (wikilink-style) or `path=<path>` (vault-root relative); defaults to active file.
- **Vault targeting**: `vault=<name>` must come before the command name (e.g. `obsidian vault="My Vault" note-toolbar:new ...`); defaults to most recently focused vault.
- `obsidian note-toolbar` with no subcommand lists all configured toolbars.
- `obsidian note-toolbar:status` shows the toolbar that is currently visible in the active view.

## Common patterns

```bash
obsidian note-toolbar
obsidian note-toolbar toolbar="Daily Notes"
obsidian note-toolbar:new name=Formatting
obsidian note-toolbar:add-command to=Formatting label=Bold command=editor:toggle-bold focus
obsidian note-toolbar:use item=c0a21325-b8b1-4617-81a0-5114350310fc
```

Use `--copy` on any command to copy output to clipboard. Use `total` on list commands to get a count.

## Dynamic values and dates

Before hard-coding dates or note names in toolbar items, check whether the item can use Note Toolbar variables.

Relevant docs:
- Variables: https://raw.githubusercontent.com/wiki/chrisgurney/obsidian-note-toolbar/Variables.md
- Note Toolbar API: https://raw.githubusercontent.com/wiki/chrisgurney/obsidian-note-toolbar/Note-Toolbar-API.md

URI items can use variables such as `{{note_title}}`, `{{file_path}}`, `{{prop_NAME}}`, and expressions such as `{{js: ...}}`, `{{dv: ...}}`, and `{{tp: ...}}`.

## Key constraints

- If a Gallery item requires a plugin to be enabled, ask the user to enable that plugin themselves.
- If Note Toolbar's `scripting` setting is *not* enabled, ask the user to open Note Toolbar's settings to enable it themselves (which can be done with the `obsidian note-toolbar:settings` command).
- If any notes are created in response to a user request:
  - check if the toolbar is visible on the new note
  - remind the user that they need to update their mappings