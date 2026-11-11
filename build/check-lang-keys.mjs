/**
 * Checks for unused language keys, per-language sync, and 
 * language keys used in code but missing from the base.
 *
 * Contract: a key counts as used only when it appears as a string literal
 * in the first argument of a `t()` or `ntb.t()` call. Do not pass keys through
 * dynamic templates, i18next `context:` options, or data fields that store a
 * key for later translation: the checker cannot see the key and will report it unused.
 *
 * The base is the combined leaf keys of src/I18n/en.json,
 * src/I18n/gallery/en.json, and src/I18n/cli/en.json, matching the
 * runtime merge and TranslationKey. Each other language is read from
 * its three files the same way. Scanned code: TypeScript in src/,
 * JavaScript in docs/examples/, and the "script" strings in
 * src/Gallery/gallery-items.json. Gallery and CLI id integrity is
 * checked by build/check-lang-ids.mjs, not here.
 *
 * The documented rules:
 *   1. Plural: a t('base', { count: ... }) call also uses the plural
 *      suffixes of that base that exist in en.
 *   2. Dynamic templates: a t() template whose static head starts
 *      with plugin., gallery., or cli. can resolve to any key under
 *      that prefix, so those keys count as used.
 *   3. API allowlist: keys that are part of the public API surface
 *      and documented for user scripts, even though internal code
 *      never calls them. Currently one key, with its reason below.
 *   4. The current release note: setting.whats-new.<releaseVersion
 *      with the first dot replaced by a dash>, from package.json.
 *   5. CLI category headings are read by build/cli-docs.mjs straight
 *      from cli/en.json, not through t().
 * Dynamic t() calls that match no rule are reported, so a new dynamic
 * pattern is visible instead of silently hiding keys. They are a
 * warning, not a gate.
 *
 * Reports are counts only by default; --verbose lists the individual
 * keys, --strict exits 1 only on base findings (unused keys and code
 * keys missing from the base). Missing translations and extra keys
 * never fail: they lag by design.
 */


import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const i18nDir = path.join(rootDir, 'src', 'I18n');
const srcDir = path.join(rootDir, 'src');
const examplesDir = path.join(rootDir, 'docs', 'examples');
const baseName = 'en';

const PLURAL_SUFFIXES = ['zero', 'one', 'two', 'few', 'many', 'other', 'plural'];

// Public API surface, counted as used even though internal code never
// calls them. Each entry needs a reason, so this list does not grow
// silently into a general exemption.
const API_ALLOWLIST = [
    // Documented as the example argument for the public ntb.t() function
    // in src/Api/INoteToolbarApi.ts. A user script following that
    // example would get the key string back if it were deleted.
    'api.msg.clipboard-copied',
];

// A dynamic template can resolve to any key under its static head, so
// those keys count as used; orphans are caught by check-lang-ids.mjs.
const DYNAMIC_PREFIX_ROOTS = ['plugin.', 'gallery.', 'cli.'];

// TranslationKey allows any suffix after these prefixes, so keys under
// them are never "missing"; check-lang-ids.mjs verifies gallery.* and
// cli.* keys belong to real ids.
const ESCAPE_HATCH_PREFIXES = ['plugin.', 'setting.whats-new.', 'gallery.', 'cli.'];

const args = process.argv.slice(2);
const verbose = args.includes('--verbose');
const strict = args.includes('--strict');
const help = args.includes('--help') || args.includes('-h');
const unknown = args.filter((arg) => !['--verbose', '--strict', '--help', '-h'].includes(arg));

if (help || unknown.length > 0) {
    if (unknown.length > 0) console.error(`[lang] Unknown option: ${unknown.join(' ')}`);
    console.log('Usage: node build/check-lang-keys.mjs [--verbose] [--strict]');
    console.log('  --verbose  Also list the individual unused, missing, and extra keys, the escape-hatch keys, and the dynamic t() calls.');
    console.log('  --strict   Exit 1 only on base findings: unused keys and code keys missing from the base. Missing translations and extra keys never fail.');
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

function collectFiles(dir, extension, out = []) {
    if (!fs.existsSync(dir)) return out;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) collectFiles(fullPath, extension, out);
        else if (entry.isFile() && entry.name.endsWith(extension)) out.push(fullPath);
    }
    return out;
}

