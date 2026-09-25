
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