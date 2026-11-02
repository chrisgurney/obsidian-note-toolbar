Note Toolbar adds customizable toolbars to notes and other parts of Obsidian. Users build toolbars from items (commands, links, scripts, menus), control where each toolbar appears with display rules, and style them per platform (desktop, phone, tablet). It works on desktop and mobile. Configuration lives in the plugin's settings (`data.json` in the vault's config folder); toolbars can also be embedded directly in notes as [Note Toolbar Callouts](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Note-Toolbar-Callouts).

> This page describes Note Toolbar **v1.35.x**. Items marked *in development* or *planned* are not in the released plugin.

## Where toolbars can appear

Each toolbar has a **Position**, set separately for desktop and mobile. See [[Positioning toolbars]]. Internal ids (shown as `id: …`) are the values used in settings data, the API, and the CLI. Most readers can ignore them.

| Position | Behavior |
| --- | --- |
| Top navigation (id: `tabbar`, v1.26+) | A toolbar button at the top of the editor, next to the Reading/Preview and File menu buttons. |
| Top (fixed) (id: `top`) | Fixed to the top of the editor, above the note title, regardless of scroll. |
| Below Properties (id: `props`) | Below the note's Properties. Not shown in Source mode; in non-Markdown files it falls back to the top. Can be made sticky on scroll with the `sticky` style. |
| Bottom (id: `bottom`) | Fixed to the bottom of the editor window. |
| Floating button (ids: `fabl` / `fabr`) | A floating button in the lower-left or lower-right corner; opens a menu of the toolbar's items. An optional **default item** executes on tap; right-click / long-press opens the full menu. |
| Hidden (id: `hidden`) | Not rendered in the editor for that platform (the toolbar can still be surfaced elsewhere: ribbon, menus, commands). |

Toolbars also surface in other parts of the app, configured under [[Toolbars within the app]]:

- **Ribbon** (v1.34+, desktop and mobile): access individual toolbars and toolbar items.
- **Navigation bar** on phones, including a Note Toolbar button for switching toolbars.
- **New tab view**: show a toolbar on new tabs, or replace the view entirely with a toolbar as a launchpad. Also works with the Home Tab and Beautitab plugins.
- **Selected text** (v1.26+): a toolbar appears when text is selected; `Esc` closes it; the `{{selection}}` variable holds the selected text.
- **Editor menu** (desktop only, v1.26.07+): a toolbar can completely replace the right-click Editor menu, shown as a menu or as a toolbar.
- **File menu**: the toolbar for a linked note appears in the File menu when right-clicking an internal link, so actions can run on notes without opening them.
- **Web viewer** (desktop only, v1.29.12+): a toolbar in Web viewer tabs (address-bar area, below it, or floating), with the Web viewer core plugin enabled.
- **Quick Tools windows**: searchable floating windows listing all items across toolbars, the current toolbar's items, or all toolbars.

## Item types

