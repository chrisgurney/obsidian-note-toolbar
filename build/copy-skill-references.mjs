// Copies reference documentation into each skill folder, so a skill
// is self-contained and does not need to fetch its reference from the wiki.
//
// API, CLI, and Gallery references are copied from the generated docs/dist
// outputs, so run the docs build (npm run docs, or any plugin build) before
// regenerating them standalone, or they will reflect the last docs build.

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
    {
        src: 'docs/wiki/Variables.md',
        dest: 'skills/note-toolbar-variables/references/variables-reference.md',
    },
    {
        src: 'docs/wiki/Note-Toolbar-Callouts.md',
        dest: 'skills/note-toolbar-callouts/references/callouts-reference.md',
    },
    {
        src: 'docs/dist/wiki/Note-Toolbar-API.md',
        dest: 'skills/note-toolbar-api/references/api-reference.md',
    },
    {
        src: 'docs/dist/wiki/Note-Toolbar-CLI.md',
        dest: 'skills/note-toolbar-cli/references/cli-reference.md',
    },
    {
        src: 'docs/dist/wiki/Gallery.md',
        dest: 'skills/note-toolbar-gallery/references/gallery-reference.md',
    },
    {
        src: 'src/Gallery/gallery.json',
        dest: 'skills/note-toolbar-gallery/references/gallery.json',
    },
    {
        src: 'src/Gallery/gallery-items.json',
        dest: 'skills/note-toolbar-gallery/references/gallery-items.json',
    },
];

const generatedNote = (src) =>
    `<!-- Generated from ${src} by build/copy-skill-references.mjs. Do not edit by hand. To update, run: npm run build:skills -->\n\n`;

let failures = 0;
let unchanged = 0;

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

    // JSON destinations are copied verbatim; a generated header would
    // corrupt the JSON. Markdown destinations get the header, as before.
    const generated = dest.endsWith('.json') ? source : generatedNote(src) + source;

    if (checkOnly) {
        let existing = null;
        try {
            existing = fs.readFileSync(destPath, 'utf-8');
        } catch {
            // missing file is a failure, reported below
        }
        if (existing === generated) {
            unchanged += 1;
        } else if (existing === null) {
            console.error(`[copy-skill-references] ✗ missing: ${dest} (run: npm run build:skills)`);
            failures += 1;
        } else {
            console.error(`[copy-skill-references] ✗ stale: ${dest} (run: npm run build:skills)`);
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
        unchanged += 1;
    } else {
        fs.writeFileSync(destPath, generated);
        console.log(`[copy-skill-references] ✓ wrote: ${dest}`);
    }
}

if (checkOnly && failures === 0) {
    console.log(`[copy-skill-references] ✓ ${unchanged} references up to date`);
} else if (unchanged > 0) {
    console.log(`[copy-skill-references] ${unchanged} unchanged`);
}
if (checkOnly && failures > 0) {
    const noun = failures === 1 ? 'reference' : 'references';
    console.log(`[copy-skill-references] ✗ ${failures} ${noun} to update (run: npm run build:skills)`);
}

if (failures > 0) {
    process.exitCode = 1;
}
