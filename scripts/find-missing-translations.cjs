const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../src/shared/locales');
const enFilePath = path.join(localesDir, 'en.json');

const enData = JSON.parse(fs.readFileSync(enFilePath, 'utf8'));

function getMissingKeys(source, target, path = '') {
  let missing = [];
  for (const key in source) {
    const currentPath = path ? `${path}.${key}` : key;
    if (typeof source[key] === 'object' && source[key] !== null) {
      if (!target[key] || typeof target[key] !== 'object') {
        missing.push(currentPath);
      } else {
        missing = missing.concat(getMissingKeys(source[key], target[key], currentPath));
      }
    } else {
      if (!(key in target)) {
        missing.push(currentPath);
      }
    }
  }
  return missing;
}

const files = fs.readdirSync(localesDir).filter(f => f.endsWith('.json') && f !== 'en.json');

console.log('Missing keys relative to en.json:');
for (const file of files) {
  const filePath = path.join(localesDir, file);
  try {
    const targetData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const missing = getMissingKeys(enData, targetData);
    console.log(`${file}: ${missing.length} missing keys`);
  } catch (e) {
    console.log(`${file}: Error parsing - ${e.message}`);
  }
}
