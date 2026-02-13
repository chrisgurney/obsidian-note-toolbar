## Create your first toolbar

In Obsidian's settings go to **Note Toolbar → + New toolbar**, or [open the Gallery](obsidian://note-toolbar?gallery) and choose an item to get your toolbar started.

Then:

1. _Optional:_ Give your toolbar a unique **Name**. This will help you keep your toolbars organized. (You can do this later.)
2. **Search** (to browse items included with Note Toolbar), or use **+ New** to create toolbar items from scratch.
3. _Optional:_ Set a **Position** (toolbars appear under the Properties section by default), or choose to **Style** your toolbar. For now, let's leave it as-is, and explore this later.

Close the window, and you will be asked if you want to make this the toolbar the default for all of your notes. You can choose not to, and learn about the other approaches below.

**Try:** Click/Tap to add a formatting command to your toolbar:

> [!note-toolbar-gallery]
> - bold
> - italic
> - set-heading-1
> - set-heading-2

## To get a toolbar to show up in your notes

Under **Settings... → Note Toolbar → Display rules**, you can decide which toolbars appear in which notes:

* The **Default toolbar** appears in all notes, unless one of the rules below is satisfied.
* Use the `notetoolbar` property in any note if you want a specific toolbar to appear. (Change the name of this property with the **Property** setting.)
* Use **Folder mappings** to specify which toolbar appears based on what folder your note is in. Use **+ New mapping** to create a new one.

Learn more about [Defining where to show toolbars ↗](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Defining-where-to-show-toolbars) in the User Guide.

## Styling your toolbar

There are several ways to organize and style toolbars, depending on what look you're trying to achieve:

- Add separators, gaps, and line breaks.
- Use the **Styles** settings: This allows you to individually style toolbars, and define their behavior.
- Use the **Style Settings Plugin** to customize even more details. Note however that this applies styles to all toolbars, overriding the defaults (which are designed to adapt to the theme). You can use this plugin to fix certain issues you encounter with themes.
- Apply **Custom styles**, defined in CSS snippets, if you wish to make even more specific changes.

Learn more about [Styling toolbars ↗](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Styling-toolbars) in the User Guide.

## Positioning your toolbar

Choose the position of your toolbar, separately for desktop and mobile (i.e., phone and tablet), using the toolbar's **Position** setting.

Learn more about [Positioning toolbars ↗](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Positioning-toolbars) in the User Guide.

## Example: Daily Notes toolbar

The Daily Notes plugin can be powerful for keeping a daily journal, and Note Toolbar can help you navigate between your daily entries easier.

Select one of these to get started:

> [!note-toolbar-gallery]
> - daily-notes-prev
> - daily-notes-today
> - daily-notes-next

Once you've added all of your items, under **Folder mappings**, add the folder containing your daily notes, and select your new toolbar. (Alternately, in your daily notes template, add a `notetoolbar` property with the name of the toolbar.)

## Using the Gallery

> [!note-toolbar-video]
> https://chrisgurney.github.io/obsidian-note-toolbar/tips/en/getting-started-gallery.mp4

## More to explore

Read about [Creating toolbar items ↗](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Creating-toolbar-items) to learn about the various item types such as commands, file and folder links, websites/URIs, menus, groups, and scripts (Dataview, Templater, and JavaScript).

Use toolbars in other areas of Obsidian, as well:

- You can also access toolbars throughout the app, including: in the New tab view, the Navigation bar (on phones), and more. See Note Toolbar's **Toolbars within the app** settings.
- Toolbars can also be shown in non-markdown files such as canvases, PDFs, and video.
- To put toolbars in the middle of your notes, try [Note Toolbar Callouts ↗](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Note-Toolbar-Callouts).