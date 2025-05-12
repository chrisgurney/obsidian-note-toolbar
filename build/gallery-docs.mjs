// Generates a markdown summary of Gallery items for publishing in the User Guide.

import fs from 'fs';

export async function galleryDocs(itemsFile, galleryFile, outputFile) {
    const items = JSON.parse(fs.readFileSync(itemsFile, 'utf-8'));
    const gallery = JSON.parse(fs.readFileSync(galleryFile, 'utf-8'));

    let markdown = `# ${gallery.title.en}\n\n`;

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
            //     description += ` • Uses plugin: ${item.pluginName})`;
            // }

            const exclusionNote = getExclusionNote(item);
            description += `${exclusionNote ? ` *${exclusionNote}*` : ''}`;
            
            let line = `| ${item.tooltip.en} | ${description} |`;
            markdown += line + '\n';
        }
        markdown += '\n';
    }

    fs.writeFileSync(outputFile, markdown);
    console.log('[gallery-docs] Markdown exported to:', outputFile);
}

// // Uncomment the following lines to run this script directly from the command line
// if (process.argv.length === 5) {
//     const [,, itemsFile, galleryFile, outputFile] = process.argv;
//     await galleryDocs(itemsFile, galleryFile, outputFile);
// } else {
//     console.error('Usage: node gallery-docs.mjs <items.json> <gallery.json> <output.md>');
//     process.exit(1);
// }