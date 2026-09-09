import fs from 'fs';
import path from 'path';

const localesDir = 'src/shared/locales';
const masterFile = path.join(localesDir, 'en.json');
const en = JSON.parse(fs.readFileSync(masterFile, 'utf8'));

function sync(targetPath) {
    const target = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
    const result = {};

    function traverse(sourceObj, targetObj, resObj) {
        for (const key in sourceObj) {
            if (typeof sourceObj[key] === 'object' && sourceObj[key] !== null && !Array.isArray(sourceObj[key])) {
                resObj[key] = {};
                traverse(sourceObj[key], targetObj[key] || {}, resObj[key]);
            } else {
                // If target has it and it's not empty, keep it. 
                // Otherwise, use English as fallback.
                resObj[key] = (targetObj[key] && targetObj[key] !== "") ? targetObj[key] : sourceObj[key]; 
            }
        }
    }

    traverse(en, target, result);
    fs.writeFileSync(targetPath, JSON.stringify(result, null, 2), 'utf8');
}

const files = fs.readdirSync(localesDir);
files.forEach(file => {
    if (file.endsWith('.json') && file !== 'en.json') {
        const fullPath = path.join(localesDir, file);
        console.log(`Syncing ${fullPath}...`);
        sync(fullPath);
    }
});

console.log('Universal sync complete');
