/**
 * Shows how to use JS Engine's Markdown Builder to provide output.
 * Credit: https://github.com/mProjectsCode/obsidian-js-engine-plugin
 * 
 * Works with and without an Note Toolbar Output callout ID.
 */

let markdownBuilder = engine.markdown.createBuilder();

markdownBuilder.createHeading(2, 'Test Heading');
markdownBuilder.createParagraph('This is a test paragraph.');

markdownBuilder.createHeading(3, 'This is a sub heading');
markdownBuilder.createHeading(4, 'This is a sub sub heading');
markdownBuilder.createParagraph('This is another test paragraph.');

return markdownBuilder;