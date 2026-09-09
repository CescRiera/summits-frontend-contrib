import fs from 'fs';

const en = JSON.parse(fs.readFileSync('src/shared/locales/en.json', 'utf8'));

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

const langs = ['ru', 'zh', 'eu'];
langs.forEach(lang => {
    const path = `src/shared/locales/${lang}.json`;
    console.log(`Syncing ${path}...`);
    sync(path);
});

console.log('Sync complete');
