#!/usr/bin/env node
/*
  Prefix every file and directory under src/desktop with "desktop-" and update internal imports.
  Usage:
    node scripts/prefix-desktop.cjs --dry-run      # show what would change
    node scripts/prefix-desktop.cjs --confirm      # apply changes

  Notes:
  - Only paths inside src/desktop are modified.
  - Import path updates are done only within src/desktop files.
  - Skips entries that already start with "desktop-".
*/
const fs = require('fs/promises');
const fssync = require('fs');
const path = require('path');

const PROJECT_ROOT = process.cwd();
const DESKTOP_ROOT = path.join(PROJECT_ROOT, 'src', 'desktop');
const PREFIX = 'desktop-';

function log(...args) { console.log('[prefix-desktop]', ...args); }

function isCodeFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return ['.ts', '.tsx', '.js', '.jsx', '.css'].includes(ext);
}

async function exists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const results = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    results.push({ path: full, dirent: entry });
    if (entry.isDirectory()) {
      results.push(...await walk(full));
    }
  }
  return results;
}

function toPosix(p) { return p.split(path.sep).join('/'); }

function computeNewBasename(name) {
  return name.startsWith(PREFIX) ? name : `${PREFIX}${name}`;
}

function sortByDepthDesc(paths) {
  return paths.sort((a, b) => b.split(path.sep).length - a.split(path.sep).length);
}

function tryResolveImportAbsolute(fromFile, specifier) {
  if (!specifier.startsWith('.') && !specifier.startsWith('/')) return null; // non-relative
  const base = path.resolve(path.dirname(fromFile), specifier);
  const candidates = [
    base,
    `${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}.jsx`, `${base}.css`,
    path.join(base, 'index.ts'), path.join(base, 'index.tsx'), path.join(base, 'index.js'), path.join(base, 'index.jsx')
  ];
  for (const cand of candidates) {
    try {
      const stat = fssync.statSync(cand);
      if (stat.isFile() || stat.isDirectory()) return cand;
    } catch (_) {}
  }
  return null;
}

function tryResolveWithDesktopPrefixes(fromFile, specifier) {
  if (!specifier.startsWith('.') && !specifier.startsWith('/')) return null;
  const fromDir = path.dirname(fromFile);
  const parts = toPosix(specifier).split('/').filter(Boolean);
  // Build a path by preferring prefixed segments when present on disk
  let current = fromDir;
  for (let i = 0; i < parts.length; i++) {
    const seg = parts[i];
    const normal = path.join(current, seg);
    const prefixed = path.join(current, computeNewBasename(seg));
    if (fssync.existsSync(prefixed)) {
      current = prefixed;
    } else {
      current = normal;
    }
  }
  // Now try file resolution on this candidate path
  const base = current;
  const candidates = [
    base,
    `${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}.jsx`, `${base}.css`,
    path.join(base, 'index.ts'), path.join(base, 'index.tsx'), path.join(base, 'index.js'), path.join(base, 'index.jsx')
  ];
  for (const cand of candidates) {
    try {
      const stat = fssync.statSync(cand);
      if (stat.isFile() || stat.isDirectory()) return cand;
    } catch (_) {}
  }
  return null;
}

function computeNewRelative(fromFile, oldAbsTarget, plan) {
  const newAbs = plan.get(oldAbsTarget) || oldAbsTarget;
  let rel = path.relative(path.dirname(fromFile), newAbs);
  if (!rel.startsWith('.')) rel = `.${path.sep}${rel}`;
  return toPosix(rel);
}

