What's new in Note Toolbar v1.21?

## New Features 🎉

### Introducing the Note Toolbar Gallery

The gallery is a curated list of items that can be added to your toolbars in just one (or two) clicks.

Most of the items are from the User Guide's _Examples_ page. However, the Gallery can include _even more_ as items can use scripts, creating useful tools that Obsidian does not provide out of the box. There's 66 items so far, but I'm aiming for a higher number on release.

Explore via the new **Gallery** button in settings, or if you have the beta open [open the Gallery here](obsidian://note-toolbar?gallery).

- Browse though the categories, or search for items at the top.
- To add an item to a toolbar, just click/tap on it. You will be prompted to select a toolbar to add it to.
- If the item is compatible with more than one plugin, you will be prompted to select the one you would like to use.

**I'd love your feedback!**

I’d love to hear your feedback on the items, and categories I’ve started this with. What are some helpful items you think other users would benefit from, that Obsidian doesn’t already provide, or is maybe not obvious? And let me know if anything’s broken.

Note for the localization team: Strings used within the Gallery and its items are in the [`gallery.json`](https://github.com/chrisgurney/obsidian-note-toolbar/blob/master/src/Gallery/gallery.json) and [`items.json`](https://github.com/chrisgurney/obsidian-note-toolbar/blob/master/src/Gallery/items.json) files respectively.  

### Search for items to add 

Next to the `Add` button for the toolbar, you can now Search for items to add from your existing toolbars. 

Suggestions from the Gallery are provided at the bottom of search results.

## Improvements 🚀

- On phones: Items opened or added in settings now use the item modal, rather than expanding in the list in-place.
- JS Engine: Added an Evaluate function, which evaluates a provided expression and displays a value if returned.

## Fixes

- Toolbar Settings: The need to re-enable the Scripting setting if a plugin was not installed/enabled, and it was then installed and enabled, has been removed.
- Quick Tools: Console errors are no longer reported for any items.
- Settings: Hot key display logic has been updated thanks to @mProjectsCode ’s updates.
- Item Settings: (To test) Style dropdown not rounded when it’s actively being pressed down on phone.
- Item Settings: Fixed an issue where the command suggester field was empty, even though the command was valid.

---

## Previous releases

[v1.20](https://github.com/chrisgurney/obsidian-note-toolbar/releases/tag/1.20.0): Swap toolbars; support for audio/images/PDF/video; add a command for any item

[v1.19](https://github.com/chrisgurney/obsidian-note-toolbar/releases/tag/1.19.1): Canvas support, right-click to edit items, default item for floating buttons, toolbar search in settings

[v1.18](https://github.com/chrisgurney/obsidian-note-toolbar/releases/tag/1.18.1): Add a toolbar to the New Tab view; Commands to show individual toolbars

[v1.17](https://github.com/chrisgurney/obsidian-note-toolbar/releases/tag/1.17.0): Bottom toolbars, quick access to styles, API component improvements