import NoteToolbarPlugin from "main";
import { TFile, FileSystemAdapter } from "obsidian";

/**
 * Formats an expression for display (for error notices + console), by prepending and truncating if necessary.
 */
export function formatExpression(expression: string, maxLength = 250): string {
    const lines = expression.split('\n');
    const result: string[] = [];
    const PREFIX = '    ';
    let length = 0;

    for (const line of lines) {
        const formattedLine = `${PREFIX}${line}`;

        if (length + formattedLine.length + (result.length ? 1 : 0) > maxLength) {
            break;
        }

        result.push(formattedLine);
        length += formattedLine.length + (result.length > 1 ? 1 : 0);
    }

    return result.join('\n') + (result.length < lines.length ? `\n${PREFIX}...` : '');
}

/**
 * Returns an error with additional context (sourceFile and optional notes), 
 * for diagnosing script evaluation errors.
 * 
 * @param ntb plugin instance
 * @param error the original error
 * @param sourceFile the script file where the error occurred
 * @param notes optional context to display with the source file
 */
export function formatScriptError(
    ntb: NoteToolbarPlugin,
    error: unknown,
    sourceFile: TFile,
    notes?: string
): Error {
    const isError = error instanceof Error;
    const message = isError ? error.message : String(error);
    const name = isError ? error.name : 'Error';

    const uri = getFileUri(ntb, sourceFile);

    const result = new Error(message);
    result.name = `${notes ?? ''}${uri}\n\n${name}`;

    const originalStack = isError
        ? error.stack?.split('\n').slice(1).join('\n')
        : undefined;

    result.stack = `${result.name}: ${message}${originalStack ? `\n${originalStack}` : ''}`;

    return result;
}

/**
 * Returns a `file://` URI for the given file, to provide a link for error messages.
 * 
 * @param ntb plugin instance
 * @param file TFile to get URI for
 * @returns 
 */
export function getFileUri(ntb: NoteToolbarPlugin, file: TFile) {
    const basePath = (ntb.app.vault.adapter as FileSystemAdapter).getBasePath();
    return `file://${encodeURI(`${basePath}/${file.path}`)}`;
}