# Releasing

## For major releases

- [ ] Create and update the latest _What's New_ documentation in `src/Help/Releases/en`.
  - If you're working in a beta branch, make sure this done is in the `master` branch (or cherry picked from the branch).
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
1. In the feature branch, run `npm run release 1.xx-beta-01`
1. [Edit the release on GitHub](https://github.com/chrisgurney/obsidian-note-toolbar/releases) and **Set as a pre-release**.
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