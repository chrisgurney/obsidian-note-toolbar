[obsidian-note-toolbar](index.md) / [INoteToolbarApi](INoteToolbarApi.md) / INoteToolbarApi

> [!note]
> This documentation is for version `1.25.18`.

The Note Toolbar API provides toolbar access, and the ability to show UI (suggesters, prompts, menus, and modals). The latter enables Dataview JS, JS Engine, or Templater scripts to ask for information, or to show helpful text.

Using the `ntb` object, below are the functions that can be called in scripts that are [executed from Note Toolbar items](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Executing-scripts).

I would appreciate your feedback, which you can leave in [the discussions](https://github.com/chrisgurney/obsidian-note-toolbar/discussions).

> [!warning]
> While you could also directly access Note Toolbar's settings or toolbar items via `app.plugins.getPlugin("note-toolbar").settings`, be aware that these are subject to change and may break your scripts. The API will be the official way to access and change information about toolbars.

## Copy developer ID for items

In each item's _More actions..._ menu, use `Copy developer ID` to copy the unique identifier (UUID) for any toolbar item to the clipboard. 

From code you can then target the item and make changes to it:

```js
const item = ntb.getItem('112c7ed3-d5c2-4750-b95d-75bc84e23513');
item.setIcon('alert');

// or fetch the HTML element (for non-floating-button toolbars)
const itemEl = activeDocument.getElementById('112c7ed3-d5c2-4750-b95d-75bc84e23513');
```

## `ntb` API

- [[ntb.clipboard|Note-Toolbar-API#clipboard]]
- [[ntb.fileSuggester|Note-Toolbar-API#filesuggester]]
- [[ntb.getActiveItem|Note-Toolbar-API#getactiveitem]]
- [[ntb.getItem|Note-Toolbar-API#getitem]]
- [[ntb.getProperty|Note-Toolbar-API#getproperty]]
- [[ntb.getToolbars|Note-Toolbar-API#gettoolbars]]
- [[ntb.menu|Note-Toolbar-API#menu]]
- [[ntb.modal|Note-Toolbar-API#modal]]
- [[ntb.prompt|Note-Toolbar-API#prompt]]
- [[ntb.setProperty|Note-Toolbar-API#setproperty]]
- [[ntb.suggester|Note-Toolbar-API#suggester]]
- [[ntb.t|Note-Toolbar-API#t]]

---

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

The clipboard value or `null`.

#### Example

```ts
// gets the clipboard value
const value = await ntb.clipboard();

new Notice(value);
```

***

### fileSuggester()

> **fileSuggester**: (`options`?) => `Promise`\<`null` \| `TAbstractFile`\>

Shows a file suggester modal and waits for the user's selection.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options`? | \{ `allowCustomInput`: `boolean`; `class`: `string`; `default`: `string`; `filesonly`: `boolean`; `foldersonly`: `boolean`; `label`: `string`; `limit`: `number`; `placeholder`: `string`; `rendermd`: `boolean`; \} | Optional display options. |
| `options.allowCustomInput`? | `boolean` | If set to `true`, the user can input a custom value that is not in the list of suggestions. Default is `false`. |
| `options.class`? | `string` | Optional CSS class(es) to add to the component. |
| `options.default`? | `string` | Optionally pre-set the suggester's input with this value. Matching results will be shown, as if you typed in that string yourself (assuming the string appears in the list of options provided). If not provided, no default is set. |
| `options.filesonly`? | `boolean` | If set to true, only files are shown. If not provided, defaults to `false`. |
| `options.foldersonly`? | `boolean` | If set to true, only folders are shown. If not provided, defaults to `false`. |
| `options.label`? | `string` | Optional text shown above the input field, with markdown formatting supported. Default is no label. |
| `options.limit`? | `number` | Optional limit of the number of items rendered at once (useful to improve performance when displaying large lists). |
| `options.placeholder`? | `string` | Optional placeholder text for input field; defaults to preset message. |
| `options.rendermd`? | `boolean` | Set to `false` to disable rendering of suggestions as markdown. Default is `true`. |

#### Returns

`Promise`\<`null` \| `TAbstractFile`\>

The selected `TAbstractFile`.

#### Example

```ts
const fileOrFolder = await ntb.fileSuggester();
new Notice(fileOrFolder.name);
// show only folders
const folder = await ntb.fileSuggester({
 foldersonly: true
});
new Notice(folder.name);
```

***

### getActiveItem()

> **getActiveItem**: () => `undefined` \| [`IItem`](IItem.Interface.IItem.md)

Gets the active (last activated) toolbar item.

#### Returns

`undefined` \| [`IItem`](IItem.Interface.IItem.md)

The active (last activated) item.

#### Remarks

This does not work with Note Toolbar Callouts.

***

### getItem()

> **getItem**: (`id`) => `undefined` \| [`IItem`](IItem.Interface.IItem.md)

Gets an item by its ID, if it exists.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `id` | `string` | The ID of the item. |

#### Returns

`undefined` \| [`IItem`](IItem.Interface.IItem.md)

The item, or undefined.

#### Example

```js
// to get the ID, edit an item's settings and use _Copy developer ID_
const item = ntb.getItem('112c7ed3-d5c2-4750-b95d-75bc84e23513');
```

***

### getProperty()

> **getProperty**: (`property`) => `undefined` \| `string`

Gets the value of the given property in the active note.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `property` | `string` | The property to get the frontmatter for. |

#### Returns

`undefined` \| `string`

The frontmatter value for the given property, or `undefined` if it does not exist.

#### Example

```ts
const createdDate = ntb.getProperty('created');
```

***

### getToolbars()

> **getToolbars**: () => [`IToolbar`](IToolbar.Interface.IToolbar.md)[]

Gets all toolbars.

#### Returns

[`IToolbar`](IToolbar.Interface.IToolbar.md)[]

All toolbars.

***

### menu()

> **menu**: (`items`, `options`?) => `Promise`\<`void`\>

Shows a menu with the provided items.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `items` | [`NtbMenuItem`](INoteToolbarApi.Interface.NtbMenuItem.md)[] | Array of items to display. See [NtbMenuItem](INoteToolbarApi.Interface.NtbMenuItem.md). |
| `options`? | \{ `class`: `string`; `focusInMenu`: `boolean`; \} | Optional display options. |
| `options.class`? | `string` | Optional CSS class(es) to add to the component. |
| `options.focusInMenu`? | `boolean` | If `true`, the menu item will be focused when the menu opens; defaults to `false`. |

#### Returns

`Promise`\<`void`\>

Nothing. Displays the menu.

#### Examples

```ts
await ntb.menu([
  { type: 'command', value: 'editor:toggle-bold', label: 'Toggle Bold', icon: 'bold' },
  { type: 'file', value: 'Home.md', label: 'Open File' },
  { type: 'uri', value: 'https://example.com', label: 'Visit Site' }
]);
```

```ts
// shows bookmarks in a menu
const b = app.internalPlugins.plugins['bookmarks'];
if (!b?.enabled) return;
const i = b.instance?.getBookmarks();
const b = app.internalPlugins.plugins['bookmarks'];
const mi = i
  .filter(b => b.type === 'file' || b.type === 'folder')
  .map(b => ({
      type: 'file',
      value: b.path,
      label: b.title ? b.title : b.path,
      icon: b.type === 'folder' ? 'folder' : 'file'
  }));
ntb.menu(mi);
```

***

### modal()

> **modal**: (`content`, `options`?) => `Promise`\<`Modal`\>

Shows a modal with the provided content.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `content` | `string` \| `TFile` | Content to display in the modal, either as a string or a file within the vault. |
| `options`? | \{ `class`: `string`; `title`: `string`; `webpage`: `boolean`; \} | Optional display options. |
| `options.class`? | `string` | Optional CSS class(es) to add to the component. |
| `options.title`? | `string` | Optional title for the modal, with markdown formatting supported. |
| `options.webpage`? | `boolean` | If `true`, the modal will show the web page URL in `content` using the Web Viewer core plugin (if enabled); defaults to `false`. |

#### Returns

`Promise`\<`Modal`\>

A `Modal`, in case you want to manipulate it further; can be ignored otherwise.

#### Examples

```ts
// shows a modal with the provided string
await ntb.modal("_Hello_ world!");
```

```ts
// shows a modal with the rendered contents of a file
const filename = "Welcome.md";
const file = app.vault.getAbstractFileByPath(filename);

if (file) {
  await ntb.modal(file, {
    title: `**${file.basename}**`
  });
}
else {
  new Notice(`File not found: ${filename}`);
}
```

#### See

`NtbModal.js` in the [examples/Scripts folder](https://github.com/chrisgurney/obsidian-note-toolbar/tree/master/examples/Scripts).

***

### prompt()

> **prompt**: (`options`?) => `Promise`\<`null` \| `string`\>

Shows the prompt modal and waits for the user's input.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options`? | \{ `class`: `string`; `default`: `string`; `label`: `string`; `large`: `boolean`; `placeholder`: `string`; \} | Optional display options. |
| `options.class`? | `string` | Optional CSS class(es) to add to the component. |
| `options.default`? | `string` | Optional default value for text field. If not provided, no default value is set. |
| `options.label`? | `string` | Optional text shown above the text field, with markdown formatting supported. Default is no label. |
| `options.large`? | `boolean` | If set to `true`, the input field will be multi line. If not provided, defaults to `false`. |
| `options.placeholder`? | `string` | Optional text inside text field. Defaults to a preset message. |

#### Returns

`Promise`\<`null` \| `string`\>

The user's input.

#### Examples

```ts
// default (one-line) prompt with default placeholder message
const result = await ntb.prompt();

new Notice(result);
```

```ts
// large prompt with message, overridden placeholder, and default value 
const result = await ntb.prompt({
  label: "Enter some text",
  large: true,
  placeholder: "Placeholder",
  default: "Default"
});

new Notice(result);
```

#### See

`NtbPrompt.js` in the [examples/Scripts folder](https://github.com/chrisgurney/obsidian-note-toolbar/tree/master/examples/Scripts).

***

### setProperty()

> **setProperty**: (`property`, `value`) => `Promise`\<`void`\>

Sets the given property's value in the active note.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `property` | `string` | Propety to set in the frontmatter. |
| `value` | `any` | Value to set for the property. |

#### Returns

`Promise`\<`void`\>

#### Example

```ts
await ntb.setProperty('Created', moment().format('YYYY-MM-DD'));
await ntb.setProperty('cssclasses', 'myclass');
await ntb.setProperty('A Link', '[[Some Note]]');
await ntb.setProperty('A Number', 1234);
await ntb.setProperty('A List', ['asdf', 'asdf2']);
```

***

### suggester()

> **suggester**: (`values`, `keys`?, `options`?) => `Promise`\<`null` \| `T`\>

Shows a suggester modal and waits for the user's selection.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `values` | `string`[] \| (`value`) => `string` | Array of strings representing the text that will be displayed for each item in the suggester prompt. This can also be a function that maps an item to its text representation. Markdown formatting is supported: optionally mix in Obsidian and plugin markdown (e.g., Iconize) to have it rendered |
| `keys`? | `T`[] | Optional array containing the keys of each item in the correct order. If not provided or `null`, values are returned on selection. |
| `options`? | \{ `allowCustomInput`: `boolean`; `class`: `string`; `default`: `string`; `label`: `string`; `limit`: `number`; `placeholder`: `string`; `rendermd`: `boolean`; \} | Optional display options. |
| `options.allowCustomInput`? | `boolean` | If set to `true`, the user can input a custom value that is not in the list of suggestions. Default is `false`. |
| `options.class`? | `string` | Optional CSS class(es) to add to the component. |
| `options.default`? | `string` | Optionally pre-set the suggester's input with this value. Matching results will be shown, as if you typed in that string yourself (assuming the string appears in the list of options provided). If not provided, no default is set. |
| `options.label`? | `string` | Optional text shown above the input field, with markdown formatting supported. Default is no label. |
| `options.limit`? | `number` | Optional limit of the number of items rendered at once (useful to improve performance when displaying large lists). |
| `options.placeholder`? | `string` | Optional placeholder text for input field; defaults to preset message. |
| `options.rendermd`? | `boolean` | Set to `false` to disable rendering of suggestions as markdown. Default is `true`. |

#### Returns

`Promise`\<`null` \| `T`\>

The selected value, or corresponding key if keys are provided.

#### Examples

```ts
// shows a suggester that returns the selected value 
const values = ["value `1`", "value `2`"];

const selectedValue = await ntb.suggester(values);

new Notice(selectedValue);
```

```ts
// shows a suggester that returns a key corresponding to the selected value, and overrides placeholder text
const values = ["value `1`", "value `2`"];
const keys = ["key1", "key2"];

const selectedKey = await ntb.suggester(values, keys, {
  placeholder: "Pick something"
});

new Notice(selectedKey);
```

#### See

`NtbSuggester.js` in the [examples/Scripts folder](https://github.com/chrisgurney/obsidian-note-toolbar/tree/master/examples/Scripts).

***

### t

> **t**: `string`

This is the [i18next translation function](https://www.i18next.com/translation-function/essentials), scoped to Note Toolbar's localized strings.

#### Returns

The string translation corresponding with the provided key, if it exists, with a fallback to English. If the key does not exist, the key is returned.

#### Example

```ts
// shows "Copied to clipboard" if the language is English, or in another langauge if the translation exists
new Notice(ntb.t('api.msg.clipboard-copied'));
```

#### See

 - For usage, see the [i18next documentation](https://www.i18next.com/translation-function/essentials).
 - `en.json` and other translations in the [src/I18n folder](https://github.com/chrisgurney/obsidian-note-toolbar/tree/master/src/I18n).
