## Create your first toolbar

In Obsidian's settings go to [**Note Toolbar → + New toolbar**](obsidian://note-toolbar?new), or [open the Gallery](obsidian://note-toolbar?gallery) and choose an item to get your toolbar started.

<img src="https://raw.githubusercontent.com/chrisgurney/obsidian-note-toolbar/master/docs/images/settings_edit_toolbar_empty.png" title="Edit Toolbar dialog, showing name, items, styles, and a delete button" width="800"/>

1. _Optional:_ Give your toolbar a unique **Name**. This will help you keep your toolbars organized. (You can do this later.)
2. **Search** (to browse items included with Note Toolbar), or use **+ New** to create toolbar items from scratch.
3. _Optional:_ Set a **Position** (toolbars appear under the Properties section by default), or choose to **Style** your toolbar. For now, let's leave it as-is, and explore this later.

Close the window, and you will be asked if you want to make this the toolbar the default for all of your notes. You can choose not to, and continue reading to learn about your other options.

**Try:** Click/Tap to add a formatting command to your toolbar:

> [!note-toolbar-gallery]
> - bold
> - italic
> - set-heading-1
> - set-heading-2

## To get a toolbar to show up in your notes

Under **Settings... → Note Toolbar → Display rules**, you can decide which toolbars appear in which notes:

<img src="https://raw.githubusercontent.com/chrisgurney/obsidian-note-toolbar/master/docs/images/settings_rules.png" title="Rules section of the settings, defining where to show the toolbar" width="800"/>

* The **Default toolbar** appears in all notes, unless one of the rules below is satisfied.
* Use the `notetoolbar` property in any note if you want a specific toolbar to appear. (Change the name of this property with the **Property** setting.)
* Use **Folder mappings** to specify which toolbar appears based on what folder your note is in. Use **+ New mapping** to create a new one.

Learn more about [Defining where to show toolbars ↗](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Defining-where-to-show-toolbars) in the User Guide.

## Styling your toolbar

There are several ways to organize and style toolbars, depending on what look you're trying to achieve:

- Add separators, gaps, and line breaks.
- Use the **Styles** in a toolbar's settings to individually style toolbars.
- Use the **Style Settings Plugin** to customize even more details. Note that this applies styles to _all_ toolbars, overriding the defaults (which are designed to adapt to your themes). Consider using this plugin to fix certain issues you encounter with themes.
- Apply **Custom styles**, defined in CSS snippets, if you wish to make even more specific changes.

Learn about the available styles [in the User Guide ↗](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Styling-toolbars).

## Positioning your toolbar

Use the toolbar's **Position** setting to choose the position of your toolbar, separately for desktop and mobile (i.e., phone and tablet).

Learn more about the available positions [in the User Guide ↗](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Positioning-toolbars).

## Example: Daily Notes toolbar

The Daily Notes plugin can be powerful for keeping a daily journal, and Note Toolbar can help you navigate between your daily entries easier.

**Try:** Select one of these to get started:

> [!note-toolbar-gallery]
> - daily-notes-prev
> - daily-notes-today
> - daily-notes-next

Once you've added all of your items, under **Folder mappings**, add the folder containing your daily notes, and select your new toolbar. (Alternately, in your daily notes template, add a `notetoolbar` property with the name of the toolbar.)

## More to explore

Read about [Creating toolbar items ↗](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Creating-toolbar-items) to learn about the various item types such as commands, file and folder links, websites/URIs, menus, groups, and scripts (Dataview, Templater, and JavaScript).

Use toolbars in other parts of Obsidian, as well:

- Use the **Toolbars within the app** setting to [access toolbars throughout the app ↗](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Toolbars-within-the-app), including: in the New tab view, the Navigation bar (on phones), and more.
- Toolbars can also be shown in non-markdown files such as canvases, PDFs, and video.
- To put toolbars in the middle of your notes, try [Note Toolbar Callouts ↗](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Note-Toolbar-Callouts).