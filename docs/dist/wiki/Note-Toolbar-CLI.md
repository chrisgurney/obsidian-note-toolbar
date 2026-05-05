> Available in `1.31+`

The **Note Toolbar CLI** provides command-line access to create [Note Toolbar](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/) toolbars and items, using [Obsidian's CLI ↗](https://obsidian.md/help/cli). This lets you control Note Toolbar from your terminal for scripting, automation, and integration with external tools.

> [!IMPORTANT]
> Access to the CLI requires Obsidian 1.12.2 or later, and Note Toolbar 1.31 or later.

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

When adding an icon for a toolbar item, Obsidian uses the [Lucide ↗](https://lucide.dev/) icon library, which lists available icons (and their names) on their website.

If your icon name isn't working, note that Obsidian may be a version or two behind what's listed there; if in doubt, check [Fevol's Icon Search tool ↗](https://fevol.github.io/obsidian-notes/utils/icons/), or use Note Toolbar's interface to add an item for a list of all icon names.

### Provide the position

Positions (`pos`) start at zero. For example, add an item to the start of a toolbar using `pos=0`. (Remember that there may be items in the toolbar that are not visible.)

### Copy output

Add `--copy` to any command to copy the output to the clipboard.
```console
note-toolbar:items empty format=csv --copy
```

---

## Help

### `note-toolbar:help`

Lists all Note Toolbar CLI actions.

## Items

### `note-toolbar:items`

Lists all toolbar items, except empty items (no label or tooltip) by default.

```sh
toolbar=<nameOrId>  # Toolbar to list items for
empty               # Include empty items in output
total               # Returns item count
verbose             # Include additional details in output
format=csv          # Output format
```

## Items (Adding)

Add items to toolbars.

### `note-toolbar:add-break`

Adds a [break](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Creating-toolbar-items#toolbar-layout) to a toolbar.

```sh
to=<toolbarNameOrId>  # Toolbar name or ID to add item to (required)
pos=<n>               # Item position in toolbar (default: end of toolbar)
```

### `note-toolbar:add-command`

Adds a [command item](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Command-items) to a toolbar.

```sh
to=<toolbarNameOrId>  # Toolbar name or ID to add item to (required)
label=<label>         # Item label (required: label or icon)
icon=<iconName>       # Item icon, from Lucide's icon set (required: label or icon)
command=<commandId>   # Obsidian command ID (e.g. editor:toggle-bold) (required)
focus                 # Focus the editor after executing the command (default: false)
target=split|tab      # Where to run command
tooltip=<tooltip>     # Item tooltip
pos=<n>               # Item position in toolbar (default: end of toolbar)
```

#### Examples

```sh
# Add a bold toggle to an existing toolbar
note-toolbar:add-command to="Formatting Tools" icon=bold command="editor:toggle-bold"
```

### `note-toolbar:add-file`

Adds a [file item](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/File-items) to a toolbar.

```sh
to=<toolbarNameOrId>           # Toolbar name or ID to add item to (required)
label=<label>                  # Item label (required: label or icon)
icon=<iconName>                # Item icon, from Lucide's icon set (required: label or icon)
file=<name>                    # File to link to (required: file or path)
path=<path>                    # Path of file to link to (required: file or path)
target=modal|split|tab|window  # Where to open the file
tooltip=<tooltip>              # Item tooltip
pos=<n>                        # Item position in toolbar (default: end of toolbar)
```

### `note-toolbar:add-group`

Adds an [item group](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Item-groups) to a toolbar.

```sh
to=<toolbarNameOrId>       # Toolbar name or ID to add item to (required)
toolbar=<toolbarNameOrId>  # Toolbar to add as a group (required)
pos=<n>                    # Item position in toolbar (default: end of toolbar)
```

### `note-toolbar:add-js`

Adds a [JavaScript item](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/JavaScript) to a toolbar.

```sh
to=<toolbarNameOrId>  # Toolbar name or ID to add item to (required)
label=<label>         # Item label (required: label or icon)
icon=<iconName>       # Item icon, from Lucide's icon set (required: label or icon)
code=<code>           # JavaScript code to execute (required: code, file, or path)
file=<name>           # Filename to execute (required: code, file, or path)
path=<path>           # Filename with path to execute (required: code, file, or path)
args=<args>           # Comma-separated 'name: value' format, with string values in quotes
tooltip=<tooltip>     # Item tooltip
pos=<n>               # Item position in toolbar (default: end of toolbar)
```

### `note-toolbar:add-menu`

Adds an [item menu](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Item-Menus) to a toolbar.

```sh
to=<toolbarNameOrId>       # Toolbar name or ID to add item to (required)
label=<label>              # Item label (required: label or icon)
icon=<iconName>            # Item icon, from Lucide's icon set (required: label or icon)
toolbar=<toolbarNameOrId>  # Toolbar to add as a menu (required)
tooltip=<tooltip>          # Item tooltip
pos=<n>                    # Item position in toolbar (default: end of toolbar)
```

### `note-toolbar:add-sep`

Adds a [separator](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Creating-toolbar-items#toolbar-layout) to a toolbar.

```sh
to=<toolbarNameOrId>  # Toolbar name or ID to add item to (required)
pos=<n>               # Item position in toolbar (default: end of toolbar)
```

### `note-toolbar:add-spread`

Adds a [spreader](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Creating-toolbar-items#toolbar-layout) to a toolbar.

```sh
to=<toolbarNameOrId>  # Toolbar name or ID to add item to (required)
pos=<n>               # Item position in toolbar (default: end of toolbar)
```

### `note-toolbar:add-uri`

Adds a [URI item](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/URI-items) to a toolbar.

```sh
to=<toolbarNameOrId>           # Toolbar name or ID to add item to (required)
label=<label>                  # Item label (required: label or icon)
icon=<iconName>                # Item icon, from Lucide's icon set (required: label or icon)
uri=<link>                     # Website, URI, or note title (required)
target=modal|split|tab|window  # Where to open the URI
tooltip=<tooltip>              # Item tooltip
pos=<n>                        # Item position in toolbar (default: end of toolbar)
```

## Toolbars

### `note-toolbar:new`

Creates a new toolbar.

```sh
name=<name>  # Toolbar name
```

### `note-toolbar:toolbars`

Lists all toolbars.

```sh
verbose     # Include additional details in output
format=csv  # Output format
```

