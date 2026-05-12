---
name: note-toolbar-cli
description: Interact with the Obsidian Note Toolbar plugin using the Obsidian CLI to create, list, and manage toolbars; add, move, copy, or remove items (commands, links, scripts, separators, and more); use/execute items; list Note Toolbar Gallery items and mapping rules; and open Note Toolbar settings. Use when the user asks to create, update, query, or interact with Note Toolbar toolbars or items in their Obsidian vault.
---

# Note Toolbar CLI

Use the `obsidian` CLI to interact with a running Obsidian instance. Requires Obsidian to be open, with the Note Toolbar plugin installed and enabled.

Run `obsidian note-toolbar:help` to see all available commands. This is always up to date.

Full docs: https://raw.githubusercontent.com/wiki/chrisgurney/obsidian-note-toolbar/Note-Toolbar-CLI.md

## Quick syntax reference

- **Parameters** take a value with `=`. Quote values with spaces. **Flags** are boolean switches with no value.
- **File targeting**: use `file=<name>` (wikilink-style) or `path=<path>` (vault-root relative); defaults to active file.
- **Vault targeting**: `vault=<name>` must come before the command name (e.g. `obsidian vault="My Vault" note-toolbar:new ...`); defaults to most recently focused vault.
- `obsidian note-toolbar` with no subcommand lists toolbars for the active file.

## Common patterns

```bash
obsidian note-toolbar
obsidian note-toolbar toolbar="Daily Notes"
obsidian note-toolbar:new name=Formatting
obsidian note-toolbar:add-command to=Formatting label=Bold command=editor:toggle-bold focus
obsidian note-toolbar:use item=c0a21325-b8b1-4617-81a0-5114350310fc
```

Use `--copy` on any command to copy output to clipboard. Use `total` on list commands to get a count.