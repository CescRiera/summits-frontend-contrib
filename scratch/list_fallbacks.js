import fs from 'fs';

const en = JSON.parse(fs.readFileSync('src/shared/locales/en.json', 'utf8'));

function findIdentical(target, master, path = '') {
    let results = [];
    for (const key in master) {
        const currentPath = path ? `${path}.${key}` : key;
        if (typeof master[key] === 'object' && master[key] !== null) {
            results = results.concat(findIdentical(target[key] || {}, master[key], currentPath));
        } else {
            if (target[key] === master[key] && master[key] !== '' && master[key].length > 5) {
                results.push({ path: currentPath, value: master[key] });
            }
        }
    }
    return results;
}

['ru', 'zh'].forEach(lang => {
    const data = JSON.parse(fs.readFileSync(`src/shared/locales/${lang}.json`, 'utf8'));
    const identical = findIdentical(data, en);
    console.log(`\n--- ${lang}.json identical keys ---`);
    identical.forEach(item => console.log(`${item.path}: ${item.value}`));
});
