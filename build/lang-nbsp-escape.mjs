/**
 * Re-escapes literal non-breaking spaces (NBSP, U+00A0) back to the
 * `\u00A0` escape in the i18n JSON files. Run after `crowdin pull`:
 * Crowdin writes NBSP as literal characters, and this repo keeps the
 * escape form so the spaces stay visible in diffs and review.
 *
 * Only the NBSP representation changes: the file is parsed before and
 * after, and it is written only if the parsed values are identical.
 * Files with no literal NBSP are left untouched.
 *
 * Usage: node build/re-escape-nbsp.mjs [--check]
 *   npm run i18n:re-escape
 * --check reports the files that would change and exits 1 if any would,
 * without writing anything.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const i18nDir = path.resolve(__dirname, '..', 'src', 'I18n');
const NBSP = '\u00A0';
const ESCAPE = '\\u00A0';
const checkOnly = process.argv.includes('--check');

function jsonFiles(dir) {
    const found = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) found.push(...jsonFiles(full));
        else if (entry.isFile() && entry.name.endsWith('.json')) found.push(full);
    }
    return found;
}

let changedFiles = 0;
let reescaped = 0;
for (const filePath of jsonFiles(i18nDir)) {
    const rel = path.relative(i18nDir, filePath);
    const before = fs.readFileSync(filePath, 'utf8');
    const count = before.split(NBSP).length - 1;
    if (count === 0) continue;
    let parsedBefore;
    try {
        parsedBefore = JSON.parse(before);
    } catch {
        console.error(`${rel}: invalid JSON, refusing to touch it`);
        process.exit(1);
    }
    const after = before.split(NBSP).join(ESCAPE);
    if (JSON.stringify(parsedBefore) !== JSON.stringify(JSON.parse(after))) {
        console.error(`${rel}: parsed values changed, refusing to write`);
        process.exit(1);
    }
    if (checkOnly) {
        console.log(`${rel}: would re-escape ${count} NBSP`);
    } else {
        fs.writeFileSync(filePath, after);
        console.log(`${rel}: re-escaped ${count} NBSP`);
    }
    changedFiles++;
    reescaped += count;
}

if (changedFiles === 0) {
    console.log('NBSP re-escape: all i18n files already use the escape form');
} else if (checkOnly) {
    console.log(`NBSP re-escape: ${changedFiles} files would change (${reescaped} NBSP)`);
    process.exit(1);
} else {
    console.log(`NBSP re-escape: ${changedFiles} files changed (${reescaped} NBSP re-escaped)`);
}
