# Building

## Development

Run the development server to automatically watch for changes:

```sh
npm run dev
```

## Linting

```sh
npm run lint
```

## Documentation

Documentation should automatically be updated based on the source files for those docs.

|Type    |Source        |Then update...|
|--------|--------------|--------------|
|API     |`src/Api`     |[API wiki page](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Note-Toolbar-API)|
|Gallery |`src/Gallery` |[Gallery wiki page](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Gallery)|

# Releasing

## For major releases

- [ ] Create and update the latest _What's New_ documentation in `docs/releases/en`.
  - For beta branches, amke sure this done is in the `master` branch.
- [ ] Update `WHATSNEW_VERSION` in `NoteToolbarSettings.ts` in order to show the latest _What's New_ doc in the plugin.

## Release process

1. Run `npm run release VERSIONNUMBER`.
2. Edit and publish the release [on GitHub](https://github.com/chrisgurney/obsidian-note-toolbar/releases).

## Betas

Test with the [BRAT plugin ↗](https://github.com/TfTHacker/obsidian42-brat). See also the [BRAT Guide for Plugin Developers](https://github.com/TfTHacker/obsidian42-brat/blob/main/BRAT-DEVELOPER-GUIDE.md).

### Method 1: Using feature branches

1. Create a new branch.
1. Make changes.
1. Update `WHATSNEW_VERSION` in `NoteToolbarSettings.ts`.
1. Make sure the What's New doc in `docs/releases/en` is in the `master` branch. 
1. Run `npm run release 1.xx-beta-01`
1. Edit and **Set as a pre-release** [on GitHub](https://github.com/chrisgurney/obsidian-note-toolbar/releases).
1. Use the [BRAT plugin](https://github.com/TfTHacker/obsidian42-brat/) to get the latest version.

### Method 2: Using the `master` branch

1. Make changes.
1. Update `WHATSNEW_VERSION` in `NoteToolbarSettings.ts`.
1. Create `manifest-beta.json` a copy of `manifest.json`.
    1. Set the `version` as `X.Y-beta-01`.
1. Update the `package.json` with the beta version. _Do not_ run `npm run release`.
1. Commit and push.
1. Tag the release.
1. Edit and **Set as a pre-release** [on GitHub](https://github.com/chrisgurney/obsidian-note-toolbar/releases).
1. Use the [BRAT plugin](https://github.com/TfTHacker/obsidian42-brat/) to get the latest version.

# Icons

If there's a Lucide icon that doesn't quite fit the plugin's use case, here's how to create one:

1. Copy any [Lucide icon](https://lucide.dev/) you want to modify by using the site’s **Copy SVG** button.
    - Paste it into a design tool like [Figma](https://www.figma.com/) (free to use, with limited projects).
2. In the design tool:
    - **resize to 100 x 100**
    - set the **stroke size to 7**
    - make your changes
    - **save as SVG**
3. Use [ImageOptim](https://imageoptim.com/) to **optimize the SVG file**.
4. **Edit the SVG file by hand** (e.g., in TextEdit/Notepad):
    - Change stroke colors to `stroke=“currentColor”`
    - Add `fill=“none”` on `<g>` or individual `<path>` elements (your shapes may get filled in by Obsidian otherwise).
5. **Copy the *contents*** of the `<svg>` element.
    - Why? `setIcon()` seems to add its own `<svg>` element wrapper.
6. **In your plugin code**:
    - Use `addIcon()` to add the icon for use.
    - Prefix icon names with your plugin’s ID (which I believe this is necessary to avoid possible conflicts).
    - Example: `addIcon('note-toolbar-pen-book', '<g fill="none" stroke="currentColor" …’);`
7. **Use the icon** as you normally would via `setIcon()`.