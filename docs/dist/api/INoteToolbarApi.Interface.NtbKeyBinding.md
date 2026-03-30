[obsidian-note-toolbar](index.md) / [INoteToolbarApi](INoteToolbarApi.md) / NtbKeyBinding

## Properties

### action

> **action**: `"navigateNext"` \| `"navigatePrev"` \| `"select"` \| `"dismiss"` \| `"autofill"` \| () => `boolean`

The action to perform when this binding is triggered.
- `navigateNext`: move to the next suggestion
- `navigatePrev`: move to the previous suggestion
- `select`: confirm the current suggestion
- `dismiss`: close the suggester
- `autofill`: fill the input with the current suggestion without selecting

***

### key

> **key**: `string`

The key that triggers this binding, as a [KeyboardEvent.key](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key/Key_Values) value
(e.g. `"Tab"`, `"Enter"`, `"ArrowDown"`).

***

### modifiers?

> `optional` **modifiers**: `Modifier`[] \| `null`

Modifier keys that must be held for this binding to trigger. Use `null` if no modifier is required.

#### See

Modifier
