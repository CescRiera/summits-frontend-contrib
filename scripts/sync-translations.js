const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../src/shared/locales');
const enFilePath = path.join(localesDir, 'en.json');

const enData = JSON.parse(fs.readFileSync(enFilePath, 'utf8'));

// Helper to deeply merge/sync keys from source Object to target Object
function syncKeys(source, target) {
  let changes = 0;
  for (const key in source) {
    if (typeof source[key] === 'object' && source[key] !== null) {
      if (!target[key] || typeof target[key] !== 'object') {
        target[key] = Array.isArray(source[key]) ? [] : {};
        changes++;
      }
      changes += syncKeys(source[key], target[key]);
    } else {
      if (!(key in target)) {
        target[key] = source[key];
        changes++;
      }
    }
  }
  return changes;
}

const files = fs.readdirSync(localesDir).filter(f => f.endsWith('.json') && f !== 'en.json');

for (const file of files) {
  const filePath = path.join(localesDir, file);
  let targetData;
  try {
    targetData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    console.error(`Failed to parse ${file}:`, e.message);
    continue;
  }
  
  const changes = syncKeys(enData, targetData);
  
  if (changes > 0) {
    fs.writeFileSync(filePath, JSON.stringify(targetData, null, 2) + '\n', 'utf8');
    console.log(`Synced ${changes} missing keys to ${file}`);
  } else {
    console.log(`${file} is already up to date with en.json`);
  }
}

console.log('Synchronization complete.');
