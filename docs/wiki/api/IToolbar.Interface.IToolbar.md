[obsidian-note-toolbar](index.md) / [IToolbar](IToolbar.md) / IToolbar

The `IToolbar` interface provides basic API access to toolbars, with more functions to be added.

## Properties

### id?

> `optional` **id**: `string`

Unique identifier for the toolbar.

## Methods

### export()

> **export**(): `Promise`\<`string` \| `null`\>

Exports this toolbar to a [Note Toolbar callout](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Note-Toolbar-Callouts).

#### Returns

`Promise`\<`string` \| `null`\>

Toolbar as a callout or `null` if the toolbar is undefined.

#### Example

```ts
const toolbars = ntb.getToolbars();
for (let toolbar of toolbars) {
    console.log(`\n## ${toolbar.getName()}\n\n`);
    console.log(await toolbar.export());
}
```

#### See

`NtbExport.js` in the [examples/Scripts folder](https://github.com/chrisgurney/obsidian-note-toolbar/tree/master/examples/Scripts).

***

### getName()

> **getName**(): `string` \| `undefined`

Gets the name of this toolbar.

#### Returns

`string` \| `undefined`

Name of the toolbar or `undefined` if the toolbar is invalid.
