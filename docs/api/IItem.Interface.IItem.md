[obsidian-note-toolbar](index.md) / [IItem](IItem.md) / IItem

The `IItem` interface provides basic API access to toolbar items, with more functions to be added.

## Properties

### id?

> `optional` **id**: `string`

Unique identifier for the item.

## Methods

### setIcon()

> **setIcon**(`iconId`): `void`

Updates the icon to the provided one, if it exists.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `iconId` | `string` | The icon ID. |

#### Returns

`void`

nothing

#### Example

```ts
const item = ntb.getActiveItem();
item.setIcon('circle-alert');
```
