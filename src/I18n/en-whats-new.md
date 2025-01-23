What's new in Note Toolbar v1.17?

## New Features 🎉

### Bottom toolbar position

By popular demand, there is now a _Bottom_ toolbar position, which floats the toolbar at the bottom of your note.

- Set the position using _right-click → Set position → Bottom_, or via the toolbar's settings.
- Styling notes:
  - If the `border` style is enabled, the border surrounds the toolbar.
  - Adjust position and border radius using [Style Settings](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Style-Settings-plugin-support).

**💬 Let me know how well it works for you** in the [discussion thread](https://github.com/chrisgurney/obsidian-note-toolbar/discussions/218), or use the [Google feedback form ↗](https://docs.google.com/forms/d/e/1FAIpQLSeVWHVnookJr8HVQywk5TwupU-p7vkRkSt83Q5jscR6VwpZEQ/viewform?usp=sf_link).

### Quickly access styles from the toolbar's context menu

Get to the Style section of settings for the active toolbar by right-clicking on it (or long-press on mobile) and select _Style..._

## Improvements 🚀

- Floating buttons: Support for the `autohide` and `border` styles.
  - The border color defaults to the button's icon color, but can be overridden with [Style Settings](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Style-Settings-plugin-support).
- [Style Settings](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Style-Settings-plugin-support):
  - Override the `autohide` style opacity for toolbars and buttons separately.
  - Inactive opacity settings for mobile and desktop are now separate.
- Beta API UI components:
  - Added `modal` class to Suggester. _Thanks @FelipeRearden_
  - Updated class names from `note-toolbar-comp-*` to `note-toolbar-ui-*`.

## Fixes

- Toolbars in split views are now updated on leaf change, if its config was updated.

## Changes

- Updated Ukranian tranlations thanks to @laktiv

---

## Previous releases

[v1.16](https://github.com/chrisgurney/obsidian-note-toolbar/releases/tag/1.16.0): Custom styles, API (Suggesters + Prompts), toolbar rendering and import improvements

[v1.15](https://github.com/chrisgurney/obsidian-note-toolbar/releases/tag/1.15.0): Dataview, JS Engine, and Templater support

[v1.14](https://github.com/chrisgurney/obsidian-note-toolbar/releases/tag/1.14.0): Share toolbars, and import/export as callouts