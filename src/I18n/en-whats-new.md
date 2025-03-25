What's new in Note Toolbar v1.21?

## New Features 🎉

### Introducing the Note Toolbar Gallery

The gallery is a curated list of items that can be added to your toolbars in just one (or two) clicks. Explore it via the new **Gallery** button in settings.

The Gallery includes the User Guide's examples, and _even more_ as items can use scripts, creating useful tools that Obsidian does not provide out of the box. There's **over 70 items so far**, but I'm aiming for a higher number on release.

<img src="https://github.com/user-attachments/assets/2b271f98-c1d8-49cf-a1a0-83385422d337" width="700"/>

It's easy to use the Gallery:

- In settings, look for the new _Gallery_ button/link at the top.
- Browse though the categories, or search for items at the top.
- To add an item to a toolbar, just click/tap on it. You will be prompted to select a toolbar to add it to, or you can create a new toolbar.
- If the item is compatible with more than one plugin, you will be prompted to select the one you would like to use.
- Once the item is added to your toolbar, you can edit it however you see fit.

>[!note] 
> **I'd love your feedback** on the items, and categories I’ve started this with. What are some helpful items you think other users would benefit from, that Obsidian doesn’t already provide, or is maybe not obvious? Also, do let me know if anything’s broken. [Google feedback form ↗](https://docs.google.com/forms/d/e/1FAIpQLSeVWHVnookJr8HVQywk5TwupU-p7vkRkSt83Q5jscR6VwpZEQ/viewform)

> 🌐 For the localization team: Strings used within the Gallery and its items are in the [`gallery.json`](https://github.com/chrisgurney/obsidian-note-toolbar/blob/master/src/Gallery/gallery.json) and [`items.json`](https://github.com/chrisgurney/obsidian-note-toolbar/blob/master/src/Gallery/items.json) files respectively.  

### Search for items to add 

Next to the `Add` button for the toolbar, you can now Search for items to add from your existing toolbars. 

Suggestions from the Gallery are provided at the bottom of search results.

<img src="https://github.com/user-attachments/assets/d4318824-e537-42e2-adc3-9b88e173c051" width="700"/>

## Improvements 🚀

### Use file items like tabs

File items are now given a `data-active-file` attribute, if the file you're currently viewing matches the item's filename. This allows you to optionally style a button as if it was a tab.

<img src="https://github.com/user-attachments/assets/24d31261-f98c-4258-95bc-f807c5cf8774" width="600"/>

Example CSS snippet:

```css
.callout[data-callout="note-toolbar"] {
  li[data-active-file] {
    border-bottom: 1px solid var(--link-color);
    & span.external-link {
      color: var(--link-color);
      filter: unset;
    }
  }
}
```

### Other improvements

- On phones: Items opened or added in settings now use the item modal, rather than expanding in the list in-place.
- JS Engine: Added an Evaluate function, which evaluates a provided expression and displays a value if returned.

## Fixes

- Item Settings: Pressing down arrow key when in an edit field no longer closes the item.
- Toolbar Settings: The need to re-enable the Scripting setting if a plugin was not installed/enabled, and it was then installed and enabled, has been removed.
- Quick Tools: Console errors are no longer reported for any items.
- Settings: Hot key display logic has been updated thanks to @mProjectsCode ’s updates.
- Item Settings: (To test) Style dropdown not rounded when it’s actively being pressed down on phone.
- Item Settings: Fixed an issue where the command suggester field was empty, even though the command was valid.

## API Beta

### New Features 🎉

A few features have been added to the API to support the addition of the Gallery, but your scripts may be able to benefit from them as well.

**Get an item by its ID**, or **get the active item** (i.e., the item that was just clicked/tapped), and then **set its icon**:

```ts
const item = ntb.getActiveItem();
// you can also get items by ID
// const item = ntb.getItem('112c7ed3-d5c2-4750-b95d-75bc84e23513');
item?.setIcon('circle-alert');
```

Some of the items in the Gallery use this, such as `Toggle light/dark mode` which updates the icon to reflect the current mode.

A very basic `Item` interface has been added to support this method, and to get its ID. See the [updated API documentation](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Note-Toolbar-API).

Scripts can now **access Note Toolbar's translations** via `ntb.t()`:

```ts
// shows "Copied to clipboard" if the language is English, or in another langauge if the translation exists
new Notice(ntb.t('api.msg.clipboard-copied'));
```

- For function usage, see the [i18next documentation](https://www.i18next.com/translation-function/essentials).
- See `en.json` and other translations in the [src/I18n folder](https://github.com/chrisgurney/obsidian-note-toolbar/tree/master/src/I18n).

---

## Previous releases

[v1.20](https://github.com/chrisgurney/obsidian-note-toolbar/releases/tag/1.20.0): Swap toolbars; support for audio/images/PDF/video; add a command for any item

[v1.19](https://github.com/chrisgurney/obsidian-note-toolbar/releases/tag/1.19.1): Canvas support, right-click to edit items, default item for floating buttons, toolbar search in settings

[v1.18](https://github.com/chrisgurney/obsidian-note-toolbar/releases/tag/1.18.1): Add a toolbar to the New Tab view; Commands to show individual toolbars

[v1.17](https://github.com/chrisgurney/obsidian-note-toolbar/releases/tag/1.17.0): Bottom toolbars, quick access to styles, API component improvements