/**
 * Characterization tests for src/Utils/ImportExport.ts.
 *
 * These tests pin the behaviour the code has TODAY, before any fix.
 * They were written alongside an exports-only change: the eight helpers
 * below were previously file-private, and are now exported so they can
 * be tested directly. No behaviour was changed to write these tests.
 *
 * Tests that document a known defect are marked KNOWN BUG or KNOWN GAP
 * in their names. When the planned escaping fix lands, those specific
 * tests are expected to be updated deliberately, and the rest of this
 * file should keep passing unchanged. That diff is the safety net
 * working as intended.
 *
 * Known defects pinned here (verified on feat-error-reporting b706d20):
 * - escapeAttribute never escapes `&` (CodeQL: incomplete escaping).
 * - escapeTextForCallout / escapeLinkForCallout never escape a
 *   pre-existing backslash first (CodeQL: incomplete escaping).
 * - unescapeLinkForCallout maps `\]` to `[` instead of `]`, so link
 *   round trips lose closing brackets. The text variant is correct.
 * - importFromCallout never unescapes the tooltip, so an escaped
 *   tooltip comes back still escaped (found while characterizing).
 */
import type NoteToolbarPlugin from 'main';
import {
	DEFAULT_ITEM_VISIBILITY_SETTINGS,
	type ExportSettings,
	ItemType,
	type ToolbarItemSettings,
	type ToolbarSettings,
	type Visibility,
} from 'Settings/NoteToolbarSettings';
import {
	escapeAttribute,
	escapeLinkForCallout,
	escapeTextForCallout,
	exportItemToCallout,
	exportToCallout,
	importFromCallout,
	parseCalloutLines,
	replaceScriptDelimiters,
	stripJsComments,
	unescapeLinkForCallout,
	unescapeTextForCallout,
} from 'Utils/ImportExport';
import { describe, expect, it } from 'vitest';

/** Builds a minimal plugin stub covering only what ImportExport reads. */
function makeNtb(options: {
	templater?: boolean;
	dataview?: boolean;
	dvPrefix?: string | null;
	toolbars?: Record<string, ToolbarSettings>;
	commandNames?: Record<string, string>;
} = {}) {
	const toolbars = options.toolbars ?? {};
	const commandNames = options.commandNames ?? {};
	const ntb = {
		debug: () => undefined,
		error: () => undefined,
		app: {
			workspace: { getActiveFile: () => null },
			vault: { getAbstractFileByPath: () => null },
			metadataCache: { getFirstLinkpathDest: () => null },
		},
		settingsManager: {
			getToolbar: (nameOrId: string) =>
				Object.values(toolbars).find((t) => t.uuid === nameOrId || t.name === nameOrId),
			getToolbarById: (id: string) => toolbars[id],
			getUniqueToolbarName: (name: string) => name,
		},
		vars: {
			replaceVars: (input: string) => Promise.resolve(input),
		},
		adapters: {
			hasPlugin: (type: ItemType) =>
				(type === ItemType.Templater && !!options.templater) ||
				(type === ItemType.Dataview && !!options.dataview),
			dv: options.dataview
				? { getSetting: (key: string) => (key === 'inlineQueryPrefix' ? (options.dvPrefix ?? '=') : undefined) }
				: undefined,
		},
		utils: {
			getCommandNameById: (id: string) => commandNames[id],
		},
	};
	return ntb as unknown as NoteToolbarPlugin;
}

const defaultExportOptions: ExportSettings = {
	includeIcons: false,
	replaceVars: false,
	useDataEls: false,
	useIds: false,
};

function makeItem(partial: Partial<ToolbarItemSettings>): ToolbarItemSettings {
	return {
		uuid: 'test-item',
		icon: '',
		label: '',
		tooltip: '',
		hasCommand: false,
		inGallery: false,
		link: '',
		linkAttr: { commandCheck: false, commandId: '', hasVars: false, type: ItemType.Uri },
		visibility: JSON.parse(JSON.stringify(DEFAULT_ITEM_VISIBILITY_SETTINGS)) as Visibility,
		...partial,
	};
}

