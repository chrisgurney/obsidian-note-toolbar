import fs from 'fs';
import path from 'path';

// inlines @import directives in the input file and writes the result to the output file
export function fileInliner(inputPath, outputPath) {
  try {
    let content = fs.readFileSync(inputPath, 'utf8');

    const importRegex = /^@import\s+['"]([^'"]+)['"]\s*;?\s*$/gm;
    for (const match of [...content.matchAll(importRegex)]) {
      const fullPath = path.resolve(path.dirname(inputPath), match[1]);
      const fileContent = fs.readFileSync(fullPath, 'utf8');
      content = content.replace(match[0], fileContent);
    }

    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(outputPath, content);
    console.log(`[file-inliner] written: ${outputPath}`);
  }
  catch (error) {
    console.error(`\x1b[31m[file-inliner] ✗ failed: ${inputPath}\x1b[0m`, error);
    throw error;
  }
}