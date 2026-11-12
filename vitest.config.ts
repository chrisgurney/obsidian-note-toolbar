import { readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const require = createRequire(import.meta.url);
// The `obsidian` npm package is types-only (no runtime entry point), so
// Vite cannot resolve `import ... from 'obsidian'` on its own, and the
// vi.mock() in obsidian-test-mocks' vitest-setup never gets a chance to
// intercept it. Alias the specifier straight at the mocks' obsidian
// module instead; vitest-setup still installs the prototype extensions
// and globals.
const obsidianMocks = require.resolve('obsidian-test-mocks/obsidian');

const srcDir = fileURLToPath(new URL('./src', import.meta.url));
const mock = (name: string) => fileURLToPath(new URL(`./tests/mocks/${name}`, import.meta.url));

// The plugin's tsconfig maps bare imports onto ./src/* ("paths": { "*": ["./src/*"] }).
// Mirror that here for every top-level folder under src/, so tests import
// production modules exactly the way production code imports them.
const srcAliases = readdirSync(srcDir, { withFileTypes: true })
	.filter((entry) => entry.isDirectory())
	.map((entry) => ({
		find: new RegExp(`^${entry.name}/(.*)$`),
		replacement: `${srcDir}/${entry.name}/$1`,
	}));

export default defineConfig({
	resolve: {
		alias: [
			// Host-provided modules that only exist inside Obsidian.
			// These must come first, before the src/ aliases above.
			// `obsidian` resolves to obsidian-test-mocks (see above);
			// vitest-setup (in setupFiles) installs its globals.
			{ find: /^obsidian$/, replacement: obsidianMocks },
			{ find: /^main$/, replacement: mock('main.ts') },
			{ find: /^version$/, replacement: mock('version.ts') },
			{ find: /^@codemirror\/view$/, replacement: mock('codemirror-view.ts') },
			...srcAliases,
		],
	},
	test: {
		environment: 'jsdom',
		include: ['tests/unit/**/*.test.ts'],
		setupFiles: ['obsidian-test-mocks/vitest-setup', 'tests/setup.ts'],
	},
});