describe('escapeAttribute', () => {
	it('escapes double quotes and angle brackets', () => {
		expect(escapeAttribute('a "b" <c> d')).toBe('a &quot;b&quot; &lt;c&gt; d');
	});

	it('KNOWN BUG: does not escape ampersands', () => {
		expect(escapeAttribute('Fish & Chips')).toBe('Fish & Chips');
		// A pre-existing entity therefore passes straight through, which
		// is indistinguishable from an escaped quote on the way back in.
		expect(escapeAttribute('&quot;already&quot;')).toBe('&quot;already&quot;');
		expect(escapeAttribute('a &amp; b')).toBe('a &amp; b');
	});

	it('does not escape single quotes', () => {
		expect(escapeAttribute("it's")).toBe("it's");
	});

	it('collapses every run of whitespace, including newlines and tabs, to a single space', () => {
		expect(escapeAttribute('a\n\n b\t c\r\nd')).toBe('a b c d');
		expect(escapeAttribute('\ta\t')).toBe(' a ');
	});

	it('leaves ordinary text and empty strings unchanged', () => {
		expect(escapeAttribute('scripts/my file.js')).toBe('scripts/my file.js');
		expect(escapeAttribute('')).toBe('');
	});
});

describe('escapeTextForCallout / unescapeTextForCallout', () => {
	it('escapes square brackets in link text', () => {
		expect(escapeTextForCallout('a [b] c')).toBe('a \\[b\\] c');
	});

	it('leaves parentheses, quotes, angles and ampersands untouched', () => {
		expect(escapeTextForCallout('a (b) "c" <d> & e')).toBe('a (b) "c" <d> & e');
	});

	it('KNOWN GAP: does not escape a pre-existing backslash first', () => {
		// The original backslash is left as-is and the bracket gains one,
		// so the output carries two backslashes before the bracket.
		expect(escapeTextForCallout('\\[')).toBe('\\\\[');
		expect(escapeTextForCallout('a \\ b')).toBe('a \\ b');
	});

	it('unescapes square brackets, including the closing bracket', () => {
		expect(unescapeTextForCallout('a \\[b\\] c')).toBe('a [b] c');
		expect(unescapeTextForCallout('\\]')).toBe(']');
		expect(unescapeTextForCallout('\\[')).toBe('[');
	});

	it('unescape leaves escaped parentheses untouched', () => {
		expect(unescapeTextForCallout('a \\(b\\)')).toBe('a \\(b\\)');
	});

	it('round trip: plain bracketed text survives escape then unescape', () => {
		expect(unescapeTextForCallout(escapeTextForCallout('a [b] c'))).toBe('a [b] c');
		expect(unescapeTextForCallout(escapeTextForCallout('no brackets'))).toBe('no brackets');
	});

	it('round trip: a lone backslash survives', () => {
		expect(unescapeTextForCallout(escapeTextForCallout('a \\ b'))).toBe('a \\ b');
	});
});

