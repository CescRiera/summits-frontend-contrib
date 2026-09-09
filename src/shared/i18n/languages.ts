export type AppLanguageCode =
  | "en"
  | "es"
  | "ca"
  | "fr"
  | "it"
  | "de"
  | "eu"
  | "ja"
  | "no"
  | "pl"
  | "pt"
  | "ru"
  | "zh";

export interface AppLanguageOption {
  code: AppLanguageCode;
  nativeName: string;
  flag: string;
  ogLocale: string;
}

export const DEFAULT_LANGUAGE: AppLanguageCode = "en";

export const APP_LANGUAGE_OPTIONS: readonly AppLanguageOption[] = [
  {
    code: "en",
    nativeName: "English",
    flag: "/icons/flags/en.png",
    ogLocale: "en_US",
  },
  {
    code: "es",
    nativeName: "Espa\u00f1ol",
    flag: "/icons/flags/es.png",
    ogLocale: "es_ES",
  },
  {
    code: "ca",
    nativeName: "Catal\u00e0",
    flag: "/icons/flags/ca.png",
    ogLocale: "ca_ES",
  },
  {
    code: "fr",
    nativeName: "Fran\u00e7ais",
    flag: "/icons/flags/fr.png",
    ogLocale: "fr_FR",
  },
  {
    code: "it",
    nativeName: "Italiano",
    flag: "/icons/flags/it.png",
    ogLocale: "it_IT",
  },
  {
    code: "de",
    nativeName: "Deutsch",
    flag: "/icons/flags/de.png",
    ogLocale: "de_DE",
  },
  {
    code: "eu",
    nativeName: "Euskara",
    flag: "/icons/flags/eu_v2.svg",
    ogLocale: "eu_ES",
  },
  {
    code: "ja",
    nativeName: "\u65e5\u672c\u8a9e",
    flag: "/icons/flags/jp.png",
    ogLocale: "ja_JP",
  },
  {
    code: "no",
    nativeName: "Norsk",
    flag: "/icons/flags/no.png",
    ogLocale: "nb_NO",
  },
  {
    code: "pl",
    nativeName: "Polski",
    flag: "/icons/flags/pl.png",
    ogLocale: "pl_PL",
  },
  {
    code: "pt",
    nativeName: "Portugu\u00eas",
    flag: "/icons/flags/pt.png",
    ogLocale: "pt_PT",
  },
  {
    code: "ru",
    nativeName: "\u0420\u0443\u0441\u0441\u043a\u0438\u0439",
    flag: "/icons/flags/ru.png",
    ogLocale: "ru_RU",
  },
  {
    code: "zh",
    nativeName: "\u4e2d\u6587",
    flag: "/icons/flags/zh.png",
    ogLocale: "zh_CN",
  },
];

export const APP_LANGUAGE_CODES: readonly AppLanguageCode[] =
  APP_LANGUAGE_OPTIONS.map((language) => language.code);

const APP_LANGUAGE_CODE_SET = new Set<AppLanguageCode>(APP_LANGUAGE_CODES);

const OG_LOCALE_BY_LANGUAGE: Record<AppLanguageCode, string> =
  APP_LANGUAGE_OPTIONS.reduce(
    (acc, language) => {
      acc[language.code] = language.ogLocale;
      return acc;
    },
    {} as Record<AppLanguageCode, string>
  );

export const isAppLanguage = (value: string): value is AppLanguageCode => {
  return APP_LANGUAGE_CODE_SET.has(value as AppLanguageCode);
};

export const getIntlLocale = (language: string): AppLanguageCode => {
  const normalized = language.toLowerCase();
  if (isAppLanguage(normalized)) return normalized;

  const languageBase = normalized.split("-")[0];
  if (languageBase && isAppLanguage(languageBase)) return languageBase;

  return DEFAULT_LANGUAGE;
};

export const getOpenGraphLocale = (language: string): string => {
  const locale = getIntlLocale(language);
  return OG_LOCALE_BY_LANGUAGE[locale];
};
