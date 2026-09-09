import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import styles from "./desktop-FloraFauna.module.css";
import { getPeakFloraFauna } from "../../../../shared/api/endpoints/peaks";
import type { FloraFaunaData } from "../../../../shared/api/types";
import {
  Eye,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
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
import ShimmerWrapper from "../../../desktop-components/desktop-Shimmer/desktop-ShimmerWrapper.tsx";
import { smoothScrollHorizontal } from "../../../desktop-utils/desktop-smoothScroll.ts";
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
      return <Squirrel size={24} />;
    case "birds":
      return <Bird size={24} />;
    case "reptiles":
      return <Turtle size={24} />;
    case "amphibians":
      return <Droplet size={24} />;
    case "insects":
      return <Bug size={24} />;
    case "plants":
      return <Leaf size={24} />;
    case "fungi":
      return <Sprout size={24} />;
    default:
      return <HelpCircle size={24} />;
  }
};

const FloraFauna: React.FC<FloraFaunaProps> = ({ peakId }) => {
  const { language } = useI18n();
  const { trackSectionEvent } = usePeakDetailsAnalytics(
    "desktop",
    "flora_fauna",
    peakId
  );
  const [biodiversity, setBiodiversity] = useState<FloraFaunaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());
  const scrollRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [scrollStates, setScrollStates] = useState<{
    [key: string]: { canScrollLeft: boolean; canScrollRight: boolean };
  }>({});

  useEffect(() => {
    if (!peakId) return;
    getPeakFloraFauna(peakId, 5)
      .then((data) => {
        setBiodiversity(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [peakId, language]);

  // Calculate categories and categoryNames (memoized to prevent infinite re-renders)
  const categories = useMemo(
    () =>
      biodiversity?.biodiversity_data?.iNaturalist_observations?.categories ||
      ({} as Record<string, any[]>),
    [biodiversity]
  );

  const categoryNames = useMemo(
    () =>
      Object.keys(categories)
        .filter(
          (cat) => Array.isArray(categories[cat]) && categories[cat].length > 0
        )
        .sort((a, b) => {
          // Put "other" category last
          if (a === "other") return 1;
          if (b === "other") return -1;
          return 0;
        }),
    [categories]
  );

  const hasData = Boolean(categoryNames.length > 0);
  usePeakDetailsView("desktop", "flora_fauna", hasData, peakId);

  // Initialize first category as open when data loads
  useEffect(() => {
    if (!biodiversity || categoryNames.length === 0) return;
    
    // If no categories are open yet, open the first one
    if (openCategories.size === 0 && categoryNames[0]) {
      setOpenCategories(new Set([categoryNames[0]]));
    }
    // eslint_disable-next-line react-hooks/exhaustive-deps
  }, [biodiversity, categoryNames.join(",")]);

  // Check scroll position for each category
  const checkScrollPosition = useCallback((category: string) => {
    const scrollElement = scrollRefs.current[category];
    if (!scrollElement) return;

    const canScrollLeftNow = scrollElement.scrollLeft > 0;
    const canScrollRightNow =
      scrollElement.scrollLeft <
      scrollElement.scrollWidth - scrollElement.clientWidth - 1;

    setScrollStates((prev) => ({
      ...prev,
      [category]: {
        canScrollLeft: canScrollLeftNow,
        canScrollRight: canScrollRightNow,
      },
    }));
  }, []);

  // Set up scroll listeners for each open category
  useEffect(() => {
    if (!hasData) return;

    const cleanupFunctions: (() => void)[] = [];

    categoryNames.forEach((cat) => {
      // Only set up listeners for open categories
      if (!openCategories.has(cat)) return;

      const scrollElement = scrollRefs.current[cat];
      if (!scrollElement) return;

      checkScrollPosition(cat);
      const handler = () => checkScrollPosition(cat);
      scrollElement.addEventListener("scroll", handler);
      window.addEventListener("resize", handler);

      cleanupFunctions.push(() => {
        scrollElement.removeEventListener("scroll", handler);
        window.removeEventListener("resize", handler);
      });
    });

    return () => {
      cleanupFunctions.forEach((cleanup) => cleanup());
    };
    // Use openCategories.size and categoryNames.join to avoid Set reference issues
    // eslint_disable-next-line react-hooks/exhaustive-deps
  }, [hasData, categoryNames.join(","), checkScrollPosition, openCategories.size]);

  const scrollCategory = (category: string, direction: "left" | "right") => {
    trackSectionEvent("button_click", `scroll_${direction}`, category);
    smoothScrollHorizontal(scrollRefs.current[category] ?? null, direction, 400);
  };

  const toggleCategory = (category: string) => {
    setOpenCategories((prev) => {
      const newSet = new Set(prev);
      const wasOpen = newSet.has(category);
      trackSectionEvent(
        "interaction",
        wasOpen ? "category_collapse" : "category_expand",
        category
      );
      if (wasOpen) {
        newSet.delete(category);
      } else {
        newSet.add(category);
        // Check scroll position after opening (with a small delay to ensure DOM is updated)
        setTimeout(() => {
          checkScrollPosition(category);
        }, 100);
      }
      return newSet;
    });
  };

  const getCategoryName = (cat: string) => {
    return (
      (biodiversity?.biodiversity_data?.iNaturalist_observations as any)
        ?.category_names?.[cat] ||
      cat.charAt(0).toUpperCase() + cat.slice(1)
    );
  };

  return (
    <ShimmerWrapper isLoading={loading} hasData={hasData}>
      {hasData && (
        <section className={styles["flora-fauna"]}>
          <h3
            className={`${styles["flora-fauna__title"]} typography-desktop-title-small`}
          >
            <Eye className={styles["flora-fauna__icon"]} />
            Flora & Fauna
          </h3>
          {categoryNames.length > 0 && (
            <div className={styles["flora-fauna__categories"]}>
              {categoryNames.map((cat) => {
                const speciesList = Array.isArray(categories[cat])
                  ? categories[cat]
                  : [];
                const isOpen = openCategories.has(cat);
                const scrollState = scrollStates[cat] || {
                  canScrollLeft: false,
                  canScrollRight: false,
                };

                return (
                  <div key={cat} className={styles["flora-fauna__category"]}>
                    <button
                      className={`${styles["flora-fauna__category-header"]} ${isOpen ? styles["flora-fauna__category-header--open"] : ""}`}
                      onClick={() => toggleCategory(cat)}
                      aria-expanded={isOpen}
                      aria-controls={`flora-fauna-panel-${cat}`}
                    >
                      <div
                        className={`${styles["flora-fauna__category-title"]} typography-desktop-body-medium`}
                      >
                        <span className={styles["flora-fauna__category-icon"]}>
                          {getCategoryIcon(cat)}
                        </span>
                        <span>{getCategoryName(cat)}</span>
                        <span
                          className={`${styles["flora-fauna__category-count"]} typography-body-small`}
                        >
                          ({speciesList.length})
                        </span>
                      </div>
                      <span className={styles["flora-fauna__category-chevron"]}>
                        {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </span>
                    </button>
                    <div
                      id={`flora-fauna-panel-${cat}`}
                      className={`${styles["flora-fauna__panel"]} ${isOpen ? styles["flora-fauna__panel--open"] : ""}`}
                    >
                      <div className={styles["flora-fauna__scroll-container"]}>
                        {scrollState.canScrollLeft && (
                          <button
                            className={`${styles["flora-fauna__scroll-arrow"]} ${styles["flora-fauna__scroll-arrow--left"]}`}
                            onClick={() => scrollCategory(cat, "left")}
                            aria-label="Scroll left"
                          >
                            <ChevronLeft size={24} />
                          </button>
                        )}
                        <div
                          ref={(el) => {
                            scrollRefs.current[cat] = el;
                          }}
                          className={styles["flora-fauna__scroll"]}
                        >
                          {speciesList.map((species, idx) => (
                            <div
                              key={`${cat}-${idx}`}
                              className={styles["flora-fauna__card"]}
                            >
                              {species.photo_url ? (
                                <div className={styles["flora-fauna__card-image"]}>
                                  <img
                                    src={species.photo_url.replace(
                                      "/square.",
                                      "/medium."
                                    )}
                                    alt={species.common_name || species.name}
                                    loading="lazy"
                                  />
                                </div>
                              ) : (
                                <div
                                  className={`${styles["flora-fauna__card-image"]} ${styles["flora-fauna__card-image--placeholder"]}`}
                                >
                                  <Eye size={32} />
                                </div>
                              )}
                              <div className={styles["flora-fauna__card-info"]}>
                                <div
                                  className={`${styles["flora-fauna__card-name"]} typography-desktop-body-small`}
                                >
                                  {species.common_name || species.name}
                                </div>
                                {species.common_name && species.name !== species.common_name && (
                                  <div
                                    className={`${styles["flora-fauna__card-scientific"]} typography-desktop-label-medium`}
                                  >
                                    {species.name}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                        {scrollState.canScrollRight && (
                          <button
                            className={`${styles["flora-fauna__scroll-arrow"]} ${styles["flora-fauna__scroll-arrow--right"]}`}
                            onClick={() => scrollCategory(cat, "right")}
                            aria-label="Scroll right"
                          >
                            <ChevronRight size={24} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
    </ShimmerWrapper>
  );
};

export default FloraFauna;