describe('escapeLinkForCallout / unescapeLinkForCallout', () => {
	it('escapes square brackets and parentheses in links', () => {
		expect(escapeLinkForCallout('a [b] (c)')).toBe('a \\[b\\] \\(c\\)');
	});

	it('leaves angle brackets, quotes and ampersands untouched', () => {
		expect(escapeLinkForCallout('https://example.com/?a=1&b="2"')).toBe('https://example.com/?a=1&b="2"');
	});

	it('KNOWN GAP: does not escape a pre-existing backslash first', () => {
		expect(escapeLinkForCallout('\\]')).toBe('\\\\]');
		expect(escapeLinkForCallout('a \\ b')).toBe('a \\ b');
	});

	it('unescapes opening brackets and parentheses', () => {
		expect(unescapeLinkForCallout('\\[')).toBe('[');
		expect(unescapeLinkForCallout('\\(c\\)')).toBe('(c)');
	});

	it('KNOWN BUG: unescapes a closing bracket to an opening bracket', () => {
		expect(unescapeLinkForCallout('\\]')).toBe('[');
	});

	it('KNOWN BUG: link round trip loses closing brackets', () => {
		expect(unescapeLinkForCallout(escapeLinkForCallout('x ] y'))).toBe('x [ y');
		expect(unescapeLinkForCallout(escapeLinkForCallout('a [b] (c)'))).toBe('a [b[ (c)');
	});

	it('round trip: links without closing brackets survive', () => {
		expect(unescapeLinkForCallout(escapeLinkForCallout('a [b (c)'))).toBe('a [b (c)');
		expect(unescapeLinkForCallout(escapeLinkForCallout('https://example.com/plain'))).toBe('https://example.com/plain');
	});

	it('strips one wrapping pair of angle brackets', () => {
		expect(unescapeLinkForCallout('<https://example.com>')).toBe('https://example.com');
		expect(unescapeLinkForCallout('ab>')).toBe('ab');
	});

	it('keeps Templater delimiters: a leading <% is not stripped, and a trailing %> keeps its >', () => {
		expect(unescapeLinkForCallout('<% tp.date.now() %>')).toBe('<% tp.date.now() %>');
	});
});

describe('stripJsComments', () => {
	it('removes block comments, including multi-line ones', () => {
		expect(stripJsComments('a /* comment */ b')).toBe('a  b');
		expect(stripJsComments('a /* one\ntwo */ b')).toBe('a  b');
		expect(stripJsComments('/* a */ x /* b */ y')).toBe(' x  y');
	});

	it('removes line comments, preserving the whitespace before them', () => {
		expect(stripJsComments('code; // trailing\nnext();')).toBe('code; \nnext();');
		expect(stripJsComments('// header\ncode();')).toBe('\ncode();');
	});

	it('does not strip // that is not preceded by whitespace or line start', () => {
		// This is what keeps URLs in expressions intact.
		expect(stripJsComments('const u = "https://example.com";')).toBe('const u = "https://example.com";');
		expect(stripJsComments('a//b')).toBe('a//b');
	});

	it('KNOWN LIMITATION: strips // inside a string literal when preceded by a space', () => {
		expect(stripJsComments('const s = "a // b";')).toBe('const s = "a ');
	});

	it('leaves unterminated block comments and comment-free code unchanged', () => {
		expect(stripJsComments('a /* open b')).toBe('a /* open b');
		expect(stripJsComments('return 1 + 2;')).toBe('return 1 + 2;');
	});

	it('KNOWN LIMITATION: nested block comments end at the first */', () => {
		expect(stripJsComments('/* a /* b */ c */ d')).toBe(' c */ d');
	});
});

