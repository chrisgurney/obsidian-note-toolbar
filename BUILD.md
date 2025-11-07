# Building

## Development

Run the development server to automatically watch for changes:

```sh
npm run dev
```

## Linting

Periodically run ESLint to check for issues:

```sh
npm run lint
```

## Documentation

### API

API documentation can be generated, if the API itself is updated, using:

```sh
npm run apidocs
```

Once complete, update the [API wiki page](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Note-Toolbar-API).

### Gallery

Gallery documentation should automatically be generated when any changes are made to the Gallery JSON files.

Once generated, update the [Gallery wiki page](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Gallery).

# Releasing

## For major releases

- [ ] Create and update the latest _What's New_ documentation in `docs/releases/en`.
- [ ] Update `WHATSNEW_VERSION` in `NoteToolbarSettings.ts` in order to show the latest _What's New_ doc in the plugin.

## Release process

1. Update `package.json` with the new version (and stage changes).
1. Run `npm run version`, which updates `manifest.json` and `versions.json`.
    ```sh
    npm run version
    ```
1. Commit changes _and push_.
1. Tag the release by running `./release.sh {NEWVERSION}`. Example:
    ```sh
    ./release.sh 1.25.22
    ```  
1. Edit and publish the release [on GitHub](https://github.com/chrisgurney/obsidian-note-toolbar/releases).

## Betas

See for more details: https://github.com/TfTHacker/obsidian42-brat/blob/main/BRAT-DEVELOPER-GUIDE.md

### Method 1: Using the `main` branch

1. Create `manifest-beta.json` a copy of `manifest.json`.
    1. Set the `version` as `X.Y-beta-01`.
1. Update the `package.json` with the beta version. _Do not_ run `npm run version`.
1. Commit and push.
1. Tag the release by running `./release.sh {NEWVERSION}`. Example:
    ```sh
    ./release.sh X.Y-beta-01
    ```
1. Edit and **Set as a pre-release** [on GitHub](https://github.com/chrisgurney/obsidian-note-toolbar/releases).
1. Use the [BRAT plugin](https://github.com/TfTHacker/obsidian42-brat/) to get the latest version.