# Translations

To update or add UI documentation in the relevant language:

1. Copy [`en.json`](https://github.com/chrisgurney/obsidian-note-toolbar/blob/master/src/I18n/en.json) to `LANGUAGECODE.json` using the [language codes per Obsidian](https://github.com/obsidianmd/obsidian-translations?tab=readme-ov-file#existing-languages).
2. Start translating strings.
   - Under the covers the plugin uses [i18next](https://www.i18next.com/translation-function/formatting), so you can refer to their docs for help with formatting strings (in particular refer to [Formatting](https://www.i18next.com/translation-function/formatting), [Plurals](https://www.i18next.com/translation-function/plurals), and [Context](https://www.i18next.com/translation-function/context)).
3. For new languages, in [`NoteToolbarSettings.ts`](https://github.com/chrisgurney/obsidian-note-toolbar/blob/master/src/Settings/NoteToolbarSettings.ts):
   - Import the new language; and
   - add an `addResourceBundle` line, using the [language codes per Obsidian](https://github.com/obsidianmd/obsidian-translations?tab=readme-ov-file#existing-languages).

## For Style Settings plugin (styles.css) translations:

1. Open [`style-settings.yaml`](https://github.com/chrisgurney/obsidian-note-toolbar/blob/master/src/style-settings.yaml) and update per [Style Settings documentation](https://github.com/mgmeyers/obsidian-style-settings?tab=readme-ov-file#localization-support)

Example for Ukrainian:
```
title: 'Floating Button'
title.uk: 'Плаваюча кнопка'
description: 'Styles for floating buttons (set toolbar position to "floating button")'
description.uk: 'Стилі для плаваючих кнопок (встановіть позицію панелі інструментів на «плаваючу кнопку»)'
```
## For _What's New_ notes:

1. Open `RELEASE.md` from [`src/Help/Releases/en`](https://github.com/chrisgurney/obsidian-note-toolbar/tree/master/src/Help/Releases/en)
2. Translate
3. Save as `src/Help/Releases/LANGUAGECODE/RELEASE.md`
4. Update [`src/Help/HelpContent.ts`](https://github.com/chrisgurney/obsidian-note-toolbar/tree/master/src/Help/HelpContent.ts). (See how English notes are defined.)
5. Test, including in any new languages.

## For README and/or User Guide

[Drop me a comment](https://github.com/chrisgurney/obsidian-note-toolbar/discussions/118) if you're interested!