Every item has an icon (from Obsidian's icon set / Lucide), an optional label and tooltip (both support variables and expressions), per-platform visibility (icon/label shown or hidden on desktop vs mobile), and Reading/Editing mode visibility. Items can be given their own Obsidian command (and therefore a hotkey), copied/moved between toolbars, shared, or copied as callout items. See [[Item types]] for details.

| Type | What it does | Requirements |
| --- | --- | --- |
| Command (id: `command`) | Runs any Obsidian or plugin command. | None |
| File (id: `file`) | Opens a specific file. Can also target a folder, which reveals it in the file explorer. | None |
| URI (id: `uri`) | Opens a website, an `obsidian://` URI, another app, or a file outside the vault. Supports variables, e.g. links built from note properties. | None |
| Item Menu (id: `menu`) | Embeds another toolbar as a drop-down menu. | None |
| Item Group (id: `group`) | Embeds another toolbar's items inline, for reusing groups across toolbars. | None |
| JavaScript (id: `javascript`) | Runs JavaScript: inline scripts or files, with the `ntb` API. | Scripting setting enabled. |
| Dataview (id: `dataview`) | Runs Dataview queries, expressions, and scripts. | Scripting enabled + Dataview plugin. |
| JS Engine (id: `js-engine`) | Runs JavaScript via the JS Engine plugin. | Scripting enabled + JS Engine plugin. |
| Templater (id: `templater-obsidian`) | Inserts templates, creates notes from templates, runs Templater commands. | Scripting enabled + Templater plugin. |

Layout elements (not actions): **Separator** (id: `separator`, a divider line), **Spreader** (id: `spreader`, pushes item groups apart to the edges), **Break** (id: `break`, forces a new line). Breaks and spreaders render as separators inside menus.

Three further type values appear in stored data but are NOT user-creatable: `folder` (the internal storage type of a File item that targets a folder; users create it as a File item), and `additional` / `plugin` (Gallery-provided items: externally hosted examples, and items that rely on a plugin). The item-type dropdown offers exactly the nine types in the table above plus the layout elements.

## Which toolbar shows: display rules

Resolved in this order (see [[Defining where to show toolbars]]):

1. **Property**: the `notetoolbar` note property (name configurable) names the toolbar for that note; the value `none` shows no toolbar. A property always overrides rules. The **Swap toolbar** context action and the `Use toolbar` command set this property.
2. **Rules** (v1.35+; replaced Folder Mappings from v1.34 and earlier, which are converted automatically on upgrade): an ordered list; the first matching rule wins. Each rule has one or more conditions on: editor mode (editing/reading), file name (contains / starts with / ends with / is …), file type, folder path (`/` = vault root, `*` = all files), platform (desktop / mobile / phone / tablet), tags, and any note property (exists / is empty / contains …). A rule can also specify **No toolbar**.
3. **Default toolbar**: shown when nothing else matches.

Toolbars can be enabled for non-Markdown **file types**: audio, Bases, canvas, images, PDF, video, and manually entered types (e.g. `excalidraw`). Properties and property-based variables do not exist in those files.

## Styling

Per-toolbar styles, with a Defaults set and a Mobile override set: `active file` (item styled like a tab when its file is open), `auto-hide` (hover-reveal on desktop, slide-away on phones), `border`, `button`, alignment (`left align items`, `center items`, `right align items`, `space between items`, `space items evenly`), `content width`, `editor width`, `don't wrap items` (single-line, scrollable), `glass`, `hide in inactive views`, `sticky`. Mobile overrides can negate defaults: `no border`, `no auto-hide`, `no active file`, `not sticky`. Deeper customization is available via the Style Settings plugin and CSS snippets (custom classes per toolbar/item). See [[Styling-toolbars]] for details.

**Glass style**: On desktop, applies a Liquid Glass type look-and-feel to toolbars in the `Top (fixed)` and `Floating button` positions. On mobile, to *all* positions.

## The Gallery

The [[Gallery]] is a built-in catalog of ready-made items (137 items in v1.35), organized into categories such as formatting and daily-note navigation. Items can be added to a toolbar individually; categories marked `addAsToolbar` can be added as a whole toolbar in one click/tap. Some Gallery items require another plugin (e.g. Daily Notes core plugin, Periodic Notes, Workspaces, Templater). Note Toolbar does not install or enable plugins for the user. A separate list is on the [[Additional Gallery items]] page.

## Note Toolbar Callouts

Toolbars can be defined inside a note as a special callout containing links and self-closing `<data>` elements, instead of (or in addition to) settings-defined toolbars. Callouts can be created from existing toolbars and vice versa ("Copy as callout item"). A **Lock Note Toolbar Callouts** setting prevents accidental edits.

## Scripting and extensibility

- **Scripting gate**: script item types (JavaScript, Dataview, JS Engine, Templater) do nothing until the user enables Note Toolbar's **Scripting** setting. An error-behavior setting controls how script errors surface (notice / console / ignored).
- **Note Toolbar API** (`ntb`): scripts can show prompts, suggesters, file suggesters, menus and modals, read/write note properties, and inspect toolbars/items. See the [Note Toolbar API](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Note-Toolbar-API) documentation.
- **CLI**: Note Toolbar registers its own commands with the Obsidian CLI (Obsidian 1.12+) to list, create, and modify toolbars and items, run items, list Gallery items and rules, and open settings. It is designed for external tools and AI assistants. See the [Note Toolbar CLI](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Note-Toolbar-CLI) documentation.
- **URIs / protocol handler**: `obsidian://note-toolbar?...` links run commands and items from outside Obsidian; each item command has a copyable URI.
- **Variables**: labels, tooltips, and URI fields support `{{note_title}}`, `{{file_path}}`, `{{prop_NAME}}`, `{{selection}}`, and expression forms `{{js:}}`, `{{dv:}}`, `{{jse:}}`, `{{tp:}}`. See the [Variables](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Variables) documentation.
- **Works alongside**: Dataview, Templater, JS Engine, Style Settings, Advanced URI (for building URIs), Home Tab, Beautitab, and the Shell Commands plugin's commands (as Command items).

## Built-in commands

Note Toolbar adds Obsidian commands including (see [[Commands]] for the full list): Create toolbar; Use toolbar; Open display rules (v1.35+); Focus (keyboard focus into the toolbar, arrow-key navigation); Focus in text toolbar; Quick tools / Quick tools (for current toolbar) / Quick toolbars; Toggle, Fold, Hide, and Show Properties; Toggle Base toolbars; Copy callout item for command; Copy URI for command; Lock/Unlock Note Toolbar Callouts; Open Gallery; Open Help; Plugin settings; Toolbar settings. Users can additionally generate a command for any individual toolbar (opens it as a menu, toolbar, or Quick Tools window) or any individual item.

## Sharing and portability

Toolbars and individual items can be shared as links that other Note Toolbar users import. Settings can be exported and imported (including an import from callout markdown). "Copy developer ID" exposes an item's UUID for API use.

## Platform and localization

- Desktop (Windows/macOS/Linux) and mobile (iOS/Android); phone and tablet are treated as distinct platforms in positions, styles, visibility, and rules.
- Interface languages: English, Deutsch, 日本語, Українська, 简体中文 (community translations; completeness varies). Localization via CrowdIn is *planned*, not yet in place.
- Settings UI and toolbars are keyboard navigable (Focus commands; accessible settings).

## Limits and non-features

- **No native AI features.** Note Toolbar does not include built-in AI services or integrations, and there are no plans to add them. AI workflows are external: users configure toolbar items/scripts that call an AI service themselves, or use external AI tools (skills, the CLI) to configure the plugin. The plugin does not send vault content anywhere on its own.
- **No plugin management.** It uses other plugins' commands and APIs but does not install, enable, or configure them (except opening its own settings).
- **Scripting is opt-in.** Script items require the Scripting setting; a script item will not work without it.
- **Not a sync tool.** Settings live in the plugin's `data.json`; whether they sync between devices depends on the user's own vault/config sync setup, not on Note Toolbar.
- **Version landmarks**: Rules replaced Folder Mappings in v1.35; Ribbon access arrived in v1.34; the CLI arrived in v1.31; tab-bar position and selected-text toolbars in v1.26.
- **In development** (not released): error handling/reporting improvements for scripts, plus bug fixes and stabilization.
- **Planned** (not released, may change): CrowdIn localization support; update to Obsidian 1.13's declarative settings API.
