What's new in Note Toolbar v1.19?

## New Features 🎉

### Canvas support

Enable the **Show toolbar in canvas files** setting to show toolbars in canvases. Disabled by default.

_Support was partially enabled by accident in 1.18, but I decided to leave it in and get it fully working. Let me know what you think._

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

### Generic expression delimiters

Generic delimiters for expressions provide for more portable [Note Toolbar Callouts](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Note-Toolbar-Callouts), and will help support other expression types in the future. Use this new notation in item label, tooltip, and URI fields.

- For Dataview, instead of `=` (or whatever your prefix is configured as) expressions can alternately use <code>\{\{dv: ... \}\}</code>
- For Templater, instead of `<% ... %>` expressions can alternately use <code>\{\{tp: ... \}\}</code>.

[Copying toolbars as callouts](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Creating-callouts-from-toolbars) now uses this notation, if Note Toolbar's **Copy as callout → Replace variables and expressions** option is OFF.

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

- Mobile: Set mobile FAB color defaults to match Obsidian's colors.
- Mobile: Active FAB buttons now enlarge on tap, to provide feedback.
- Mobile: The phone now vibrates when opening the toolbar's context menu for default items.
- Slightly decreased the size of icons on desktop. (Override in the [Style Settings plugin](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Style-Settings-plugin-support), if you'd prefer.)
- The button's tooltip is now just the toolbar's name.

### Localization updates

- Ukrainian localization updated by [@laktiv](https://github.com/laktiv)
- Chinese (Simplified) localization updated by [@Moyf](https://github.com/Moyf)

## Fixes

- Mobile: Toolbars in the _New tab_ view in the top/props position are now usable/tappable.
- Fixed case where opening Quick Tools in an Empty tab shows Templater error notices, if Templater expressions are used.
- API: modal(): Markdown and wiki links used in the title are now tabbable.

## API Beta

### New Features 🎉

API to get all toolbars (`ntb.getToolbars()`) and a new Toolbar API (`IToolbar`) to:

- get the toolbar's name (`IToolbar.getName()`)
- export the toolbar as a callout (`IToolbar.export()`)

As an example, here's a script that writes out callouts for each configured toolbar:

```js
const toolbars = ntb.getToolbars();
for (let toolbar of toolbars) {
    console.log(`\n## ${toolbar.getName()}\n\n`);
    console.log(await toolbar.export());
}
```

See the [updated API documentation](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Note-Toolbar-API).

---

## Previous releases

[v1.18](https://github.com/chrisgurney/obsidian-note-toolbar/releases/tag/1.18.1): Add a toolbar to the New Tab view; Commands to show individual toolbars

[v1.17](https://github.com/chrisgurney/obsidian-note-toolbar/releases/tag/1.17.0): Bottom toolbars, quick access to styles, API component improvements

[v1.16](https://github.com/chrisgurney/obsidian-note-toolbar/releases/tag/1.16.0): Custom styles, API (Suggesters + Prompts), toolbar rendering and import improvements

[v1.15](https://github.com/chrisgurney/obsidian-note-toolbar/releases/tag/1.15.0): Dataview, JS Engine, and Templater support