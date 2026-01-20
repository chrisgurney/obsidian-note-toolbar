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
    // update package.json
    const packageJson = JSON.parse(readFileSync('package.json', 'utf-8'));
    packageJson.version = newVersion;
    writeFileSync('package.json', JSON.stringify(packageJson, null, 2) + '\n');
    console.log('✓ package.json updated');

    // read minAppVersion from manifest.json and bump version to target version
    let manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
    const { minAppVersion } = manifest;
    manifest.version = newVersion;
    writeFileSync("manifest.json", JSON.stringify(manifest, null, "\t"));
    console.log('✓ manifest.json updated');

    // update versions.json with target version and minAppVersion from manifest.json
    let versions = JSON.parse(readFileSync("versions.json", "utf8"));
    versions[newVersion] = minAppVersion;
    writeFileSync("versions.json", JSON.stringify(versions, null, "\t"));
    console.log('✓ versions.json updated');

    // git add the version files
    console.log('\nAdding files to git...');
    execSync('git add manifest.json package.json versions.json', { stdio: 'inherit' });
    console.log('✓ Files added to git');

    // ask before committing and pushing the version files
    await prompt('\nPress Enter to commit and push with message "build: updated release version"...');
    execSync('git commit -m "build: updated release version"', { stdio: 'inherit' });
    execSync('git push', { stdio: 'inherit' });
    console.log('✓ Committed and pushed');

    // ask before creating and pushing tag
    await prompt(`\nPress Enter to create and push tag "${newVersion}"...`);
    execSync(`git tag -a "${newVersion}" -m "${newVersion}"`, { stdio: 'inherit' });
    execSync(`git push origin "${newVersion}"`, { stdio: 'inherit' });
    console.log('✓ Tag created and pushed');
} 
catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
}