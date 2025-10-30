# Releasing

1. Update `package.json` with the new version (and stage changes).
1. Run `npm run version`, which updates `manifest.json` and `versions.json`.
    ```sh
    npm run version
    ```
1. Commit changes _and push_.
1. Run `./release.sh {NEWVERSION}`. Example:
      ```sh
    ./release.sh 1.25.22
    ```  
1. Edit and publish the release [on GitHub](https://github.com/chrisgurney/obsidian-note-toolbar/releases).