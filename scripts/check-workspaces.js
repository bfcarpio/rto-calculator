#!/usr/bin/env node
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

// Workspaces that need to be built
const workspaces = [
  { name: 'nager_date_api_reference', path: 'packages/nager.date', distPath: 'packages/nager.date/dist' },
  { name: 'datepainter', path: 'packages/datepainter', distPath: 'packages/datepainter/dist' }
];

let allBuilt = true;

for (const workspace of workspaces) {
  const distPath = join(rootDir, workspace.distPath);
  if (!existsSync(distPath)) {
    console.warn(`⚠️  Workspace '${workspace.name}' is not built (missing ${workspace.distPath})`);
    allBuilt = false;
  }
}

if (!allBuilt) {
  console.warn('');
  console.warn('📦 To build workspace dependencies, run:');
  console.warn('   npm run build:all');
  console.warn('');
  console.warn('💡 This only needs to be done once after cloning or when workspace code changes.');
  console.warn('');
}

// Don't exit with error - just warn
process.exit(0);
