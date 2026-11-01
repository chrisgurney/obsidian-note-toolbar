# Architecture

Note Toolbar is an Obsidian plugin that shows a configurable toolbar in notes, driven by settings, rules, and the active file. This document maps the system so a new contributor can find where a change belongs. For how to build, test, and submit a change, see `CONTRIBUTING.md`.

## How the system fits together

1. Obsidian fires an event, or the user clicks a toolbar item.
2. A listener asks the renderer to re-render for the current view.
3. The rules system picks which toolbar, if any, belongs to the current file.
4. The renderer builds the toolbar, resolving variables in labels, tooltips, and links first.
5. A click dispatches by item type: a command, a file, a URI, a menu, or a script run through an adapter.
6. Settings changes flow the other way: the settings UI edits the settings object, the settings manager writes it, and the renderer re-renders the current view.

## The plugin object

`src/main.ts` defines `NoteToolbarPlugin`, which extends Obsidian's `Plugin` class. Almost every other class receives the whole plugin object in its constructor, as `ntb`, and reaches the rest of the plugin through it. Follow that pattern for consistency in a first change.

On load, the plugin creates its managers and listeners, loads and if needed migrates settings, then creates the managers that need settings. On layout ready, it exposes the public API, renders the initial toolbar, and registers listeners, commands, views, and the protocol handler. On unload, it removes toolbar elements, removes the public API, and unloads commands and ribbon items.

The plugin object groups into settings, choosing and rendering, surfaces, scripting and utilities, and listeners. If you need something, look for the manager that owns it before adding a new field to the plugin object.

## Folder map

| Folder | Purpose |
| --- | --- |
| `src/` | Plugin entry point (`main.ts`). |
| `src/Adapters/` | Scripting adapters for other plugins, plus a script loader. |
| `src/Api/` | The public scripting API and its toolbar and item wrappers. |
| `src/Cli/` | The Obsidian CLI surface, defined from data. |
| `src/Commands/` | Obsidian commands, including per-toolbar and per-item commands. |
| `src/Gallery/` | The Gallery view and its item data. |
| `src/Help/` | Help, tip, and What's New views and their content lists. |
| `src/I18n/` | Translations only, no code. |
| `src/Listeners/` | One class per event source: workspace, view, document, metadata, vault, callout, and window. |
| `src/Protocol/` | The `obsidian://note-toolbar` URI handler. |
| `src/Ribbon/` | Ribbon icons, driven by ribbon settings. |
| `src/Settings/` | Settings types, defaults, load, save, and migration. |
| `src/Settings/UI/` | The settings tab, modals, components, and suggesters. |
| `src/Styles/` | CSS, inlined into the built `styles.css`. |
| `src/Toolbar/` | Toolbar selection, rendering, clicks, callouts, variables, and the text toolbar. |
| `src/Types/` | Shared type declarations. |
| `src/Utils/` | Small shared helpers, including import and export. |

The largest single file is `ToolbarRenderer.ts`. If a rendering change looks like it belongs in several places, start there and check whether the same logic already exists for menus and callouts before duplicating it.

## Data model

All settings types live in `src/Settings/NoteToolbarSettings.ts`. The three to learn first are:

- The whole plugin settings object, which holds toolbars, rules, the default toolbar, ribbon items, and global toggles.
- One toolbar, with its items, its position per platform, its styles, and an updated timestamp.
- One item, with its icon, label, tooltip, link, and link details carrying its type, command, focus, and target, plus visibility per platform and view mode.

A group item names another toolbar, so groups are toolbars nested inside toolbars, resolved at render time.

A rule has a toolbar and a list of conditions on the file, such as folder, file name, tag, or a frontmatter property. Rules are evaluated in order, and the first matching rule wins. A rule with no conditions never matches.

Settings are stored by Obsidian as `data.json` for the plugin. Loading merges stored settings over the defaults and runs a migration when the stored version differs from the current settings version. Saving writes the settings and, by default, re-renders the current view.

## How a toolbar is chosen

For a file view, toolbar selection runs in this order:

1. Frontmatter property. A configurable property on the note can name a toolbar directly, or name no toolbar.
2. Rules. The first matching rule wins.
3. Default toolbar. Used only if nothing else matched.

