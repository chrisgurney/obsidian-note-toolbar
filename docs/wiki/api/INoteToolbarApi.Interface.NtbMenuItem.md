[obsidian-note-toolbar](index.md) / [INoteToolbarApi](INoteToolbarApi.md) / NtbMenuItem

Defines a menu item that can be dynamically created and displayed via [`ntb.menu()`](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Note-Toolbar-API#menu).

## Properties

### icon?

> `optional` **icon**: `string`

Optional icon to display in the menu item.

***

### id?

> `optional` **id**: `string`

Optional ID to add to the menu item when it's rendered.

#### Since

1.27

***

### label

> **label**: `string`

Label for the menu item.

***

### type

> **type**: `"file"` \| `"command"` \| `"uri"`

Type of the menu item. Can be `command`, `file`, or `uri`.

***

### value

> **value**: `string`

Value for the menu item. For `command`, this is the command ID.
