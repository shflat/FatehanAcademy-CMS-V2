#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const ROOT_DIR = process.cwd();
const IGNORE_DIRS = new Set([
  'node_modules',
  'dist',
  '.git',
  '.aistudio',
  'backups',
]);

function walkFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fullPath, fileList);
    } else if (/\.(ts|tsx|js|mjs|json|css)$/.test(entry.name)) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

function analyzeSourceFile(absPath) {
  const relPath = path.relative(ROOT_DIR, absPath).replace(/\\/g, '/');
  const ext = path.extname(absPath);
  const content = fs.readFileSync(absPath, 'utf-8');
  const lines = content.split('\n').length;

  const imports = [];
  const exportsList = [];
  const apiEndpoints = [];
  const dbTables = [];

  if (/\.(ts|tsx|js|mjs)$/.test(ext)) {
    const importRegex = /import\s+(?:type\s+)?(?:[^'"]+from\s+)?['"]([^'"]+)['"]/g;
    let m;
    while ((m = importRegex.exec(content)) !== null) {
      imports.push(m[1]);
    }

    const exportRegex =
      /export\s+(?:async\s+)?(?:function|const|let|class|interface|type|enum)\s+([A-Za-z0-9_]+)/g;
    while ((m = exportRegex.exec(content)) !== null) {
      exportsList.push(m[1]);
    }

    const routeRegex =
      /\b(?:app|router)\.(get|post|put|patch|delete)\(\s*['"`]([^'"`]+)['"`]/g;
    while ((m = routeRegex.exec(content)) !== null) {
      apiEndpoints.push({
        method: m[1].toUpperCase(),
        path: m[2],
        file: relPath,
      });
    }

    const tableRegex = /CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+([a-zA-Z0-9_]+)/gi;
    while ((m = tableRegex.exec(content)) !== null) {
      dbTables.push(m[1]);
    }
  }

  const category = relPath.startsWith('core/') || relPath.startsWith('src/core/') || relPath.startsWith('src/server/core/')
    ? 'core'
    : relPath.startsWith('src/server/database/')
    ? 'database'
    : relPath.startsWith('modules/') || relPath.startsWith('src/modules/') || relPath.startsWith('src/server/modules/')
    ? 'modules'
    : relPath.startsWith('themes/') || relPath.startsWith('src/theme/')
    ? 'theme'
    : relPath.startsWith('public/')
    ? 'public_assets'
    : 'root';

  return {
    path: relPath,
    category,
    lines,
    imports,
    exports: exportsList,
    apiEndpoints,
    dbTables,
  };
}

export function buildProjectGraph() {
  const targetDirs = [
    path.join(ROOT_DIR, 'src'),
    path.join(ROOT_DIR, 'core'),
    path.join(ROOT_DIR, 'modules'),
    path.join(ROOT_DIR, 'themes'),
    path.join(ROOT_DIR, 'public', 'assets'),
  ];

  const allFiles = [];
  if (fs.existsSync(path.join(ROOT_DIR, 'server.ts'))) {
    allFiles.push(path.join(ROOT_DIR, 'server.ts'));
  }
  for (const d of targetDirs) {
    walkFiles(d, allFiles);
  }

  const nodes = allFiles.map(analyzeSourceFile);
  const endpoints = nodes.flatMap((n) => n.apiEndpoints);
  const tables = Array.from(new Set(nodes.flatMap((n) => n.dbTables)));

  let detectedVersion = 'v2.4.0';
  const defaultsPath = path.join(ROOT_DIR, 'src', 'data', 'defaults.ts');
  if (fs.existsSync(defaultsPath)) {
    const defSrc = fs.readFileSync(defaultsPath, 'utf-8');
    const verMatch = defSrc.match(/export\s+const\s+APP_VERSION\s*=\s*['"]([^'"]+)['"]/);
    if (verMatch?.[1]) detectedVersion = verMatch[1];
  }

  const graph = {
    generatedAt: new Date().toISOString(),
    cmsVersion: detectedVersion,
    summary: {
      totalFiles: nodes.length,
      totalLines: nodes.reduce((acc, n) => acc + n.lines, 0),
      totalEndpoints: endpoints.length,
      totalDbTables: tables.length,
      byCategory: nodes.reduce((acc, n) => {
        acc[n.category] = (acc[n.category] || 0) + 1;
        return acc;
      }, {}),
    },
    dbTables: tables,
    apiEndpoints: endpoints,
    files: nodes,
  };

  fs.writeFileSync(
    path.join(ROOT_DIR, 'PROJECT_GRAPH.json'),
    JSON.stringify(graph, null, 2),
    'utf-8'
  );

  const mdLines = [
    '# نقشه جامع معماری و گراف وابستگی پروژه (PROJECT_MAP)',
    '',
    `- **نسخه هسته:** \`${graph.cmsVersion}\``,
    `- **زمان تولید گراف:** \`${graph.generatedAt}\``,
    `- **تعداد کل فایل‌های اسکن‌شده:** \`${graph.summary.totalFiles}\``,
    `- **مجموع خطوط کد:** \`${graph.summary.totalLines}\``,
    `- **تعداد اندپوینت‌های API:** \`${graph.summary.totalEndpoints}\``,
    `- **تعداد جداول دیتابیس SQL:** \`${graph.summary.totalDbTables}\``,
    '',
    '## ۱. جداول دیتابیس (SQL Tables)',
    ...tables.map((t) => `- \`${t}\``),
    '',
    '## ۲. اندپوینت‌های سرور (API Endpoints)',
    '| متد | مسیر API | فایل ماژول |',
    '| :--- | :--- | :--- |',
    ...endpoints.map((ep) => `| \`${ep.method}\` | \`${ep.path}\` | \`${ep.file}\` |`),
    '',
    '## ۳. تفکیک فایل‌ها بر اساس لایه معماری',
    '| مسیر فایل | لایه | تعداد خط | خروجی‌ها (Exports) |',
    '| :--- | :--- | :--- | :--- |',
    ...nodes.map(
      (n) =>
        `| \`${n.path}\` | \`${n.category}\` | ${n.lines} | ${
          n.exports.slice(0, 6).join(', ') || '—'
        } |`
    ),
    '',
  ];

  fs.writeFileSync(
    path.join(ROOT_DIR, 'PROJECT_MAP.md'),
    mdLines.join('\n'),
    'utf-8'
  );

  return graph;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const graph = buildProjectGraph();
  console.log(
    `[project-indexer] Generated PROJECT_GRAPH.json & PROJECT_MAP.md (${graph.summary.totalFiles} files, ${graph.summary.totalEndpoints} endpoints, ${graph.summary.totalDbTables} DB tables).`
  );
}
