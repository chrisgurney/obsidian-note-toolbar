/**
 * Guards the non-breaking spaces (NBSP, U+00A0) that hold UI words together
 * ("Note Toolbar", "Learn more", the `[property: name]` callout example).
 * Crowdin exports NBSP as literal characters, and a translator can delete
 * one by accident; either way the UI starts wrapping where it should not.
 *
 * The expected NBSP counts live in build/nbsp-expected.json, one entry per
 * string that must contain NBSP, per language. This check counts the NBSP
 * characters in each listed string's parsed value and fails on any loss.
 * It checks only the listed strings: an NBSP added elsewhere is harmless
 * and is not reported. Representation does not matter here: a literal NBSP
 * and a `\u00A0` escape parse to the same character, so run
 * build/re-escape-nbsp.mjs first if the escape form matters to you.
 *
 * When a string legitimately gains or loses an NBSP, update
 * build/nbsp-expected.json in the same commit.
 *
 * Usage: node build/check-nbsp.mjs [--verbose]
 *   npm run check:nbsp
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const i18nDir = path.join(rootDir, 'src', 'I18n');
const manifestPath = path.join(__dirname, 'nbsp-expected.json');
const NBSP = '\u00A0';
const verbose = process.argv.includes('--verbose');

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

function resolveKey(obj, dottedKey) {
    let current = obj;
    for (const part of dottedKey.split('.')) {
        if (current === null || typeof current !== 'object' || !(part in current)) return undefined;
        current = current[part];
    }
    return current;
}

let expectedTotal = 0;
let checkedStrings = 0;
const failures = [];

for (const [file, keys] of Object.entries(manifest)) {
    const filePath = path.join(i18nDir, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    for (const [key, expected] of Object.entries(keys)) {
        expectedTotal += expected;
        checkedStrings++;
        const value = resolveKey(data, key);
        if (value === undefined) {
            failures.push(`${file} ${key}: key not found (update the manifest)`);
            continue;
        }
        if (typeof value !== 'string') {
            failures.push(`${file} ${key}: not a string (update the manifest)`);
            continue;
        }
        const found = value.split(NBSP).length - 1;
        if (verbose) console.log(`${file} ${key}: ${found}/${expected}`);
        if (found !== expected) {
            failures.push(`${file} ${key}: expected ${expected} NBSP, found ${found}`);
        }
    }
}

if (failures.length > 0) {
    for (const failure of failures) console.error(`NBSP lost: ${failure}`);
    console.error(`NBSP guard: ${failures.length} of ${checkedStrings} strings failed (${expectedTotal} NBSP expected)`);
    process.exit(1);
}
console.log(`NBSP guard: all ${expectedTotal} NBSP present in ${checkedStrings} strings`);
