/**
 * Runs the two language checks with the same flags: the key-usage and sync
 * check (build/check-lang-keys.mjs) and the Gallery/CLI id check
 * (build/check-lang-ids.mjs). Both always run, so --strict reports every
 * finding and --strict-base reports every base finding, and the exit
 * code is the first non-zero one, or 0.
 *
 * Usage: node build/check-lang.mjs [--verbose] [--strict] [--strict-base]
 *   npm run check-lang / npm run check-lang -- --verbose
 */

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
let exitCode = 0;
for (const script of ['check-lang-keys.mjs', 'check-lang-ids.mjs']) {
    const result = spawnSync(process.execPath, [path.join(__dirname, script), ...args], { stdio: 'inherit' });
    if (result.status !== 0 && exitCode === 0) exitCode = result.status;
}
process.exit(exitCode);
