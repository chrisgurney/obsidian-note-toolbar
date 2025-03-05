What's new in Note Toolbar v1.20?

## New Features 🎉

### Easily swap toolbars

While a note is open, right-click on a toolbar (long-press on mobile) to show an option to swap the toolbar with another you can then choose.

<img src="https://github.com/user-attachments/assets/7f76705c-1b07-454c-be55-aafe29c4dba6" width="700"/>

Notes:

- Selecting an option will override the default mapping for the toolbar by updating the Note Toolbar property/frontmatter in the current note (`notetoolbar` by default).
- Select the "Default" option to remove the property, which reverts to the default (folder) mapping.
- Note that _Swap toolbars_ will **not** be available if: 
  - the active file is not a note/markdown (as there's no properties to change); or
  - your Note Toolbar Property is set to `tags` (to prevent accidental deletion/overwriting of note tags).

_Thanks to @FeralFlora for the original idea._

### Support for Audio, Images, PDF, and Video

Open the **Show toolbars in other views** heading (under **Folder mappings**) to add mapped toolbars to audio, images, PDF, and video files.

Support for canvases, the File menu, and New tab view are now also grouped under this heading.

<img src="https://github.com/user-attachments/assets/ac6a5066-e46e-4794-801b-db9cd5c62073" width="600"/>

### Add a command for any item

Add a command for any toolbar item you would like to execute from the command palette or a hot key. Use the new item action menu to add the command.

<img src="https://github.com/user-attachments/assets/ddcf0e37-c5ec-4f66-bdc9-71979e8ae92f" width="600"/>

Notes

- Hotkeys assigned to item commands will show in the item list in settings, in item tooltips, and in menus. (Only the first mapped hotkey is shown.) _Thank you @mProjectsCode for the hotkey-handling code._
- If the label and tooltip are empty, you won't be able to add the item.
- If the label uses variables or expressions, the tooltip will be used instead; if the tooltip's empty, or also has variables, the command won't be able to be added.
- _Thank you @Dopairym for the idea._

### Copy developer ID for items

Using the menu on items, copy the unique identifier (UUID) for the toolbar item to the clipboard, so that in code you can target the item and make changes to it.

Once you have the ID, you can fetch the HTML element. As an example:

```js
activeDocument.getElementById('112c7ed3-d5c2-4750-b95d-75bc84e23513');
```

_Thank you @laktiv for the idea._

## Improvements 🚀

### Settings UI

- A dismissible onboarding message is shown when creating a new toolbar, noting that the toolbar must be mapped (or property set) in order to actually use it.
- Toolbar search
  - Results now include any matches with visible toolbar item text (labels, tooltips).
  - Search field is now shown by default on desktop and tablet.
  - Arrow down out of the search field to navigate search results.
- The new item actions menu (on phones) now contains the **Duplicate item** and **Delete** options, which helps give more room in the UI for visibility settings on smaller phones.

### Other

- Hotkeys assigned to toolbar commands will show in the toolbar list in settings. (Only the first mapped hotkey is shown.) _Thank you @mProjectsCode for the hotkey-handling code._
- The right-click > Edit item... text is now truncated if the toolbar item's name is too long (usually if using expressions).

## Fixes

- When entering a Note Toolbar property (`notetoolbar` by default) that was a string type (vs. list), the “no matching toolbar" notice would show the first character. This may have also caused problems in the past showing the toolbar if this was a string property. In both cases, the correct toolbar name is now used.
- Dataview expressions that use the new <code>\{\{dv:</code> notation no longer have extra letters removed.

## Licensing

Note Toolbar is now licensed under GPL 3.0 to ensure all contributions remain open source, and to maintain compliance when incorporating code from other projects.

---

## Previous releases

[v1.19](https://github.com/chrisgurney/obsidian-note-toolbar/releases/tag/1.19.1): Canvas support, right-click to edit items, default item for floating buttons, toolbar search in settings

[v1.18](https://github.com/chrisgurney/obsidian-note-toolbar/releases/tag/1.18.1): Add a toolbar to the New Tab view; Commands to show individual toolbars

[v1.17](https://github.com/chrisgurney/obsidian-note-toolbar/releases/tag/1.17.0): Bottom toolbars, quick access to styles, API component improvements

[v1.16](https://github.com/chrisgurney/obsidian-note-toolbar/releases/tag/1.16.0): Custom styles, API (Suggesters + Prompts), toolbar rendering and import improvements

[v1.15](https://github.com/chrisgurney/obsidian-note-toolbar/releases/tag/1.15.0): Dataview, JS Engine, and Templater support