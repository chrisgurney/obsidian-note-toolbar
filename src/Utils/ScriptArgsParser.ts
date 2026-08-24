/**
 * Parses a JSON-like object string into JavaScript values.
 *
 * Unlike strict JSON, the input may omit the outer braces and quotes around
 * object keys and simple string values. Arrays are supported and may be nested.
 *
 * Supported values include:
 * - strings (quoted or unquoted)
 * - numbers
 * - booleans (`true`, `false`)
 * - `null`
 * - arrays (including nested arrays)
 *
 * This parser is intended for simple script argument definitions rather than
 * general-purpose JSON parsing.
 */
export class ScriptArgsParser {

    private readonly s: string;
    private i = 0;

    constructor(input: string) {
        this.s = input.trim();
    }

    parse(): Record<string, unknown> {
        const result: Record<string, unknown> = {};

        if (this.peek() === '{') {
            this.consume('{');
        }

        while (!this.eof() && this.peek() !== '}') {
            const key = this.parseKey();
            this.consume(':');
            result[key] = this.parseValue();

            this.skipWhitespace();

            if (this.peek() === ',') {
                this.consume(',');
            }
        }

        if (this.peek() === '}') {
            this.consume('}');
        }

        return result;
    }

    private parseValue(): unknown {
        this.skipWhitespace();

        switch (this.peek()) {
            case '"':
                return this.parseString();
            case '[':
                return this.parseArray();
            default:
                return this.parsePrimitive();
        }
    }

    private parseArray(): unknown[] {
        this.consume('[');

        const values: unknown[] = [];

        while (true) {
            this.skipWhitespace();

            if (this.peek() === ']') {
                this.consume(']');
                return values;
            }

            values.push(this.parseValue());

            this.skipWhitespace();

            if (this.peek() === ',') {
                this.consume(',');
                continue;
            }

            this.consume(']');
            return values;
        }
    }

    private parseKey(): string {
        this.skipWhitespace();

        return this.peek() === '"'
            ? this.parseString()
            : this.readBareToken([':']);
    }

    private parseString(): string {
        this.consume('"');

        let value = '';

        while (!this.eof()) {
            const ch = this.peek();

            if (ch === '\\') {
                this.i++;
                value += this.peek() ?? '';
                this.i++;
                continue;
            }

            if (ch === '"') {
                this.consume('"');
                return value;
            }

            value += ch;
            this.i++;
        }

        throw new Error('Unterminated string');
    }

    private parsePrimitive(): unknown {
        const token = this.readBareToken([',', '}', ']']);

        if (token === '') return null;
        if (token === 'true') return true;
        if (token === 'false') return false;
        if (token === 'null') return null;

        const number = Number(token);
        if (!isNaN(number)) {
            return number;
        }

        return token;
    }

    private readBareToken(terminators: string[]): string {
        const start = this.i;

        while (!this.eof() && !terminators.includes(this.peek()!)) {
            this.i++;
        }

        return this.s.slice(start, this.i).trim();
    }

    private skipWhitespace(): void {
        while (!this.eof() && /\s/.test(this.peek()!)) {
            this.i++;
        }
    }

    private consume(expected: string): void {
        this.skipWhitespace();

        if (this.peek() !== expected) {
            this.error(`Expected '${expected}'`);
        }

        this.i++;
    }

    private peek(): string | undefined {
        return this.s[this.i];
    }

    private eof(): boolean {
        return this.i >= this.s.length;
    }

    private error(message: string): never {
        const start = Math.max(0, this.i - 10);
        const end = Math.min(this.s.length, this.i + 10);

        throw new Error(
            `${message} at position ${this.i}\n` +
            `${this.s.slice(start, end)}\n` +
            `${' '.repeat(this.i - start)}^`
        );
    }
}