For a non-file view, such as a new tab or the web viewer, a configured empty-view or webviewer toolbar is used instead, if one is set. If no step matches, no toolbar is rendered for that file.

Rendering then inserts the toolbar at its configured position, filters items by platform visibility and view mode, expands groups, hides items whose resolved label is empty, and disables command items whose command is not available in the current view.

## Callouts, text toolbar, and menus

These are three renderings of the same toolbar data, not three separate systems: a toolbar written into a note as a callout block, the toolbar shown for selected text, and a toolbar rendered as a menu. If you change how an item renders or behaves, check all three, not just the in-note toolbar.

Variables are resolved before render for labels and tooltips, and at click time for links, because the file, selection, or frontmatter may have changed since render. Scripting variables run through the adapters below.

## Scripting adapters

`Adapters/AdapterManager.ts` is the single place that knows which scripting plugin is available. It creates adapters only when scripting is enabled and the corresponding plugin is present, and maps an item type to its adapter, or to nothing when the plugin is missing. JavaScript is built in; Dataview, JsEngine, and Templater require their plugins. If you add a scripting source, add it here first.

## Other surfaces

| Surface | Where to start |
| --- | --- |
| Commands | `Commands/CommandManager.ts`, with translatable names from `src/I18n/en.json`. Per-toolbar and per-item commands are set up with their toolbar or item, not as core commands. |
| CLI | `Cli/CliManager.ts` and `src/Cli/cli.json`. Add a definition to the JSON file and a handler alongside it. |
| Gallery | `Gallery/GalleryManager.ts`, `src/Gallery/gallery-items.json`, and `src/Gallery/gallery.json`. Add an item to the items file and its id to a category in the gallery file, not to a toolbar directly. |
| Public API | `Api/INoteToolbarApi.ts` for the interface, `Api/NoteToolbarApi.ts` for the implementation. The plugin exposes it as `window.ntb`. |
| Settings UI | `Settings/UI/NoteToolbarSettingTab.ts`, with toolbar, item, and rules modals under `Settings/UI/Modals/`. Settings UI code edits settings through the settings manager. |
| Protocol | `Protocol/ProtocolManager.ts`, registered in `main.ts`. |
| Ribbon | `Ribbon/RibbonManager.ts`, driven by ribbon settings. |
| Help views | `Help/HelpView.ts`, `TipView.ts`, and `WhatsNewView.ts`, with content lists in `HelpContent.ts`. |
| Translations | `src/I18n/en.json` first, through the translation function. Other locales fall back to English for missing keys. See `docs/contributing/translations.md`. |
| Styles | `src/Styles/styles.css`, which imports the other CSS files. Edit the sources there, never the built file. |

## Invariants and boundaries

These change rarely, and breaking one breaks user data or a public surface:

- Settings are read and written only through the settings manager. Nothing writes `data.json` directly.
- Scripting plugins are reached only through the adapter manager, so a missing plugin degrades to a notice instead of a crash.
- Generated files are never hand-edited: `src/version.ts`, `docs/dist/`, `main.js`, and `styles.css`. Change their sources instead.
- A settings shape change needs a migration, and an item type value must never be renamed, because both are stored in user data.
- A new view, command, or protocol action must be registered in `main.ts` or in the command manager. An unregistered surface is invisible in Obsidian.
- API documentation is generated from the interface's documentation comments, so an API change needs a matching comment change.

## Recipes

- Add a command: start in `CommandManager.ts`, with a translatable name, and delegate the action to the manager that owns the behaviour.
- Add a Gallery item: start in `src/Gallery/gallery-items.json`, add its id to a category in `src/Gallery/gallery.json`, then test by adding it from the Gallery view.
- Add a setting: start in `NoteToolbarSettings.ts` for the field and default, add a migration if existing settings need converting, then add the UI and the user-facing strings.
- Add an API method: start in `INoteToolbarApi.ts` with documentation comments, implement it in `NoteToolbarApi.ts` by delegating to the owning manager, and handle the missing-target case explicitly instead of silently doing nothing.

## Maintenance

Revisit this document when a subsystem is added or removed, or when a boundary above changes. Do not try to keep it synchronized with individual methods, file moves within a folder, or new enum values; those are what code search and code comments are for.
