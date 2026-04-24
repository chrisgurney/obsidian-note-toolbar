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
        const value = flagVal.value?.en ?? '';
        const desc  = (flagVal.required ? '(required) ' : '') + (flagVal.description?.en ?? '');
        rows.push([`${flagKey}${value ? `=${value}` : ''}`, desc]);
    }

    if (!rows.length) return '';

    const colWidth = Math.max(...rows.map(([col]) => col.length));
    let block = '```sh\n';
    for (const [col, desc] of rows) {
        block += `${col.padEnd(colWidth)}  # ${desc}\n`;
    }
    block += '```\n\n';
    return block;
}

export function cliDocs(cliJsonPath, outputFile) {
    const cli = JSON.parse(fs.readFileSync(cliJsonPath, 'utf-8'));

    let markdown = '';

    // display actions by category
    for (const category of cli.categories ?? []) {
        markdown += `## ${category.heading}\n\n`;
        if (category.docs) markdown += `${category.docs}\n\n`;
        const actions = Object.entries(cli.actions).filter(([, a]) => a.category === category.id);
        for (const [id, action] of actions) {
            markdown += `### \`${id}\`\n\n`;
            if (action.docs) markdown += `${action.docs}\n\n`;
            markdown += flagsBlock(action.flags ?? {}, cli.commonFlags ?? {});
            if (action.examples) {
                markdown += '#### Examples\n\n```sh\n';
                markdown += `${action.examples}\n`;
                markdown += '```\n\n';
            }
        }
    }

    // actions with no category (should not be any, but just in case)
    const uncategorized = Object.entries(cli.actions).filter(([, a]) => !a.category);
    for (const [id, action] of uncategorized) {
        markdown += `### \`${id}\`\n\n`;
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