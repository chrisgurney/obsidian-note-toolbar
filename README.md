# Obsidian Note Toolbar

The [Obsidian](https://obsidian.md) Note Toolbar plugin provides a flexible way to create toolbars at the top of your notes.

Alternately, add Note Toolbar Callouts anywhere in your notes.

[![GitHub Release](https://img.shields.io/github/v/release/chrisgurney/obsidian-note-toolbar?sort=semver)](https://github.com/chrisgurney/obsidian-note-toolbar/releases)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

- [ ] _Gif_: Create toolbar (daily notes, sticky), Add with metadata

# Installation

## Installing via Community Plugins

- [ ] TBD

## Installing via BRAT

1. Install the BRAT plugin:
  - Open Settings -> Community Plugins
  - Disable safe mode, if enabled
  - Browse, and search for "BRAT"
  - Install the latest version of Obsidian 42 - BRAT
2. Open BRAT settings (Settings -> Obsidian 42 - BRAT)
3. Scroll to the Beta Plugin List section
4. Add Beta Plugin
5. Specify this repository: `chrisgurney/obsidian-note-toolbar`
6. Enable the Note Toolbar plugin (Settings -> Community Plugins)

# Getting Started 🚀

- [ ] TBD: 

1. In settings, create a New Toolbar
2. Add items to your toolbar
3. Try mapping a folder

# Examples

- [ ] TBD:

Examples of items you might put in a toolbar:
- Next/Previous Daily Note: use [Periodic Notes](https://github.com/liamcain/obsidian-periodic-notes) + [Advanced URI](https://github.com/Vinzent03/obsidian-advanced-uri)
- Create new notes: Templater
- Bookmarks: Dataview + [!toolbar] callout
- Shell Commands
- ...let me know how you use your toolbars!

Note Toolbar pairs well with these plugins:
- [Advanced URI](https://github.com/Vinzent03/obsidian-advanced-uri) (for linking to any Obsidian command)
- [Dataview](https://github.com/blacksmithgu/obsidian-dataview) (e.g., generate a list of your Bookmarks)
- [Periodic Notes](https://github.com/liamcain/obsidian-periodic-notes) (link to today's, and previous/next Daily Notes)
- [Shell Commands](https://github.com/Taitava/obsidian-shellcommands) (for executing shell scripts, Python code, etc.)

# Settings Guide 🛠️

Once installed, in Obsidian go to: **Settings... > Note Toolbar** and click **+ New toolbar**.

## Creating Note Toolbars

### Name

Give your toolbar a name. This name will be used from your note properties, or when mapping folders (see below).

### Items

Add each item to your toolbar:

| Setting | What it does |
| --- | --- |
| Item label | What's shown on the toolbar |
| Tooltip | Displayed on hovering over the item on the toolbar. Nothing is displayed if this is not set. |
| URL | What the item links to. See the [URLs](#urls) section. |
| Hide on mobile | Enable this to simplify your experience on mobile due to limited screen real-estate, or for items that just don't work on mobile (e.g., Shell Commands). |
| Hide on desktop | If you have items you prefer not to see on desktop. |

#### URLs

URLs support the following variables, which are substituted on click:

| Variable | What it is |
| --- | --- |
| `{{note_title}}` | The title (a.k.a. basename) of the current note. |
| `{{prop_NAME}}` | Property in the current note with the given name. If the property does not exist, the variable will not be substitued. e.g., if you have a property called "date" use `{{prop_date}}` |

URL variable values are [encoded](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent) for safety.

[Let me know](https://github.com/chrisgurney/obsidian-note-toolbar/discussions) what else you might want to add.

### Styles

Styles define how the toolbar will look (and behave).

There's a set of default styles, but they're overridden for mobile (below) by any styles listed there.

- border (adds a top and bottom border)
- no border
- center items
- evenly space items
- float left (floats the toolbar left of nearby content)
- float right (floats the toolbar right of nearby content)
- no float
- left align items
- right align items
- sticky (sticks toolbar to top on scroll)
- not sticky

In the **Mobile** section, you can add equivalent styles that allow you to override the defaults on mobile.

_Notes on precedence:_
- Styles are applied in the order you add them in settings. Per how CSS works, styles later in the lists take precedence.
- In case it helps, styles are defined alphabetically in [styles.css](https://github.com/chrisgurney/obsidian-note-toolbar/blob/master/styles.css) (with the exception of float being at the top).

## Defining where Note Toolbars are applied

Tell the plugin which notes to display toolbars in one of two ways:

### Note property

Set the `notetoolbar` property on your note with the name of the toolbar you want to display.

Change what property to use by looking at by changing the `Property` setting.

If you prefer not to use properties, try Folder Mappings.

### Folder Mappings

Specify the folders you want your toolbars to appear on.

For example, if your daily notes are all in the same root folder, just specify that folder and map it to your "Daily Notes" toolbar, and it will appear on all existing, and new daily notes.

_Notes on precedence_:
- Notes are matched to folders starting from the top of the list.
- If you have a property on a given note, it will override the folder mapping.

# Use Toolbar Callouts

Toolbars are actually callouts! You can use a toolbar callout directly, to add a toolbar in the middle of your notes, for example. 

This feature allows for more flexibility, and using other plugins (e.g., Templater, Dataview) to generate the contents of the toolbar.

## How to use Toolbar Callouts

Create a toolbar by creating a callout containing any list, like this:
```markdown
> [!note-toolbar]
> - [Link Menu Item](obsidian://...)
> - [[Page Menu Item]]
> - Menu Item That Won't Do Anything
```

To control its appearance, optionally add metadata by adding a | and listing styles, for example:
```markdown
> [!note-toolbar|border-right-sticky]
```

Refer directly to the [styles.css](https://github.com/chrisgurney/obsidian-note-toolbar/blob/master/styles.css) for the literal style names.

# Troubleshooting

## I want to link a toolbar item to a note...

I'm investigating adding this in addition to URLs, but in the meantime you can get the URL from Obsidian itself (`Copy Obsidian URL`).

## The styling of my toolbar looks weird...

See the notes in the [Styles](#styles) section around precedence.

However, if you use other plugins or themes that modify how callouts behave or look, they _may_ have an effect on this plugin. 

As noted, toolbars are a special form of callout, designed to fit naturally with Obsidian's look and feel. The plugin inserts between the metadata and content portions of the editor view, assuming certain criteria are met.

Please [log an issue](https://github.com/chrisgurney/obsidian-note-toolbar/issues) if you think there’s a conflict with a theme, for example, that can be resolved in the plugin itself (e.g., missed a style that needs to be overridden). Pull requests are also welcome.

If you prefer to workaround any issues in the short term, styling is handled in [styles.css](https://github.com/chrisgurney/obsidian-note-toolbar/blob/master/styles.css) by `.callout[data-callout="note-toolbar"]`.

# License

Note Toolbar is licensed under Apache License Version 2.0. See the [LICENSE](https://github.com/chrisgurney/obsidian-note-toolbar/blob/master/LICENSE).

# Inspiration and Thanks 🙏

Shout out to other projects and people who helped me with questions I had while developing this plugin:

- Obsidian's [Sample Plugin](https://github.com/obsidianmd/obsidian-sample-plugin), [developer docs](https://docs.obsidian.md/) and [this playlist](https://www.youtube.com/playlist?list=PLIDCb22ZUTBnMCbJa-st4PD5T3Olep078).
- [Templater](https://github.com/SilentVoid13/Templater) - for code, especially around settings.
- [Periodic Notes](https://github.com/liamcain/obsidian-periodic-notes/) - for code, and one of the reasons this plugin works well for my own needs... and for liam.cain's help!
- [BRAT](https://github.com/TfTHacker/obsidian42-brat) - for the means to beta test this plugin.
- Everybody on the [Obsidian Discord](https://discord.gg/obsidianmd), for their time and documentation, including but not limited to: claremacrae, lemons_dev, liam.cain, dovos, and joethei.

# Contribute 🧑‍💻

Happy to [discuss your ideas](https://github.com/chrisgurney/obsidian-note-toolbar/discussions)! If they sound good, pull requests are welcome!

# Support 🛟

[Log an issue](https://github.com/chrisgurney/obsidian-note-toolbar/issues) or [ask a question](https://github.com/chrisgurney/obsidian-note-toolbar/discussions)!