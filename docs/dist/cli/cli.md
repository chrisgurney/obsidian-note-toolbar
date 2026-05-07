## Help

### `note-toolbar:help`

Lists all Note Toolbar CLI actions.

## Items

### `note-toolbar:gallery`

Lists items in the [Note Toolbar Gallery](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Gallery). Copy them to toolbars using the `note-toolbar:copy` command.

### `note-toolbar:items`

Lists all toolbar items, except empty items (no label or tooltip) by default.

```sh
toolbar=<nameOrId>  # Toolbar to list items for
empty               # Include empty items in output
total               # Returns item count
verbose             # Include additional details in output
format=csv|tsv      # Output format (default: tsv)
```

### `note-toolbar:use`

Uses an item. Defaults to using the item within the active file.

```sh
item=<itemId>  # ID of item to use (required)
file=<name>    # File to use the item in
path=<path>    # Path of file to use the item in
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

## Items (Copying + Moving)

Copy and move items to toolbars.

### `note-toolbar:copy`

Copies an item to a toolbar.

```sh
to=<toolbarNameOrId>  # Toolbar name or ID to add item to (required)
item=<itemId>         # Item ID (required)
pos=<n>               # Item position in toolbar (default: end of toolbar)
```

### `note-toolbar:move`

Moves an item to a toolbar.

```sh
to=<toolbarNameOrId>  # Toolbar name or ID to add item to (required)
item=<itemId>         # Item ID (required)
pos=<n>               # Item position in toolbar (default: end of toolbar)
```

## Rules

Display folder mappings

### `note-toolbar:rules`

Lists toolbar [folder mappings](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Defining-where-to-show-toolbars).

```sh
format=csv|tsv  # Output format (default: tsv)
```

## Settings

### `note-toolbar:settings`

Opens settings in Obsidian for the provided item or toolbar. Opens main settings by default.

```sh
item=<itemId>       # ID of item to open settings for
toolbar=<nameOrId>  # ID of toolbar to open settings for
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
format=csv|tsv  # Output format (default: tsv)
```

