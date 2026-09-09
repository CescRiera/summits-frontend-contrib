import fs from 'fs';

const en = JSON.parse(fs.readFileSync('src/shared/locales/en.json', 'utf8'));

function findIdentical(target, master, path = '') {
    let count = 0;
    for (const key in master) {
        const currentPath = path ? `${path}.${key}` : key;
        if (typeof master[key] === 'object' && master[key] !== null) {
            count += findIdentical(target[key] || {}, master[key], currentPath);
        } else {
            if (target[key] === master[key] && master[key] !== '') {
                // If it's a short string, it might be the same in both languages (e.g. "Km", "GPS")
                // but if it's long, it's definitely a fallback.
                if (master[key].length > 5) {
                    count++;
                }
            }
        }
    }
    return count;
}

['ru', 'zh', 'eu'].forEach(lang => {
    const data = JSON.parse(fs.readFileSync(`src/shared/locales/${lang}.json`, 'utf8'));
    const identical = findIdentical(data, en);
    console.log(`${lang}.json: ~${identical} keys likely using English fallback.`);
});
