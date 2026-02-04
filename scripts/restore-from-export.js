/**
 * Restores project files from FULL_PROJECT_EXPORT.md (pre-Tailwind snapshot).
 * Run from project root: node scripts/restore-from-export.js
 *
 * Format in export: ## File: <path> then blank line, then `````<lang> then content then `````
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const EXPORT_PATH = path.join(ROOT, 'FULL_PROJECT_EXPORT.md');

const FILE_HEADER = /^## File: (.+)$/;
const OPEN_FENCE = /^`{4}\w*$/;   // 4 backticks + optional lang
const CLOSE_FENCE = /^`{4}$/;     // exactly 4 backticks

function main() {
  if (!fs.existsSync(EXPORT_PATH)) {
    console.error('Not found:', EXPORT_PATH);
    process.exit(1);
  }

  const raw = fs.readFileSync(EXPORT_PATH, 'utf8');
  const lines = raw.split(/\r?\n/);
  let i = 0;
  let restored = 0;

  while (i < lines.length) {
    const headerMatch = lines[i].match(FILE_HEADER);
    if (!headerMatch) {
      i++;
      continue;
    }

    const filePath = headerMatch[1].trim();
    i++;
    // skip blank line
    if (i < lines.length && lines[i].trim() === '') i++;
    if (i >= lines.length) break;

    if (!OPEN_FENCE.test(lines[i])) {
      console.warn('Expected opening fence after ## File:', filePath, 'at line', i + 1);
      i++;
      continue;
    }
    i++;
    const contentStart = i;
    while (i < lines.length && !CLOSE_FENCE.test(lines[i])) {
      i++;
    }
    if (i >= lines.length) {
      console.warn('No closing fence for file:', filePath);
      break;
    }
    const contentLines = lines.slice(contentStart, i);
    const content = contentLines.join('\n');
    const fullPath = path.join(ROOT, filePath);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(fullPath, content.endsWith('\n') ? content : content + '\n', 'utf8');
    console.log('Restored:', filePath);
    restored++;
    i++;
  }

  console.log('Done. Restored', restored, 'files.');
}

main();
