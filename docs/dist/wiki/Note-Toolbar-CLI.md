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

When adding an icon for a toolbar item, Obsidian uses the [Lucide ↗](https://lucide.dev/) icon library, which lists available icon (and their names) on their website. If your icon name isn't working, note that Obsidian may be a version or two behind what's listed there; if in doubt, use Note Toolbar's interface to add an item for a list of all icon names.

---

## Help

### `note-toolbar:help`

Opens Note Toolbar's CLI user guide (this page) in a browser.

## Items

### `note-toolbar:items`

Lists toolbar items.

```sh
empty           # Include empty items in output
verbose         # Include additional details in output
format=tsv|csv  # Output format (default: tsv)
```

## Items (Adding)

Add items to toolbars.

### `note-toolbar:add-break`

Adds a [break](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Creating-toolbar-items#toolbar-layout) to a toolbar.

```sh
toolbar=<nameOrId>  # Toolbar name or ID to add item to
pos=<n>             # Item position in toolbar (default: end)
```

### `note-toolbar:add-command`

Adds a [command item](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Command-items) to a toolbar.

```sh
toolbar=<nameOrId>   # Toolbar name or ID to add item to
label=<label>        # Item label (required if icon is not provided)
icon=<iconName>      # Item icon, from Lucide's icon set (required if label is not provided)
command=<commandId>  # Obsidian command ID (e.g. editor:toggle-bold)
focus                # Focus the editor after executing the command (default: false)
tooltip=<tooltip>    # Item tooltip
pos=<n>              # Item position in toolbar (default: end)
```

#### Examples

```sh
# Add a bold toggle to an existing toolbar
note-toolbar:add-command toolbar="Formatting Tools" icon=bold command="editor:toggle-bold"
```

### `note-toolbar:add-js`

Adds a [JavaScript item](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/JavaScript) to a toolbar.

```sh
toolbar=<nameOrId>  # Toolbar name or ID to add item to
label=<label>       # Item label (required if icon is not provided)
icon=<iconName>     # Item icon, from Lucide's icon set (required if label is not provided)
code=<code>         # JavaScript code to execute (required if file or path is not provided)
file=<name>         # Filename to execute (file or path required if code is not provided)
path=<path>         # Filename with path to execute (file or path required if code is not provided).
args=<args>         # Comma-separated 'name: value' format, with string values in quotes
tooltip=<tooltip>   # Item tooltip
pos=<n>             # Item position in toolbar (default: end)
```

### `note-toolbar:add-sep`

Adds a [separator](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Creating-toolbar-items#toolbar-layout) to a toolbar.

```sh
toolbar=<nameOrId>  # Toolbar name or ID to add item to
pos=<n>             # Item position in toolbar (default: end)
```

### `note-toolbar:add-spread`

Adds a [spreader](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Creating-toolbar-items#toolbar-layout) to a toolbar.

```sh
toolbar=<nameOrId>  # Toolbar name or ID to add item to
pos=<n>             # Item position in toolbar (default: end)
```

## Toolbars

### `note-toolbar:add-toolbar`

Creates a new toolbar.

```sh
name=<name>  # Toolbar name
```

### `note-toolbar:toolbars`

Lists toolbars.

```sh
verbose         # Include additional details in output
format=tsv|csv  # Output format (default: tsv)
```

