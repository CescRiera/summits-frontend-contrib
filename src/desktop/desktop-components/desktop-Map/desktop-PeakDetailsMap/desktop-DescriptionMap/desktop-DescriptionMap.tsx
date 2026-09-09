import React, { useState, useEffect, useRef } from "react";
import styles from "./desktop-DescriptionMap.module.css";
import { getPeakDescription } from "../../../../../shared/api/endpoints/peaks";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useI18n } from "../../../../../shared/context/I18nContext";
import {
  usePeakDetailsAnalytics,
  usePeakDetailsView,
} from "../../../../../shared/hooks/usePeakDetailsAnalytics";

const langToCountry: Record<string, string> = {
  en: "gb",
  es: "es",
  fr: "fr",
  de: "de",
  it: "it",
  pt: "pt",
  ru: "ru",
  zh: "cn",
  ja: "jp",
  ko: "kr",
  nl: "nl",
  pl: "pl",
  uk: "ua",
  ca: "es",
  eu: "es",
  sv: "se",
  da: "dk",
  fi: "fi",
  nn: "no",
  no: "no",
  tr: "tr",
  ro: "ro",
  cs: "cz",
  sk: "sk",
  lt: "lt",
  vi: "vn",
  hr: "hr",
  be: "by",
  az: "az",
  hy: "am",
  fa: "ir",
  ar: "sa",
  cy: "gb",
  eo: "eu",
  ceb: "ph",
  sh: "rs",
  lld: "it",
  ast: "es",
  arz: "eg",
  an: "es",
  gl: "es",
  oc: "fr",
  ka: "ge",
};

type DescriptionProps = {
  peakId: number;
};

const MAX_LINES = 4;

