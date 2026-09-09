import fs from 'fs';

const translations = {
    zh: {
        peakLists: {
            namePlaceholder: "输入挑战名称...",
            descriptionPlaceholder: "此挑战的主题是什么？",
            starts: "开始",
            primaryImage: "封面图片",
            addImage: "添加封面图片",
            noImage: "未提供图片",
            imageUrlPlaceholder: "粘贴图片 URL（例如 https://...）"
        }
    }
};

function applyTranslations(lang) {
    const path = `src/shared/locales/${lang}.json`;
    const data = JSON.parse(fs.readFileSync(path, 'utf8'));
    
    // Deep merge function
    function merge(target, source) {
        for (const key in source) {
            if (typeof source[key] === 'object' && source[key] !== null) {
                if (!target[key]) target[key] = {};
                merge(target[key], source[key]);
            } else {
                target[key] = source[key];
            }
        }
    }

    if (translations[lang]) {
        merge(data, translations[lang]);
        fs.writeFileSync(path, JSON.stringify(data, null, 2), 'utf8');
        console.log(`Finalized ${path}`);
    }
}

applyTranslations('zh');
