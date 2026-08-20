import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'node:url';
import * as path from 'path';
import * as readline from 'readline';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// displays command to console, then executes it
function cmd(command) {
    console.log(command);
    execSync(command, { stdio: 'inherit', cwd: rootDir });
}

// helper function to prompt user (hit enter before continuing)
function prompt(question) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer);
        });
    });
}

const newVersion = process.argv[2];

if (!newVersion) {
    console.error('Error: Version number required');
    console.log('Usage: npm run release <version>');
    console.log('Example: npm run release 1.2.3');
    process.exit(1);
}

try {
    console.log('[release] Updating JSON files...');

    // update package.json
    const packageJsonPath = path.join(rootDir, 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

    if (packageJson.version === newVersion) {
        throw Error('Provided version is the same as the existing version.');
    }

    packageJson.version = newVersion;
    writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
    console.log('\x1b[32m✓ package.json updated\x1b[0m');

    // read minAppVersion from manifest.json and bump version to target version
    const manifestPath = path.join(rootDir, 'manifest.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    const { minAppVersion } = manifest;

    manifest.version = newVersion;
    writeFileSync(manifestPath, JSON.stringify(manifest, null, '\t'));
    console.log('\x1b[32m✓ manifest.json updated\x1b[0m');

    // update versions.json with target version and minAppVersion from manifest.json
    const versionsPath = path.join(rootDir, 'versions.json');
    const versions = JSON.parse(readFileSync(versionsPath, 'utf8'));
    const lastMinAppVersion = Object.values(versions).at(-1);

    if (minAppVersion !== lastMinAppVersion) {
        versions[newVersion] = minAppVersion;
        writeFileSync(versionsPath, JSON.stringify(versions, null, '\t'));
        console.log('\x1b[32m✓ versions.json updated\x1b[0m');
    }

    // git add the version files
    console.log('\n[release] Adding JSON files to git...');
    cmd('git add manifest.json package.json versions.json');
    console.log('\x1b[32m✓ Files added to git\x1b[0m');

    // ask before committing and pushing the version files
    await prompt('\n[release] Commit and push JSON files... (press ENTER):');
    cmd(`git commit -m "build: release ${newVersion} update"`);
    cmd('git push');
    console.log('\x1b[32m✓ Committed and pushed\x1b[0m');

    // ask before creating and pushing tag
    await prompt(`\n[release] Create and push tag "${newVersion}"... (press ENTER):`);
    cmd(`git tag -a "${newVersion}" -m "${newVersion}"`);
    cmd(`git push origin "${newVersion}"`);
    console.log('\x1b[32m✓ Tag created and pushed\x1b[0m');
} catch (error) {
    console.error('\x1b[31m[release] Error:\x1b[0m', error.message);
    process.exit(1);
}