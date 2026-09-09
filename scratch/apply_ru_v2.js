import fs from 'fs';

const translations = {
    ru: {
        peakLists: {
            addPeaks: "Добавить вершины",
            selectPeaks: "Выбрать вершины",
            selectedPeaks: "Выбранные вершины",
            noPeaksSelected: "Вершины еще не выбраны. Найдите и выберите вершины, чтобы добавить их в челлендж.",
            saveSuccess: "Челлендж успешно сохранен!",
            saveError: "Не удалось сохранить челлендж. Пожалуйста, попробуйте снова.",
            loadError: "Не удалось загрузить челлендж. Пожалуйста, попробуйте снова.",
            validation: {
                nameRequired: "Укажите название челленджа.",
                descriptionRequired: "Описание обязательно.",
                imageRequired: "Изображение обложки обязательно.",
                peaksRequired: "Выберите хотя бы одну вершину.",
                startDateInvalid: "Введите правильную дату начала.",
                endDateInvalid: "Введите правильную дату окончания.",
                endDateBeforeStart: "Дата окончания должна быть позже даты начала.",
                maxDurationInvalid: "Введите допустимую максимальную продолжительность (больше 0)."
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

applyTranslations('ru');
