import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Recursively extract all keys from a nested object
 */
function extractKeys(obj, prefix = '') {
  const keys = [];
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        keys.push(...extractKeys(obj[key], fullKey));
      } else {
        keys.push(fullKey);
      }
    }
  }
  return keys;
}

/**
 * Recursively get all files in a directory
 */
function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);
  files.forEach((file) => {
    const filePath = path.join(dirPath, file);
    if (fs.statSync(filePath).isDirectory()) {
      if (!['node_modules', '.git', 'dist', 'build', '.agent'].includes(file)) {
        arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
      }
    } else {
      if (/\.(ts|tsx|js|jsx|html)$/.test(file)) {
        arrayOfFiles.push(filePath);
      }
    }
  });
  return arrayOfFiles;
}

function main() {
  const localesDir = path.join(__dirname, '../src/shared/locales');
  const enPath = path.join(localesDir, 'en.json');
  
  if (!fs.existsSync(enPath)) {
    console.error('English locale file not found at:', enPath);
    process.exit(1);
  }

  console.log('📖 Loading keys from en.json...');
  const enData = JSON.parse(fs.readFileSync(enPath, 'utf-8'));
  const allKeys = extractKeys(enData);
  console.log(`✅ Found ${allKeys.length} total keys.\n`);

  const srcDir = path.join(__dirname, '../src');
  console.log('📂 Scanning source files for translation usage...');
  const sourceFiles = getAllFiles(srcDir);
  console.log(`   Found ${sourceFiles.length} source files.\n`);

  const sourceFilesData = sourceFiles.map(file => ({
    path: file,
    content: fs.readFileSync(file, 'utf-8')
  }));

  const allSourceContent = sourceFilesData.map(f => f.content).join('\n');

  console.log('🔍 Analyzing usage patterns...');

  // 1. Identify dynamic translation patterns
  // Pattern 1: t(`prefix.${variable}`)
  // Pattern 2: t('prefix.' + variable)
  // Pattern 3: key: "prefix." + variable
  const dynamicPatterns = [];
  const dynamicRegex = /t\(\s*[`"']([^`"']*\$\{|\w+\s*\+\s*[`"']|[`"'][^`"']*\.[`"']\s*\+\s*\w+)/g;
  
  let match;
  const dynamicPrefixes = new Set();
  
  // Also look for template literals inside t() calls
  const templateLiteralRegex = /t\(\s*`([^`]*)`/g;
  while ((match = templateLiteralRegex.exec(allSourceContent)) !== null) {
    const content = match[1];
    if (content.includes('${')) {
      const prefix = content.split('${')[0];
      if (prefix) dynamicPrefixes.add(prefix);
    }
  }

  // Look for concatenation
  const concatRegex = /t\(\s*['"]([^'"]+)['"]\s*\+/g;
  while ((match = concatRegex.exec(allSourceContent)) !== null) {
    dynamicPrefixes.add(match[1]);
  }

  if (dynamicPrefixes.size > 0) {
    console.log(`📡 Detected these dynamic prefixes (usage like t(\`prefix.\${var}\`)):`);
    dynamicPrefixes.forEach(p => console.log(`   - ${p}`));
    console.log('');
  }

  const unusedKeys = [];
  const usedKeys = [];
  const potentiallyDynamicKeys = [];

  for (const key of allKeys) {
    // Check for explicit literal usage
    const isExplicitlyUsed = 
      allSourceContent.includes(`"${key}"`) || 
      allSourceContent.includes(`'${key}'`) || 
      allSourceContent.includes(`\`${key}\``);

    if (isExplicitlyUsed) {
      usedKeys.push(key);
      continue;
    }

    // Check if it matches any dynamic prefix
    let matchesDynamic = false;
    for (const prefix of dynamicPrefixes) {
      if (key.startsWith(prefix)) {
        matchesDynamic = true;
        break;
      }
    }

    if (matchesDynamic) {
      potentiallyDynamicKeys.push(key);
    } else {
      unusedKeys.push(key);
    }
  }

  console.log('📊 Result Analysis:');
  console.log(`✅ Explicitly used: ${usedKeys.length}`);
  console.log(`📡 Potentially dynamic: ${potentiallyDynamicKeys.length}`);
  console.log(`⚠️  Likely unused: ${unusedKeys.length}`);
  console.log('');

  if (potentiallyDynamicKeys.length > 0) {
    console.log('⚡ POTENTIALLY DYNAMIC KEYS (Keep these for safety):');
    const groupedDynamic = groupKeys(potentiallyDynamicKeys);
    printGrouped(groupedDynamic);
    console.log('');
  }

  if (unusedKeys.length > 0) {
    console.log('❌ LIKELY UNUSED KEYS (Safe to double-check and delete):');
    const groupedUnused = groupKeys(unusedKeys);
    printGrouped(groupedUnused);
  }

  console.log('\n' + '='.repeat(60));
  console.log('Summary: Check "LIKELY UNUSED" section first. "POTENTIALLY DYNAMIC" are keys where');
  console.log('the code contains patterns like t(`category.${var}`), so they might be used.');
  console.log('='.repeat(60) + '\n');
}

function groupKeys(keys) {
  const grouped = {};
  keys.forEach(key => {
    const cat = key.split('.')[0];
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(key);
  });
  return grouped;
}

function printGrouped(grouped) {
  for (const cat in grouped) {
    console.log(`📦 [${cat}]`);
    if (grouped[cat].length > 10) {
      console.log(`   - ${grouped[cat][0]}`);
      console.log(`   - ... and ${grouped[cat].length - 1} more`);
    } else {
      grouped[cat].forEach(key => console.log(`   - ${key}`));
    }
  }
}

main();
