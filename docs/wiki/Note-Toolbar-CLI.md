> Available in `1.31+`

The **Note Toolbar CLI** provides command-line access to create [Note Toolbar](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/) toolbars and items, using [Obsidian's CLI ↗](https://obsidian.md/help/cli). This lets you control Note Toolbar from your terminal for scripting, automation, and integration with external tools.

> [!NOTE]
> Out of an abundance of caution, deletion of items and toolbars is currently not supported in the CLI. Perhaps such commands will be added if there is a clean way to undo these actions (for which currently there is not).

## Get started

Read the [Obsidian CLI ↗](https://obsidian.md/help/cli) documentation to install, enable, and get familiar with how Obsidian's command-line interface works.

> [!IMPORTANT]
> Access to the CLI requires Obsidian 1.12 (and the installer for that version) or later, as well as Note Toolbar 1.31 or later.

## Examples

```sh
# List toolbars
obsidian note-toolbar

# List items in a toolbar
obsidian note-toolbar toolbar="Daily Notes"

# Create a toolbar
obsidian note-toolbar:new name=Formatting

# Add an item to a toolbar
obsidian note-toolbar:add-command to=Formatting label=Bold command=editor:toggle-bold

# Use an item
obsidian note-toolbar:use item=c0a21325-b8b1-4617-81a0-5114350310fc
```

## How to

### Provide files to commands

Some commands accept file and path parameters to target a specific file (for example for executing script files).

- `file=<name>` resolves the file using the same link resolution as [wikilinks ↗](https://obsidian.md/help/links), matching by file name without requiring the full path or extension.
- `path=<path>` requires the exact path from the vault root, `e.g. folder/script.js`.

### Provide icons to commands

When adding an icon for a toolbar item, Obsidian uses the [Lucide ↗](https://lucide.dev/) icon library, which lists available icons (and their names) on their website.

If your icon name isn't working, note that Obsidian may be a version or two behind what's listed there; if in doubt, check [Fevol's Icon Search tool ↗](https://fevol.github.io/obsidian-notes/utils/icons/), or use Note Toolbar's interface to add an item for a list of all icon names.

### Copy output

Add `--copy` to any command to copy the output to the clipboard.
```sh
obsidian note-toolbar:items empty format=csv --copy
```

---

@include '../dist/cli/cli.md';