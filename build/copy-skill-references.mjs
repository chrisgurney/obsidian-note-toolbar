// Copies canonical reference documentation into each skill folder, so a skill
// is self-contained and does not need to fetch its reference from the wiki:
//
//   skills/note-toolbar-features/references/features-reference.md
//     <- docs/wiki/Note-Toolbar-Features.md
//
// To add a skill, add one entry to REFERENCES below. No other code change is
// needed. The script is deliberately separate from esbuild: references are
// committed files, not main.js build output, so they are refreshed on demand
// and checked in CI, not rewritten on every plugin build.
//
// Usage:
//   node build/copy-skill-references.mjs           rewrite any stale references
//   node build/copy-skill-references.mjs --check   write nothing; exit 1 if any
//                                                      committed reference is
//                                                      missing or stale

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const checkOnly = process.argv.includes('--check');

// One entry per reference file. src is the canonical source in the repo.
// dest is the file shipped inside the skill folder.
const REFERENCES = [
    {
        src: 'docs/wiki/Note-Toolbar-Features.md',
        dest: 'skills/note-toolbar-features/references/features-reference.md',
    },
];

const generatedNote = (src) =>
    `<!-- Generated from ${src} by build/copy-skill-references.mjs. Do not edit by hand. To update, run: npm run generate:skill-references -->\n\n`;

let failures = 0;

for (const { src, dest } of REFERENCES) {
    const srcPath = path.join(rootDir, src);
    const destPath = path.join(rootDir, dest);

    let source;
    try {
        source = fs.readFileSync(srcPath, 'utf-8');
    } catch {
        console.error(`[copy-skill-references] ✗ source not found: ${src}`);
        failures += 1;
        continue;
    }

    const generated = generatedNote(src) + source;

    if (checkOnly) {
        let existing = null;
        try {
            existing = fs.readFileSync(destPath, 'utf-8');
        } catch {
            // missing file is a failure, reported below
        }
        if (existing === generated) {
            console.log(`[copy-skill-references] ✓ up to date: ${dest}`);
        } else if (existing === null) {
            console.error(`[copy-skill-references] ✗ missing: ${dest} (run: npm run generate:skill-references)`);
            failures += 1;
        } else {
            console.error(`[copy-skill-references] ✗ stale: ${dest} (run: npm run generate:skill-references)`);
            failures += 1;
        }
        continue;
    }

    fs.mkdirSync(path.dirname(destPath), { recursive: true });

    let existing = null;
    try {
        existing = fs.readFileSync(destPath, 'utf-8');
    } catch {
        // no existing file, write it below
    }

    if (existing === generated) {
        console.log(`[copy-skill-references] unchanged: ${dest}`);
    } else {
        fs.writeFileSync(destPath, generated);
        console.log(`[copy-skill-references] ✓ wrote: ${dest}`);
    }
}

if (failures > 0) {
    process.exitCode = 1;
}
