[obsidian-note-toolbar](index.md) / [IToolbar](IToolbar.md) / IToolbar

Toolbar API.

## Properties

### id?

> `optional` **id**: `string`

Unique identifier for the toolbar.

## Methods

### export()

> **export**(): `Promise`\<`null` \| `string`\>

Exports this toolbar to a [Note Toolbar callout](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Note-Toolbar-Callouts).

#### Returns

`Promise`\<`null` \| `string`\>

Toolbar as a callout or `null` if the toolbar is undefined.

***

### getName()

> **getName**(): `undefined` \| `string`

Gets the name of this toolbar.

#### Returns

`undefined` \| `string`

Name of the toolbar or `undefined` if the toolbar is invalid.
