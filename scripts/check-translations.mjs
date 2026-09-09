import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Recursively extract all keys from a nested object
 * Returns an array of dot-notation keys (e.g., "common.loading")
 */
function extractKeys(obj, prefix = '') {
  const keys = [];
  
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        // Recursively extract keys from nested objects
        keys.push(...extractKeys(obj[key], fullKey));
      } else {
        // Leaf node - add the key
        keys.push(fullKey);
      }
    }
  }
  
  return keys;
}

/**
 * Load and parse all locale files
 */
function loadLocaleFiles() {
  const localesDir = path.join(__dirname, '../src/shared/locales');
  const files = fs.readdirSync(localesDir).filter(file => file.endsWith('.json'));
  
  const locales = {};
  
  for (const file of files) {
    const filePath = path.join(localesDir, file);
    const localeName = path.basename(file, '.json');
    
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(content);
      locales[localeName] = {
        file: file,
        data: data,
        keys: extractKeys(data)
      };
    } catch (error) {
      console.error(`Error loading ${file}:`, error.message);
    }
  }
  
  return locales;
}

/**
 * Recursively get all files in a directory
 */
function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);
  
  files.forEach((file) => {
    const filePath = path.join(dirPath, file);
    if (fs.statSync(filePath).isDirectory()) {
      // Skip node_modules and other common ignore dirs
      if (!['node_modules', '.git', 'dist', 'build'].includes(file)) {
        arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
      }
    } else {
      // Only check source files
      if (/\.(ts|tsx|js|jsx)$/.test(file)) {
        arrayOfFiles.push(filePath);
      }
    }
  });
  
  return arrayOfFiles;
}

/**
 * Check if a translation key is used in the codebase
 */
function isKeyUsed(key, sourceFiles) {
  // Patterns to search for: t("key"), t('key'), t(`key`), or just the key in quotes
  const patterns = [
    `"${key}"`,
    `'${key}'`,
    `\`${key}\``,
  ];
  
  for (const filePath of sourceFiles) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      
      for (const pattern of patterns) {
        if (content.includes(pattern)) {
          return true;
        }
      }
    } catch (error) {
      // Skip files that can't be read
      continue;
    }
  }
  
  return false;
}

/**
 * Find missing keys in each locale compared to all others
 */
function findMissingKeys(locales) {
  const localeNames = Object.keys(locales);
  const allKeys = new Set();
  
  // Collect all unique keys from all locales
  for (const localeName of localeNames) {
    locales[localeName].keys.forEach(key => allKeys.add(key));
  }
  
  const results = {};
  
  for (const localeName of localeNames) {
    const localeKeys = new Set(locales[localeName].keys);
    const missing = Array.from(allKeys).filter(key => !localeKeys.has(key));
    results[localeName] = missing.sort();
  }
  
  return results;
}

/**
 * Main function
 */
function main() {
  console.log('🔍 Checking translation keys across all locale files...\n');
  
  const locales = loadLocaleFiles();
  const localeNames = Object.keys(locales);
  
  if (localeNames.length === 0) {
    console.error('No locale files found!');
    process.exit(1);
  }
  
  console.log(`Found ${localeNames.length} locale files: ${localeNames.join(', ')}\n`);
  
  // Show key counts
  for (const localeName of localeNames) {
    console.log(`  ${localeName}.json: ${locales[localeName].keys.length} keys`);
  }
  
  console.log('\n' + '='.repeat(60) + '\n');
  
  const missingKeys = findMissingKeys(locales);
  
  let hasMissing = false;
  let totalUsed = 0;
  let totalUnused = 0;
  
  console.log('🔍 Checking which missing keys are actually used in the codebase...\n');
  
  // Get all source files once
  const srcDir = path.join(__dirname, '../src');
  console.log('📂 Scanning source files...');
  const sourceFiles = getAllFiles(srcDir);
  console.log(`   Found ${sourceFiles.length} source files\n`);
  
  for (const localeName of localeNames) {
    const missing = missingKeys[localeName];
    
    if (missing.length > 0) {
      hasMissing = true;
      const usedKeys = [];
      const unusedKeys = [];
      
      console.log(`\n📋 ${localeName}.json - Checking ${missing.length} missing key(s)...\n`);
      
      for (let i = 0; i < missing.length; i++) {
        const key = missing[i];
        process.stdout.write(`\r   Checking ${i + 1}/${missing.length}: ${key.substring(0, 50)}...`);
        const isUsed = isKeyUsed(key, sourceFiles);
        const hasKey = localeNames.filter(name => 
          locales[name].keys.includes(key)
        );
        
        if (isUsed) {
          usedKeys.push({ key, hasKey });
          totalUsed++;
        } else {
          unusedKeys.push({ key, hasKey });
          totalUnused++;
        }
      }
      process.stdout.write('\r' + ' '.repeat(80) + '\r'); // Clear progress line
      
      if (usedKeys.length > 0) {
        console.log(`  ✅ USED (${usedKeys.length}):`);
        for (const { key, hasKey } of usedKeys) {
          console.log(`     - ${key}`);
          console.log(`       (present in: ${hasKey.join(', ')})`);
        }
        console.log('');
      }
      
      if (unusedKeys.length > 0) {
        console.log(`  ⚠️  UNUSED (${unusedKeys.length}):`);
        for (const { key, hasKey } of unusedKeys) {
          console.log(`     - ${key}`);
          console.log(`       (present in: ${hasKey.join(', ')})`);
        }
        console.log('');
      }
    } else {
      console.log(`✅ ${localeName}.json has all keys\n`);
    }
  }
  
  if (!hasMissing) {
    console.log('✅ All locale files have the same keys!');
  } else {
    console.log('\n' + '='.repeat(60));
    console.log('\n📊 Summary:');
    for (const localeName of localeNames) {
      const missing = missingKeys[localeName];
      if (missing.length > 0) {
        const used = missing.filter(k => isKeyUsed(k, sourceFiles)).length;
        const unused = missing.length - used;
        console.log(`  ${localeName}.json: ${missing.length} missing (${used} used, ${unused} unused)`);
      }
    }
    console.log(`\n  Total: ${totalUsed} used keys need translation, ${totalUnused} unused keys can be ignored`);
    
    // Only exit with error if there are used keys missing
    if (totalUsed > 0) {
      process.exit(1);
    }
  }
}

main();

