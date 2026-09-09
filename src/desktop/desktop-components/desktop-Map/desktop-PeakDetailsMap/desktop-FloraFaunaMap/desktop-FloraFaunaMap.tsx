import React, { useState, useEffect, useRef } from "react";
import styles from "./desktop-FloraFaunaMap.module.css";
import { getPeakFloraFauna } from "../../../../../shared/api/endpoints/peaks";
import type { FloraFaunaData } from "../../../../../shared/api/types";
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
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useI18n } from "../../../../../shared/context/I18nContext";
import { smoothScrollHorizontal } from "../../../../desktop-utils/desktop-smoothScroll";
import {
  usePeakDetailsAnalytics,
  usePeakDetailsView,
} from "../../../../../shared/hooks/usePeakDetailsAnalytics";

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

const FloraFaunaMap: React.FC<FloraFaunaProps> = ({ peakId }) => {
  const { language } = useI18n();
  const { trackSectionEvent } = usePeakDetailsAnalytics(
    "desktop_map",
    "flora_fauna",
    peakId
  );
  const [biodiversity, setBiodiversity] = useState<FloraFaunaData | null>(null);
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const speciesListRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [scrollStates, setScrollStates] = useState<{
    [key: string]: { canScrollLeft: boolean; canScrollRight: boolean };
  }>({});
  const hideArrowTimeoutsRef = useRef<{
    [key: string]: {
      left: NodeJS.Timeout | null;
      right: NodeJS.Timeout | null;
    };
  }>({});

  useEffect(() => {
    if (!peakId) return;
    getPeakFloraFauna(peakId, 5)
      .then((data) => {
        setBiodiversity(data);
      })
      .catch(() => {});
  }, [peakId, language]);

  // Check scroll position for a specific species list
  const checkScrollPosition = (category: string) => {
    const scrollElement = speciesListRefs.current[category];
    if (!scrollElement) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollElement;
    const canScrollLeftNow = scrollLeft > 0;
    const canScrollRightNow = scrollLeft < scrollWidth - clientWidth - 1;

    // Initialize timeout ref for this category if needed
    if (!hideArrowTimeoutsRef.current[category]) {
      hideArrowTimeoutsRef.current[category] = { left: null, right: null };
    }

    // Clear existing timeouts
    if (hideArrowTimeoutsRef.current[category].left) {
      clearTimeout(hideArrowTimeoutsRef.current[category].left);
      hideArrowTimeoutsRef.current[category].left = null;
    }
    if (hideArrowTimeoutsRef.current[category].right) {
      clearTimeout(hideArrowTimeoutsRef.current[category].right);
      hideArrowTimeoutsRef.current[category].right = null;
    }

    // If can scroll, show immediately
    if (canScrollLeftNow) {
      setScrollStates((prev) => ({
        ...prev,
        [category]: {
          canScrollLeft: true,
          canScrollRight: prev[category]?.canScrollRight ?? false,
        },
      }));
    } else {
      // If can't scroll, hide after 1 second
      hideArrowTimeoutsRef.current[category].left = setTimeout(() => {
        setScrollStates((prev) => ({
          ...prev,
          [category]: {
            canScrollLeft: false,
            canScrollRight: prev[category]?.canScrollRight ?? false,
          },
        }));
      }, 1000);
    }

    if (canScrollRightNow) {
      setScrollStates((prev) => ({
        ...prev,
        [category]: {
          canScrollLeft: prev[category]?.canScrollLeft ?? false,
          canScrollRight: true,
        },
      }));
    } else {
      // If can't scroll, hide after 1 second
      hideArrowTimeoutsRef.current[category].right = setTimeout(() => {
        setScrollStates((prev) => ({
          ...prev,
          [category]: {
            canScrollLeft: prev[category]?.canScrollLeft ?? false,
            canScrollRight: false,
          },
        }));
      }, 1000);
    }
  };

  const scrollSpeciesList = (category: string, direction: "left" | "right") => {
    trackSectionEvent("button_click", `scroll_${direction}`, category);
    smoothScrollHorizontal(speciesListRefs.current[category] ?? null, direction);
  };

  // Set up scroll listeners for each category when it opens
  useEffect(() => {
    if (!openCategory) return;
    const scrollElement = speciesListRefs.current[openCategory];
    if (!scrollElement) return;
    checkScrollPosition(openCategory);
    const handler = () => checkScrollPosition(openCategory);
    scrollElement.addEventListener("scroll", handler);
    window.addEventListener("resize", handler);
    return () => {
      scrollElement.removeEventListener("scroll", handler);
      window.removeEventListener("resize", handler);
      // Clear timeouts on cleanup
      if (openCategory && hideArrowTimeoutsRef.current[openCategory]) {
        if (hideArrowTimeoutsRef.current[openCategory].left) {
          clearTimeout(hideArrowTimeoutsRef.current[openCategory].left);
        }
        if (hideArrowTimeoutsRef.current[openCategory].right) {
          clearTimeout(hideArrowTimeoutsRef.current[openCategory].right);
        }
      }
    };
  }, [
    openCategory,
    biodiversity?.biodiversity_data?.iNaturalist_observations?.categories,
  ]);

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
  usePeakDetailsView("desktop_map", "flora_fauna", hasData, peakId);

  if (!hasData) {
    return null;
  }

  return (
    <section className={styles["flora-fauna"]}>
      <h3
        className={`${styles["flora-fauna__title"]} typography-desktop-body-small`}
      >
        <Eye className={styles["flora-fauna__icon"]} />
        Flora & Fauna
      </h3>
      {categoryNames.length > 0 && (
        <div className={styles["flora-fauna__accordion-list"]}>
          {categoryNames.map((cat) => (
            <div key={cat} className={styles["flora-fauna__accordion-item"]}>
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
                  className={`${styles["flora-fauna__accordion-title"]} typography-desktop-body-small`}
                >
                  <span
                    className={`${styles["flora-fauna__accordion-title-icon"]} typography-desktop-body-small`}
                  >
                    {getCategoryIcon(cat)}
                  </span>
                  <span
                    className={`${styles["flora-fauna__accordion-title-text"]} typography-desktop-body-small`}
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
                  <span className={styles["flora-fauna__accordion-chevron"]}>
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
                <div className={styles["flora-fauna__species-list-container"]}>
                  {scrollStates[cat]?.canScrollLeft && (
                    <button
                      className={`${styles["flora-fauna__species-scroll-arrow"]} ${styles["flora-fauna__species-scroll-arrow--left"]}`}
                      onClick={() => scrollSpeciesList(cat, "left")}
                      aria-label="Scroll left"
                    >
                      <ChevronLeft size={20} />
                    </button>
                  )}
                  {scrollStates[cat]?.canScrollRight && (
                    <button
                      className={`${styles["flora-fauna__species-scroll-arrow"]} ${styles["flora-fauna__species-scroll-arrow--right"]}`}
                      onClick={() => scrollSpeciesList(cat, "right")}
                      aria-label="Scroll right"
                    >
                      <ChevronRight size={20} />
                    </button>
                  )}
                  <div
                    className={styles["flora-fauna__species-list"]}
                    ref={(el) => {
                      speciesListRefs.current[cat] = el;
                    }}
                  >
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
                          <div className={styles["flora-fauna__species-info"]}>
                            <div
                              className={`${styles["flora-fauna__species-name"]} typography-desktop-body-small`}
                            >
                              {species.common_name || species.name}
                            </div>
                            <div
                              className={`${styles["flora-fauna__species-scientific"]} typography-desktop-label-medium`}
                            >
                              {species.name}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default FloraFaunaMap;
