## Help

### `note-toolbar:help`

Opens Note Toolbar's CLI user guide (this page) in a browser.

## Items

### `note-toolbar:items`

Lists all toolbar items, except empty items (no label or tooltip) by default.

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
toolbar=<nameOrId>  # (required) Toolbar name or ID to add item to
pos=<n>             # Item position in toolbar (default: end of toolbar)
```

### `note-toolbar:add-command`

Adds a [command item](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Command-items) to a toolbar.

```sh
toolbar=<nameOrId>   # (required) Toolbar name or ID to add item to
label=<label>        # (required: label or icon) Item label
icon=<iconName>      # (required: label or icon) Item icon, from Lucide's icon set
command=<commandId>  # (required) Obsidian command ID (e.g. editor:toggle-bold)
focus                # Focus the editor after executing the command (default: false)
tooltip=<tooltip>    # Item tooltip
pos=<n>              # Item position in toolbar (default: end of toolbar)
```

#### Examples

```sh
# Add a bold toggle to an existing toolbar
note-toolbar:add-command toolbar="Formatting Tools" icon=bold command="editor:toggle-bold"
```

### `note-toolbar:add-js`

Adds a [JavaScript item](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/JavaScript) to a toolbar.

```sh
toolbar=<nameOrId>  # (required) Toolbar name or ID to add item to
label=<label>       # (required: label or icon) Item label
icon=<iconName>     # (required: label or icon) Item icon, from Lucide's icon set
code=<code>         # (required: code, file, or path) JavaScript code to execute
file=<name>         # (required: code, file, or path) Filename to execute
path=<path>         # (required: code, file, or path) Filename with path to execute
args=<args>         # Comma-separated 'name: value' format, with string values in quotes
tooltip=<tooltip>   # Item tooltip
pos=<n>             # Item position in toolbar (default: end of toolbar)
```

### `note-toolbar:add-sep`

Adds a [separator](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Creating-toolbar-items#toolbar-layout) to a toolbar.

```sh
toolbar=<nameOrId>  # (required) Toolbar name or ID to add item to
pos=<n>             # Item position in toolbar (default: end of toolbar)
```

### `note-toolbar:add-spread`

Adds a [spreader](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Creating-toolbar-items#toolbar-layout) to a toolbar.

```sh
toolbar=<nameOrId>  # (required) Toolbar name or ID to add item to
pos=<n>             # Item position in toolbar (default: end of toolbar)
```

## Toolbars

### `note-toolbar:add-toolbar`

Creates a new toolbar.

```sh
name=<name>  # Toolbar name
```

### `note-toolbar:toolbars`

Lists all toolbars.

```sh
verbose         # Include additional details in output
format=tsv|csv  # Output format (default: tsv)
```

