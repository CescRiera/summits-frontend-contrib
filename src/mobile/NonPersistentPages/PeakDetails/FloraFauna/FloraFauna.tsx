import React, { useState, useEffect } from "react";
import styles from "./FloraFauna.module.css";
import { getPeakFloraFauna } from "../../../../shared/api/endpoints/peaks";
import type { FloraFaunaData } from "../../../../shared/api/types";
import {
  Eye,
  ChevronDown,
  Squirrel,
  Bird,
  Turtle,
  Droplet,
  Bug,
  Leaf,
  Sprout,
  HelpCircle,
} from "lucide-react";
import { useI18n } from "../../../../shared/context/I18nContext";
import ShimmerWrapper from "../../../components/Shimmer/ShimmerWrapper";
import {
  usePeakDetailsAnalytics,
  usePeakDetailsView,
} from "../../../../shared/hooks/usePeakDetailsAnalytics";

type FloraFaunaProps = {
  peakId: number;
};

const getCategoryIcon = (cat: string) => {
  switch (cat) {
    case "mammals":
      return <Squirrel size={20} style={{ marginRight: 8 }} />;
    case "birds":
      return <Bird size={20} style={{ marginRight: 8 }} />;
    case "reptiles":
      return <Turtle size={20} style={{ marginRight: 8 }} />;
    case "amphibians":
      return <Droplet size={20} style={{ marginRight: 8 }} />;
    case "insects":
      return <Bug size={20} style={{ marginRight: 8 }} />;
    case "plants":
      return <Leaf size={20} style={{ marginRight: 8 }} />;
    case "fungi":
      return <Sprout size={20} style={{ marginRight: 8 }} />;
    default:
      return <HelpCircle size={20} style={{ marginRight: 8 }} />;
  }
};

const FloraFauna: React.FC<FloraFaunaProps> = ({ peakId }) => {
  const { language } = useI18n();
  const { trackSectionEvent } = usePeakDetailsAnalytics(
    "mobile",
    "flora_fauna",
    peakId
  );
  const [biodiversity, setBiodiversity] = useState<FloraFaunaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  useEffect(() => {
    if (!peakId) return;
    getPeakFloraFauna(peakId, 5)
      .then((data) => {
        setBiodiversity(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [peakId, language]);

  const categories =
    biodiversity?.biodiversity_data?.iNaturalist_observations?.categories ||
    ({} as Record<string, any[]>);
  const categoryNames = Object.keys(categories)
    .filter(
      (cat) => Array.isArray(categories[cat]) && categories[cat].length > 0
    )
    .sort((a, b) => {
      // Put "other" category last
      if (a === "other") return 1;
      if (b === "other") return -1;
      return 0;
    });

  const hasData = Boolean(categoryNames.length > 0);
  usePeakDetailsView("mobile", "flora_fauna", hasData, peakId);

  return (
    <ShimmerWrapper isLoading={loading} hasData={hasData}>
      {hasData && (
        <section className={styles["flora-fauna"]}>
          <h3
            className={`${styles["flora-fauna__title"]} typography-title-medium`}
          >
            <Eye className={styles["flora-fauna__icon"]} />
            Flora & Fauna
          </h3>
          {categoryNames.length > 0 && (
            <div className={styles["flora-fauna__accordion-list"]}>
              {categoryNames.map((cat) => (
                <div
                  key={cat}
                  className={styles["flora-fauna__accordion-item"]}
                >
                  <button
                    className={styles["flora-fauna__accordion-header"]}
                    onClick={() => {
                      trackSectionEvent(
                        "interaction",
                        openCategory === cat ? "category_collapse" : "category_expand",
                        cat
                      );
                      setOpenCategory(openCategory === cat ? null : cat);
                    }}
                    aria-expanded={openCategory === cat}
                    aria-controls={`flora-fauna-panel-${cat}`}
                  >
                    <span
                      className={`${styles["flora-fauna__accordion-title"]} typography-title-medium`}
                    >
                      <span
                        className={`${styles["flora-fauna__accordion-title-icon"]} typography-title-medium`}
                      >
                        {getCategoryIcon(cat)}
                      </span>
                      <span
                        className={`${styles["flora-fauna__accordion-title-text"]} typography-title-medium`}
                      >
                        {(
                          biodiversity?.biodiversity_data
                            ?.iNaturalist_observations as any
                        )?.category_names?.[cat] ||
                          cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </span>
                    </span>
                    <span
                      className={
                        styles["flora-fauna__accordion-badge-chevron-group"]
                      }
                    >
                      <span className={styles["flora-fauna__accordion-badge"]}>
                        {Array.isArray(categories[cat])
                          ? categories[cat].length
                          : 0}
                      </span>
                      <span
                        className={styles["flora-fauna__accordion-chevron"]}
                      >
                        <ChevronDown size={20} />
                      </span>
                    </span>
                  </button>
                  <div
                    id={`flora-fauna-panel-${cat}`}
                    className={
                      styles["flora-fauna__accordion-panel"] +
                      (openCategory === cat ? " " + styles["open"] : "")
                    }
                    style={{ maxHeight: openCategory === cat ? 1000 : 0 }}
                  >
                    <div className={styles["flora-fauna__species-list"]}>
                      {Array.isArray(categories[cat]) &&
                        categories[cat].map((species, idx) => (
                          <div
                            key={`${cat}-${idx}`}
                            className={styles["flora-fauna__species-card"]}
                          >
                            {species.photo_url ? (
                              <img
                                src={species.photo_url.replace(
                                  "/square.",
                                  "/small."
                                )}
                                alt={species.common_name || species.name}
                                loading="lazy"
                              />
                            ) : (
                              <div
                                className={
                                  styles["flora-fauna__species-placeholder"]
                                }
                              >
                                <Eye size={24} />
                              </div>
                            )}
                            <div
                              className={styles["flora-fauna__species-info"]}
                            >
                              <div
                                className={`${styles["flora-fauna__species-name"]} typography-title-medium`}
                              >
                                {species.common_name || species.name}
                              </div>
                              <div
                                className={`${styles["flora-fauna__species-scientific"]} typography-body-small`}
                              >
                                {species.name}
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </ShimmerWrapper>
  );
};

export default FloraFauna;