// Combined leaf keys of the three en files, matching the runtime merge
// and TranslationKey; a missing file contributes nothing.
const baseFileLabels = [];
const baseKeys = new Set();
for (const [label, file] of [
    [`${baseName}.json`, path.join(i18nDir, `${baseName}.json`)],
    [`gallery/${baseName}.json`, path.join(i18nDir, 'gallery', `${baseName}.json`)],
    [`cli/${baseName}.json`, path.join(i18nDir, 'cli', `${baseName}.json`)],
]) {
    if (fs.existsSync(file)) {
        baseFileLabels.push(label);
        for (const key of readKeys(file)) baseKeys.add(key);
    }
}
const mainBasePath = path.join(i18nDir, `${baseName}.json`);
if (!fs.existsSync(mainBasePath)) {
    console.error(`[lang] Base language file not found: ${mainBasePath}`);
    process.exit(1);
}

let packageJson = {};
try {
    packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
} catch {
    // No releaseVersion available; the whats-new rule below is skipped.
}

// First-argument literals of t() / ntb.t() calls, with their sources.
const codeKeys = new Set();
const codeKeySources = new Map();
const countBases = new Set();
const dynamicPrefixes = new Set();
const dynamicCalls = new Map();

function recordDynamic(sourceFile, label, node, pattern) {
    const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
    const key = `${label}:${line + 1}:${pattern}`;
    if (!dynamicCalls.has(key)) {
        dynamicCalls.set(key, { label, line: line + 1, pattern });
    }
}

// Literals in a t() first argument. Anything else is recorded as a
// dynamic call, so it is visible rather than silently ignored.
function extractLiterals(arg, sourceFile, label, node) {
    if (ts.isStringLiteral(arg) || ts.isNoSubstitutionTemplateLiteral(arg)) {
        return [arg.text];
    }
    if (ts.isParenthesizedExpression(arg) || ts.isAsExpression(arg) || ts.isTypeAssertionExpression(arg)) {
        return extractLiterals(arg.expression, sourceFile, label, node);
    }
    if (ts.isConditionalExpression(arg)) {
        return [
            ...extractLiterals(arg.whenTrue, sourceFile, label, node),
            ...extractLiterals(arg.whenFalse, sourceFile, label, node),
        ];
    }
    if (ts.isTemplateExpression(arg)) {
        const prefix = arg.head.text;
        if (DYNAMIC_PREFIX_ROOTS.some((root) => prefix.startsWith(root))) dynamicPrefixes.add(prefix);
        recordDynamic(sourceFile, label, node, `template \`${prefix}\${...}\``);
        return [];
    }
    if (ts.isIdentifier(arg)) {
        recordDynamic(sourceFile, label, node, `variable ${arg.text}`);
        return [];
    }
    recordDynamic(sourceFile, label, node, `non-literal ${ts.SyntaxKind[arg.kind] ?? arg.kind}`);
    return [];
}

function visit(node, sourceFile, label) {
    if (ts.isCallExpression(node)) {
        const callee = node.expression;
        const isT = (ts.isIdentifier(callee) && callee.text === 't')
            || (ts.isPropertyAccessExpression(callee) && callee.name.text === 't');
        if (isT && node.arguments.length > 0) {
            const literals = extractLiterals(node.arguments[0], sourceFile, label, node);
            for (const key of literals) {
                codeKeys.add(key);
                if (!codeKeySources.has(key)) codeKeySources.set(key, new Set());
                codeKeySources.get(key).add(label);
            }
            // Plural rule: a call with a count option also uses the
            // plural suffixes of each literal base it calls.
            if (node.arguments.length > 1 && ts.isObjectLiteralExpression(node.arguments[1])) {
                const hasCount = node.arguments[1].properties.some((prop) => {
                    if (!ts.isPropertyAssignment(prop)) return false;
                    const name = prop.name;
                    return (ts.isIdentifier(name) && name.text === 'count')
                        || (ts.isStringLiteral(name) && name.text === 'count');
                });
                if (hasCount) {
                    for (const key of literals) countBases.add(key);
                }
            }
        }
    }
    ts.forEachChild(node, (child) => visit(child, sourceFile, label));
}

function scanSourceText(text, fileName, label, scriptKind) {
    const sourceFile = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true, scriptKind);
    visit(sourceFile, sourceFile, label);
}

for (const file of collectFiles(srcDir, '.ts')) {
    scanSourceText(fs.readFileSync(file, 'utf8'), file, path.relative(rootDir, file), ts.ScriptKind.TS);
}

