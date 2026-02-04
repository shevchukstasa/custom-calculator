/**
 * Generates FULL_PROJECT_EXPORT.md with complete project code for pasting into Gemini.
 * Run from project root: node scripts/export-for-gemini.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const FILES = [
  // Root config
  'index.html',
  'package.json',
  'tsconfig.json',
  'tsconfig.node.json',
  'vite.config.ts',
  // Entry
  'src/main.tsx',
  'src/App.tsx',
  'src/App.css',
  'src/index.css',
  'src/vite-env.d.ts',
  // Types
  'src/types/index.ts',
  // Components (alphabetical by filename)
  'src/components/ApprovalWarningModal.css',
  'src/components/ApprovalWarningModal.tsx',
  'src/components/BackupLogin.css',
  'src/components/BackupLogin.tsx',
  'src/components/BackupManagement.tsx',
  'src/components/CalculationHistory.tsx',
  'src/components/CalculationResults.tsx',
  'src/components/CostResults.tsx',
  'src/components/ErrorModal.css',
  'src/components/ErrorModal.tsx',
  'src/components/GlazePlacementSelector.tsx',
  'src/components/KilnSelector.tsx',
  'src/components/ManagerSelector.tsx',
  'src/components/MultiKilnResults.tsx',
  'src/components/NotificationModal.css',
  'src/components/NotificationModal.tsx',
  'src/components/OrderQuantityInput.tsx',
  'src/components/PriceConflictModal.css',
  'src/components/PriceConflictModal.tsx',
  'src/components/ProductInput.tsx',
  'src/components/ProductTypeSelector.tsx',
  'src/components/StoneCostInput.tsx',
  'src/components/StoneDatabase.tsx',
  // Utils (alphabetical)
  'src/utils/backup.ts',
  'src/utils/calculationHistory.ts',
  'src/utils/constants.ts',
  'src/utils/costCalculations.ts',
  'src/utils/costLogic.ts',
  'src/utils/kilnCalculations.ts',
  'src/utils/stoneDatabase.ts',
  'src/utils/telegram.ts',
];

const LANG = {
  '.json': 'json',
  '.html': 'html',
  '.ts': 'ts',
  '.tsx': 'tsx',
  '.css': 'css',
};

function getLang(filePath) {
  return LANG[path.extname(filePath)] || '';
}

const HEADER = `# Kiln Calculator — Full Project Export

Use this document to recreate the application in another environment (e.g. paste into Gemini and ask it to build the project).

## Build instructions

- **Stack:** React 18, TypeScript, Vite
- **Requirements:** Node.js 18+
- **Commands:**
  - \`npm install\` — install dependencies
  - \`npm run dev\` — start dev server
  - \`npm run build\` — production build
  - \`npm run preview\` — preview production build

Recreate the project by creating each file below with the given path and content.

---

`;

function main() {
  const out = [HEADER];

  for (const file of FILES) {
    const fullPath = path.join(ROOT, file);
    if (!fs.existsSync(fullPath)) {
      console.warn('Skip (not found):', file);
      continue;
    }
    const content = fs.readFileSync(fullPath, 'utf8');
    const lang = getLang(file);
    // Use 4 backticks so triple backticks inside file don't break the fence
    out.push(`## File: ${file}\n\n`);
    out.push('````' + lang + '\n');
    out.push(content);
    if (!content.endsWith('\n')) out.push('\n');
    out.push('````\n\n');
  }

  const outPath = path.join(ROOT, 'FULL_PROJECT_EXPORT.md');
  fs.writeFileSync(outPath, out.join(''), 'utf8');
  console.log('Written:', outPath);
}

main();
