import fs from 'fs/promises';
import path from 'path';

// inlines @import directives in the input file and writes the result to the output file
export async function fileInliner(inputPath, outputPath) {
  try {
    let content = await fs.readFile(inputPath, 'utf8');

    const importRegex = /^@import\s+['"]([^'"]+)['"]\s*;?\s*$/gm;
    for (const match of [...content.matchAll(importRegex)]) {
      const fullPath = path.resolve(path.dirname(inputPath), match[1]);
      const fileContent = await fs.readFile(fullPath, 'utf8');
      content = content.replace(match[0], fileContent);
    }

    await fs.writeFile(outputPath, content);
    console.log(`[file-inliner] written: ${outputPath}`);
  } catch (error) {
    console.error('[file-inliner] processing failed:', error);
    throw error;
  }
}