import fs from 'fs';

const translations = {
    zh: {
        peakLists: {
            addPeaks: "添加山峰",
            selectPeaks: "选择山峰",
            selectedPeaks: "已选山峰",
            noPeaksSelected: "尚未选择山峰。搜索并选择山峰以将其添加到您的挑战中。",
            saveSuccess: "挑战保存成功！",
            saveError: "保存挑战失败。请重试。",
            loadError: "加载挑战失败。请重试。",
            validation: {
                nameRequired: "挑战名称是必填项。",
                descriptionRequired: "描述是必填项。",
                imageRequired: "封面图片是必填项。",
                peaksRequired: "请至少选择一座山峰。",
                startDateInvalid: "请输入有效的开始日期。",
                endDateInvalid: "请输入有效的结束日期。",
                endDateBeforeStart: "结束日期必须在开始日期之后。",
                maxDurationInvalid: "请输入大于 0 的有效最大持续时间。"
            }
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
        console.log(`Applied additional translations to ${path}`);
    }
}

applyTranslations('zh');
