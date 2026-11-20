#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const ROOT_DIR = process.cwd();
const IGNORE_DIRS = new Set(['node_modules', 'dist', '.git', '.aistudio', 'backups']);

function walk(dir, list = []) {
  if (!fs.existsSync(dir)) return list;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, list);
    else if (/\.(ts|tsx|js)$/.test(entry.name)) list.push(full);
  }
  return list;
}

export function runCleanCodeCheck() {
  const files = [
    path.join(ROOT_DIR, 'server.ts'),
    ...walk(path.join(ROOT_DIR, 'src')),
    ...walk(path.join(ROOT_DIR, 'core')),
    ...walk(path.join(ROOT_DIR, 'modules')),
    ...walk(path.join(ROOT_DIR, 'themes')),
  ].filter((f) => fs.existsSync(f));

  const largeFiles = [];
  const legacyDirViolations = [];
  const exportedSymbolMap = new Map();
  const duplicateExports = [];

  for (const abs of files) {
    const rel = path.relative(ROOT_DIR, abs).replace(/\\/g, '/');
    const content = fs.readFileSync(abs, 'utf-8');
    const lineCount = content.split('\n').length;

    if (rel.startsWith('src/components/') || rel.startsWith('src/utils/')) {
      legacyDirViolations.push(rel);
    }

    // Data catalog files naturally hold static skill items; flag logic files > 400 lines
    const isStaticData = rel.startsWith('src/data/') || rel.includes('iran-geo');
    if (!isStaticData && lineCount > 400) {
      largeFiles.push({ path: rel, lines: lineCount });
    }

    const fnExportRegex = /export\s+(?:async\s+)?function\s+([A-Za-z0-9_]+)/g;
    let m;
    while ((m = fnExportRegex.exec(content)) !== null) {
      const fnName = m[1];
      if (exportedSymbolMap.has(fnName)) {
        const prev = exportedSymbolMap.get(fnName);
        // Ignore intentionally mirrored core/ and src/core/ bridges
        if (!prev.endsWith(path.basename(rel))) {
          duplicateExports.push({ symbol: fnName, files: [prev, rel] });
        }
      } else {
        exportedSymbolMap.set(fnName, rel);
      }
    }
  }

  return {
    timestamp: new Date().toISOString(),
    totalScannedFiles: files.length,
    legacyDirViolations,
    duplicateExports,
    largeFiles,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const res = runCleanCodeCheck();
  console.log(
    `[clean-code-checker] Scanned ${res.totalScannedFiles} files | Legacy folders: ${res.legacyDirViolations.length} | Duplicate exports: ${res.duplicateExports.length} | Files >400 lines: ${res.largeFiles.length}`
  );
  for (const lf of res.largeFiles) {
    console.log(`  • ${lf.path} (${lf.lines} lines)`);
  }
}
