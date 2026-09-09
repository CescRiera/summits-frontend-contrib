import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOCALES_DIR = path.join(__dirname, '../src/shared/locales');

/**
 * Flatens a nested object into a single-level object with dot-separated keys
 */
function flattenObject(obj, prefix = '') {
  let keys = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        Object.assign(keys, flattenObject(obj[key], fullKey));
      } else {
        keys[fullKey] = true;
      }
    }
  }
  return keys;
}

function checkTranslations() {
  const files = fs.readdirSync(LOCALES_DIR).filter(file => file.endsWith('.json'));
  const languages = {};

  console.log(`Found ${files.length} translation files: ${files.join(', ')}\n`);

  // Load and flatten all languages
  files.forEach(file => {
    const lang = path.basename(file, '.json');
    const raw = fs.readFileSync(path.join(LOCALES_DIR, file), 'utf8').replace(/^\uFEFF/, '');
    const content = JSON.parse(raw);
    languages[lang] = {
      keys: flattenObject(content),
      filename: file
    };
  });

  const langNames = Object.keys(languages);
  let totalDiscrepancies = 0;

  // Compare every pair
  for (let i = 0; i < langNames.length; i++) {
    for (let j = 0; j < langNames.length; j++) {
      if (i === j) continue;

      const langA = langNames[i];
      const langB = langNames[j];
      
      const keysA = Object.keys(languages[langA].keys);
      const keysB = languages[langB].keys;

      const missingInB = keysA.filter(key => !keysB[key]);

      if (missingInB.length > 0) {
        totalDiscrepancies += missingInB.length;
        console.log(`[\u2717] ${langB.toUpperCase()} is missing ${missingInB.length} keys found in ${langA.toUpperCase()}:`);
        missingInB.forEach(key => console.log(`    - ${key}`));
        console.log('');
      }
    }
  }

  if (totalDiscrepancies === 0) {
    console.log('[\u2713] All translation files are synchronized! No missing keys found.');
  } else {
    console.log(`Found a total of ${totalDiscrepancies} missing keys across all comparisons.`);
  }
}

try {
  checkTranslations();
} catch (error) {
  console.error('Error running translation check:', error.message);
  process.exit(1);
}
