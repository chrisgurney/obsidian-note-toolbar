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
toolbar=<nameOrId>  # Toolbar name or ID to add item to (required)
pos=<n>             # Item position in toolbar (default: end of toolbar)
```

### `note-toolbar:add-command`

Adds a [command item](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Command-items) to a toolbar.

```sh
toolbar=<nameOrId>   # Toolbar name or ID to add item to (required)
label=<label>        # Item label (required: label or icon)
icon=<iconName>      # Item icon, from Lucide's icon set (required: label or icon)
command=<commandId>  # Obsidian command ID (e.g. editor:toggle-bold) (required)
focus                # Focus the editor after executing the command (default: false)
tooltip=<tooltip>    # Item tooltip
pos=<n>              # Item position in toolbar (default: end of toolbar)
```

#### Examples

```sh
# Add a bold toggle to an existing toolbar
note-toolbar:add-command toolbar="Formatting Tools" icon=bold command="editor:toggle-bold"
```

### `note-toolbar:add-file`

Adds a [file item](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/File-items) to a toolbar.

```sh
toolbar=<nameOrId>  # Toolbar name or ID to add item to (required)
label=<label>       # Item label (required: label or icon)
icon=<iconName>     # Item icon, from Lucide's icon set (required: label or icon)
file=<name>         # File to link to (required: file or path)
path=<path>         # Path of file to link to (required: file or path)
tooltip=<tooltip>   # Item tooltip
pos=<n>             # Item position in toolbar (default: end of toolbar)
```

### `note-toolbar:add-group`

Adds an [item group](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Item-groups) to a toolbar.

```sh
toolbar=<nameOrId>       # Toolbar name or ID to add item to (required)
group=<toolbarNameOrId>  # Toolbar to add as a group (required)
pos=<n>                  # Item position in toolbar (default: end of toolbar)
```

### `note-toolbar:add-js`

Adds a [JavaScript item](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/JavaScript) to a toolbar.

```sh
toolbar=<nameOrId>  # Toolbar name or ID to add item to (required)
label=<label>       # Item label (required: label or icon)
icon=<iconName>     # Item icon, from Lucide's icon set (required: label or icon)
code=<code>         # JavaScript code to execute (required: code, file, or path)
file=<name>         # Filename to execute (required: code, file, or path)
path=<path>         # Filename with path to execute (required: code, file, or path)
args=<args>         # Comma-separated 'name: value' format, with string values in quotes
tooltip=<tooltip>   # Item tooltip
pos=<n>             # Item position in toolbar (default: end of toolbar)
```

### `note-toolbar:add-menu`

Adds an [item menu](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Item-Menus) to a toolbar.

```sh
toolbar=<nameOrId>      # Toolbar name or ID to add item to (required)
label=<label>           # Item label (required: label or icon)
icon=<iconName>         # Item icon, from Lucide's icon set (required: label or icon)
menu=<toolbarNameOrId>  # Toolbar to add as a menu (required)
tooltip=<tooltip>       # Item tooltip
pos=<n>                 # Item position in toolbar (default: end of toolbar)
```

### `note-toolbar:add-sep`

Adds a [separator](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Creating-toolbar-items#toolbar-layout) to a toolbar.

```sh
toolbar=<nameOrId>  # Toolbar name or ID to add item to (required)
pos=<n>             # Item position in toolbar (default: end of toolbar)
```

### `note-toolbar:add-spread`

Adds a [spreader](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Creating-toolbar-items#toolbar-layout) to a toolbar.

```sh
toolbar=<nameOrId>  # Toolbar name or ID to add item to (required)
pos=<n>             # Item position in toolbar (default: end of toolbar)
```

### `note-toolbar:add-uri`

Adds a [URI item](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/URI-items) to a toolbar.

```sh
toolbar=<nameOrId>  # Toolbar name or ID to add item to (required)
label=<label>       # Item label (required: label or icon)
icon=<iconName>     # Item icon, from Lucide's icon set (required: label or icon)
uri=<link>          # Website, URI, or note title (required)
tooltip=<tooltip>   # Item tooltip
pos=<n>             # Item position in toolbar (default: end of toolbar)
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
verbose         # Include additional details in output
format=tsv|csv  # Output format (default: tsv)
```

