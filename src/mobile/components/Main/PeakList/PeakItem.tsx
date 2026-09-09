import React, { useState, useMemo } from "react";
import styles from "./PeakItem.module.css";
import RouteChips from "./RouteChips";
import { useI18n } from "../../../../shared/context/I18nContext";
import { getIntlLocale } from "../../../../shared/i18n/languages";

interface Peak {
  id: string;
  name: string;
  ele?: number;
  region?: string;
  country?: string;
  image?: string;
  route_names?: string[];
  description?: string;
}

function getAltitudeIcon(ele?: number) {
  if (!ele) return "/icons/altitude/green.png";
  if (ele >= 8000) return "/icons/altitude/black.png";
  if (ele >= 6000) return "/icons/altitude/burgundy.png";
  if (ele >= 4000) return "/icons/altitude/red.png";
  if (ele >= 3000) return "/icons/altitude/orange.png";
  if (ele >= 2000) return "/icons/altitude/yellow.png";
  return "/icons/altitude/green.png";
}

const PeakItem: React.FC<{ peak: Peak }> = ({ peak }) => {
  const [expanded, setExpanded] = useState(false);
  const { t, language } = useI18n();

  // Description block logic
  const descriptionBlock = useMemo(() => {
    const locale = getIntlLocale(language);
    const name = peak.name || "-";
    const region = peak.region || "-";
    const country = peak.country || "-";
    const dates = Array.isArray((peak as any).route_dates)
      ? (peak as any).route_dates
      : [];
    const routes = Array.isArray(peak.route_names) ? peak.route_names : [];
    const listFormatter = new Intl.ListFormat(locale, {
      style: "long",
      type: "conjunction",
    });
    const joinWithAnd = (arr: string[]) => {
      if (!arr || arr.length === 0) return "";
      if (arr.length === 1) return arr[0];
      return listFormatter.format(arr);
    };
    const formatDate = (date: string) => {
      if (!date) return "-";
      try {
        const d = new Date(date);
        return d.toLocaleDateString(locale);
      } catch {
        return date;
      }
    };
    const datesStr = joinWithAnd(dates.map((d: string) => formatDate(d)));
    const routesStr = joinWithAnd(routes);
    const isSingle = dates.length === 1 && routes.length === 1;
    const key = isSingle
      ? "peaks.userPeakDescriptionSingle"
      : "peaks.userPeakDescriptionMultiple";
    const raw = t(key, {
      name,
      region,
      country,
      dates: datesStr,
      routes: routesStr,
    });
    // Render <b>...</b> as bold
    const parts = raw.split(/(<b>|<\/b>)/g);
    let bold = false;
    return parts.map((part, idx) => {
      if (part === "<b>") {
        bold = true;
        return null;
      }
      if (part === "</b>") {
        bold = false;
        return null;
      }
      if (part === "") return null;
      return (
        <span key={idx} style={bold ? { fontWeight: 700 } : {}}>
          {part}
        </span>
      );
    });
  }, [peak, t, language]);

  return (
    <div className={styles["peak-item"]}>
      <div className={styles["peak-item__main"]}>
        <img
          className={styles["peak-item__image"]}
          src={peak.image || "/default_peak.png"}
          alt={peak.name}
        />
        <div className={styles["peak-item__info"]}>
          <div
            className={styles["peak-item__name"] + " typography-title-small"}
          >
            <img
              src={getAltitudeIcon(peak.ele)}
              alt={t("peaks.elevation")}
              className={styles["peak-item__altitude-icon"]}
            />
            {peak.name}
            {peak.region && (
              <span
                className={
                  styles["peak-item__region"] + " typography-body-small"
                }
              >
                {" "}
                • {peak.region}
              </span>
            )}
          </div>
          <div className={styles["peak-item__meta"] + " typography-body-small"}>
            <span className="typography-body-small">
              {peak.ele ? `${peak.ele}m` : "-"}
            </span>
            {peak.country && (
              <span className="typography-body-small"> • {peak.country}</span>
            )}
          </div>
        </div>
        <button
          className={styles["peak-item__expand-btn"]}
          onClick={() => setExpanded((e) => !e)}
          aria-label={expanded ? t("common.close") : t("common.edit")}
        >
          {expanded ? "▲" : "▼"}
        </button>
      </div>
      {expanded && (
        <div className={styles["peak-item__details"]}>
          <div
            className={
              styles["peak-item__description"] + " typography-body-small"
            }
          >
            {descriptionBlock}
          </div>
          <div
            className={
              styles["peak-item__description"] + " typography-body-small"
            }
          >
            <strong className="typography-label-medium">
              {t("peaks.description")}:
            </strong>{" "}
            {peak.description || t("peaks.noDescription")}
          </div>
          <RouteChips routes={peak.route_names || []} />
        </div>
      )}
    </div>
  );
};

export default PeakItem;