describe('replaceScriptDelimiters', () => {
	it('converts Templater expressions when the Templater plugin is present', () => {
		const ntb = makeNtb({ templater: true });
		expect(replaceScriptDelimiters(ntb, '<% tp.date.now() %>')).toBe('{{tp: tp.date.now()}}');
		expect(replaceScriptDelimiters(ntb, '<%    tp.x    %>')).toBe('{{tp: tp.x}}');
		// The closing > of %> is optional in the current pattern.
		expect(replaceScriptDelimiters(ntb, '<% tp.file.title %>')).toBe('{{tp: tp.file.title}}');
	});

	it('does not convert multi-line Templater expressions', () => {
		const ntb = makeNtb({ templater: true });
		expect(replaceScriptDelimiters(ntb, '<% a\nb %>')).toBe('<% a\nb %>');
	});

	it('converts Dataview inline queries at line starts, using the configured prefix', () => {
		const ntb = makeNtb({ dataview: true });
		expect(replaceScriptDelimiters(ntb, '= dv.pages()')).toBe('{{dv: dv.pages()}}');
		expect(replaceScriptDelimiters(ntb, '= one\n= two')).toBe('{{dv: one}}\n{{dv: two}}');
		expect(replaceScriptDelimiters(ntb, 'x = dv.pages()')).toBe('x = dv.pages()');
	});

	it('honours a custom Dataview prefix and falls back to = when the setting is empty', () => {
		const custom = makeNtb({ dataview: true, dvPrefix: 'dv:' });
		expect(replaceScriptDelimiters(custom, 'dv: pages')).toBe('{{dv: pages}}');
		expect(replaceScriptDelimiters(custom, '= pages')).toBe('= pages');
		const fallback = makeNtb({ dataview: true, dvPrefix: null });
		expect(replaceScriptDelimiters(fallback, '= pages')).toBe('{{dv: pages}}');
	});

	it('leaves input unchanged when neither plugin is present', () => {
		const ntb = makeNtb();
		expect(replaceScriptDelimiters(ntb, '<% tp.x %> and = dv.y')).toBe('<% tp.x %> and = dv.y');
	});
});

describe('parseCalloutLines', () => {
	it('splits on real newlines and trims the whole callout', () => {
		expect(parseCalloutLines('> [!note-toolbar] T\n> - [A](<https://a>)\n> - [B](<https://b>)')).toEqual([
			'> [!note-toolbar] T',
			'> - [A](<https://a>)',
			'> - [B](<https://b>)',
		]);
		expect(parseCalloutLines('  \n a \n ')).toEqual(['a']);
	});

	it('splits on literal \\n sequences outside quotes', () => {
		expect(parseCalloutLines('line1\\nline2')).toEqual(['line1', 'line2']);
	});

	it('does not split on literal \\n inside double or single quotes', () => {
		expect(parseCalloutLines('> - [A]()<data data-expr="a\\nb"/>\n> - [B](<https://b>)')).toEqual([
			'> - [A]()<data data-expr="a\\nb"/>',
			'> - [B](<https://b>)',
		]);
		expect(parseCalloutLines("x 'a\\nb' y\\nz")).toEqual(["x 'a\\nb' y", 'z']);
	});

	it('returns a single empty line for an empty callout', () => {
		expect(parseCalloutLines('')).toEqual(['']);
	});
});

