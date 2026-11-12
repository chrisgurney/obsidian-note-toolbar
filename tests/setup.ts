/**
 * Test-environment globals that Obsidian normally provides.
 * Runs before any test file (and therefore before any production
 * module under test) is loaded.
 *
 * Add new globals by the gap they fill, not by the test that needs
 * them, so this file stays short as the suite grows.
 */

const g = globalThis as Record<string, unknown>;

// Production modules build an i18next instance at import time. The
// stub echoes translation keys back, which is all any module under
// test needs from it.
g.i18next = {
	createInstance: () => ({
		init: () => Promise.resolve(),
		getFixedT: () => (key: string) => key,
	}),
};

// Some production code reads browser globals through `window`
// (for example `window.crypto`). This environment already provides
// those on the global object, so `window` points at it.
if (typeof g.window === 'undefined') {
	g.window = globalThis;
}

// This environment provides Event but not MouseEvent. The stub
// carries the standard button and modifier fields, so `instanceof
// MouseEvent` checks and event handlers behave normally.
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
