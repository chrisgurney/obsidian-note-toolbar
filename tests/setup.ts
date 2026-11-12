/**
 * Test-environment globals that Obsidian normally provides.
 * Runs before any test file (and therefore before any production
 * module under test) is loaded.
 */

const g = globalThis as Record<string, unknown>;

// Settings/NoteToolbarSettings.ts builds its i18next instance at import
// time. The stub's `t` just echoes the key, which is all the modules
// under test need.
g.i18next = {
	createInstance: () => ({
		init: () => Promise.resolve(),
		getFixedT: () => (key: string) => key,
	}),
};

// Utils.getUUID() uses window.crypto.randomUUID(); Node provides the
// same Web Crypto global, so point `window` at the global object.
if (typeof g.window === 'undefined') {
	g.window = globalThis;
}

// Node has Event but not MouseEvent; Utils.getLinkUiTarget() does an
// `instanceof MouseEvent` check. This stub carries just the fields
// that function (and the tests) read.
if (typeof g.MouseEvent === 'undefined') {
	g.MouseEvent = class MouseEvent extends Event {
		button = 0;
		ctrlKey = false;
		metaKey = false;
		altKey = false;
		shiftKey = false;
		constructor(type: string, init?: Record<string, unknown>) {
			super(type);
			if (init) Object.assign(this, init);
		}
	};
}
