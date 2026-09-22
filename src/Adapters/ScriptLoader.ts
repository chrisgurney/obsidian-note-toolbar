import NoteToolbarPlugin from 'main';
import { normalizePath, TFile } from 'obsidian';

/**
 * Loads scripts to make them available for evaluated scripts.
 * 
 * @see INoteToolbarApi.loadScript
 */
export class ScriptLoader {

    constructor(
        private readonly ntb: NoteToolbarPlugin
    ) {}

    async load<T = Record<string, unknown>>(
        path: string
    ): Promise<T> {
        const file = this.resolve(path);
        if (!file) {
            throw new Error(`User script not found: ${path}`);
        }
        const contents = await this.ntb.app.vault.cachedRead(file);
        // this.ntb.debug('evaluating:', contents);
        return this.evaluate<T>(contents);
    }

    private resolve(path: string): TFile | null {
        const scriptPath = normalizePath(path);
        const file = this.ntb.app.vault.getAbstractFileByPath(scriptPath);
        return file instanceof TFile ? file : null;
    }

    private async evaluate<T>(expression: string): Promise<T> {
        type AsyncFunctionConstructor = new (
            ...args: string[]
        ) => (...args: unknown[]) => Promise<unknown>;

        const asyncFunctionPrototype = Object.getPrototypeOf(
            async function () {}
        ) as { constructor: AsyncFunctionConstructor };

        const AsyncFunction = asyncFunctionPrototype.constructor;

        const func = new AsyncFunction('ntb', expression);
        const result = await func(this.ntb.api);

        return result as T;
    }

}