for (const file of collectFiles(examplesDir, '.js')) {
    scanSourceText(fs.readFileSync(file, 'utf8'), file, path.relative(rootDir, file), ts.ScriptKind.JS);
}

// Gallery item scripts are scanned as code; the JSONs carry ids only.
const galleryItemsPath = path.join(srcDir, 'Gallery', 'gallery-items.json');
let galleryItems = null;
if (fs.existsSync(galleryItemsPath)) {
    galleryItems = JSON.parse(fs.readFileSync(galleryItemsPath, 'utf8'));
}
if (Array.isArray(galleryItems)) {
    galleryItems.forEach((item, index) => {
        if (item !== null && typeof item === 'object' && typeof item.script === 'string') {
            scanSourceText(item.script, 'gallery-item-script.js', 'gallery-script', ts.ScriptKind.JS);
        }
    });
}

// Apply the documented rules to the literal keys found.
const usedKeys = new Set();
for (const key of codeKeys) {
    if (baseKeys.has(key)) usedKeys.add(key);
}
for (const base of countBases) {
    for (const suffix of PLURAL_SUFFIXES) {
        if (baseKeys.has(`${base}_${suffix}`)) usedKeys.add(`${base}_${suffix}`);
    }
}
// Rule 2: a dynamic template can resolve to any key under its prefix.
for (const prefix of dynamicPrefixes) {
    for (const key of baseKeys) {
        if (key.startsWith(prefix)) usedKeys.add(key);
    }
}
// Rule 4: only the current release note is exempt.
if (typeof packageJson.releaseVersion === 'string') {
    const whatsNewKey = `setting.whats-new.${packageJson.releaseVersion.replace('.', '-')}`;
    if (baseKeys.has(whatsNewKey)) usedKeys.add(whatsNewKey);
}
// Rule 5: CLI category headings are read by build/cli-docs.mjs straight
// from cli/en.json, not through t(); a heading for a removed category
// is still caught as an orphan by check-lang-ids.mjs.
for (const key of baseKeys) {
    if (/^cli\.category\.[^.]+\.heading$/.test(key)) usedKeys.add(key);
}
// Rule 3: public API surface, counted as used with its reason above.
const allowlistedInBase = API_ALLOWLIST.filter((key) => baseKeys.has(key));
for (const key of allowlistedInBase) usedKeys.add(key);

const unusedKeys = [...baseKeys].filter((key) => !usedKeys.has(key)).sort();
const isEscapeHatchKey = (key) => ESCAPE_HATCH_PREFIXES.some((prefix) => key.startsWith(prefix));
const codeKeysMissingFromBase = [...codeKeys].filter((key) => !baseKeys.has(key) && !isEscapeHatchKey(key)).sort();
const escapeHatchKeysMissingFromBase = [...codeKeys].filter((key) => !baseKeys.has(key) && isEscapeHatchKey(key)).sort();

// Each language from its three files, combined like the base; a missing
// file contributes nothing.
function readLanguageKeys(lang) {
    const keys = new Set();
    for (const file of [
        path.join(i18nDir, `${lang}.json`),
        path.join(i18nDir, 'gallery', `${lang}.json`),
        path.join(i18nDir, 'cli', `${lang}.json`),
    ]) {
        if (fs.existsSync(file)) {
            for (const key of readKeys(file)) keys.add(key);
        }
    }
    return keys;
}

const languageFiles = fs.readdirSync(i18nDir)
    .filter((name) => name.endsWith('.json') && name !== `${baseName}.json`)
    .sort();

console.log(`[lang] Language keys: base ${baseFileLabels.join(' + ')} (${baseKeys.size} keys), ${languageFiles.length} other languages`);

// Abridged by default: counts only. Verbose lists every key.
function sourceLabel(source) {
    if (source === 'gallery-script') return 'Gallery script';
    if (source === 'ts' || source.startsWith('src/')) return 'internal TypeScript';
    return source;
}

function sourceBreakdown(keys) {
    const counts = {};
    for (const key of keys) {
        for (const source of codeKeySources.get(key) ?? []) {
            counts[source] = (counts[source] ?? 0) + 1;
        }
    }
    return Object.entries(counts)
        .map(([source, count]) => `${count} ${sourceLabel(source)}`)
        .join(', ');
}

if (verbose) {
    console.log(`[lang] Unused keys in base: ${unusedKeys.length}`);
    for (const key of unusedKeys) console.log(`  - ${key}`);
} else {
    console.log(`[lang] Unused keys in base: ${unusedKeys.length} (use --verbose to list them)`);
}

