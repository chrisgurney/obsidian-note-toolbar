/**
 * Tier 0 tests: the standalone functions exported from src/Utils/Utils.ts.
 *
 * None of these functions are methods on PluginUtils, and none of them
 * take the plugin object: they operate on plain data (plus, for a few,
 * Obsidian's Platform flags, provided by obsidian-test-mocks).
 * That is what makes them testable today with zero refactoring.
 */
import { App, Platform, WorkspaceLeaf } from 'obsidian';
import type { ComponentType, DefaultStyleType, MobileStyleType, ToolbarSettings, Visibility } from 'Settings/NoteToolbarSettings';
import { ItemType } from 'Settings/NoteToolbarSettings';
import {
	addComponentVisibility,
	arraymove,
	calcComponentVisToggles,
	getLinkUiTarget,
	getUUID,
	getViewId,
	hasStyle,
	hasVisibleComponents,
	importArgs,
	isUuid,
	isValidUri,
	moveElement,
	removeComponentVisibility,
	toolbarHasMenu,
} from 'Utils/Utils';
import { MarkdownView } from 'obsidian';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const icon = 'icon' as ComponentType;
const label = 'label' as ComponentType;

beforeEach(() => {
	// the mock's defaults; tests that flip these must not leak state
	Platform.isDesktop = true;
	Platform.isPhone = false;
	Platform.isWin = false;
	Platform.isLinux = true;
	Platform.isMacOS = false;
});

