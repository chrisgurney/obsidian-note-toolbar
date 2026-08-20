import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const packageJson = JSON.parse(
    fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8')
);

const { version, releaseVersion, settingsVersion } = packageJson;

if (!version || !releaseVersion || settingsVersion === undefined) {
    throw new Error(
        "package.json must contain version, releaseVersion, and settingsVersion. See BUILD.md for more information."
    );
}

const output = `export const PLUGIN_VERSION = ${JSON.stringify(version)};
export const RELEASE_VERSION = ${JSON.stringify(releaseVersion)};
export const SETTINGS_VERSION = ${settingsVersion};
export { default as CURRENT_RELEASE } from 'Help/Releases/en/${releaseVersion}.md';
`;

fs.writeFileSync(
    path.join(rootDir, 'src/version.ts'),
    output
);