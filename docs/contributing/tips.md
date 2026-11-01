# Authoring Tips

Tips are help articles that are built-in to the plugin. Tips are accessible from the Help view, and can also be referenced from Settings `Learn more` links via a URI (see below).

## Create new Tips

1. Open `tip-id.md` from [`src/Help/Tips/en`](https://github.com/chrisgurney/obsidian-note-toolbar/tree/master/src/Help/Tips/en)
2. Translate
3. Save as `src/Help/Tips/LANGUAGECODE/tip-id.md`
4. Update [`src/Help/HelpContent.ts`](https://github.com/chrisgurney/obsidian-note-toolbar/tree/master/src/Help/HelpContent.ts) to include the language code. (See how English notes are defined.)
5. Add it to the Help view `src/Help/HelpView.ts`
6. Test, including in any new languages.

See below for instructions on adding various components to Tips.

## Linking to Tips

Use this URI format to link between Tips. The value of the `tip` parameter corresponds with the ID (and filename) in `tips.json`.

```markdown
Learn about how to add toolbars to your [daily notes](obsidian://note-toolbar?tip=daily-notes).
```

## Toolbar items in Tips

Create a strip of item cards by using the `note-toolbar-gallery` callout. Use Gallery item IDs in a list, as defined in `src/Gallery/gallery-items.json`.

```markdown
> [!note-toolbar-gallery]
> - copy
> - paste
> - undo
> - redo
```

## Video in Tips

1. Record with https://cursorful.com/
1. Switch to the `gh-pages` branch.
1. Add file to `tips/en` folder.
1. Push, and reference in tips in a `note-toolbar-video` callout, as follows:

```markdown
> [!note-toolbar-video]
> https://chrisgurney.github.io/obsidian-note-toolbar/tips/en/getting-started-gallery.mp4
```