const DescriptionMap: React.FC<DescriptionProps> = ({ peakId }) => {
  const { language: uiLanguage, t } = useI18n();
  const { trackSectionEvent } = usePeakDetailsAnalytics(
    "desktop_map",
    "description",
    peakId
  );
  const [description, setDescription] = useState<{
    description: string;
    source?: string;
    lang_codes: string[];
  } | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [language, setLanguage] = useState<string>("");
  const [langCodes, setLangCodes] = useState<string[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isChangingLanguage, setIsChangingLanguage] = useState(false);

  // Display names cache
  const displayNamesCacheRef = useRef<
    Record<string, Intl.DisplayNames | undefined>
  >({});

  // Height animation refs
  const wrapperRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [measured, setMeasured] = useState({ collapsed: 0, expanded: 0 });
  const [currentHeight, setCurrentHeight] = useState<number | "auto">(0);

  const getLanguageLabel = (code: string): string => {
    let dn = displayNamesCacheRef.current[code];
    if (!dn) {
      try {
        dn = new Intl.DisplayNames([code], { type: "language" });
      } catch {
        try {
          const fallbackLocale = uiLanguage || "en";
          dn = new Intl.DisplayNames([fallbackLocale], { type: "language" });
        } catch {
          dn = undefined;
        }
      }
      displayNamesCacheRef.current[code] = dn;
    }
    const label = dn?.of(code);
    if (label && typeof label === "string") {
      return label.charAt(0).toUpperCase() + label.slice(1);
    }
    return code.toUpperCase();
  };

  // Fetch description. First fetch uses UI language, subsequent fetches only when user changes language
  const initializedRef = useRef(false);
  useEffect(() => {
    if (!peakId) return;

    const isInitial = !initializedRef.current;

    // Avoid immediate re-fetch if the derived initial language equals current state
    if (!isInitial && !language) return;

    // Set loading states appropriately
    if (!isInitial) {
      setIsChangingLanguage(true);
    }

    getPeakDescription(peakId, isInitial ? uiLanguage : language)
      .then(
        (data: {
          description: string;
          source?: string;
          lang_codes: string[];
          language?: string;
        }) => {
          setDescription((prev) => ({ ...prev, ...data }));
          if (isInitial) {
            if (Array.isArray(data.lang_codes) && data.lang_codes.length > 0) {
              setLangCodes(data.lang_codes);
            }
            // Initialize selected language without triggering a same-language re-fetch
            if (!language && data.language && data.language !== language) {
              setLanguage(data.language);
            }
            initializedRef.current = true;
          }
          setIsChangingLanguage(false);
        }
      )
      .catch(() => {
        setIsChangingLanguage(false);
      });
  }, [peakId, language, uiLanguage]);

  // Measure heights for smooth height animation
  useEffect(() => {
    const wrapper = wrapperRef.current;
    const inner = innerRef.current;
    if (!wrapper || !inner) return;

    // Temporarily set to auto to measure expanded
    const prevHeight = wrapper.offsetHeight;
    wrapper.style.height = "auto";
    inner.style.display = "-webkit-box";
    (inner.style as CSSStyleDeclaration & { [key: string]: string })[
      "-webkit-box-orient"
    ] = "vertical";
    (inner.style as CSSStyleDeclaration & { [key: string]: string })[
      "-webkit-line-clamp"
    ] = String(MAX_LINES);
    const collapsedH = inner.offsetHeight;

    inner.style.display = "block";
    (inner.style as CSSStyleDeclaration & { [key: string]: string })[
      "-webkit-line-clamp"
    ] = "unset";
    const expandedH = inner.offsetHeight;

    setMeasured({ collapsed: collapsedH, expanded: expandedH });
    // Restore previous height to prep for animation
    wrapper.style.height = prevHeight + "px";
    // Next frame, set target height
    requestAnimationFrame(() => {
      setCurrentHeight(expanded ? expandedH : collapsedH);
      wrapper.style.height = (expanded ? expandedH : collapsedH) + "px";
    });
  }, [description, expanded, language]);

  const text = description?.description || "";
  const hasData = Boolean(text.trim());
  usePeakDetailsView("desktop_map", "description", hasData, peakId);

  return (
    <section className={styles["description__container"]}>
      {language && (
        <div className={styles["description__header"]}>
          <div className={styles["description__lang-dropdown"]}>
            <button
              className={styles["description__lang-current"]}
              onClick={() => {
                if (isChangingLanguage) return;

                const nextOpen = !dropdownOpen;
                trackSectionEvent(
                  "button_click",
                  nextOpen ? "language_dropdown_open" : "language_dropdown_close"
                );
                setDropdownOpen(nextOpen);
              }}
              type="button"
              disabled={isChangingLanguage}
            >
              {langToCountry[language] && (
                <img
                  src={
                    language === "ca"
                      ? "/icons/flags/ca_v2.svg"
                      : language === "eu"
                      ? "/icons/flags/eu_v2.svg"
                      : `https://flagcdn.com/w20/${langToCountry[language]}.png`
                  }
                  alt={language}
                  className={styles["description__lang-flag"]}
                  loading="lazy"
                />
              )}
              <span className="typography-desktop-body-small">
                {getLanguageLabel(language)}
              </span>
              <ChevronDown
                size={16}
                className={
                  styles["description__lang-chevron"] +
                  (dropdownOpen ? " " + styles["open"] : "") +
                  (isChangingLanguage ? " " + styles["changing"] : "")
                }
              />
            </button>
            <div
              className={
                styles["description__lang-list"] +
                (dropdownOpen ? " " + styles["open"] : "")
              }
            >
              {langCodes.map((code) => (
                <button
                  key={code}
                  className={
                    styles["description__lang-list-btn"] +
                    (language === code ? " " + styles["active"] : "")
                  }
                  onClick={() => {
                    trackSectionEvent("button_click", "language_select", code);
                    setLanguage(code);
                    setDropdownOpen(false);
                    setIsChangingLanguage(true);
                  }}
                  type="button"
                >
                  {langToCountry[code] && (
                    <img
                      src={
                        code === "ca"
                          ? "/icons/flags/ca_v2.svg"
                          : code === "eu"
                          ? "/icons/flags/eu_v2.svg"
                          : `https://flagcdn.com/w20/${langToCountry[code]}.png`
                      }
                      alt={code}
                      className={styles["description__lang-flag"]}
                      loading="lazy"
                    />
                  )}
                  <span className="typography-desktop-body-small">
                    {getLanguageLabel(code)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className={styles["description__content-box"]}>
        {text ? (
          <div className={styles["description__content-overlay"]}>
            <div
              ref={wrapperRef}
              className={styles["description__text-wrapper"]}
              style={{
                height:
                  typeof currentHeight === "number" ? currentHeight : undefined,
              }}
            >
              <div ref={innerRef}>
                <p
                  className={`${styles["description__text"]} typography-desktop-body-small`}
                >
                  {text}
                </p>
              </div>
            </div>
            {isChangingLanguage && (
              <div className={styles["description__language-spinner-overlay"]}>
                <div className={styles["description__language-spinner"]}></div>
              </div>
            )}
            {measured.expanded > measured.collapsed && (
              <button
                className={styles["description__see-more-btn"]}
                onClick={() => {
                  trackSectionEvent(
                    "interaction",
                    expanded ? "collapse" : "expand"
                  );
                  setExpanded(!expanded);
                }}
                type="button"
              >
                {expanded ? t("main.seeLess") : t("main.seeMore")}
                <ChevronRight
                  size={16}
                  className={
                    styles["description__see-more-chevron"] +
                    (expanded ? " " + styles["rotated"] : "")
                  }
                />
              </button>
            )}
            {description?.source && (
              <div className={styles["description__source"]}>
                Source: {description.source}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
};

export default DescriptionMap;
