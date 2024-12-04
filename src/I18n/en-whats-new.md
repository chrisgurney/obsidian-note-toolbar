What's new in Note Toolbar v1.15?

## Scripting

Note Toolbar can now execute Dataview, JavaScript (via [JS Engine ↗](https://obsidian.md/plugins?id=js-engine)), and Templater queries, expressions, and scripts from Note Toolbar buttons.

<a href="https://github.com/user-attachments/assets/56225123-145d-4500-aaf1-7b438d299a52">
  <img src="https://github.com/user-attachments/assets/56225123-145d-4500-aaf1-7b438d299a52" width="700"/>
</a>

**What's supported?**

If these plugins are installed and enabled you can:

- *Dataview* → Run queries, evaluate expressions, and execute scripts (like `dv.view`). [Learn more](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Dataview)
- *JS Engine* → Execute JavaScript. [Learn more](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/JS-Engine)
- *Templater* → Insert templates, create new notes from templates, execute commands (including running user scripts), and execute template files. [Learn more](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Templater)

If any of these return a value, they're output to the cursor position, or optionally to a `note-toolbar-output` callout that you provide an ID for. 

You can also use Dataview expressions and Templater commands in labels, tooltips, and URIs:

<a href="https://github.com/user-attachments/assets/0946d703-743e-4a1a-9f10-452531f7eec7">
  <img src="https://github.com/user-attachments/assets/0946d703-743e-4a1a-9f10-452531f7eec7" width="700"/>
</a>

**Note Toolbar Callouts + Scripting**

You can share toolbars that include script items as links, and export/import to/from Note Toolbar Callouts.

Script items can also be used directly from Note Toolbar Callouts. See below for some examples; copy some toolbars with script items as callouts to see more attributes/examples.

```markdown
> [!note-toolbar|right-mnbrder] Script Nav
> - [Create from Template]()<data data-templater-obsidian="createFrom" data-src="Templater/Basic Template.md" data-dest="&lt;%&quot;Basic &quot; + tp.file.last_modified_date(&quot;yyyy-MM-dd&quot;)%&gt;"/>
> - [Dataview Query Example]()<data data-dataview="query" data-expr="TABLE file.mtime AS &quot;Last Modified&quot; FROM &quot;Templater&quot; SORT file.mtime DESC" data-callout="asf"/>
> - [Hello World with JS Engine]()<data data-js-engine="exec" data-src="Scripts/JsEngine/HelloWorld.js"/>
```

**Learn more 📖**

- [User Guide](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Executing-scripts)
- [Example scripts](https://github.com/chrisgurney/obsidian-note-toolbar/tree/master/examples/Scripts)

**Feedback wanted 💬**

I would really appreciate your questions or feedback about scripting in [this discussion thread](https://github.com/chrisgurney/obsidian-note-toolbar/discussions/171), or using [this Google feedback form ↗](https://docs.google.com/forms/d/e/1FAIpQLSeVWHVnookJr8HVQywk5TwupU-p7vkRkSt83Q5jscR6VwpZEQ/viewform?usp=sf_link).

1. Do your existing scripts work as expected? (If not, what changes did you have to make?)
2. Does configuration make sense? (Should I add or change anything?)
3. Try out the Note Toolbar Script components for output, and let me know what you think.
4. Does the documentation and help text make sense? (Should I add or change anything?)

_Thank you!_

## Improvements 🎉

- In a Note Toolbar property, if you've entered the name of a toolbar that doesn't exist, a message now appears with a prompt to click/tap on it to create the toolbar.
- Quick Tools: Added a scroll icon for JS + Dataview items, and the Templater icon for Templater items.
- All commands now show a notice if there's an error executing it, if the command provides an error.
- Note Toolbar Callouts: Data attributes in callouts no longer require the `ntb-` portion of the attribute name, though they're still supported in everything but the above new attributes for backwards compatibility.
- Settings: The _Style_ drop-downs now only show relevant styles based on other selected styles, and the toolbar's position. Also removed `float` styles, which don't work with standard toolbars. Thanks @laktiv for the suggestion!
- Settings: Added a placeholder in the _Style_ dropdown when nothing's selected to make it clearer what action the user should take with it; made the dropdown wider to accommodate localization of that text.
- Settings: Moved field help text closer to fields.
- Translations have been updated, thanks to @hartimd and @laktiv!

## Fixes

- Settings: Item preview labels were disappearing when an icon was set, when there was no previous icon.
- Some commands existed but appeared unavailable. #170 Thanks @likemuuxi and @Moyf!
- Iconize icons in bookmarks had a thicker stroke width. #162 Thanks @laktiv!
- Editing a toolbar with no name set an incorrect modal title.
- If the button style was set for mobile, it was also applying to desktop as well, when it shouldn't have been.

---

## In case you missed it...

[v1.14 release](https://github.com/chrisgurney/obsidian-note-toolbar/releases/tag/1.14.0): Share toolbars, and import/export as callouts

[v1.13 release](https://github.com/chrisgurney/obsidian-note-toolbar/releases/tag/1.13): _What's New_ + _Help_ windows, and access to toolbars for linked notes from file menus.

[v1.12 release](https://github.com/chrisgurney/obsidian-note-toolbar/releases/tag/1.12.1): Translations, and Quick Tools (fast access to all of your tools).