[obsidian-note-toolbar](index.md) / INoteToolbarApi

Defines the functions that can be accessed from scripts (Dataview, Templater, JavaScript via JS Engine) -- that are executed from Note Toolbar items -- using the `ntb` object.

## Type Parameters

| Type Parameter |
| ------ |
| `T` |

## Properties

### clipboard()

> **clipboard**: () => `Promise`\<`null` \| `string`\>

Gets the clipboard value.

#### Returns

`Promise`\<`null` \| `string`\>

#### Example

```ts
const clipboard = await ntb.clipboard();
```

***

### prompt()

> **prompt**: (`options`?) => `Promise`\<`null` \| `string`\>

Shows the prompt modal and waits for the user's input.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options`? | \{ `default`: `string`; `label`: `string`; `large`: `boolean`; `placeholder`: `string`; \} | Optional display options. |
| `options.default`? | `string` | Optional default value for text field. If not provided, no default value is set. |
| `options.label`? | `string` | Optional text shown above the text field, rendered as markdown. Default is no label. |
| `options.large`? | `boolean` | If set to `true`, the input field will be multi line. If not provided, defaults to `false`. |
| `options.placeholder`? | `string` | Optional text inside text field. Defaults to a preset message. |

#### Returns

`Promise`\<`null` \| `string`\>

The user's input.

#### Example

```ts
// default (one-line) prompt with message, overridden placeholder, and default value 
const result = await ntb.prompt({
  label: "Enter some text",
  placeholder: "Placeholder",
  default: "Default"
});

new Notice(result);
```

#### See

`NtbPrompt.js` in the [examples/Scripts folder](https://github.com/chrisgurney/obsidian-note-toolbar/tree/master/examples/Scripts).

***

### suggester()

> **suggester**: (`values`, `keys`?, `options`?) => `Promise`\<`null` \| `T`\>

Shows a suggester modal and waits for the user's selection.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `values` | `string`[] \| (`value`) => `string` | Array of strings representing the text that will be displayed for each item in the suggester prompt. This can also be a function that maps an item to its text representation. Rendered as markdown. |
| `keys`? | `T`[] | Optional array containing the keys of each item in the correct order. If not provided, values are returned on selection. |
| `options`? | \{ `limit`: `number`; `placeholder`: `string`; \} | Optional display options. |
| `options.limit`? | `number` | Optional limit of the number of items rendered at once (useful to improve performance when displaying large lists). |
| `options.placeholder`? | `string` | Optional text inside text field; defaults to preset message. |

#### Returns

`Promise`\<`null` \| `T`\>

The selected value, or corresponding key if keys are provided.

#### Example

```ts
// values are shown in the selector; optionally mix in Obsidian 
// and plugin markdown (e.g., Iconize) to have it rendered
const values = ["value `1`", "value `2`"];
// keys are optional, but can be used to return a key corresponding to the selected value
const keys = ["key1", "key2"];

// returns a key corresponding to the selected value, overrides placeholder text
const result = await ntb.suggester(values, keys, {
  placeholder: "Pick something"
});

new Notice(result);
```

#### See

`NtbSuggester.js` in the [examples/Scripts folder](https://github.com/chrisgurney/obsidian-note-toolbar/tree/master/examples/Scripts).
