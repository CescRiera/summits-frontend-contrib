import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import en from "../locales/en.json";
import ca from "../locales/ca.json";
import es from "../locales/es.json";
import fr from "../locales/fr.json";
import it from "../locales/it.json";
import de from "../locales/de.json";
import eu from "../locales/eu.json";
import ja from "../locales/ja.json";
import no from "../locales/no.json";
import pl from "../locales/pl.json";
import pt from "../locales/pt.json";
import ru from "../locales/ru.json";
import zh from "../locales/zh.json";
import {
  DEFAULT_LANGUAGE,
  getIntlLocale,
  isAppLanguage,
  type AppLanguageCode,
} from "../i18n/languages";

const translations: Record<AppLanguageCode, any> = {
  en,
  ca,
  es,
  fr,
  it,
  de,
  eu,
  ja,
  no,
  pl,
  pt,
  ru,
  zh,
};
const fallbackLang = DEFAULT_LANGUAGE;

function detectBrowserLanguage(): AppLanguageCode {
  const lang = getIntlLocale(navigator.language || fallbackLang);
  if (lang && isAppLanguage(lang) && translations[lang]) return lang;
  return fallbackLang;
}

function interpolate(str: string, params?: Record<string, any>) {
  if (!params) return str;
  return str
    .replace(/\{\{(\w+)\}\}/g, (_, k) => params[k] ?? "")
    .replace(/\{(\w+)\}/g, (_, k) => params[k] ?? "");
}

export const I18nContext = createContext<
  | {
      t: (key: string, params?: Record<string, any>) => string;
      language: string;
      setLanguage: (lang: string) => void;
    }
  | undefined
>(undefined);

export const useI18n = () => {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
};

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [language, setLanguageState] = useState<AppLanguageCode>(() => {
    const stored = localStorage.getItem("language");
    if (stored) {
      const normalizedStored = getIntlLocale(stored);
      if (translations[normalizedStored]) return normalizedStored;
    }
    const detected = detectBrowserLanguage();
    localStorage.setItem("language", detected);
    return detected;
  });

  useEffect(() => {
    localStorage.setItem("language", language);
  }, [language]);

  const t = useCallback(
    (key: string, params?: Record<string, any>) => {
      const keys = key.split(".");

      const getValue = (lang: AppLanguageCode) => {
        let val = translations[lang] as any;
        for (const k of keys) {
          val = val?.[k];
          if (val === undefined) break;
        }

        // Handle pluralization if key is not found directly but count is provided
        if (val === undefined && params && typeof params["count"] === "number") {
          const parentKey = keys.slice(0, -1);
          const lastKey = keys[keys.length - 1];
          const pluralSuffix = params["count"] === 1 ? "_one" : "_other";
          
          let parent = translations[lang] as any;
          for (const pk of parentKey) {
            parent = parent?.[pk];
            if (parent === undefined) break;
          }
          
          if (parent) {
            val = parent[`${lastKey}${pluralSuffix}`];
          }
        }
        return val;
      };

      let value = getValue(language);

      // fallback to English
      if (value === undefined && language !== fallbackLang) {
        value = getValue(fallbackLang);
      }

      if (typeof value === "string") return interpolate(value, params);
      return key;
    },
    [language]
  );

  const setLanguage = useCallback((lang: string) => {
    if (isAppLanguage(lang) && translations[lang]) setLanguageState(lang);
  }, []);

  return (
    <I18nContext.Provider value={{ t, language, setLanguage }}>
      {children}
    </I18nContext.Provider>
  );
};





















