describe('exportItemToCallout', () => {
	it('exports a Uri item with escaped text and link, and the tooltip as a comment', async () => {
		const ntb = makeNtb();
		const item = makeItem({
			label: 'Example [site]',
			link: 'https://example.com/a(b)',
			tooltip: 'Tip [x]',
			linkAttr: { commandCheck: false, commandId: '', hasVars: false, type: ItemType.Uri },
		});
		await expect(exportItemToCallout(ntb, item, null, defaultExportOptions)).resolves.toBe(
			'> - [Example \\[site\\]](<https://example.com/a\\(b\\)>) <!-- Tip \\[x\\] -->'
		);
	});

	it('exports a Command item as a Note Toolbar URI, or as a data element when requested', async () => {
		const ntb = makeNtb();
		const item = makeItem({
			label: 'Open',
			linkAttr: { commandCheck: false, commandId: 'app:open', hasVars: false, type: ItemType.Command },
		});
		await expect(exportItemToCallout(ntb, item, null, defaultExportOptions)).resolves.toBe(
			'> - [Open](<obsidian://note-toolbar?commandid=app:open>)'
		);
		await expect(exportItemToCallout(ntb, item, null, { ...defaultExportOptions, useDataEls: true })).resolves.toBe(
			'> - [Open]()<data data-ntb-command="app:open"/>'
		);
	});

	it('exports Break and Separator items as HTML markers', async () => {
		const ntb = makeNtb();
		const brk = makeItem({ linkAttr: { commandCheck: false, commandId: '', hasVars: false, type: ItemType.Break } });
		const sep = makeItem({ linkAttr: { commandCheck: false, commandId: '', hasVars: false, type: ItemType.Separator } });
		await expect(exportItemToCallout(ntb, brk, null, defaultExportOptions)).resolves.toBe('> - <br/>');
		await expect(exportItemToCallout(ntb, sep, null, defaultExportOptions)).resolves.toBe('> - <hr/>');
	});

	it('exports a script item with comments stripped from the expression and attributes escaped', async () => {
		const ntb = makeNtb();
		const item = makeItem({
			label: 'Run',
			linkAttr: { commandCheck: false, commandId: '', hasVars: false, type: ItemType.JavaScript },
			scriptConfig: {
				pluginFunction: 'myFunc',
				expression: 'return "a<b"; // done\nreturn 2;',
				sourceFile: 'scripts/a.js',
			},
		});
		await expect(exportItemToCallout(ntb, item, null, defaultExportOptions)).resolves.toBe(
			'> - [Run]()<data data-javascript="myFunc" data-expr="return &quot;a&lt;b&quot;; return 2;" data-src="scripts/a.js"/>'
		);
	});

	it('KNOWN BUG (via export): an ampersand in a script attribute is exported unescaped', async () => {
		const ntb = makeNtb();
		const item = makeItem({
			label: 'Run',
			linkAttr: { commandCheck: false, commandId: '', hasVars: false, type: ItemType.JavaScript },
			scriptConfig: { pluginFunction: 'myFunc', sourceArgs: 'Fish & Chips' },
		});
		await expect(exportItemToCallout(ntb, item, null, defaultExportOptions)).resolves.toBe(
			'> - [Run]()<data data-javascript="myFunc" data-args="Fish & Chips"/>'
		);
	});

	it('replaces script delimiters in labels when replaceVars is off and the plugins are present', async () => {
		const ntb = makeNtb({ templater: true });
		const item = makeItem({
			label: '<% tp.file.title %>',
			link: 'https://example.com',
			linkAttr: { commandCheck: false, commandId: '', hasVars: false, type: ItemType.Uri },
		});
		await expect(exportItemToCallout(ntb, item, null, defaultExportOptions)).resolves.toBe(
			'> - [{{tp: tp.file.title}}](<https://example.com>)'
		);
	});

	it('falls back to the tooltip, then a generic name, when there is no label', async () => {
		const ntb = makeNtb();
		const withTooltip = makeItem({
			tooltip: 'Just a tip',
			link: 'https://example.com',
			linkAttr: { commandCheck: false, commandId: '', hasVars: false, type: ItemType.Uri },
		});
		await expect(exportItemToCallout(ntb, withTooltip, null, defaultExportOptions)).resolves.toBe(
			'> - [Just a tip](<https://example.com>)'
		);
	});
});

