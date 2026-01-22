import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from "fs";
import * as readline from 'readline';

// helper function to prompt user
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
    console.log('Usage: npm run version <version>');
    console.log('Example: npm run version 1.2.3');
    process.exit(1);
}

try {
    console.log('[release] Updating JSON files...');
    // update package.json
    const packageJson = JSON.parse(readFileSync('package.json', 'utf-8'));
    if (packageJson.version === newVersion) {
        throw Error('Provided version is the same as the existing version.');
    }
    packageJson.version = newVersion;
    writeFileSync('package.json', JSON.stringify(packageJson, null, 2) + '\n');
    console.log('\x1b[32m✓ package.json updated\x1b[0m');

    // read minAppVersion from manifest.json and bump version to target version
    let manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
    const { minAppVersion } = manifest;
    manifest.version = newVersion;
    writeFileSync("manifest.json", JSON.stringify(manifest, null, "\t"));
    console.log('\x1b[32m✓ manifest.json updated\x1b[0m');

    // update versions.json with target version and minAppVersion from manifest.json
    let versions = JSON.parse(readFileSync("versions.json", "utf8"));
    versions[newVersion] = minAppVersion;
    writeFileSync("versions.json", JSON.stringify(versions, null, "\t"));
    console.log('\x1b[32m✓ versions.json updated\x1b[0m');

    // git add the version files
    console.log('\n[release] Adding JSON files to git...');
    execSync('git add manifest.json package.json versions.json', { stdio: 'inherit' });
    console.log('\x1b[32m✓ Files added to git\x1b[0m');

    // ask before committing and pushing the version files
    await prompt('\n[release] Commit and push JSON files... (press ENTER):');
    const cmdCommitVersions = `git commit -m "build: release ${newVersion} update"`;
    const cmdPushVersions = 'git push'
    console.log(cmdCommitVersions);
    execSync(cmdCommitVersions, { stdio: 'inherit' });
    console.log(cmdPushVersions);
    execSync(cmdPushVersions, { stdio: 'inherit' });
    console.log('\x1b[32m✓ Committed and pushed\x1b[0m');

    // ask before creating and pushing tag
    await prompt(`\n[release] Create and push tag "${newVersion}"... (press ENTER):`);
    const cmdTag = `git tag -a "${newVersion}" -m "${newVersion}"`;
    const cmdPushOrigin = `git push origin "${newVersion}"`;
    console.log(cmdTag);
    execSync(cmdTag, { stdio: 'inherit' });
    console.log(cmdPushOrigin);
    execSync(cmdPushOrigin, { stdio: 'inherit' });
    console.log('\x1b[32m✓ Tag created and pushed\x1b[0m');
} 
catch (error) {
    console.error('\x1b[31m[release] Error:\x1b[0m', error.message);
    process.exit(1);
}