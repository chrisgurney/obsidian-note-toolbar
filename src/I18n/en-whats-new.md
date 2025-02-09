What's new in Note Toolbar v1.18?

## New Features 🎉

### Show a toolbar in the New tab view

Go to **Settings → Display rules → Show toolbar in New tab view** then select a toolbar to display in the _New tab_ view.

Notes:

- Any references to files or properties in variables or script commands won't work.
- If the toolbar is in the `Below Properties` position, it will be shown at the top instead.
- Supports the [Home Tab ↗](https://github.com/olrenso/obsidian-home-tab) and [Beautitab ↗](https://github.com/andrewmcgivery/obsidian-beautitab) plugins.

_Thank you @mardybardy for the idea in [#78](https://github.com/chrisgurney/obsidian-note-toolbar/discussions/78)._

### Commands for individual toolbars

For fast access to a specific toolbar, open any toolbar's settings, and enable **Add toolbar command**.

A new command will be added (`Note Toolbar: Open: YOURTOOLBARNAME`) that will let you open that toolbar in a [Quick Tools window](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Quick-Tools).

> 💡 Tip: Assign a hot key to that command for convenient access to that toolbar.

_Thank you Hydra (on the Obsidian Discord) for the idea._

---

## Fixes

- Bottom toolbars: Adjustments to toolbar positioning/centering, to try to account for changing Dataview expressions.
- Settings: Toolbar edit buttons varying widths on phones.
- Settings: Code lines not wrapping in toolbars list.
- Settings: Mappings heading not full width on phones.

---

## Previous releases

[v1.17](https://github.com/chrisgurney/obsidian-note-toolbar/releases/tag/1.17.0): Bottom toolbars, quick access to styles, API component improvements

[v1.16](https://github.com/chrisgurney/obsidian-note-toolbar/releases/tag/1.16.0): Custom styles, API (Suggesters + Prompts), toolbar rendering and import improvements

[v1.15](https://github.com/chrisgurney/obsidian-note-toolbar/releases/tag/1.15.0): Dataview, JS Engine, and Templater support