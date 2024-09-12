// imports YAML files into the provided CSS
// usage: @import "./style-settings.yaml";

import fs from 'fs/promises';
import path from 'path';
import postcss from 'postcss';

export async function yamlInliner(inputCssPath, outputCssPath) {
  const yamlInlinerPlugin = () => {
    return {
      postcssPlugin: 'yaml-inliner',
      async Once(root) {
        const promises = [];

        root.walkAtRules('import', (rule) => {
          if (rule.params.endsWith('.yaml"') || rule.params.endsWith('.yaml\'')) {
            const yamlPath = rule.params.replace(/['"]/g, '');
            const fullPath = path.resolve(path.dirname(inputCssPath), yamlPath);

            promises.push(
              fs.readFile(fullPath, 'utf8')
                .then(yamlContent => {
                  rule.replaceWith({
                    text: `@settings\n\n${yamlContent}\n`
                  });
                })
                .catch(err => {
                  console.error(`[yaml-inliner] error reading YAML file: ${fullPath}`, err);
                })
            );
          }
        });

        await Promise.all(promises);
      }
    };
  };

  yamlInlinerPlugin.postcss = true;

  try {
    const css = await fs.readFile(inputCssPath, 'utf8');
    const result = await postcss([yamlInlinerPlugin()]).process(css, {
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