async function updateFileImports(filePath, plan, options = { filesystemOnly: false }) {
  const original = await fs.readFile(filePath, 'utf8');
  let updated = original;

  const importLikeRegex = /\b(?:from\s+['"]([^'"]+)['"]|require\(\s*['"]([^'"]+)['"]\s*\)|import\(\s*['"]([^'"]+)['"]\s*\))/g;
  const cssUrlRegex = /url\(\s*(["']?)([^"')]+)\1\s*\)/g;

  updated = updated.replace(importLikeRegex, (match, g1, g2, g3) => {
    const spec = g1 || g2 || g3;
    let resolved = tryResolveImportAbsolute(filePath, spec);
    if (!resolved) {
      // Try resolving by applying desktop- prefixes to segments
      resolved = tryResolveWithDesktopPrefixes(filePath, spec);
    }
    if (!resolved) return match;
    if (!toPosix(resolved).includes(toPosix(DESKTOP_ROOT))) return match;
    const newRel = options.filesystemOnly
      ? toPosix(path.relative(path.dirname(filePath), resolved)).replace(/^[^\.]/, r => `./${r}`)
      : computeNewRelative(filePath, resolved, plan);
    if (g1) return match.replace(g1, newRel);
    if (g2) return match.replace(g2, newRel);
    if (g3) return match.replace(g3, newRel);
    return match;
  });

  if (path.extname(filePath).toLowerCase() === '.css') {
    updated = updated.replace(cssUrlRegex, (match, quote, urlPath) => {
      let resolved = tryResolveImportAbsolute(filePath, urlPath);
      if (!resolved) {
        resolved = tryResolveWithDesktopPrefixes(filePath, urlPath);
      }
      if (!resolved) return match;
      if (!toPosix(resolved).includes(toPosix(DESKTOP_ROOT))) return match;
      const newRel = options.filesystemOnly
        ? toPosix(path.relative(path.dirname(filePath), resolved)).replace(/^[^\.]/, r => `./${r}`)
        : computeNewRelative(filePath, resolved, plan);
      const q = quote || '';
      return `url(${q}${newRel}${q})`;
    });
  }

  if (updated !== original) {
    await fs.writeFile(filePath, updated, 'utf8');
    return true;
  }
  return false;
}

async function buildRenamePlan() {
  const items = await walk(DESKTOP_ROOT);
  const plan = new Map();
  for (const { path: fullPath } of items) {
    const parent = path.dirname(fullPath);
    const base = path.basename(fullPath);
    const newBase = computeNewBasename(base);
    if (newBase !== base) {
      plan.set(fullPath, path.join(parent, newBase));
    }
  }
  return plan;
}

async function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function safeRename(oldAbs, newAbs, options = { retries: 3, backoffMs: 200 }) {
  // If destination already exists and is same inode type, skip
  if (fssync.existsSync(newAbs)) {
    return 'exists';
  }
  let attempt = 0;
  let lastErr;
  while (attempt <= options.retries) {
    try {
      await fs.rename(oldAbs, newAbs);
      return 'renamed';
    } catch (err) {
      lastErr = err;
      // On Windows/OneDrive EPERM or EXDEV/EEXIST, fallback to copy+remove
      if (['EPERM', 'EXDEV', 'EEXIST', 'EBUSY'].includes(err.code)) {
        try {
          await fs.mkdir(path.dirname(newAbs), { recursive: true });
          await fs.cp(oldAbs, newAbs, { recursive: true, force: false, errorOnExist: false });
          await fs.rm(oldAbs, { recursive: true, force: true });
          return 'copied';
        } catch (copyErr) {
          lastErr = copyErr;
        }
      }
      attempt += 1;
      if (attempt <= options.retries) {
        await delay(options.backoffMs * attempt);
      }
    }
  }
  throw lastErr;
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const isDryRun = args.has('--dry-run');
  const isConfirm = args.has('--confirm');
  const continueOnError = args.has('--continue-on-error');
  const fixImportsOnly = args.has('--fix-imports-only');
  const fixImportForms = args.has('--fix-import-forms');

  if (!await exists(DESKTOP_ROOT)) {
    console.error(`Cannot find ${DESKTOP_ROOT}. Run from project root.`);
    process.exit(1);
  }

  if (fixImportsOnly) {
    log('Fixing imports based on current filesystem...');
    const entries = await walk(DESKTOP_ROOT);
    const codeFiles = entries.map(e => e.path).filter(p => isCodeFile(p));
    let changed = 0;
    for (const file of codeFiles) {
      const did = await updateFileImports(file, new Map(), { filesystemOnly: true });
      if (did) changed += 1;
    }
    log(`Fixed imports in ${changed} files.`);
    process.exit(0);
  }

  if (fixImportForms) {
    log('Fixing import forms (default vs named) based on module exports...');
    const entries = await walk(DESKTOP_ROOT);
    const codeFiles = entries.map(e => e.path).filter(p => isCodeFile(p));

    function analyzeExports(targetPath) {
      try {
        const src = fssync.readFileSync(targetPath, 'utf8');
        const hasDefault = /\bexport\s+default\b/.test(src) || /\bexport\s*\{[^}]*\bdefault\b[^}]*\}/.test(src);
        const named = new Set();
        const namedRegexes = [
          /\bexport\s+const\s+(\w+)/g,
          /\bexport\s+function\s+(\w+)/g,
          /\bexport\s+class\s+(\w+)/g,
          /\bexport\s*\{([^}]+)\}/g
        ];
        for (const re of namedRegexes) {
          let m;
          while ((m = re.exec(src))) {
            if (re === namedRegexes[3]) {
              const inner = m[1];
              inner.split(',').map(s => s.trim()).forEach(chunk => {
                if (!chunk) return;
                const [left, right] = chunk.split(/\s+as\s+/);
                const name = (right || left || '').trim();
                if (name) named.add(name);
              });
            } else {
              named.add(m[1]);
            }
          }
        }
        return { hasDefault, named };
      } catch {
        return { hasDefault: false, named: new Set() };
      }
    }

    function replaceImportLine(line, filePath) {
      // handle: import X from 'path'; import { X } from 'path'; import { default as X } from 'path';
      const m = line.match(/^\s*import\s+(.+)\s+from\s+['"]([^'"]+)['"];?\s*$/);
      if (!m) return null;
      const clause = m[1];
      const spec = m[2];
      if (!spec.startsWith('.') && !spec.startsWith('/')) return null;
      let target = tryResolveImportAbsolute(filePath, spec) || tryResolveWithDesktopPrefixes(filePath, spec);
      if (!target) return null;
      const { hasDefault, named } = analyzeExports(target);

      // import { X } from path
      const namedImport = clause.match(/^\{\s*([^}]+)\s*\}$/);
      // import X from path
      const defaultImport = clause.match(/^(\w+)(?:\s*,\s*\{[^}]+\})?$/);
      // import { default as X } from path
      const defaultAs = clause.match(/^\{\s*default\s+as\s+(\w+)\s*\}$/);

      let newLine = null;
      if (defaultAs && hasDefault) {
        const local = defaultAs[1];
        newLine = line.replace(clause, `${local}`);
      } else if (namedImport) {
        const namesRaw = namedImport[1].split(',').map(s => s.trim());
        if (namesRaw.length === 1) {
          const single = namesRaw[0];
          const aliasMatch = single.match(/^(\w+)\s+as\s+(\w+)$/);
          const imported = aliasMatch ? aliasMatch[1] : single;
          const local = aliasMatch ? aliasMatch[2] : imported;
          if (hasDefault && !named.has(imported)) {
            // switch to default import with same local name
            newLine = line.replace(clause, `${local}`);
          }
        }
      } else if (defaultImport) {
        const local = defaultImport[1];
        if (!hasDefault) {
          if (named.has(local)) {
            newLine = line.replace(clause, `{ ${local} }`);
          } else if (named.size === 1) {
            const only = Array.from(named)[0];
            if (only === local) {
              newLine = line.replace(clause, `{ ${local} }`);
            } else {
              newLine = line.replace(clause, `{ ${only} as ${local} }`);
            }
          }
        }
      }
      return newLine;
    }

    let filesChanged = 0;
    for (const file of codeFiles) {
      let text = fssync.readFileSync(file, 'utf8');
      const lines = text.split(/\r?\n/);
      let changed = false;
      for (let i = 0; i < lines.length; i++) {
        const newLine = replaceImportLine(lines[i], file);
        if (newLine && newLine !== lines[i]) {
          lines[i] = newLine;
          changed = true;
        }
      }
      if (changed) {
        fssync.writeFileSync(file, lines.join('\n'), 'utf8');
        filesChanged += 1;
      }
    }
    log(`Adjusted import forms in ${filesChanged} files.`);
    process.exit(0);
  }

  if (!isDryRun && !isConfirm) {
    console.log('Usage:');
    console.log('  node scripts/prefix-desktop.cjs --dry-run');
    console.log('  node scripts/prefix-desktop.cjs --confirm');
    console.log('  node scripts/prefix-desktop.cjs --fix-imports-only');
    console.log('  node scripts/prefix-desktop.cjs --fix-import-forms');
    process.exit(0);
  }

  log('Scanning tree...');
  const entries = await walk(DESKTOP_ROOT);
  const plan = await buildRenamePlan();

  const renames = Array.from(plan.entries());
  if (renames.length === 0) {
    log('No files or directories need prefixing.');
    process.exit(0);
  }

  log(`Planned renames: ${renames.length}`);
  for (const [oldP, newP] of renames) {
    console.log(`  ${toPosix(path.relative(PROJECT_ROOT, oldP))} -> ${toPosix(path.relative(PROJECT_ROOT, newP))}`);
  }

  const codeFiles = entries.map(e => e.path).filter(p => isCodeFile(p));
  if (isDryRun) {
    log(`Dry-run: would update imports in ${codeFiles.length} files.`);
    process.exit(0);
  }

  log(`Updating imports in ${codeFiles.length} files...`);
  let changedCount = 0;
  for (const file of codeFiles) {
    const changed = await updateFileImports(file, plan);
    if (changed) changedCount += 1;
  }
  log(`Updated imports in ${changedCount} files.`);

  const allOldPaths = Array.from(plan.keys());
  const ordered = sortByDepthDesc(allOldPaths);
  log('Applying renames (deepest first)...');
  for (const oldAbs of ordered) {
    const newAbs = plan.get(oldAbs);
    if (!newAbs) continue;
    const destDir = path.dirname(newAbs);
    if (!fssync.existsSync(destDir)) {
      await fs.mkdir(destDir, { recursive: true });
    }
    try {
      const result = await safeRename(oldAbs, newAbs);
      log(`${result === 'copied' ? 'Moved' : 'Renamed'}: ${toPosix(path.relative(PROJECT_ROOT, oldAbs))} -> ${toPosix(path.relative(PROJECT_ROOT, newAbs))}`);
    } catch (err) {
      console.error(`[prefix-desktop] Failed to move ${oldAbs} -> ${newAbs}:`, err.message || err);
      if (!continueOnError) {
        throw err;
      }
    }
  }

  // Final touch-up
  const newEntries = await walk(DESKTOP_ROOT);
  const newCodeFiles = newEntries.map(e => e.path).filter(p => isCodeFile(p));
  let finalChanged = 0;
  for (const file of newCodeFiles) {
    const changed = await updateFileImports(file, plan);
    if (changed) finalChanged += 1;
  }
  log(`Final import touch-ups in ${finalChanged} files.`);
  log('Done.');
}

main().catch(err => {
  console.error('[prefix-desktop] Error:', err);
  process.exit(1);
});


