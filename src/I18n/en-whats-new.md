What's new in Note Toolbar v1.16?

## New Features 🎉

### Custom styles

Using the new _Custom_ styles section with a CSS snippet, you can now define custom classes that you can apply to one or more specific toolbars.

Read more about it on the new [Custom styling](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Custom-styling) page.

_Thank you @Moyf for the idea, and to @laktiv for the feedback._

<img src="https://raw.githubusercontent.com/chrisgurney/obsidian-note-toolbar/master/docs/images/styles_settings_custom.png" width="700"/>

### Execute a command after creating a file from a template (Templater)

<img src="https://github.com/user-attachments/assets/7ae7628f-24e6-4721-9f31-2a3b6fb008d0" width="700"/>

Notes:

- Depending on your feedback, this can be added easily to other script functions/types.
- Creating a file from template will now no longer focus the file explorer on the new file, but you now can explicitly do that by selecting the `Files: Reveal current file in navigation` command.
  - _Though I couldn't get this command to work reliably in my own testing, while other commands seem to work fine. I'm open to getting help to figure out why. I'm wondering if I have to wait for the `file-open` event explicitly first, before execution._
- Thank you @pdelre for inspiring the idea for this one in [#203](https://github.com/chrisgurney/obsidian-note-toolbar/discussions/203)

### (BETA) Note Toolbar API

The first Note Toolbar APIs allow you to show suggester and prompt modals, enabling Dataview JS or JS Engine scripts to prompt the user for information.

>[!note]
> The API is considered BETA beyond this release, until more functions are added in the future (e.g., manipulating toolbars, and other UI components) and I consider naming and organization of the methods available. Functions may change. Provide feedback on the [release announcement](https://github.com/chrisgurney/obsidian-note-toolbar/discussions/207).

Read more about it on the [Note Toolbar API](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Note-Toolbar-API) page.

## Improvements 🚀

- Improved upon how toolbars are rendered to:
  - remove unneeded removal of existing toolbars (reduce flickering, speed up display);
  - evaluate Templater/Dataview expressions used in the toolbar before displaying it ([#198](https://github.com/chrisgurney/obsidian-note-toolbar/issues/198)); and
  - ensure the toolbar is shown if the view is switched between view modes (i.e., reading ←→ editing)
- Changes to the right-click menu:
  - Choose positions, including floating button positions, via the _Set position_ menu.
  - Show/Hide note properties.
  - Reordered items to put settings at the bottom.
- Settings: Increased the size of the arguments and expressions fields for script items. _Thanks @laktiv_

## Fixes

- Importing callouts from Settings now also transfers mobile styles properly [#189](https://github.com/chrisgurney/obsidian-note-toolbar/issues/189) _Thanks @laktiv!_
- Better importing of brackets, escaped characters from callouts.
- Minimal theme: Width of toolbar below props too wide [#204](https://github.com/chrisgurney/obsidian-note-toolbar/issues/204)
- The menu CSS class is now added to sub-menus, so CSS snippets can be applied to them as well.
- Quick Tools: Items with invalid item expressions showing multiple error messages.
- Settings: Preview tooltips with vars not using monospace font.
- Export/Share: URIs with a Templater expression as a link were having extra brackets added.
- Export/Share: Link is cut off at first close bracket.
- Settings: Long expressions in previews pushing Edit button to the right.
- Settings: Font size for expressions too large for item group previews.

---

## Previous releases

[v1.15 release](https://github.com/chrisgurney/obsidian-note-toolbar/releases/tag/1.15.0): Dataview, JS Engine, and Templater support

[v1.14 release](https://github.com/chrisgurney/obsidian-note-toolbar/releases/tag/1.14.0): Share toolbars, and import/export as callouts

[v1.13 release](https://github.com/chrisgurney/obsidian-note-toolbar/releases/tag/1.13): _What's New_ + _Help_ windows, and access to toolbars for linked notes from file menus.

[v1.12 release](https://github.com/chrisgurney/obsidian-note-toolbar/releases/tag/1.12.1): Translations, and Quick Tools (fast access to all of your tools).