describe('export / import round trips', () => {
	it('Uri item: label and link survive a round trip when no closing bracket is in the link', async () => {
		const ntb = makeNtb();
		const item = makeItem({
			label: 'Example [site]',
			link: 'https://example.com/a(b)',
			tooltip: 'Tip [x]',
			linkAttr: { commandCheck: false, commandId: '', hasVars: false, type: ItemType.Uri },
		});
		const exported = await exportItemToCallout(ntb, item, null, defaultExportOptions);
		const [toolbar, errorLog] = importFromCallout(ntb, exported, undefined, false);
		expect(errorLog).toBe('');
		expect(toolbar.items).toHaveLength(1);
		expect(toolbar.items[0].linkAttr.type).toBe(ItemType.Uri);
		expect(toolbar.items[0].label).toBe('Example [site]');
		expect(toolbar.items[0].link).toBe('https://example.com/a(b)');
		// KNOWN GAP: import never unescapes the tooltip (it is taken raw
		// from the HTML comment), so the escaped form survives the trip.
		expect(toolbar.items[0].tooltip).toBe('Tip \\[x\\]');
	});

	it('KNOWN BUG (round trip): a closing bracket in a Uri link comes back as an opening bracket', async () => {
		const ntb = makeNtb();
		const item = makeItem({
			label: 'Docs',
			link: 'https://example.com/a]b',
			linkAttr: { commandCheck: false, commandId: '', hasVars: false, type: ItemType.Uri },
		});
		const exported = await exportItemToCallout(ntb, item, null, defaultExportOptions);
		const [toolbar] = importFromCallout(ntb, exported, undefined, false);
		expect(toolbar.items).toHaveLength(1);
		expect(toolbar.items[0].link).toBe('https://example.com/a[b');
	});

	it('Command item: survives a round trip through the data element form', async () => {
		const ntb = makeNtb({ commandNames: { 'app:open': 'Open a file' } });
		const item = makeItem({
			label: 'Open',
			linkAttr: { commandCheck: false, commandId: 'app:open', hasVars: false, type: ItemType.Command },
		});
		const exported = await exportItemToCallout(ntb, item, null, { ...defaultExportOptions, useDataEls: true });
		const [toolbar, errorLog, warningLog] = importFromCallout(ntb, exported, undefined, false);
		expect(errorLog).toBe('');
		expect(warningLog).toBe('');
		expect(toolbar.items).toHaveLength(1);
		expect(toolbar.items[0].linkAttr.type).toBe(ItemType.Command);
		expect(toolbar.items[0].linkAttr.commandId).toBe('app:open');
		expect(toolbar.items[0].link).toBe('Open a file');
	});

	it('Command item: an unrecognised command ID is kept as the link, with a warning', async () => {
		const ntb = makeNtb();
		const item = makeItem({
			label: 'Open',
			linkAttr: { commandCheck: false, commandId: 'gone:cmd', hasVars: false, type: ItemType.Command },
		});
		const exported = await exportItemToCallout(ntb, item, null, { ...defaultExportOptions, useDataEls: true });
		const [toolbar, , warningLog] = importFromCallout(ntb, exported, undefined, false);
		expect(toolbar.items[0].link).toBe('gone:cmd');
		expect(warningLog).toContain('import.errorlog-command-not-recognized');
	});

	it('Break and Separator items survive a round trip', async () => {
		const ntb = makeNtb();
		const brk = makeItem({ linkAttr: { commandCheck: false, commandId: '', hasVars: false, type: ItemType.Break } });
		const sep = makeItem({ linkAttr: { commandCheck: false, commandId: '', hasVars: false, type: ItemType.Separator } });
		const callout = [
			await exportItemToCallout(ntb, brk, null, defaultExportOptions),
			await exportItemToCallout(ntb, sep, null, defaultExportOptions),
		].join('\n');
		const [toolbar, errorLog] = importFromCallout(ntb, callout, undefined, false);
		expect(errorLog).toBe('');
		expect(toolbar.items.map((i) => i.linkAttr.type)).toEqual([ItemType.Break, ItemType.Separator]);
	});

	it('Script item: expression and source file survive a round trip, with comments stripped on export', async () => {
		const ntb = makeNtb();
		const item = makeItem({
			label: 'Run',
			linkAttr: { commandCheck: false, commandId: '', hasVars: false, type: ItemType.JavaScript },
			scriptConfig: {
				pluginFunction: 'myFunc',
				expression: 'return 1; // done',
				sourceFile: 'scripts/a.js',
			},
		});
		const exported = await exportItemToCallout(ntb, item, null, defaultExportOptions);
		const [toolbar, errorLog] = importFromCallout(ntb, exported, undefined, false);
		expect(errorLog).toBe('');
		expect(toolbar.items).toHaveLength(1);
		expect(toolbar.items[0].linkAttr.type).toBe(ItemType.JavaScript);
		expect(toolbar.items[0].scriptConfig?.pluginFunction).toBe('myFunc');
		// The space before the stripped line comment survives the trip:
		// stripJsComments preserves it and escapeAttribute only collapses
		// whitespace runs, it does not trim.
		expect(toolbar.items[0].scriptConfig?.expression).toBe('return 1; ');
		expect(toolbar.items[0].scriptConfig?.sourceFile).toBe('scripts/a.js');
	});

	it('Whole toolbar: name, styles and items survive export then import', async () => {
		const ntb = makeNtb();
		const toolbarSettings = {
			uuid: 'tb-1',
			name: 'My Toolbar',
			defaultStyles: ['border', 'sticky'],
			mobileStyles: [],
			items: [
				makeItem({
					label: 'Example',
					link: 'https://example.com',
					linkAttr: { commandCheck: false, commandId: '', hasVars: false, type: ItemType.Uri },
				}),
				makeItem({ linkAttr: { commandCheck: false, commandId: '', hasVars: false, type: ItemType.Break } }),
			],
		} as unknown as ToolbarSettings;
		const exported = await exportToCallout(ntb, toolbarSettings, defaultExportOptions);
		expect(exported.startsWith('> [!note-toolbar|border-sticky] My Toolbar')).toBe(true);
		const [imported, errorLog] = importFromCallout(ntb, exported, undefined, false);
		expect(errorLog).toBe('');
		expect(imported.name).toBe('My Toolbar');
		expect(imported.defaultStyles).toEqual(['border', 'sticky']);
		expect(imported.items.map((i) => i.linkAttr.type)).toEqual([ItemType.Uri, ItemType.Break]);
		expect(imported.items[0].label).toBe('Example');
		expect(imported.items[0].link).toBe('https://example.com');
	});

	it('Import: invalid styles in the header are reported as warnings and dropped', () => {
		const ntb = makeNtb();
		const [toolbar, , warningLog] = importFromCallout(
			ntb,
			'> [!note-toolbar|border-notastyle] Named\n> - <br/>',
			undefined,
			false
		);
		expect(toolbar.name).toBe('Named');
		expect(toolbar.defaultStyles).toEqual(['border']);
		expect(warningLog).toContain('import.errorlog-invalid-styles');
	});

	it('Import: an unparseable line is reported as an error and skipped', () => {
		const ntb = makeNtb();
		const [toolbar, errorLog] = importFromCallout(ntb, 'just some prose', undefined, false);
		expect(toolbar.items).toHaveLength(0);
		expect(errorLog).toContain('import.errorlog-invalid-format');
	});

	it('Import: literal \\n inside a quoted script attribute does not split the item', () => {
		const ntb = makeNtb();
		const callout = '> - [Run]()<data data-javascript="myFunc" data-expr="a\\nb"/>';
		const [toolbar, errorLog] = importFromCallout(ntb, callout, undefined, false);
		expect(errorLog).toBe('');
		expect(toolbar.items).toHaveLength(1);
		expect(toolbar.items[0].scriptConfig?.expression).toBe('a\\nb');
	});

	it('Import: items joined by literal \\n instead of real newlines are still split', () => {
		const ntb = makeNtb();
		const [toolbar, errorLog] = importFromCallout(ntb, '> - <br/>\\n> - <hr/>', undefined, false);
		expect(errorLog).toBe('');
		expect(toolbar.items.map((i) => i.linkAttr.type)).toEqual([ItemType.Break, ItemType.Separator]);
	});

	it('Import: a wikilink item imports as a File item with label and link split on the pipe', () => {
		const ntb = makeNtb();
		const [toolbar, errorLog] = importFromCallout(ntb, '> - [[Notes/Today|Today note]]', undefined, false);
		expect(errorLog).toBe('');
		expect(toolbar.items).toHaveLength(1);
		expect(toolbar.items[0].linkAttr.type).toBe(ItemType.File);
		expect(toolbar.items[0].link).toBe('Notes/Today');
		expect(toolbar.items[0].label).toBe('Today note');
	});
});
