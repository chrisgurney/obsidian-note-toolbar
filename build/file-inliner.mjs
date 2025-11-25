// Imports files into the provided CSS.
// usage: @import "./style-settings.yaml";

import fs from 'fs/promises';
import path from 'path';
import postcss from 'postcss';

export async function fileInliner(inputCssPath, outputCssPath) {
  const fileInlinerPlugin = () => {
    return {
      postcssPlugin: 'file-inliner',
      async Once(root) {
        const promises = [];

        root.walkAtRules('import', (rule) => {
          // extract the file path from the import statement
          const match = rule.params.match(/['"]([^'"]+)['"]/);

          if (match) {
            const filePath = match[1];
            const fullPath = path.resolve(path.dirname(inputCssPath), filePath);
            const isYaml = filePath.endsWith('.yaml') || filePath.endsWith('.yml');
            const isCss = filePath.endsWith('.css');

            promises.push(
              fs.readFile(fullPath, 'utf8')
                .then(fileContent => {
                  if (isCss) {
                    const parsed = postcss.parse(fileContent);
                    rule.replaceWith(parsed.nodes);
                  } 
                  else if (isYaml) {
                    rule.replaceWith({
                      text: `@settings\n\n${fileContent}\n`
                    });
                  } 
                  else {
                    rule.replaceWith({
                      text: fileContent
                    });
                  }
                })
                .catch(err => {
                  console.error(`\x1b[31m[file-inliner] error reading file:\x1b[0m ${fullPath}`, err);
                })
            );
          }
        });

        await Promise.all(promises);
      }
    };
  };

  fileInlinerPlugin.postcss = true;

  try {
    const css = await fs.readFile(inputCssPath, 'utf8');
    const result = await postcss([fileInlinerPlugin()]).process(css, {
      from: inputCssPath,
      to: outputCssPath,
    });

    await fs.writeFile(outputCssPath, result.css);

    console.log('[file-inliner] CSS processing complete');
  } catch (error) {
    console.error('[file-inliner] PostCSS processing failed:', error);
    throw error;
  }
}