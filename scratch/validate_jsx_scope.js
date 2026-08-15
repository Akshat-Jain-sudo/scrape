import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.resolve(__dirname, '..', 'src');

function getAllFiles(dir, exts = ['.js', '.jsx']) {
  let files = [];
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      files = files.concat(getAllFiles(full, exts));
    } else if (exts.some(ext => item.endsWith(ext))) {
      files.push(full);
    }
  }
  return files;
}

const files = getAllFiles(srcDir);
console.log(`Scanning ${files.length} source files in src/...`);

const suspiciousPatterns = [
  { regex: /onClick=\{([a-zA-Z0-9_]+)\}/g, name: 'Direct onClick identifier' },
  { regex: /onClick=\{\(\)\s*=>\s*([a-zA-Z0-9_]+)\(/g, name: 'Arrow onClick identifier' },
];

let issues = [];

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const rel = path.relative(srcDir, file);

  // Check onClick references
  for (const pat of suspiciousPatterns) {
    let match;
    const re = new RegExp(pat.regex);
    while ((match = re.exec(content)) !== null) {
      const fnName = match[1];
      if (['alert', 'confirm', 'prompt', 'console', 'window', 'document', 'e', 'event'].includes(fnName)) continue;
      
      // Check if fnName is declared in content (import, const, let, var, function, prop)
      const isDeclared = new RegExp(`\\b(const|let|var|function|import)\\s+.*\\b${fnName}\\b|\\b${fnName}\\s*=|function\\s+${fnName}|\\b${fnName}:|\\b${fnName}\\s*,|\\b${fnName}\\s*\\)`).test(content);
      if (!isDeclared) {
        issues.push({ file: rel, identifier: fnName, type: pat.name, match: match[0] });
      }
    }
  }
}

console.log('\n=== POTENTIAL SCOPE ISSUES IN SRC/ ===');
console.table(issues);
