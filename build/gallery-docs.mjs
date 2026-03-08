// generates a markdown summary of Gallery items for publishing in the User Guide.
// returns true if the output file was written, false if unchanged

import fs from 'fs';
import path from 'path';

export function galleryDocs(itemsFile, galleryFile, outputFile) {
    const items = JSON.parse(fs.readFileSync(itemsFile, 'utf-8'));
    const gallery = JSON.parse(fs.readFileSync(galleryFile, 'utf-8'));

    let markdown = '';

    const getExclusionNote = (item) => {
        const x = item.excludeOn
            ? Array.isArray(item.excludeOn) ? item.excludeOn : [item.excludeOn]
            : [];
        return x.length > 0
            ? `Not supported on: ${x.join(', ')}`
            : '';
    };

    for (const category of gallery.categories) {
        markdown += `## ${category.name.en}\n\n${category.description.en}\n\n`;

        markdown += '| Item | Description |\n| --- | --- |\n';
        for (const itemId of category.itemIds) {
            const item = items.find(item => item.id === itemId);
            if (!item) continue;

            let description = `${item.description.en}`;

            // FIXME: reuse function to check command ID here?
            // if (item.type === 'plugin' && item.pluginName) {
            //     description += ` • Uses plugin: ${item.pluginName})`;
            // }

            const exclusionNote = getExclusionNote(item);
            description += `${exclusionNote ? ` *${exclusionNote}*` : ''}`;
            
            let line = `| ${item.tooltip.en} | ${description} |`;
            markdown += line + '\n';
        }
        markdown += '\n';
    }

    const dir = path.dirname(outputFile);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    const existing = fs.existsSync(outputFile) ? fs.readFileSync(outputFile, 'utf-8') : null;
    if (existing === markdown) return false;

    fs.writeFileSync(outputFile, markdown);
    return true;
}