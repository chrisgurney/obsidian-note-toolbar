/**
 * Tier 0 tests: ScriptArgsParser: a self-contained parser with no
 * Obsidian or plugin dependencies at all (0 `ntb` references).
 */
import { ScriptArgsParser } from 'Utils/ScriptArgsParser';
import { describe, expect, it } from 'vitest';

const parse = (input: string) => new ScriptArgsParser(input).parse();

describe('ScriptArgsParser', () => {
	it('returns an empty object for empty input', () => {
		expect(parse('')).toEqual({});
	});

	it('parses bare keys with number, boolean, and null values', () => {
		expect(parse('count: 42, ratio: 1.5, on: true, off: false, none: null'))
			.toEqual({ count: 42, ratio: 1.5, on: true, off: false, none: null });
	});

	it('parses bare string values', () => {
		expect(parse('name: my-script')).toEqual({ name: 'my-script' });
	});

	it('accepts optional outer braces and quoted keys/values', () => {
		expect(parse('{ "a b": "hello world" }')).toEqual({ 'a b': 'hello world' });
		expect(parse('a: 1')).toEqual({ a: 1 });
	});

	it('parses arrays, including nested arrays', () => {
		expect(parse('list: [1, 2, 3]')).toEqual({ list: [1, 2, 3] });
		expect(parse('list: [[1, 2], [3]]')).toEqual({ list: [[1, 2], [3]] });
		expect(parse('list: []')).toEqual({ list: [] });
	});

	it('handles escaped quotes inside strings', () => {
		expect(parse('a: "he said \\"hi\\""')).toEqual({ a: 'he said "hi"' });
	});

	it('throws on unterminated strings and missing colons', () => {
		expect(() => parse('a: "oops')).toThrow(/Unterminated string/);
		expect(() => parse('a 1')).toThrow(/Expected ':'/);
	});
});
