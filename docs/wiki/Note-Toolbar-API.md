The Note Toolbar API can be [executed from Note Toolbar items](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Executing-scripts) to get toolbar access, and to show UI (suggesters, prompts, menus, and modals). The latter enables Dataview JS, JS Engine, or Templater scripts to ask for information, or to show helpful text.

_I would appreciate your feedback, which you can leave in [the discussions](https://github.com/chrisgurney/obsidian-note-toolbar/discussions)._

## Getting started

Even if you're not a developer, getting started with the API is easy:

1. Create a new toolbar item with a **JavaScript type**.
2. **Select function... → Evaluate JavaScript**.
3. Copy/Paste one of the examples provided into the **JavaScript expression** field.

## `ntb` API

### Text

Functions to get and set note text:

- [[ntb.getProperty|Note-Toolbar-API#getproperty]]
- [[ntb.setProperty|Note-Toolbar-API#setproperty]]
- [[ntb.getSelection|Note-Toolbar-API#getselection]]
- [[ntb.setSelection|Note-Toolbar-API#setselection]]

### Toolbars

Functions to get and manipulate toolbars:

- [[ntb.export|Note-Toolbar-API#export]]
- [[ntb.getActiveItem|Note-Toolbar-API#getactiveitem]]
- [[ntb.getItem|Note-Toolbar-API#getitem]]
- [[ntb.getToolbars|Note-Toolbar-API#gettoolbars]]

### UI

Functions to display UI elements:

- [[ntb.fileSuggester|Note-Toolbar-API#filesuggester]]
- [[ntb.menu|Note-Toolbar-API#menu]]
- [[ntb.modal|Note-Toolbar-API#modal]]
- [[ntb.prompt|Note-Toolbar-API#prompt]]
- [[ntb.suggester|Note-Toolbar-API#suggester]]
- [[ntb.toolbar|Note-Toolbar-API#toolbar]]

### Utilities

- [[ntb.app|Note-Toolbar-API#app]]
- [[ntb.clipboard|Note-Toolbar-API#clipboard]]
- [[ntb.o|Note-Toolbar-API#o]]
- [[ntb.t|Note-Toolbar-API#t]]

---

> [!warning]
> You can also directly access Note Toolbar's settings or toolbar items via `app.plugins.getPlugin("note-toolbar").settings`, but be aware that these are subject to change and may break your scripts. The API will be the official way to access and change information about toolbars.

<details>
<summary>Copy developer ID for toolbars and items</summary>
<br/>
To get a unique identifier (UUID):

- for **toolbars**, go to Note Toolbar's main settings (in `1.27` or later), and use **More options → Copy developer ID**; and
- for **toolbar items**, go to each item's settings, and use **More actions... → Copy developer ID**. 

Use this as another method to uniquely style toolbars or items, or reference them in the API, without worrying if their names might change.

Here's some examples with items:

```js
// update this item's icon
const item = ntb.getItem('112c7ed3-d5c2-4750-b95d-75bc84e23513');
item.setIcon('alert');

// or fetch the HTML element (for non-floating-button toolbars)
const itemEl = activeDocument.getElementById('112c7ed3-d5c2-4750-b95d-75bc84e23513');
```
</details>

---

@import '../dist/api/INoteToolbarApi.Interface.default.md';