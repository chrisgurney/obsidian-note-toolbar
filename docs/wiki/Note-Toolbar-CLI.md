The **Note Toolbar CLI** provides command-line access to create Note Toolbar toolbars and items, using [Obsidian's CLI ↗](https://obsidian.md/help/cli). This lets you control Note Toolbar from your terminal for scripting, automation, and integration with external tools.

> [!IMPORTANT]
> Access to the CLI requires Obsidian 1.12.2 or later.

## Get started

Read the [Obsidian's CLI ↗](https://obsidian.md/help/cli) documentation to get familiar with how Obsidian's command-line interface works.

TBD

## Examples

TBD

## How to

### Provide files to commands

Some commands accept file and path parameters to target a specific file (for example for executing script files).

- `file=<name>` resolves the file using the same link resolution as [wikilinks ↗](https://obsidian.md/help/links), matching by file name without requiring the full path or extension.
- `path=<path>` requires the exact path from the vault root, `e.g. folder/note.md`.

### Provide icons to commands

When adding an icon for a toolbar item, Obsidian uses the [Lucide ↗](https://lucide.dev/) icon library, which lists available icon (and their names) on their website. If your icon name isn't working, note that Obsidian may be a version or two behind what's listed there; if in doubt, check [Fevol's Icon Search tool ↗](https://fevol.github.io/obsidian-notes/utils/icons/), or use Note Toolbar's interface to add an item for a list of all icon names.

### Provide the position

Positions (`pos`) start at zero. For example, add an item to the start of a toolbar using `pos=0`. (Remember that there may be items in the toolbar that are not visible.)

### Copy output

Add `--copy` to any command to copy the output to the clipboard.
```console
note-toolbar:items empty format=csv --copy
```

---

@import '../dist/cli/cli.md';