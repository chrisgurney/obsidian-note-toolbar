[obsidian-note-toolbar](index.md) / [IItem](IItem.md) / default

The `IItem` interface provides basic API access to toolbar items, with more functions to be added.

## Properties

### id?

> `optional` **id**: `string`

Unique identifier for the item.

## Methods

### getIcon()

> **getIcon**(): `string`

Returns the item's icon (ID).

#### Returns

`string`

The item's icon ID, or an empty string if there isn't one set.

***

### getLabel()

> **getLabel**(): `string`

Returns the item's label.

#### Returns

`string`

The item's label, or an empty string if there isn't one set.

***

### getTooltip()

> **getTooltip**(): `string`

Returns the item's tooltip.

#### Returns

`string`

The item's tooltip, or an empty string if there isn't one set.

***

### setIcon()

> **setIcon**(`iconId`): `void`

Replaces the item's icon to the provided one, if it exists.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `iconId` | `string` | The icon ID. To remove the icon, provide an empty string. |

#### Returns

`void`

nothing

#### Example

```ts
const item = ntb.getActiveItem();
item.setIcon('circle-alert');
```

***

### setLabel()

> **setLabel**(`text`): `void`

Replaces the item's label with the provided text.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `text` | `string` | The label text. |

#### Returns

`void`

nothing

#### Example

```ts
const item = ntb.getActiveItem();
item.setLabel('My Label');
```

***

### setTooltip()

> **setTooltip**(`text`): `void`

Replaces the item's tooltip with the provided text.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `text` | `string` | The tooltip text. |

#### Returns

`void`

nothing

#### Example

```ts
const item = ntb.getActiveItem();
item.setTooltip('My Tooltip');
```
