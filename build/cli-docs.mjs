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
        const value = (typeof flagVal.value === 'string' ? flagVal.value : flagVal.value?.en) ?? '';
        const desc  = (flagVal.description?.en ?? '') + (flagVal.required ? ' (required)' : '');
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

    // display commands by category
    for (const [categoryId, category] of Object.entries(cli.categories ?? {})) {
        markdown += `## ${category.heading}\n\n`;
        if (category.docs) markdown += `${category.docs}\n\n`;
        const commands = Object.entries(cli.commands).filter(([, c]) => c.category === categoryId);
        for (const [id, command] of commands) {
            // ignore as it's just a container for sub-actions/commands
            if (id === 'note-toolbar:add-tp') continue;
            markdown += `### \`${id}\`\n\n`;
            if (command.available) markdown += `> Available in \`${command.available}\`\n\n`;
            if (command.docs) markdown += `${command.docs}\n\n`;
            markdown += flagsBlock(command.flags ?? {}, cli.commonFlags ?? {});
            if (command.examples) {
                markdown += '#### Examples\n\n```sh\n';
                markdown += `${command.examples}\n`;
                markdown += '```\n\n';
            }
        }
    }

    // commands with no category (should not be any, but just in case)
    const uncategorized = Object.entries(cli.commands).filter(([, c]) => !c.category);
    for (const [id, command] of uncategorized) {
        markdown += `### \`${id}\`\n\n`;
        if (command.docs) markdown += `${command.docs}\n\n`;
        markdown += flagsBlock(command.flags ?? {}, cli.commonFlags ?? {});
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