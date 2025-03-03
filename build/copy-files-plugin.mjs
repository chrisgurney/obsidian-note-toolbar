import { copyFileSync, existsSync, readFileSync } from 'fs';

const pluginDir = '/.obsidian/plugins/note-toolbar';
const vaults = [
  'D:/Obsidian/NewScript',
  'D:/Obsidian/Dataview',
  'D:/Obsidian/dev-vault',
  'C:/Users/Laktionov.I/OneDrive/Apps/Obsidian/CV',
  'C:/Users/Laktionov.I/OneDrive/Apps/Obsidian/Wine'
];
const files = [
  'main.js',
  'styles.css'
];

function getVersion(manifestPath) {
  if (existsSync(manifestPath)) {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
    return manifest.version;
  }
  return null;
}

function compareVersions(version1, version2) {
  const v1 = version1.replace('b', '.');
  const v2 = version2.replace('b', '.');
  return v1.localeCompare(v2, undefined, { numeric: true });
}

const manifestPath = './manifest.json';
const manifestBetaPath = './manifest-beta.json';

const version1 = getVersion(manifestPath);
const version2 = getVersion(manifestBetaPath);

let latestManifest = manifestPath;
if (version1 && version2 && compareVersions(version2, version1) > 0) {
  latestManifest = manifestBetaPath;
  console.log(latestManifest);
}

vaults.forEach(vault => {
  const dist = vault + pluginDir;
  files.forEach(file => {
    copyFileSync(`./${file}`, `${dist}/${file}`);
  });
  copyFileSync(latestManifest, `${dist}/manifest.json`);
});