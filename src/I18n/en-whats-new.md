What's new in Note Toolbar v1.21?

## New Features 🎉

### Introducing the Note Toolbar Gallery

The gallery is a curated list of items that can be added to your toolbars in just one (or two) clicks. Explore it via the new **Gallery** button in settings.

The Gallery includes the User Guide's examples, and _even more_ as items can use scripts, creating useful tools that Obsidian does not provide out of the box. There's **[over 100+ items so far](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Gallery)**.

<img src="https://raw.githubusercontent.com/chrisgurney/obsidian-note-toolbar/refs/heads/master/docs/releases/1-21-gallery.png" width="700"/>

It's easy to use the Gallery:

- In settings, look for the new _Gallery_ button/link at the top, or use the `Note Toolbar: Open Gallery` command.
- Browse though the categories, or search for items at the top.
- To add an item to a toolbar, just click/tap on it. You will be prompted to select a toolbar to add it to, or you can create a new toolbar.
- Once the item is added to your toolbar, you can edit it however you see fit.

>[!note] 
> **I'd love your feedback** on the items, and categories I’ve started this with. What are some helpful items you think other users would benefit from, that Obsidian doesn’t already provide, or is maybe not obvious? Also, do let me know if anything’s broken. [Google feedback form ↗](https://docs.google.com/forms/d/e/1FAIpQLSeVWHVnookJr8HVQywk5TwupU-p7vkRkSt83Q5jscR6VwpZEQ/viewform)

> 🌐 For the localization team: Strings used within the Gallery and its items are in the [`gallery.json`](https://github.com/chrisgurney/obsidian-note-toolbar/blob/master/src/Gallery/gallery.json) and [`items.json`](https://github.com/chrisgurney/obsidian-note-toolbar/blob/master/src/Gallery/items.json) files respectively.  

### Add items to the toolbar more easily

Add items more easily in a couple new ways:

- Right-click (long-press on mobile) and using the **Add Item...** option. The item will be added wherever you right-click.
- In settings, next to the `Add` button for the toolbar, you can now Search for items to add from your existing toolbars. 

Suggestions from the Gallery are provided at the bottom of search results.

<img src="https://raw.githubusercontent.com/chrisgurney/obsidian-note-toolbar/refs/heads/master/docs/releases/1-21-additems.gif" width="700"/>

### Execute JavaScript without needing another plugin

JavaScript can now be executed without the need for another plugin. Look for the **JavaScript item type**.

- The _Scripting_ option  must be enabled in order to see this option.
- Gallery items that rely on scripts use this feature.
- [Learn more.](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/JavaScript)

### Use file items like tabs

Use the new `tab file items` style to make a file item behave like a tab, if the file you're currently viewing matches the item's filename.

<img src="https://raw.githubusercontent.com/chrisgurney/obsidian-note-toolbar/refs/heads/master/docs/releases/1-21-filetabs.gif" width="700"/>

If you'd prefer a different style, create a CSS snippet with the `data-active-file` attribute, which is applied. Example:

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

## Improvements 🚀

### Choose where to open files or to execute commands

When creating file or command items, choose from `New tab` or `Split pane`. For file items, you can also choose `New window`.

- Some commands may override this setting and do their own thing. 
- When clicking on file items, use modifier keys to override this setting.
- Using this feature, the _New Canvas_ and _New Kanban_ items in the Gallery create those file types in a new tab (versus the default, which is in the current tab).

### New URI variables + encoding

Added URI variables for the current file path <code>&#123&#123file_path&#125&#125</code> and vault path <code>&#123&#123vault_path&#125&#125</code>.

All variables (except for scripts) now support an `encode:` prefix, which, if added to a variable encodes that variable using `encodeURIComponent()`.

For example, here's a URI for **Open in VS Code** -- available in the Gallery -- using [VS Code's URL handling ↗](https://code.visualstudio.com/docs/configure/command-line#_opening-vs-code-with-urls) to open the current file:
<pre>
vscode://file/&#123;&#123;encode:vault_path&#125;&#125;%2F&#123;&#123;encode:file_path&#125;&#125;
</pre>

### Other improvements

- Move an item to another toolbar, from the item's _More actions_ menu. _Thank you for the idea @Moyf_ [#301](https://github.com/chrisgurney/obsidian-note-toolbar/discussions/301)
- _Page preview_ core plugin support for File and URI items. Use the modifier key when hovering over one of those items to show the preview. _Thank you for the idea @holroy_  [#287](https://github.com/chrisgurney/obsidian-note-toolbar/discussions/287)
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

#### [`ntb`](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Note-Toolbar-API)

**Get an item by its ID**, or **get the active item** (i.e., the item that was just clicked/tapped). See below for example.

Also **get note properties** given the property's key:

```javascript
const createdDate = ntb.getProperty('created');
```

Scripts can now also **access Note Toolbar's translations** via `ntb.t()`. For function usage, see the [i18next documentation ↗](https://www.i18next.com/translation-function/essentials). Translations are located in the [src/I18n folder](https://github.com/chrisgurney/obsidian-note-toolbar/tree/master/src/I18n).

```ts
// shows "Copied to clipboard" if the language is English, or in another langauge if the translation exists
new Notice(ntb.t('api.msg.clipboard-copied'));
```

#### [`Item`](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/IItem.Interface.IItem.md)

**Get and set an item's label, tooltip, and icon.**

Some of the items in the Gallery use this, such as `Toggle light/dark mode` which updates the icon to reflect the current mode:

```ts
const item = ntb.getActiveItem();
// you can also get items by ID
// const item = ntb.getItem('112c7ed3-d5c2-4750-b95d-75bc84e23513');
item?.setIcon('circle-alert');
```

---

## Previous releases

[v1.20](https://github.com/chrisgurney/obsidian-note-toolbar/releases/tag/1.20.0): Swap toolbars; support for audio/images/PDF/video; add a command for any item

[v1.19](https://github.com/chrisgurney/obsidian-note-toolbar/releases/tag/1.19.1): Canvas support, right-click to edit items, default item for floating buttons, toolbar search in settings

[v1.18](https://github.com/chrisgurney/obsidian-note-toolbar/releases/tag/1.18.1): Add a toolbar to the New Tab view; Commands to show individual toolbars

[v1.17](https://github.com/chrisgurney/obsidian-note-toolbar/releases/tag/1.17.0): Bottom toolbars, quick access to styles, API component improvements