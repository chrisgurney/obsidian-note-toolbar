What's new in Note Toolbar v1.17?

## New Features 🎉

### Bottom toolbar position

By popular demand, there is now a _Bottom_ toolbar position, which floats the toolbar at the bottom of your note.

Change to this position using _right-click → Set position → Bottom_, or via the toolbar's settings.

Styling notes:
- If the `border` style is enabled, the border surrounds the toolbar.
- Adjust distance from the bottom, left/right padding, and border radius using [Style Settings](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Style-Settings-plugin-support).

Limitations / Known issues:
1. Toolbars with breaks have a gap on the right side (equivalent to the size of the wrapped items).
2. Bottom toolbars + Floating buttons: On mobile, the built-in toolbar disappearing makes it hard to use certain toolbar items (e.g., select text → bold).
    - As a bit of a workaround, consider adding the new `Note Toolbar: Open Quick Tools (for current toolbar)` to the editor toolbar: _Settings → Toolbar → scroll to the bottom of Manage toolbar options → Add global command_

**💬 Let me know how well it works for you** in the [discussion thread](https://github.com/chrisgurney/obsidian-note-toolbar/discussions/218), or use the [Google feedback form ↗](https://docs.google.com/forms/d/e/1FAIpQLSeVWHVnookJr8HVQywk5TwupU-p7vkRkSt83Q5jscR6VwpZEQ/viewform?usp=sf_link).

### Quickly access styles from the toolbar's context menu

Get to the Style section of settings for the active toolbar by right-clicking on it (or long-press on mobile) and select _Style..._

### New command: Access Quick Tools for the current toolbar

Use the new `Note Toolbar: Open Quick Tools (for current toolbar)` command to open a [Quick Tools](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Quick-Tools) window that shows the items in the toolbar associated with the current note.

> 💡 Tip: On mobile, consider adding this command to the editor toolbar: _Settings → Toolbar → scroll to the bottom of Manage toolbar options → Add global command_

## Improvements 🚀

- New plugin setting: _Show toolbar for the linked note in the File menu_, under _Note Toolbar Settings → Other_, which is defaulted to off. Allows you to selectively enable this feature, which was introduced in [`1.13`](https://github.com/chrisgurney/obsidian-note-toolbar/releases/tag/1.13). _Thanks @Moyf and @FelipeRearden_
- Floating buttons: Support for the `autohide` and `border` styles.
  - The border color defaults to the button's icon color, but can be overridden with [Style Settings](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Style-Settings-plugin-support).
- [Style Settings](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Style-Settings-plugin-support):
  - Override the `autohide` style opacity for toolbars and buttons separately.
  - Inactive opacity settings for mobile and desktop are now separate.
- Beta API UI components:
  - Updated all CSS class names from `note-toolbar-comp-*` to `note-toolbar-ui-*`.
  - Suggester: Added `modal` class. _Thanks @FelipeRearden_
  - Suggester: Options are now rendered as markdown, so they can include markdown and things like Iconize icons. _Thanks @FelipeRearden_
  - Prompt: Now accepts an optional input placeholder text parameter: _Thanks @FelipeRearden_
    - `prompt(prompt_text: string, multiline?: boolean, placeholder?: string, default_value?: string)`
  - Suggester: Made function easier to use with optional params and more sensible defaults:
    - `suggester(text_items: string[] | ((item: T) => string), items?: T[], placeholder?: string, limit?: number)`
  - Examples folder in repo has been updated to use the updated functions.

## Fixes

- Toolbars in split views are now updated on leaf change, if its config was updated.

## Changes

- Updated Ukranian tranlations thanks to @laktiv

---

## Previous releases

[v1.16](https://github.com/chrisgurney/obsidian-note-toolbar/releases/tag/1.16.0): Custom styles, API (Suggesters + Prompts), toolbar rendering and import improvements

[v1.15](https://github.com/chrisgurney/obsidian-note-toolbar/releases/tag/1.15.0): Dataview, JS Engine, and Templater support

[v1.14](https://github.com/chrisgurney/obsidian-note-toolbar/releases/tag/1.14.0): Share toolbars, and import/export as callouts