describe('getUUID / isUuid', () => {
	it('getUUID returns a valid UUID starting with a letter', () => {
		for (let i = 0; i < 25; i++) {
			const uuid = getUUID();
			expect(uuid).toMatch(/^[a-f][0-9a-f]{7}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
			expect(isUuid(uuid)).toBe(true);
		}
	});

	it('isUuid accepts upper-case and rejects malformed values', () => {
		expect(isUuid('A0EEBC99-9C0B-4EF8-BB6D-6BB9BD380A11')).toBe(true);
		expect(isUuid('not-a-uuid')).toBe(false);
		expect(isUuid('a0eebc999c0b4ef8bb6d6bb9bd380a11')).toBe(false);
		expect(isUuid('')).toBe(false);
	});
});

describe('isValidUri', () => {
	it('accepts URIs with a scheme', () => {
		expect(isValidUri('https://example.com/path')).toBe(true);
		expect(isValidUri('obsidian://open?vault=MyVault')).toBe(true);
		expect(isValidUri('  https://example.com  ')).toBe(true);
	});

	it('rejects empty, schemeless, and relative strings', () => {
		expect(isValidUri('')).toBe(false);
		expect(isValidUri('   ')).toBe(false);
		expect(isValidUri('example.com')).toBe(false);
		expect(isValidUri('/notes/today.md')).toBe(false);
		expect(isValidUri('#heading')).toBe(false);
	});
});

describe('moveElement', () => {
	it('moves an element forwards and backwards', () => {
		const a = ['a', 'b', 'c', 'd'];
		moveElement(a, 0, 2);
		expect(a).toEqual(['b', 'c', 'a', 'd']);
		moveElement(a, 3, 0);
		expect(a).toEqual(['d', 'b', 'c', 'a']);
	});

	it('is a no-op for same-index and out-of-bounds moves', () => {
		const a = ['a', 'b', 'c'];
		moveElement(a, 1, 1);
		moveElement(a, -1, 0);
		moveElement(a, 0, 3);
		expect(a).toEqual(['a', 'b', 'c']);
	});
});

describe('arraymove', () => {
	it('swaps (not moves) the two elements', () => {
		const a = ['a', 'b', 'c'];
		arraymove(a, 0, 2);
		expect(a).toEqual(['c', 'b', 'a']);
	});

	it('is a no-op when the target is negative or past the end', () => {
		const a = ['a', 'b'];
		arraymove(a, 0, -1);
		arraymove(a, 0, 2);
		expect(a).toEqual(['a', 'b']);
	});
});

describe('component visibility helpers', () => {
	it('addComponentVisibility adds once only', () => {
		const platform = { components: [] as ComponentType[] };
		addComponentVisibility(platform, icon);
		addComponentVisibility(platform, icon);
		addComponentVisibility(platform, label);
		expect(platform.components).toEqual([icon, label]);
	});

	it('removeComponentVisibility removes, and ignores absent components', () => {
		const platform = { components: [icon, label] };
		removeComponentVisibility(platform, icon);
		removeComponentVisibility(platform, icon);
		expect(platform.components).toEqual([label]);
	});

	it('hasVisibleComponents reflects whether any component is present', () => {
		expect(hasVisibleComponents({ components: [] })).toBe(false);
		expect(hasVisibleComponents({ components: [icon] })).toBe(true);
	});

	it('calcComponentVisToggles returns [icon, label] per platform', () => {
		const visibility = {
			desktop: { components: [icon] },
			mobile: { components: [icon, label] },
			tablet: { components: [] },
		} as unknown as Visibility;
		expect(calcComponentVisToggles(visibility)).toEqual([true, false, true, true, false, false]);
	});
});

describe('hasStyle', () => {
	const toolbar = (over: Partial<ToolbarSettings>) => over as ToolbarSettings;
	const border = 'border' as DefaultStyleType;
	const sticky = 'sticky' as DefaultStyleType;
	const mBorder = 'mbrder' as MobileStyleType;
	const mLeft = 'mlft' as MobileStyleType;
	const mRight = 'mrght' as MobileStyleType;

	it('on desktop, only defaultStyles count', () => {
		const tb = toolbar({ defaultStyles: [border], mobileStyles: [] });
		expect(hasStyle(tb, border, mBorder)).toBe(true);
		expect(hasStyle(tb, sticky, mBorder)).toBe(false);
	});

	it('on mobile, a mobile style wins, and its compliments suppress the default', () => {
		Platform.isDesktop = false;
		const tb = toolbar({ defaultStyles: [border], mobileStyles: [mLeft] });
		// has Left: asking about Left is true, asking about Right (its
		// compliment) is false rather than falling back to the default
		expect(hasStyle(tb, border, mLeft)).toBe(true);
		expect(hasStyle(tb, border, mRight)).toBe(false);
	});

	it('on mobile, with no compliment present, falls back to the default style', () => {
		Platform.isDesktop = false;
		const tb = toolbar({ defaultStyles: [border], mobileStyles: [] });
		expect(hasStyle(tb, border, mBorder)).toBe(true);
	});
});

describe('toolbarHasMenu', () => {
	const toolbarWith = (items: unknown[]) => ({ items }) as unknown as ToolbarSettings;

	it('is true only for an item of type Menu with a link', () => {
		expect(toolbarHasMenu(toolbarWith([{ linkAttr: { type: ItemType.Menu }, link: 'some-toolbar' }]))).toBe(true);
		expect(toolbarHasMenu(toolbarWith([{ linkAttr: { type: ItemType.Menu }, link: '' }]))).toBe(false);
		expect(toolbarHasMenu(toolbarWith([{ linkAttr: { type: ItemType.Uri }, link: 'https://example.com' }]))).toBe(false);
		expect(toolbarHasMenu(toolbarWith([]))).toBe(false);
	});
});

describe('getLinkUiTarget', () => {
	it('returns undefined without an event or modifiers', () => {
		expect(getLinkUiTarget(undefined)).toBeUndefined();
		expect(getLinkUiTarget(new MouseEvent('click'))).toBeUndefined();
	});

	it('middle-click opens a tab', () => {
		expect(getLinkUiTarget(new MouseEvent('auxclick', { button: 1 }))).toBe('tab');
	});

	it('Ctrl/Cmd-click combinations choose tab, split, and window', () => {
		// the mock is Linux, so Ctrl is the modifier
		expect(getLinkUiTarget(new MouseEvent('click', { ctrlKey: true }))).toBe('tab');
		expect(getLinkUiTarget(new MouseEvent('click', { ctrlKey: true, altKey: true }))).toBe('split');
		expect(getLinkUiTarget(new MouseEvent('click', { ctrlKey: true, altKey: true, shiftKey: true }))).toBe('window');
	});
});

describe('getViewId', () => {
	it('combines leaf id, file path, and (for markdown) view mode', () => {
		// obsidian-test-mocks: views are built through the mock factories,
		// starting from a configured in-memory app.
		type MockApp = typeof import('obsidian-test-mocks/obsidian').App;
		type MockLeaf = typeof import('obsidian-test-mocks/obsidian').WorkspaceLeaf;
		type MockView = typeof import('obsidian-test-mocks/obsidian').MarkdownView;
		const app = (App as unknown as MockApp).createConfigured__({
			files: { 'Notes/Today.md': '# Today' },
		});
		const leaf = (WorkspaceLeaf as unknown as MockLeaf).create2__(app, 'test-leaf');
		// The mocks store the leaf id internally (id__); production code
		// reads leaf.id (declared in src/Types/types.d.ts, as in real
		// Obsidian), so assign it, per the mocks' strict-proxy override
		// pattern: assign first, then reads work.
		(leaf as unknown as { id: string }).id = 'test-leaf';
		const view = (MarkdownView as unknown as MockView).create2__(leaf);
		view.file = app.vault.getFileByPath('Notes/Today.md');
		expect(getViewId(view as unknown as MarkdownView)).toBe('test-leaf Notes/Today.md source');
		expect(getViewId(null)).toBeUndefined();
		expect(getViewId(undefined)).toBeUndefined();
	});
});

describe('importArgs', () => {
	it('parses a JSON-like argument string', () => {
		expect(importArgs('count: 2, name: hello')).toEqual({ value: { count: 2, name: 'hello' } });
	});

	it('reports an error instead of throwing on bad input', () => {
		// importArgs logs the error it reports; silence it so the
		// test run stays clean, and assert the report happened.
		const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		try {
			const result = importArgs('name: "unterminated');
			expect(result.value).toBeNull();
			expect(result.error).toBeTruthy();
			expect(errorSpy).toHaveBeenCalled();
		} finally {
			errorSpy.mockRestore();
		}
	});
});
