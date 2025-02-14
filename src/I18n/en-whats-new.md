What's new in Note Toolbar v1.19?

## New Features 🎉

### Right-click on an item to edit it

Right-clicking on any item in a toolbar (long-pressing on mobile), will show an option in the menu to edit the item directly.

_Thanks @laktiv for the [suggestion](https://github.com/chrisgurney/obsidian-note-toolbar/discussions/214#discussioncomment-11955006)_

### Default item for floating buttons

For floating buttons, optionally set an item to show which will execute that item when clicked/tapped. To get access to the toolbar's items, right-click on the button (or long-press on mobile).

> 💡 Tip: Consider using this with a floating button in the ["New tab" view](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Defining-where-to-show-toolbars#show-a-toolbar-in-the-new-tab-view) and scripting, to create a convenient launching point for your vault.

Notes:

- The setting appears only when a floating button position is set for either the desktop or mobile.
- The icon for the item will be shown if one is set, otherwise it will use the toolbar's icon.
- Remember that the **Show "Edit toolbar" link in toolbar menus** setting can be enabled to add an item to edit the toolbar, if needed.

## Improvements 🚀

### Search toolbars in settings

In Settings, you can now search toolbars by name, to get to them quicker. Navigate the results with up/down arrow keys.

- The search option appears when there's enough toolbars to show the collapse button.

### Settings improvements

- Use up/down arrow keys to navigate the toolbar list.
- Use up/down arrow keys to navigate the item list.
- Better visual separation of settings sections.
- A notice is now displayed when the toolbar's open command is added or removed.
- Changed settings icons in context menus, to accommodate _Edit item_.
- Small reorganization of the _Other_ settings section.

### Floating buttons

- Slightly decreased the size of icons on desktop. (Override in the [Style Settings plugin](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Style-Settings-plugin-support), if you'd prefer.)
- The button's tooltip is now just the toolbar's name.

---

## Previous releases

[v1.18](https://github.com/chrisgurney/obsidian-note-toolbar/releases/tag/1.18.1): Add a toolbar to the New Tab view; Commands to show individual toolbars

[v1.17](https://github.com/chrisgurney/obsidian-note-toolbar/releases/tag/1.17.0): Bottom toolbars, quick access to styles, API component improvements

[v1.16](https://github.com/chrisgurney/obsidian-note-toolbar/releases/tag/1.16.0): Custom styles, API (Suggesters + Prompts), toolbar rendering and import improvements

[v1.15](https://github.com/chrisgurney/obsidian-note-toolbar/releases/tag/1.15.0): Dataview, JS Engine, and Templater support