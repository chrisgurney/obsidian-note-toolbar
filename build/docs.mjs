/** 
 * Builds all documentation, as a standalone script instead of esbuild plugins. 
 * Esbuild calls this script on every build, so running esbuild directly still produces docs.
 */

import { spawn } from 'node:child_process';
import fs, { existsSync } from 'node:fs';
import { copyFile, mkdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cliDocs } from './cli-docs.mjs';
import { fileInliner } from './file-inliner.mjs';
import { galleryDocs } from './gallery-docs.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const DOC_OUTPUT = 'docs/dist';
const DOC_WIKI_INPUT = 'docs/wiki';

// directory of the external repo to copy files into
const WIKI_REPO = '../obsidian-note-toolbar-wiki';

// every .md file in docs/wiki is a wiki page: inlined to docs/dist/wiki
// by buildDocs() and mirrored to the wiki repo by copyToWiki();
// files starting with _ are drafts and are skipped.
function wikiPages() {
    return fs.readdirSync(path.join(rootDir, DOC_WIKI_INPUT))
        .filter((file) => file.endsWith('.md') && !file.startsWith('_'))
        .sort();
}

// Per-page transforms, by filename. Only the API page needs one.
const PAGE_TRANSFORMS = {
    'Note-Toolbar-API.md': (content) => content.replace(/\[obsidian-note-toolbar\][\s\S]*?(?=## Notes\n\n)/, ''),
};

// files to copy into the external wiki repo after build: every wiki page
// (derived from wikiPages(), so a new page needs no entry here), plus the
// TypeDoc outputs, which have no wiki input page.
// { src: <source path>, dest: <path relative to WIKI_REPO> }
const WIKI_FILES = [
    ...wikiPages().map((file) => ({
        src: `${DOC_OUTPUT}/wiki/${file}`,
        dest: file,
    })),
    { src: `${DOC_OUTPUT}/api/IItem.Interface.IItem.md`, dest: 'IItem.Interface.IItem.md.md' },
    { src: `${DOC_OUTPUT}/api/IToolbar.Interface.IToolbar.md`, dest: 'IToolbar.Interface.IToolbar.md.md' },
    { src: `${DOC_OUTPUT}/api/INoteToolbarApi.Interface.NtbKeyBinding.md`, dest: 'INoteToolbarApi.Interface.NtbKeyBinding.md.md' },
    { src: `${DOC_OUTPUT}/api/INoteToolbarApi.Interface.NtbMenuItem.md`, dest: 'INoteToolbarApi.Interface.NtbMenuItem.md.md' },
];

const CACHE_DIR = 'node_modules/.cache';

function runCommand(command, args, label) {
    return new Promise((resolve, reject) => {
        // when run via npm, npm already adds .bin, so this is a no-op there
        const binDir = path.join(rootDir, 'node_modules/.bin');
        const env = {
            ...process.env,
            PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ''}`,
        };
        const child = spawn(command, args, { stdio: 'inherit', cwd: rootDir, env });
        child.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`${label} exited with code ${code}`));
        });
        child.on('error', (error) => reject(new Error(`${label} failed to start: ${error.message}`)));
    });
}

async function runTypedocIfStale() {
    const stampPath = path.join(rootDir, CACHE_DIR, 'typedoc.stamp');
    const apiHash = createHash('sha256');
    for (const file of ['src/Api/INoteToolbarApi.ts', 'src/Api/IToolbar.ts', 'src/Api/IItem.ts', 'typedoc.json']) {
        apiHash.update(fs.readFileSync(path.join(rootDir, file)));
    }
    const digest = apiHash.digest('hex');
    let typedocStale = true;
    try {
        typedocStale = fs.readFileSync(stampPath, 'utf-8') !== digest;
    } catch {
        // no stamp yet
    }

    if (typedocStale) {
        await runCommand('typedoc', [
            'src/Api/INoteToolbarApi.ts',
            'src/Api/IToolbar.ts',
            'src/Api/IItem.ts',
            '--readme',
            'none',
        ], 'typedoc');
    }
    return { stampPath, digest, typedocStale };
}

async function copyToWiki() {
    const wikiRepoPath = path.resolve(rootDir, WIKI_REPO);
    if (!existsSync(wikiRepoPath)) {
        console.log(`\x1b[33m[copy-to-wiki] wiki repo folder not found, skipping wiki copies to: ${WIKI_REPO}\x1b[0m`);
        return;
    }
    for (const { src, dest } of WIKI_FILES) {
        const destPath = path.join(wikiRepoPath, dest);
        try {
            const srcContent = await readFile(path.join(rootDir, src));
            const destContent = await readFile(destPath).catch(() => null);
            if (destContent && srcContent.equals(destContent)) continue;
            await mkdir(path.dirname(destPath), { recursive: true });
            await copyFile(path.join(rootDir, src), destPath);
            console.log(`\x1b[32m[copy-to-wiki] ✓ ${src} → ${destPath}\x1b[0m`);
        } catch (error) {
            console.error(`\x1b[31m[copy-to-wiki] ✗ failed to copy ${src}: ${error.message}\x1b[0m`);
        }
    }
}

async function buildDocs() {
    let changed = false;
    fs.mkdirSync(path.join(rootDir, CACHE_DIR), { recursive: true });

    // wiki pages include their outputs (the API page includes TypeDoc 
    // output, CLI includes cli.md, Gallery includes items.md), 
    // so all three must run before any page is inlined; pages
    // never include each other, so inlining order between pages is free.
    const { stampPath, digest, typedocStale } = await runTypedocIfStale();
    if (typedocStale) fs.writeFileSync(stampPath, digest);
    if (cliDocs(path.join(rootDir, 'src/Cli/cli.json'), path.join(rootDir, `${DOC_OUTPUT}/cli/cli.md`))) changed = true;
    if (galleryDocs(
        path.join(rootDir, 'src/Gallery/gallery-items.json'),
        path.join(rootDir, 'src/Gallery/gallery.json'),
        path.join(rootDir, 'src/I18n/gallery/en.json'),
        path.join(rootDir, `${DOC_OUTPUT}/gallery/items.md`),
    )) changed = true;

    for (const file of wikiPages()) {
        if (fileInliner(
            path.join(rootDir, `${DOC_WIKI_INPUT}/${file}`),
            path.join(rootDir, `${DOC_OUTPUT}/wiki/${file}`),
            PAGE_TRANSFORMS[file],
        )) changed = true;
    }

    // skill references, then wiki copies, last, only after all generation succeeded
    await runCommand(process.execPath, ['build/copy-skill-references.mjs'], 'copy-skill-references');
    await copyToWiki();

    if (!changed) {
        console.log('[docs] up to date');
    } else {
        console.log('[docs] ✓ generated');
    }
    return changed;
}

const watchMode = process.argv.includes('--watch');

if (watchMode) {
    const { default: chokidar } = await import('chokidar');
    let running = false;
    let pending = false;
    const run = async () => {
        if (running) {
            pending = true;
            return;
        }
        running = true;
        try {
            await buildDocs();
        } catch (error) {
            console.error(`\x1b[31m[docs] ✗ failed: ${error.message}\x1b[0m`);
        } finally {
            running = false;
            if (pending) {
                pending = false;
                await run();
            }
        }
    };
    await run();
    const watcher = chokidar.watch([
        'docs/wiki',
        'src/Api',
        'src/Cli/cli.json',
        'src/Gallery/gallery.json',
        'src/Gallery/gallery-items.json',
        'src/I18n/gallery/en.json',
        'build/docs.mjs',
        'build/copy-skill-references.mjs',
    ], { cwd: rootDir });
    watcher.on('ready', () => console.log('[docs] watching for changes...'));
    watcher.on('change', async (changedPath) => {
        console.log(`[docs] file modified: ${changedPath}`);
        await run();
    });
} else {
    try {
        await buildDocs();
    } catch (error) {
        console.error(`\x1b[31m[docs] ✗ failed: ${error.message}\x1b[0m`);
        process.exitCode = 1;
    }
}
