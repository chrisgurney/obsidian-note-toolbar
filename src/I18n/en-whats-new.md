Here's what's new in v1.14:

# Share toolbars with users

Share toolbars with a link that you can send to other users.

- Right-click on a toolbar in a note to see the _Share..._ option, or use the new "More" (...) menu for toolbars in Settings.
- When the recipient clicks on the link, they will be prompted for confirmation and see a preview of the toolbar.

→ Learn more about [how sharing works](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Sharing-toolbars).

<a href="https://github.com/user-attachments/assets/a1d59acb-729c-4017-83d9-99985a920cf9">
  <img src="https://github.com/user-attachments/assets/a1d59acb-729c-4017-83d9-99985a920cf9" width="700"/>
</a>

---

# Import toolbars and items from Note Toolbar Callouts

Create toolbars from [Note Toolbar Callouts](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Note-Toolbar-Callouts) in one of two ways:

1. import a callout into a new or existing toolbar in settings; or
2. select some Note Toolbar Callout markdown in a note, then right-click and _Create Note Toolbar from callout_.

<a href="https://github.com/user-attachments/assets/0b82104e-f5f4-40f9-9880-3e9425c5f908">
  <img src="https://github.com/user-attachments/assets/0b82104e-f5f4-40f9-9880-3e9425c5f908" width="700"/>
</a>

→ Learn more about [importing toolbars and items](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Creating-toolbars-from-callouts).

---

# Copy toolbars as callouts

Right-click on a toolbar to copy it as a Note Toolbar Callout, to your clipboard.

<a href="https://github.com/user-attachments/assets/f69ad45f-2b52-4c0d-a332-92c68e736c5d">
  <img src="https://github.com/user-attachments/assets/f69ad45f-2b52-4c0d-a332-92c68e736c5d" width="700"/>
</a>

→ Learn more about [copying toolbars as callouts](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Creating-callouts-from-toolbars), including what's supported and what's not.

---

# Other improvements

- In Settings, in the toolbar list, look for a new "More" (...) menu (where "Duplicate" used to be) containing _Duplicate_, _Share_, _Copy as callout_, and _Delete_ options.
- Most plugin startup tasks are now done after the layout's ready, and after initial toolbar rendering, which may help with startup performance. `#ObsidianOctober`
- An error message is now shown if a [Note Toolbar URI](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Note-Toolbar-URIs) contains invalid parameters.
- Quick Toolbars: Items are kept in order they're displayed in the toolbar, when browsing by toolbar. Thanks to @Glint-Eye for the suggestion.
- Updated the _Help_ window with a link to a bug report Google form, removing the pre-requisite for a GitHub account.
- Updated the _What's New_ window with a permanent link to the Roadmap, at the bottom.

---

# Fixes

- Duplicated toolbar items without changes now update the settings UI, save the change, and re-render the toolbar.
- Toolbar icons/text weren't being vertically centered by a few pixels, due to a line-height being added.

---

# And in case you missed it...

- [v1.13 release](https://github.com/chrisgurney/obsidian-note-toolbar/releases/tag/1.13): _What's New_ + _Help_ windows, and access to toolbars for linked notes from the file menu.
- [v1.12 release](https://github.com/chrisgurney/obsidian-note-toolbar/releases/tag/1.12.1): Translations, and Quick Tools (fast access to all of your tools).