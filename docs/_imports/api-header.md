The Note Toolbar API can be [executed from Note Toolbar items](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Executing-scripts) to get toolbar access, and to show UI (suggesters, prompts, menus, and modals). The latter enables Dataview JS, JS Engine, or Templater scripts to ask for information, or to show helpful text.

_I would appreciate your feedback, which you can leave in [the discussions](https://github.com/chrisgurney/obsidian-note-toolbar/discussions)._

> [!warning]
> While you could also directly access Note Toolbar's settings or toolbar items via `app.plugins.getPlugin("note-toolbar").settings`, be aware that these are subject to change and may break your scripts. The API will be the official way to access and change information about toolbars.

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

## `ntb` API

- [[ntb.app|Note-Toolbar-API#app]]
- [[ntb.clipboard|Note-Toolbar-API#clipboard]]
- [[ntb.export|Note-Toolbar-API#export]]
- [[ntb.fileSuggester|Note-Toolbar-API#filesuggester]]
- [[ntb.getActiveItem|Note-Toolbar-API#getactiveitem]]
- [[ntb.getItem|Note-Toolbar-API#getitem]]
- [[ntb.getProperty|Note-Toolbar-API#getproperty]]
- [[ntb.getSelection|Note-Toolbar-API#getselection]]
- [[ntb.getToolbars|Note-Toolbar-API#gettoolbars]]
- [[ntb.menu|Note-Toolbar-API#menu]]
- [[ntb.modal|Note-Toolbar-API#modal]]
- [[ntb.o|Note-Toolbar-API#o]]
- [[ntb.prompt|Note-Toolbar-API#prompt]]
- [[ntb.setProperty|Note-Toolbar-API#setproperty]]
- [[ntb.setSelection|Note-Toolbar-API#setselection]]
- [[ntb.suggester|Note-Toolbar-API#suggester]]
- [[ntb.t|Note-Toolbar-API#t]]
- [[ntb.toolbar|Note-Toolbar-API#toolbar]]

---

@import '../dist/api/INoteToolbarApi.Interface.default.md';