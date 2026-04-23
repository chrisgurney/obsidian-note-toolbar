## Add items to a toolbar

Commands for adding items to a toolbar.

### `note-toolbar:add-break`

Adds a [break](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Creating-toolbar-items#toolbar-layout) to a toolbar.

```sh
toolbar=<nameOrId>  # Toolbar name or ID to add item to
pos=<n>             # Item position in toolbar; default = end
```

### `note-toolbar:add-command`

Adds a [command item](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Command-items) to a toolbar.

```sh
toolbar=<nameOrId>   # Toolbar name or ID to add item to
label=<label>        # Item label (required if icon is not provided)
icon=<iconName>      # Item icon, from Lucide's icon set (required if label is not provided)
command=<commandId>  # Obsidian command ID (e.g. editor:toggle-bold)
tooltip=<tooltip>    # Item tooltip
pos=<n>              # Item position in toolbar; default = end
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
code=<code>         # JavaScript code to execute (required if file is not provided)
file=<file>         # Filename to execute (file or path required if code is not provided)
path=<path>         # Filename with path to execute (file or path required if code is not provided).
args=<args>         # Comma-separated 'name: value' format, with string values in quotes
tooltip=<tooltip>   # Item tooltip
pos=<n>             # Item position in toolbar; default = end
```

### `note-toolbar:add-sep`

Adds a [separator](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Creating-toolbar-items#toolbar-layout) to a toolbar.

```sh
toolbar=<nameOrId>  # Toolbar name or ID to add item to
pos=<n>             # Item position in toolbar; default = end
```

### `note-toolbar:add-spread`

Adds a [spreader](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Creating-toolbar-items#toolbar-layout) to a toolbar.

```sh
toolbar=<nameOrId>  # Toolbar name or ID to add item to
pos=<n>             # Item position in toolbar; default = end
```