if (verbose) {
    console.log(`[lang] Keys used in code but missing from base: ${codeKeysMissingFromBase.length}`);
    for (const key of codeKeysMissingFromBase) {
        const sources = [...(codeKeySources.get(key) ?? [])].map(sourceLabel).join(', ');
        console.log(`  - ${key} (${sources})`);
    }
} else if (codeKeysMissingFromBase.length > 0) {
    console.log(`[lang] Keys used in code but missing from base: ${codeKeysMissingFromBase.length} (${sourceBreakdown(codeKeysMissingFromBase)})`);
} else {
    console.log(`[lang] Keys used in code but missing from base: 0`);
}

if (verbose) {
    console.log(`[lang] Escape-hatch keys used in code but not in base: ${escapeHatchKeysMissingFromBase.length} (allowed by TranslationKey prefix, not counted as missing)`);
    for (const key of escapeHatchKeysMissingFromBase) {
        const sources = [...(codeKeySources.get(key) ?? [])].map(sourceLabel).join(', ');
        console.log(`  - ${key} (${sources})`);
    }
} else {
    console.log(`[lang] Escape-hatch keys used in code but not in base: ${escapeHatchKeysMissingFromBase.length}`);
}

if (verbose) {
    console.log(`[lang] Allowlisted API keys counted as used (not internal use): ${allowlistedInBase.length}`);
    for (const key of allowlistedInBase) console.log(`  - ${key}`);
} else {
    console.log(`[lang] Allowlisted API keys counted as used (not internal use): ${allowlistedInBase.length}`);
}

// Dynamic calls are a warning, not a gate: counts by default, the
// full list under --verbose.
if (verbose) {
    console.log(`[lang] Dynamic t() calls (not literals, check they are covered by a rule): ${dynamicCalls.size}`);
    for (const entry of [...dynamicCalls.values()].sort((a, b) => (a.label < b.label ? -1 : a.label > b.label ? 1 : a.line - b.line))) {
        console.log(`  - ${entry.label}:${entry.line} ${entry.pattern}`);
    }
} else {
    console.log(`[lang] Dynamic t() calls (not literals, check they are covered by a rule): ${dynamicCalls.size} (use --verbose to list them)`);
}

let outOfSyncCount = 0;
for (const file of languageFiles) {
    const lang = path.basename(file, '.json');
    const langKeys = readLanguageKeys(lang);
    const present = [...baseKeys].filter((key) => langKeys.has(key));
    const missing = [...baseKeys].filter((key) => !langKeys.has(key)).sort();
    const extra = [...langKeys].filter((key) => !baseKeys.has(key)).sort();
    const coverage = ((present.length / baseKeys.size) * 100).toFixed(1);
    const outOfSync = missing.length > 0 || extra.length > 0;
    if (outOfSync) outOfSyncCount += 1;

    if (outOfSync) {
        console.log(`\x1b[33m[lang] ${lang} is out of sync: ${present.length}/${baseKeys.size} present (${coverage}%), ${missing.length} missing, ${extra.length} extra\x1b[0m`);
    } else {
        console.log(`\x1b[32m[lang] ${lang} is in sync with ${baseName} (${present.length}/${baseKeys.size})\x1b[0m`);
    }

    if (verbose) {
        console.log(`  Missing keys in ${lang} (${missing.length}):`);
        for (const key of missing) console.log(`    - ${key}`);
        console.log(`  Extra keys in ${lang} (${extra.length}):`);
        for (const key of extra) console.log(`    - ${key}`);
    }
}

console.log(`[lang] Summary: ${unusedKeys.length} unused keys in base, ${outOfSyncCount} of ${languageFiles.length} languages out of sync`);

const hasFindings = unusedKeys.length > 0 || outOfSyncCount > 0 || codeKeysMissingFromBase.length > 0;
// Base findings are the gate: keys the English base owns or should own.
// Missing translations and extra keys are not base findings; they lag
// by design.
const hasBaseFindings = unusedKeys.length > 0 || codeKeysMissingFromBase.length > 0;
if (hasBaseFindings && strict) {
    console.log('\x1b[31m[lang] Check failed in strict mode.\x1b[0m');
    process.exit(1);
}
if (hasFindings && !strict) {
    console.log('[lang] Notice only: exit code 0. Use --strict to fail on base findings.');
}
process.exit(0);
