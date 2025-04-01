// Generates a markdown summary of Gallery items for publishing in the User Guide.

import fs from 'fs';

export async function galleryDocs(itemsFile, galleryFile, outputFile) {
    const items = JSON.parse(fs.readFileSync(itemsFile, 'utf-8'));
    const gallery = JSON.parse(fs.readFileSync(galleryFile, 'utf-8'));

    let markdown = `# ${gallery.title.en}\n\n`;

    for (const category of gallery.categories) {
        markdown += `### ${category.name.en}\n\n${category.description.en}\n\n`;

        markdown += '| Item | Description |\n| --- | --- |\n';
        for (const itemId of category.itemIds) {
            const item = items.find(item => item.id === itemId);
            if (!item) continue;

            let line = `| ${item.tooltip.en} | ${item.description.en} |`;
            // FIXME: reuse function to check command ID here?
            if (item.type === 'plugin' && item.pluginName) {
                line += ` (uses plugin: ${item.pluginName})`;
            }

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