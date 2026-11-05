---
name: note-toolbar-api
description: "Write, edit, or debug JavaScript that uses the Note Toolbar `ntb` API inside Obsidian. Use this skill whenever the user wants to script a toolbar item, use ntb.prompt / ntb.suggester / ntb.fileSuggester / ntb.menu / ntb.modal, read or write note properties via ntb.getProperty / ntb.setProperty, work with toolbar items via ntb.getItem / ntb.getToolbars, or combine the ntb API with Dataview JS, JS Engine, or Templater. Also trigger for any script that references `ntb`, `NtbSuggester`, or 'Note Toolbar API'."
---

# Note Toolbar API

Read `references/api-reference.md` before writing or editing any script. Use it as the authoritative reference for the `ntb` API. Do not fetch the wiki version instead: the included reference is the version matched to this checkout.

## Code conventions

- Comments start with a lower-case character.
- Use `activeWindow.navigator` (not bare `navigator`) for clipboard/permission-sensitive APIs.
- Use `normalizePath()` for vault paths.
- Keep scripts minimal; avoid unnecessary variables.
- Null-check all UI method results; every `ntb` UI call returns `null` if dismissed: `if (!result) return;`
- Inline scripts are plain JS; no type annotations.

## Script arguments (`input`)

Scripts receive their arguments as `input`: the object parsed from the item's Arguments field, from `data-args` on a callout item, or from `args=` on a CLI `add-js` item. The format is JSON-like: outer braces are optional, keys may be unquoted, and values may be strings (quoted or unquoted), numbers, booleans, `null`, or arrays. Invalid args show an error and the script does not run; with no args, `input` carries only the added `_scriptFile`. Note Toolbar also adds `input._scriptFile`, the `TFile` of the script being executed.

```js
// args field: property: "type", mode: "list"
const property = input?.property || 'type';
const mode = input?.mode;
```

## Script template

```js
// ask for a value and store it as a property on the active file
const file = ntb.app.workspace.getActiveFile();
if (!file) {
    new Notice('No active file found');
    return;
}

const property = input?.property || 'type';

try {
    const selected = await ntb.suggester(['article', 'note', 'journal'], null, { label: 'Select type' });
    if (!selected) return;

    await ntb.setProperty(property, selected);
    new Notice(`Set ${property}: ${selected}`);
} catch (e) {
    console.error(e);
    new Notice('Error: ' + e.message);
}
```

## Property types and list values

`ntb.getProperty()` returns the raw frontmatter value, so a list property returns an array at runtime (see the `getProperty` remarks in the reference). To decide whether to overwrite or append, read the property's widget from Obsidian's metadata cache. These two methods exist at runtime but are not part of the typed Obsidian API, so they work in plain scripts and have no TypeScript types. Look the property up by lower-case name and read `.widget`; `multitext` means a list.

```js
// widget for a property: "text", "multitext", "number", "date", "checkbox", and others
function getPropertyWidget(propName) {
    const allProps = ntb.app.metadataCache.getAllPropertyInfos();
    return allProps[propName.toLowerCase()]?.widget;
}

// set a value, appending to list properties instead of overwriting them
const property = input?.property || 'type';
const newValue = 'journal';
const current = ntb.getProperty(property);
if (getPropertyWidget(property) === 'multitext') {
    const values = Array.isArray(current) ? [...current] : (current ? [current] : []);
    if (!values.includes(newValue)) {
        values.push(newValue);
        await ntb.setProperty(property, values);
    }
} else {
    await ntb.setProperty(property, newValue);
}

// all existing values for a property, for suggester options
const values = ntb.app.metadataCache.getFrontmatterPropertyValuesForKey('type');
```