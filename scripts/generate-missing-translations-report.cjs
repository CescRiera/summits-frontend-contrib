const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../src/shared/locales');
const enFilePath = path.join(localesDir, 'en.json');

const enData = JSON.parse(fs.readFileSync(enFilePath, 'utf8'));

function getMissingTranslations(source, target, result = {}) {
  for (const key in source) {
    if (typeof source[key] === 'object' && source[key] !== null) {
      if (!target[key] || typeof target[key] !== 'object') {
        result[key] = source[key];
      } else {
        const subResult = getMissingTranslations(source[key], target[key]);
        if (Object.keys(subResult).length > 0) {
          result[key] = subResult;
        }
      }
    } else {
      if (!(key in target)) {
        result[key] = source[key];
      }
    }
  }
  return result;
}

const files = fs.readdirSync(localesDir).filter(f => f.endsWith('.json') && f !== 'en.json');

for (const file of files) {
  const filePath = path.join(localesDir, file);
  try {
    const targetData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const missing = getMissingTranslations(enData, targetData);
    if (Object.keys(missing).length > 0) {
      console.log(`--- MISSING FOR ${file} ---`);
      console.log(JSON.stringify(missing, null, 2));
      console.log(`--- END ${file} ---\n`);
    }
  } catch (e) {
    console.log(`${file}: Error parsing - ${e.message}`);
  }
}
