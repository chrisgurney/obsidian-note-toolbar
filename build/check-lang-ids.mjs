/**
 * Checks Gallery and CLI ids against their language keys: every item,
 * category, command, and flag in the data has its keys in gallery/en.json
 * or cli/en.json, and every gallery.* / cli.* key maps back to a real id.
 *
 * This is the data-integrity half of the language check. The other half,
 * build/check-lang-keys.mjs, checks key usage and translation sync;
 * it marks every key under a dynamic prefix (gallery.item.${id},
 * cli.command.${id}) as used, so orphans under those prefixes are only
 * caught here. Run both through `npm run check-lang`.
 *
 * Reports are counts only by default. --verbose lists the missing and
 * orphan keys. --strict exits 1 on any finding: id mismatches are
 * issues in the English-language (base) translations, not translation
 * sync. Unknown options exit 2. Skipped (exit 0) on a tree with no
 * gallery/en.json or cli/en.json.
 *
 * Usage: node build/check-lang-ids.mjs [--verbose] [--strict]
 *   npm run check-lang / npm run check-lang -- --verbose
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const i18nDir = path.join(rootDir, 'src', 'I18n');
const srcDir = path.join(rootDir, 'src');
const baseName = 'en';

const args = process.argv.slice(2);
const verbose = args.includes('--verbose');
const strict = args.includes('--strict');
const help = args.includes('--help') || args.includes('-h');
const unknown = args.filter((arg) => !['--verbose', '--strict', '--help', '-h'].includes(arg));

if (help || unknown.length > 0) {
    if (unknown.length > 0) console.error(`[lang] Unknown option: ${unknown.join(' ')}`);
    console.log('Usage: node build/check-lang-ids.mjs [--verbose] [--strict]');
    console.log('  --verbose  Also list the individual missing and orphan Gallery/CLI id keys.');
    console.log('  --strict   Exit 1 if any Gallery/CLI id mismatch is found.');
    process.exit(unknown.length > 0 ? 2 : 0);
}

function flatten(obj, prefix, out) {
    for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
            flatten(value, fullKey, out);
        } else {
            out.add(fullKey);
        }
    }
    return out;
}

function readKeys(filePath) {
    return flatten(JSON.parse(fs.readFileSync(filePath, 'utf8')), '', new Set());
}

// Gallery data: the item and category ids the id check verifies.
const galleryItemsPath = path.join(srcDir, 'Gallery', 'gallery-items.json');
const galleryPath = path.join(srcDir, 'Gallery', 'gallery.json');
let galleryItems = null;
let galleryData = null;
for (const galleryFile of [galleryItemsPath, galleryPath]) {
    if (!fs.existsSync(galleryFile)) continue;
    const parsed = JSON.parse(fs.readFileSync(galleryFile, 'utf8'));
    if (galleryFile === galleryItemsPath) galleryItems = parsed;
    if (galleryFile === galleryPath) galleryData = parsed;
}

function checkGalleryIds() {
    const galleryEnPath = path.join(i18nDir, 'gallery', `${baseName}.json`);
    if (!fs.existsSync(galleryEnPath)) return null;
    if (!Array.isArray(galleryItems)) return null;
    if (galleryData === null || typeof galleryData !== 'object' || !Array.isArray(galleryData.categories)) return null;
    const galleryEnKeys = readKeys(galleryEnPath);
    const categoryIds = [...new Set(galleryData.categories.map((category) => category?.id).filter((id) => typeof id === 'string'))].sort();
    const itemIds = [...new Set(galleryItems.map((item) => item?.id).filter((id) => typeof id === 'string'))].sort();
    const missing = [];
    for (const id of categoryIds) {
        for (const field of ['name', 'description']) {
            const key = `gallery.category.${id}.${field}`;
            if (!galleryEnKeys.has(key)) missing.push(key);
        }
    }
    for (const id of itemIds) {
        for (const field of ['description', 'tooltip']) {
            const key = `gallery.item.${id}.${field}`;
            if (!galleryEnKeys.has(key)) missing.push(key);
        }
    }
    // Gallery-level keys that belong to no item or category.
    const GALLERY_LEVEL_KEYS = new Set(['gallery.bannerTitle', 'gallery.overview', 'gallery.pluginNote']);
    const categoryIdSet = new Set(categoryIds);
    const itemIdSet = new Set(itemIds);
    const orphans = [];
    for (const key of [...galleryEnKeys].sort()) {
        if (GALLERY_LEVEL_KEYS.has(key)) continue;
        let match = key.match(/^gallery\.category\.([^.]+)\.(name|description)$/);
        if (match) {
            if (!categoryIdSet.has(match[1])) orphans.push(key);
            continue;
        }
        match = key.match(/^gallery\.item\.([^.]+)\.(description|tooltip)$/);
        if (match) {
            if (!itemIdSet.has(match[1])) orphans.push(key);
            continue;
        }
        orphans.push(key);
    }
    return { missing: missing.sort(), orphans, items: itemIds.length, categories: categoryIds.length };
}


function checkCliIds() {
    const cliEnPath = path.join(i18nDir, 'cli', `${baseName}.json`);
    const cliPath = path.join(srcDir, 'Cli', 'cli.json');
    if (!fs.existsSync(cliEnPath) || !fs.existsSync(cliPath)) return null;
    const cliEnKeys = readKeys(cliEnPath);
    let cliData = null;
    try {
        cliData = JSON.parse(fs.readFileSync(cliPath, 'utf8'));
    } catch {
        return null;
    }
    if (cliData === null || typeof cliData !== 'object') return null;
    // command ids use ':' replaced by '-', as in CliDefinition (i18next would read ':' as its namespace separator)
    const sanitize = (id) => id.replace(/:/g, '-');
    const commands = cliData.commands ?? {};
    const commonFlags = cliData.commonFlags ?? {};
    const categories = cliData.categories ?? {};
    const commandIds = Object.keys(commands).sort();
    const commonFlagNames = Object.keys(commonFlags).sort();
    const categoryIds = Object.keys(categories).sort();
    const missing = [];
    let commandFlagCount = 0;
    for (const id of commandIds) {
        const key = `cli.command.${sanitize(id)}.description`;
        if (!cliEnKeys.has(key)) missing.push(key);
        const flags = commands[id]?.flags ?? {};
        for (const flag of Object.keys(flags).sort()) {
            // $before and $after are flag lists, not flag definitions.
            if (flag.startsWith('$')) continue;
            commandFlagCount += 1;
            const flagKey = `cli.command.${sanitize(id)}.flag.${flag}.description`;
            if (!cliEnKeys.has(flagKey)) missing.push(flagKey);
        }
    }
    for (const flag of commonFlagNames) {
        const key = `cli.flag.${flag}.description`;
        if (!cliEnKeys.has(key)) missing.push(key);
    }
    for (const category of categoryIds) {
        const key = `cli.category.${category}.heading`;
        if (!cliEnKeys.has(key)) missing.push(key);
    }
    const commandIdSet = new Set(commandIds.map(sanitize));
    const commonFlagSet = new Set(commonFlagNames);
    const categoryIdSet = new Set(categoryIds);
    const orphans = [];
    for (const key of [...cliEnKeys].sort()) {
        let match = key.match(/^cli\.command\.([^.]+)\.description$/);
        if (match) {
            if (!commandIdSet.has(match[1])) orphans.push(key);
            continue;
        }
        match = key.match(/^cli\.command\.([^.]+)\.flag\.([^.]+)\.description$/);
        if (match) {
            const commandId = commandIds.find((id) => sanitize(id) === match[1]);
            if (!commandId || !(match[2] in (commands[commandId]?.flags ?? {}))) orphans.push(key);
            continue;
        }
        match = key.match(/^cli\.flag\.([^.]+)\.description$/);
        if (match) {
            if (!commonFlagSet.has(match[1])) orphans.push(key);
            continue;
        }
        match = key.match(/^cli\.category\.([^.]+)\.heading$/);
        if (match) {
            if (!categoryIdSet.has(match[1])) orphans.push(key);
            continue;
        }
        orphans.push(key);
    }
    return {
        missing: missing.sort(),
        orphans,
        commands: commandIds.length,
        commandFlags: commandFlagCount,
        commonFlags: commonFlagNames.length,
        categories: categoryIds.length,
    };
}


function reportIdCheck(label, check, summary) {
    if (check === null) return;
    const issueCount = check.missing.length + check.orphans.length;
    const line = `[lang] ${label}: ${summary}, ${check.missing.length} missing keys, ${check.orphans.length} orphan keys`;
    if (issueCount > 0) {
        console.log(`\x1b[33m${line}\x1b[0m`);
    } else {
        console.log(`\x1b[32m${line}\x1b[0m`);
    }
    if (verbose && issueCount > 0) {
        if (check.missing.length > 0) {
            console.log(`  Missing ${label} keys (${check.missing.length}):`);
            for (const key of check.missing) console.log(`    - ${key}`);
        }
        if (check.orphans.length > 0) {
            console.log(`  Orphan ${label} keys (${check.orphans.length}):`);
            for (const key of check.orphans) console.log(`    - ${key}`);
        }
    }
}


const galleryIdCheck = checkGalleryIds();
const cliIdCheck = checkCliIds();

if (galleryIdCheck === null && cliIdCheck === null) {
    console.log('[lang] Gallery/CLI id checks skipped: no gallery/en.json or cli/en.json found.');
    process.exit(0);
}

if (galleryIdCheck !== null) {
    reportIdCheck('Gallery ids', galleryIdCheck, `${galleryIdCheck.items} items, ${galleryIdCheck.categories} categories`);
}
if (cliIdCheck !== null) {
    reportIdCheck('CLI ids', cliIdCheck, `${cliIdCheck.commands} commands, ${cliIdCheck.commandFlags} command flags, ${cliIdCheck.commonFlags} common flags, ${cliIdCheck.categories} categories`);
}

const galleryIdIssues = galleryIdCheck === null ? 0 : galleryIdCheck.missing.length + galleryIdCheck.orphans.length;
const cliIdIssues = cliIdCheck === null ? 0 : cliIdCheck.missing.length + cliIdCheck.orphans.length;

console.log(`[lang] Summary: ${galleryIdIssues} gallery id issue${galleryIdIssues === 1 ? '' : 's'}, ${cliIdIssues} cli id issue${cliIdIssues === 1 ? '' : 's'}`);

const hasFindings = galleryIdIssues > 0 || cliIdIssues > 0;
if (hasFindings && strict) {
    console.log('\x1b[31m[lang] Check failed in strict mode.\x1b[0m');
    process.exit(1);
}
if (hasFindings && !strict) {
    console.log('[lang] Notice only: exit code 0. Use --strict to fail on any finding.');
}
process.exit(0);
