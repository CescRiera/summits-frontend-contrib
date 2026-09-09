import React, { useState, useEffect, useRef } from "react";
import styles from "./desktop-ShelterDescription.module.css";
import {
  getShelterDescription,
  getShelterAdditionalInfo,
} from "../../../../shared/api/endpoints/shelters";
import { ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import ShimmerWrapper from "../../../desktop-components/desktop-Shimmer/desktop-ShimmerWrapper";
import { useI18n } from "../../../../shared/context/I18nContext";
import type { ShelterFacilities } from "../../../../shared/api/types";

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

type ShelterDescriptionProps = {
  shelterId: number;
};

const MAX_LINES = 4;

const SERVICE_KEYS: {
  facilitiesKey: keyof ShelterFacilities;
  translationKey: string;
}[] = [
  { facilitiesKey: "toilets", translationKey: "toilets" },
  { facilitiesKey: "drinking_water", translationKey: "drinking_water" },
  { facilitiesKey: "fireplace", translationKey: "fireplace" },
  { facilitiesKey: "heating", translationKey: "heating" },
  { facilitiesKey: "electricity", translationKey: "electricity" },
  { facilitiesKey: "shower", translationKey: "shower" },
  { facilitiesKey: "internet_access", translationKey: "internet" },
];

const TAG_SERVICE_KEYS: { tagsKey: string; translationKey: string }[] = [
  { tagsKey: "kitchen", translationKey: "kitchen" },
  { tagsKey: "lit", translationKey: "lit" },
  { tagsKey: "outdoor_seating", translationKey: "outdoor_seating" },
  { tagsKey: "picnic_table", translationKey: "picnic_table" },
  { tagsKey: "bench", translationKey: "bench" },
  { tagsKey: "covered", translationKey: "covered" },
];

const ShelterDescription: React.FC<ShelterDescriptionProps> = ({
  shelterId,
}) => {
  const { t } = useI18n();
  const [description, setDescription] = useState<{
    description: string;
    source: string | undefined;
    lang_codes: string[];
  } | null>(null);
  const [osmDescription, setOsmDescription] = useState<string | null>(null);
  const [facilities, setFacilities] = useState<ShelterFacilities | null>(null);
  const [tags, setTags] = useState<Record<string, string> | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [language, setLanguage] = useState<string>("");
  const [langCodes, setLangCodes] = useState<string[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isChangingLanguage, setIsChangingLanguage] = useState(false);

  const displayNamesCacheRef = useRef<
    Record<string, Intl.DisplayNames | undefined>
  >({});
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
        dn = undefined;
      }
      displayNamesCacheRef.current[code] = dn;
    }
    const label = dn?.of(code);
    if (label && typeof label === "string") {
      return label.charAt(0).toUpperCase() + label.slice(1);
    }
    return code.toUpperCase();
  };

  const initializedRef = useRef(false);
  useEffect(() => {
    if (!shelterId) return;

    const isInitial = !initializedRef.current;
    if (!isInitial && !language) return;

    if (isInitial) {
      setLoading(true);
    } else {
      setIsChangingLanguage(true);
    }

    const descPromise = getShelterDescription(
      shelterId,
      isInitial ? undefined : language
    );
    const additionalPromise = isInitial
      ? getShelterAdditionalInfo(shelterId)
      : Promise.resolve(null);

    Promise.all([descPromise, additionalPromise])
      .then(([descData, additionalData]) => {
        setDescription((prev) => ({
          ...prev,
          description: descData.description || "",
          source: descData.source || undefined,
          lang_codes: descData.lang_codes || [],
        }));

        if (additionalData?.facilities?.description) {
          setOsmDescription(additionalData.facilities.description);
        }

        if (additionalData?.facilities) {
          setFacilities(additionalData.facilities);
        }

        if (additionalData?.tags) {
          setTags(additionalData.tags);
        }

        if (isInitial) {
          if (
            Array.isArray(descData.lang_codes) &&
            descData.lang_codes.length > 0
          ) {
            setLangCodes(descData.lang_codes);
          }
          if (
            !language &&
            descData.language &&
            descData.language !== language
          ) {
            setLanguage(descData.language);
          }
          initializedRef.current = true;
        }
        setLoading(false);
        setIsChangingLanguage(false);
      })
      .catch(() => {
        setLoading(false);
        setIsChangingLanguage(false);
      });
  }, [shelterId, language]);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const inner = innerRef.current;
    if (!wrapper || !inner) return;

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
    wrapper.style.height = prevHeight + "px";
    requestAnimationFrame(() => {
      setCurrentHeight(expanded ? expandedH : collapsedH);
      wrapper.style.height = (expanded ? expandedH : collapsedH) + "px";
    });
  }, [description, osmDescription, expanded, language]);

  const isWikidata = description?.source === "wikidata";
  const text =
    (isWikidata && osmDescription?.trim()) ||
    description?.description?.trim() ||
    osmDescription?.trim() ||
    "";
  const hasDescData = Boolean(text);

  const paragraphs: string[] = [];

  if (facilities) {
    if (facilities.beds && facilities.capacity) {
      paragraphs.push(
        t("shelterDetails.capacity.bedsAndCapacity", {
          beds: facilities.beds,
          capacity: facilities.capacity,
        })
      );
    } else if (facilities.beds) {
      paragraphs.push(
        t("shelterDetails.capacity.bedsOnly", { beds: facilities.beds })
      );
    } else if (facilities.capacity) {
      paragraphs.push(
        t("shelterDetails.capacity.capacityOnly", {
          capacity: facilities.capacity,
        })
      );
    }

    const serviceLabels: string[] = [];
    for (const sk of SERVICE_KEYS) {
      const val = facilities[sk.facilitiesKey];
      if (val && val !== "no" && val !== "none") {
        serviceLabels.push(t(`shelterDetails.services.${sk.translationKey}`));
      }
    }

    if (tags) {
      for (const tk of TAG_SERVICE_KEYS) {
        const val = tags[tk.tagsKey];
        if (val && val !== "no" && val !== "none") {
          serviceLabels.push(
            t(`shelterDetails.services.${tk.translationKey}`)
          );
        }
      }

      if (tags["smoking"] === "no") {
        serviceLabels.push(t("shelterDetails.services.smoking_free"));
      }
      if (tags["pets"] === "yes" || tags["dog"] === "yes") {
        serviceLabels.push(t("shelterDetails.services.pets"));
      }
    }

    if (serviceLabels.length > 0) {
      paragraphs.push(
        t("shelterDetails.services.title") + " " + serviceLabels.join(", ") + "."
      );
    }
  }

  const hasInfoData = paragraphs.length > 0;
  const websiteUrl =
    facilities?.website || tags?.["website"] || tags?.["contact:website"] || null;

  return (
    <ShimmerWrapper isLoading={loading} hasData={hasDescData || hasInfoData}>
      <section className={styles["description__container"]}>
        {langCodes.length > 1 && (
          <div className={styles["description__header"]}>
            <div className={styles["description__lang-dropdown"]}>
              <button
                className={styles["description__lang-current"]}
                onClick={() => {
                  if (isChangingLanguage) return;
                  setDropdownOpen(!dropdownOpen);
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
                    typeof currentHeight === "number"
                      ? currentHeight
                      : undefined,
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
                <div
                  className={styles["description__language-spinner-overlay"]}
                >
                  <div
                    className={styles["description__language-spinner"]}
                  ></div>
                </div>
              )}
              {measured.expanded > measured.collapsed && (
                <button
                  className={
                    styles["description__see-more-btn"] +
                    " typography-desktop-body-small"
                  }
                  onClick={() => setExpanded(!expanded)}
                  type="button"
                >
                  {expanded ? t("common.seeLess") : t("common.seeMore")}
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
                  {t("shelterDetails.source", { source: description.source })}
                </div>
              )}
            </div>
          ) : null}
        </div>

        {hasInfoData && (
          <div className={styles["description__info"]}>
            <p
              className={`${styles["description__info-text"]} typography-desktop-body-small`}
            >
              {paragraphs.map((p, i) => (
                <React.Fragment key={i}>
                  {p}
                  {i < paragraphs.length - 1 && <br />}
                </React.Fragment>
              ))}
            </p>
            {websiteUrl && (
              <a
                href={websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`${styles["description__website-btn"]} typography-desktop-button-small`}
              >
                <ExternalLink size={16} />
                <span className="typography-desktop-body-small">
                  {t("shelterDetails.website")}
                </span>
              </a>
            )}
          </div>
        )}
      </section>
    </ShimmerWrapper>
  );
};

export default ShelterDescription;
