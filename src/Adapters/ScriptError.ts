import { FileSystemAdapter, TFile } from 'obsidian';
import NoteToolbarPlugin from '../main';

/**
 * Represents an error that occurred while evaluating a script.
 */
export class ScriptError extends Error {

    /**
     * @param ntb the Note Toolbar plugin instance
     * @param error the original error
     * @param sourceFile the script file where the error occurred
     * @param notes optional context to display with the source file
     */
    constructor(
        ntb: NoteToolbarPlugin,
        error: unknown,
        sourceFile: TFile,
        notes?: string
    ) {
        const isError = error instanceof Error;
        const message = isError ? error.message : String(error);
        const name = isError ? error.name : 'Error';

        super(message);

        const basePath = (ntb.app.vault.adapter as FileSystemAdapter).getBasePath();
        const uri = `file://${encodeURI(`${basePath}/${sourceFile.path}`)}`;

        this.name = `${notes ?? ''}${uri}\n\n${name}`;

        const originalStack = isError
            ? error.stack?.split('\n').slice(1).join('\n')
            : undefined;

        this.stack = `${this.name}: ${message}${ originalStack ? `\n${originalStack}` : '' }`;
    }

}