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

## General commands

### `note-toolbar`

Lists all toolbars or a toolbar's items.

```sh
toolbar=<nameOrId>  # Toolbar to list items for (name or ID)
format=csv|tsv      # Output format (default: tsv)
total               # Returns count
verbose             # Include additional details in output
```

### `note-toolbar:help`

Lists all Note Toolbar CLI actions.

### `note-toolbar:settings`

Opens settings UI in Obsidian for the provided item or toolbar. Opens main settings UI by default.

```sh
item=<itemId>       # ID of item to open settings for
toolbar=<nameOrId>  # Name or ID of toolbar to open settings for
```

## Adding items

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

### `note-toolbar:add-dv`

Adds a [Dataview item](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Dataview) to a toolbar.

```sh
to=<toolbarNameOrId>  # Toolbar name or ID to add item to (required)
label=<label>         # Item label (required: label or icon)
icon=<iconName>       # Item icon, from Lucide's icon set (required: label or icon)
eval=<query>          # Dataview expression to evaluate (required: eval, query, or file/path)
query=<query>         # Dataview query to execute (required: eval, query, or file/path)
file=<name>           # Filename to execute (required: eval, query, or file/path)
path=<path>           # Filename with path to execute (required: eval, query, or file/path)
args=<args>           # Comma-separated 'name: value' format, with string values in quotes
tooltip=<tooltip>     # Item tooltip
pos=<n>               # Item position in toolbar (default: end of toolbar)
```

#### Examples

```sh
# List files in a folder
note-toolbar:add-dv to=Basic label=QueryExample query="LIST FROM \"Templates\" SORT file.name"

# Get the file modified time
note-toolbar:add-dv to=Basic label=EvalExample eval="this.file.mtime"
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

## Adding Templater items

Add [Templater items](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Templater) to toolbars.

### `note-toolbar:add-tp:command`

Adds an item to a toolbar that executes a Templater command.

```sh
to=<toolbarNameOrId>  # Toolbar name or ID to add item to (required)
label=<label>         # Item label (required: label or icon)
icon=<iconName>       # Item icon, from Lucide's icon set (required: label or icon)
command=<name>        # Templater command to execute (required)
tooltip=<tooltip>     # Item tooltip
pos=<n>               # Item position in toolbar (default: end of toolbar)
```

### `note-toolbar:add-tp:create`

Adds an item to a toolbar that creates a note from a Templater template.

```sh
to=<toolbarNameOrId>  # Toolbar name or ID to add item to (required)
label=<label>         # Item label (required: label or icon)
icon=<iconName>       # Item icon, from Lucide's icon set (required: label or icon)
file=<name>           # Template filename to create note from (required: file, or path)
path=<path>           # Template filename with path to create note from (required: file, or path)
output=<path>         # Folder and filename (without file extension) to output to
tooltip=<tooltip>     # Item tooltip
pos=<n>               # Item position in toolbar (default: end of toolbar)
```

### `note-toolbar:add-tp:exec`

Adds an item to a toolbar that executes a Templater file.

```sh
to=<toolbarNameOrId>  # Toolbar name or ID to add item to (required)
label=<label>         # Item label (required: label or icon)
icon=<iconName>       # Item icon, from Lucide's icon set (required: label or icon)
file=<name>           # Template filename to execute (required: file, or path)
path=<path>           # Template filename with path to execute (required: file, or path)
tooltip=<tooltip>     # Item tooltip
pos=<n>               # Item position in toolbar (default: end of toolbar)
```

### `note-toolbar:add-tp:insert`

Adds an item to a toolbar that inserts a template.

```sh
to=<toolbarNameOrId>  # Toolbar name or ID to add item to (required)
label=<label>         # Item label (required: label or icon)
icon=<iconName>       # Item icon, from Lucide's icon set (required: label or icon)
file=<name>           # Template filename to insert (required: file, or path)
path=<path>           # Template filename with path to insert (required: file, or path)
tooltip=<tooltip>     # Item tooltip
pos=<n>               # Item position in toolbar (default: end of toolbar)
```

## Copying + Moving items

Copy and move items to toolbars.

### `note-toolbar:copy`

Copies one or more items to a toolbar.

```sh
to=<toolbarNameOrId>         # Toolbar name or ID to add item to (required)
item=<itemId>[,<itemId>...]  # Item ID, or comma-separated list of item IDs (required)
item=<itemId>[,<itemId>...]  # Item ID, or comma-separated list of item IDs (required)
pos=<n>                      # Item position in toolbar (default: end of toolbar)
```

### `note-toolbar:move`

Moves an item to a toolbar.

```sh
to=<toolbarNameOrId>  # Toolbar name or ID to add item to (required)
item=<itemId>         # Item ID (required)
pos=<n>               # Item position in toolbar (default: end of toolbar)
```

## Listing items

### `note-toolbar:gallery`

Lists items available in the [Note Toolbar Gallery](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Gallery). Copy them to toolbars using the `note-toolbar:copy` command.

### `note-toolbar:items`

Lists items in all toolbars, except empty items (no label or tooltip) by default.

```sh
toolbar=<nameOrId>  # Toolbar to list items for
filter=<string>     # Filter by string in label/tooltip
empty               # Include empty items in output
format=csv|tsv      # Output format (default: tsv)
total               # Returns count
verbose             # Include additional details in output
```

## Using items

### `note-toolbar:use`

Uses an item. Defaults to using the item within the active file.

```sh
item=<itemId>  # ID of item to use (required)
file=<name>    # File to use the item in
path=<path>    # Path of file to use the item in
```

## Rules

Display folder mappings.

### `note-toolbar:rules`

Lists toolbar [folder mappings](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Defining-where-to-show-toolbars).

```sh
format=csv|tsv  # Output format (default: tsv)
```

### `note-toolbar:status`

Lists toolbars that are visible (positioned) in the current view.

```sh
format=csv|tsv  # Output format (default: tsv)
```

## Create toolbars

### `note-toolbar:import`

> Available in `1.33.28`

Adds items, or creates a toolbar from a [Note Toolbar Callout](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Note-Toolbar-Callouts). Newlines should be escaped (`\\n`).

```sh
toolbar=<name>      # Toolbar name to add items to
callout=<markdown>  # Callout markdown (required: callout, file, or path)
file=<name>         # Filename of callout (required: callout, file, or path)
path=<path>         # Filename with path of callout (required: callout, file, or path)
```

#### Examples

```sh
note-toolbar:import toolbar="Daily Notes" callout='> [!note-toolbar]\\n> - [:LiArrowLeft:]()<data data-ntb-command="daily-notes:goto-prev"/> <!-- Previous day -->\\n> - [:LiCalendar:]()<data data-ntb-command="daily-notes"/> <!-- Today -->\\n> - [:LiArrowRight:]()<data data-ntb-command="daily-notes:goto-next"/> <!-- Next day -->'
```

### `note-toolbar:new`

Creates a new toolbar.

```sh
name=<name>  # Toolbar name
```

