import fs from 'fs';
import path from 'path';

// inlines @import directives in the input file and writes the result to the output file
// returns true if the output file was written, false if unchanged
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

    const existing = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, 'utf8') : null;
    if (existing === content) return false;

    fs.writeFileSync(outputPath, content);
    return true;
  }
  catch (error) {
    console.error(`\x1b[31m[file-inliner] ✗ failed: ${inputPath}\x1b[0m`, error);
    throw error;
  }
}