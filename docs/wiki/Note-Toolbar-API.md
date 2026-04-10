The Note Toolbar API can be [executed from Note Toolbar items](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Executing-scripts) to get toolbar access, and to show UI (suggesters, prompts, menus, and modals). The latter enables Dataview JS, JS Engine, or Templater scripts to ask for information, or to show helpful text.

_I would appreciate your feedback, which you can leave in [the discussions](https://github.com/chrisgurney/obsidian-note-toolbar/discussions)._

## Getting started

Even if you're not a developer, getting started with the API is easy:

1. Create a new toolbar item with a **JavaScript type**.
2. **Select function... → Evaluate JavaScript**.
3. Copy/Paste one of the examples provided into the **JavaScript expression** field.

## `ntb` API

- [Note Manipulation](#Note-manipulation)
    - [[ntb.getProperty|Note-Toolbar-API#getproperty]]
    - [[ntb.setProperty|Note-Toolbar-API#setproperty]]
    - [[ntb.getSelection|Note-Toolbar-API#getselection]]
    - [[ntb.setSelection|Note-Toolbar-API#setselection]]
- [Toolbars](#Toolbars)
    - [[ntb.export|Note-Toolbar-API#export]]
    - [[ntb.getActiveItem|Note-Toolbar-API#getactiveitem]]
    - [[ntb.getItem|Note-Toolbar-API#getitem]]
    - [[ntb.getToolbars|Note-Toolbar-API#gettoolbars]]
- [UI Components](#UI-Components)
    - [[ntb.fileSuggester|Note-Toolbar-API#filesuggester]]
    - [[ntb.menu|Note-Toolbar-API#menu]]
    - [[ntb.modal|Note-Toolbar-API#modal]]
    - [[ntb.prompt|Note-Toolbar-API#prompt]]
    - [[ntb.suggester|Note-Toolbar-API#suggester]]
    - [[ntb.toolbar|Note-Toolbar-API#toolbar]]
- [Utilities](#Utilities)
    - [[ntb.app|Note-Toolbar-API#app]]
    - [[ntb.clipboard|Note-Toolbar-API#clipboard]]
    - [[ntb.o|Note-Toolbar-API#o]]
    - [[ntb.t|Note-Toolbar-API#t]]

---

> [!warning]
> You can also directly access Note Toolbar's settings or toolbar items via `app.plugins.getPlugin("note-toolbar").settings`, but be aware that these are subject to change and may break your scripts. The API will be the official way to access and change information about toolbars.

---

@import '../dist/api/INoteToolbarApi.Interface.default.md';