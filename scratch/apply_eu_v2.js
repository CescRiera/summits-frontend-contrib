import fs from 'fs';

const translations = {
    eu: {
        common: {
            save: "Gorde",
            cancel: "Utzi",
            delete: "Ezabatu",
            edit: "Editatu",
            search: "Bilatu",
            loading: "Kargatzen...",
            error: "Errorea",
            success: "Arrakasta",
            next: "Hurrengoa",
            back: "Atzera",
            close: "Itxi",
            ok: "Ados"
        },
        auth: {
            login: {
                title: "Hasi saioa",
                submit: "Hasi saioa",
                noAccount: "Ez duzu konturik?",
                register: "Erregistratu",
                forgotPassword: "Pasahitza ahaztu duzu?"
            },
            register: {
                title: "Erregistratu",
                submit: "Erregistratu",
                haveAccount: "Dagoeneko baduzu kontua?",
                login: "Hasi saioa"
            }
        },
        navigation: {
            home: "Hasiera",
            explore: "Arakatu",
            profile: "Profila",
            settings: "Ezarpenak",
            peaks: "Tontorrak"
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
        console.log(`Applied additional UI translations to ${path}`);
    }
}

applyTranslations('eu');
