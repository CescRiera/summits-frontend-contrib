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

/**
 * Remove a key from a nested object
 */
function removeKey(obj, keyPath) {
  const parts = keyPath.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!current[parts[i]]) return;
    current = current[parts[i]];
  }
  delete current[parts[parts.length - 1]];

  // Clean up empty parent objects
  for (let i = parts.length - 2; i >= 0; i--) {
    let parent = obj;
    for (let j = 0; j < i; j++) parent = parent[parts[j]];
    const currentKey = parts[i];
    if (Object.keys(parent[currentKey]).length === 0) {
      delete parent[currentKey];
    } else {
      break;
    }
  }
}

function main() {
  const localesDir = path.join(__dirname, '../src/shared/locales');
  const enPath = path.join(localesDir, 'en.json');
  
  if (!fs.existsSync(enPath)) {
    console.error('English locale file not found');
    process.exit(1);
  }

  const enData = JSON.parse(fs.readFileSync(enPath, 'utf-8'));
  const allKeys = extractKeys(enData);

  const srcDir = path.join(__dirname, '../src');
  const sourceFiles = getAllFiles(srcDir);

  let allSourceContent = '';
  for (const file of sourceFiles) {
    allSourceContent += fs.readFileSync(file, 'utf-8') + '\n';
  }

  const dynamicPrefixes = new Set();
  const templateLiteralRegex = /t\(\s*`([^`]*)`/g;
  let match;
  while ((match = templateLiteralRegex.exec(allSourceContent)) !== null) {
    const content = match[1];
    if (content.includes('${')) {
      const prefix = content.split('${')[0];
      if (prefix) dynamicPrefixes.add(prefix);
    }
  }

  const concatRegex = /t\(\s*['"]([^'"]+)['"]\s*\+/g;
  while ((match = concatRegex.exec(allSourceContent)) !== null) {
    dynamicPrefixes.add(match[1]);
  }

  const unusedKeys = [];
  for (const key of allKeys) {
    const isExplicitlyUsed = 
      allSourceContent.includes(`"${key}"`) || 
      allSourceContent.includes(`'${key}'`) || 
      allSourceContent.includes(`\`${key}\``);

    if (isExplicitlyUsed) continue;

    let matchesDynamic = false;
    for (const prefix of dynamicPrefixes) {
      if (key.startsWith(prefix)) {
        matchesDynamic = true;
        break;
      }
    }

    if (!matchesDynamic) {
      unusedKeys.push(key);
    }
  }

  if (unusedKeys.length === 0) {
    console.log('No unused keys to delete.');
    return;
  }

  console.log(`🗑️ Deleting ${unusedKeys.length} unused keys from all locale files...`);

  const localeFiles = fs.readdirSync(localesDir).filter(f => f.endsWith('.json'));
  
  for (const file of localeFiles) {
    const filePath = path.join(localesDir, file);
    console.log(`   Processing ${file}...`);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    
    unusedKeys.forEach(key => removeKey(data, key));
    
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  console.log('\n✅ Cleanup complete! All locale files have been pruned.');
}

main();
