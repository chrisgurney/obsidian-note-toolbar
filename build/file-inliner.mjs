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

            promises.push(
              fs.readFile(fullPath, 'utf8')
                .then(fileContent => {
                  rule.replaceWith({
                    text: `@settings\n\n${fileContent}\n`
                  });
                })
                .catch(err => {
                  console.error(`[file-inliner] error reading file: ${fullPath}`, err);
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

    console.log('[yaml-inliner] CSS processing complete');
  } catch (error) {
    console.error('[yaml-inliner] PostCSS processing failed:', error);
    throw error;
  }
}