/**
 * The payoff of the narrowed constructor: WindowListeners used to require
 * the whole plugin, so it could not be constructed without one. Now it
 * takes only `Pick<NoteToolbarPlugin, 'registerDomEvent'>`, so a plain
 * stub object is enough, no plugin, no Obsidian app.
 */
import WindowListeners from 'Listeners/WindowListeners';
import { Platform } from 'obsidian';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('WindowListeners', () => {
	let toggle: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		toggle = vi.fn();
		(globalThis as Record<string, unknown>).activeDocument = {
			body: { classList: { toggle } },
		};
	});

	afterEach(() => {
		Platform.isPhone = false;
	});

	it('registers nothing when not on a phone', () => {
		Platform.isPhone = false;
		const registerDomEvent = vi.fn();
		new WindowListeners({ registerDomEvent }).register();
		expect(registerDomEvent).not.toHaveBeenCalled();
	});

	it('registers both keyboard events via registerDomEvent on a phone', () => {
		Platform.isPhone = true;
		const registerDomEvent = vi.fn();
		const listeners = new WindowListeners({ registerDomEvent });
		listeners.register();
		expect(registerDomEvent).toHaveBeenCalledTimes(2);
		expect(registerDomEvent).toHaveBeenCalledWith(window, 'keyboardWillHide', listeners.onKeyboardHide);
		expect(registerDomEvent).toHaveBeenCalledWith(window, 'keyboardWillShow', listeners.onKeyboardShow);
	});

	it('keyboard handlers toggle the body class', () => {
		const listeners = new WindowListeners({ registerDomEvent: vi.fn() });
		listeners.onKeyboardShow();
		expect(toggle).toHaveBeenCalledWith('ntb-is-keyboard-open', true);
		listeners.onKeyboardHide();
		expect(toggle).toHaveBeenCalledWith('ntb-is-keyboard-open', false);
	});
});
