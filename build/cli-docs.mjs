// generates the markdown documentation for CLI commands for publishing in the User Guide.
// returns true if the output file was written, false if unchanged

import fs from 'fs';
import path from 'path';

function flagsBlock(flags, commonFlags) {
    const ordered = [
        ...(flags.$before ?? []),
        ...Object.keys(flags).filter(k => !k.startsWith('$')),
        ...(flags.$after ?? []),
    ];

    const rows = [];
    for (const flagKey of ordered) {
        const flagVal = flags[flagKey] ?? commonFlags[flagKey];
        if (!flagVal || Array.isArray(flagVal)) continue;
        const value = flagVal.value.en ?? '';
        const desc  = flagVal.description.en ?? '';
        rows.push([`${flagKey}=${value}`, desc]);
    }

    if (!rows.length) return '';

    const colWidth = Math.max(...rows.map(([col]) => col.length));
    let block = '```\n';
    for (const [col, desc] of rows) {
        block += `${col.padEnd(colWidth)}  # ${desc}\n`;
    }
    block += '```\n\n';
    return block;
}

export function cliDocs(cliJsonPath, outputFile) {
    const cli = JSON.parse(fs.readFileSync(cliJsonPath, 'utf-8'));

    let markdown = '';
    markdown += `## \`${cli.id}\`\n\n`;
    if (cli.docs) markdown += `${cli.docs}\n\n`;

    for (const action of cli.actions) {
        markdown += `## \`${action.id}\`\n\n`;
        if (action.docs) markdown += `${action.docs}\n\n`;
        markdown += flagsBlock(action.flags ?? {}, cli.commonFlags ?? {});
    }

    //
    // write output
    //

    const dir = path.dirname(outputFile);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    const existing = fs.existsSync(outputFile) ? fs.readFileSync(outputFile, 'utf-8') : null;
    if (existing === markdown) return false;

    fs.writeFileSync(outputFile, markdown);
    return true;
}