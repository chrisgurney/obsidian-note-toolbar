# Contributing to Note Toolbar

Thanks for your interest in contributing! This document covers how to build, develop, and extend the plugin.

## Development setup

```bash
git clone https://github.com/chrisgurney/obsidian-note-toolbar.git
cd obsidian-note-toolbar
npm install
```

To watch for changes during development:

```sh
npm run dev
```

To lint:

```sh
npm run lint
npm run stylelint
```

Testing in Obsidian:

symlink or copy the build output (`main.js`, `manifest.json`, `styles.css`) into a vault's `.obsidian/plugins/obsidian-note-toolbar/` folder, then enable the plugin in Obsidian settings.

## Built-in documentation

To update or add UI documentation in the relevant language:

1. Copy [`en.json`](https://github.com/chrisgurney/obsidian-note-toolbar/blob/master/src/I18n/en.json) to `LANGUAGECODE.json` using the [language codes per Obsidian](https://github.com/obsidianmd/obsidian-translations?tab=readme-ov-file#existing-languages).
2. Start translating strings.
   - Under the covers the plugin uses [i18next](https://www.i18next.com/translation-function/formatting), so you can refer to their docs for help with formatting strings (in particular refer to [Formatting](https://www.i18next.com/translation-function/formatting), [Plurals](https://www.i18next.com/translation-function/plurals), and [Context](https://www.i18next.com/translation-function/context)).
3. For new languages, in [`NoteToolbarSettings.ts`](https://github.com/chrisgurney/obsidian-note-toolbar/blob/master/src/Settings/NoteToolbarSettings.ts):
   - Import the new language; and
   - add an `addResourceBundle` line, using the [language codes per Obsidian](https://github.com/obsidianmd/obsidian-translations?tab=readme-ov-file#existing-languages).

### For Style Settings plugin (styles.css) translations:

1. Open [`style-settings.yaml`](https://github.com/chrisgurney/obsidian-note-toolbar/blob/master/src/style-settings.yaml) and update per [Style Settings documentation](https://github.com/mgmeyers/obsidian-style-settings?tab=readme-ov-file#localization-support)

Example for Ukrainian:
```
title: 'Floating Button'
title.uk: 'Плаваюча кнопка'
description: 'Styles for floating buttons (set toolbar position to "floating button")'
description.uk: 'Стилі для плаваючих кнопок (встановіть позицію панелі інструментів на «плаваючу кнопку»)'
```
### For _What's New_ notes:

1. Open `RELEASE.md` from [`src/Help/Releases/en`](https://github.com/chrisgurney/obsidian-note-toolbar/tree/master/src/Help/Releases/en)
2. Translate
3. Save as `src/Help/Releases/LANGUAGECODE/RELEASE.md`
4. Update [`src/Help/HelpContent.ts`](https://github.com/chrisgurney/obsidian-note-toolbar/tree/master/src/Help/HelpContent.ts). (See how English notes are defined.)
5. Test, including in any new languages.

### For README and/or User Guide

[Drop me a comment](https://github.com/chrisgurney/obsidian-note-toolbar/discussions/118) if you're interested!

## Help documentation

Documentation is automatically updated based on the source files for those docs. After making changes, the relevant files need to be pushed to the wiki repo.

|Type    |Source        |Then push to...|
|--------|--------------|--------------|
|API     |`src/Api`<br/>`docs/wiki/Note-Toolbar-API.md` |[API wiki page](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Note-Toolbar-API) + other API pages|
|CLI     |`src/Cli/*.json`<br/>`docs/wiki/Note-Toolbar-CLI.md` |[CLI wiki page](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Note-Toolbar-CLI)|
|Gallery |`src/Gallery/*.json`<br/>`docs/wiki/Gallery.md` |[Gallery wiki page](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Gallery)|
|Tips    |[See: Tips](#Tips) |[See: Tips](#Tips) |

## Tips

Tips are help articles that are built-in to the plugin. Tips are accessible from the Help view, and can also be referenced from Settings `Learn more` links via a URI (see below).

### Create new Tips

1. Open `tip-id.md` from [`src/Help/Tips/en`](https://github.com/chrisgurney/obsidian-note-toolbar/tree/master/src/Help/Tips/en)
2. Translate
3. Save as `src/Help/Tips/LANGUAGECODE/tip-id.md`
4. Update [`src/Help/HelpContent.ts`](https://github.com/chrisgurney/obsidian-note-toolbar/tree/master/src/Help/HelpContent.ts) to include the language code. (See how English notes are defined.)
5. Add it to the Help view `src/Help/HelpView.ts`
6. Test, including in any new languages.

See below for instructions on adding various components to Tips.

### Linking to Tips

Use this URI format to link between Tips. The value of the `tip` parameter corresponds with the ID (and filename) in `tips.json`.

```markdown
Learn about how to add toolbars to your [daily notes](obsidian://note-toolbar?tip=daily-notes).
```

### Toolbar items in Tips

Create a strip of item cards by using the `note-toolbar-gallery` callout. Use Gallery item IDs in a list, as defined in `src/Gallery/gallery-items.json`.

```markdown
> [!note-toolbar-gallery]
> - copy
> - paste
> - undo
> - redo
```

### Video in Tips

1. Record with https://cursorful.com/
1. Switch to the `gh-pages` branch.
1. Add file to `tips/en` folder.
1. Push, and reference in tips in a `note-toolbar-video` callout, as follows:

```markdown
> [!note-toolbar-video]
> https://chrisgurney.github.io/obsidian-note-toolbar/tips/en/getting-started-gallery.mp4
```

## Custom icons

If there's a Lucide icon that doesn't quite fit the plugin's use case, here's how to create one:

1. Copy any [Lucide icon](https://lucide.dev/) you want to modify by using the site’s **Copy SVG** button.
    - Paste it into a design tool like [Figma](https://www.figma.com/) (free to use, with limited projects).
2. In the design tool:
    - **resize to 100 x 100**
    - set the **stroke size to 7**
    - make your changes
    - **save as SVG**
3. Use [ImageOptim](https://imageoptim.com/) to **optimize the SVG file**.
4. **Edit the SVG file by hand** (e.g., in TextEdit/Notepad):
    - Change stroke colors to `stroke=“currentColor”`
    - Add `fill=“none”` on `<g>` or individual `<path>` elements (your shapes may get filled in by Obsidian otherwise).
5. **Copy the *contents*** of the `<svg>` element.
    - Why? `setIcon()` seems to add its own `<svg>` element wrapper.
6. **In your plugin code**:
    - Use `addIcon()` to add the icon for use.
    - Prefix icon names with your plugin’s ID (which I believe this is necessary to avoid possible conflicts).
    - Example: `addIcon('note-toolbar-pen-book', '<g fill="none" stroke="currentColor" …’);`
7. **Use the icon** as you normally would via `setIcon()`.

## Submitting a pull request
 
- **Keep PRs focused**: one concern per PR
- **Test on both desktop and mobile**, noting any `Platform.isPhone`-specific behaviour
- **Run a full build** before submitting (`npm run build`) to catch TypeDoc and esbuild errors
- **Add i18n keys** for any new user-facing strings