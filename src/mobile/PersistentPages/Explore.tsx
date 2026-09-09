"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { discoverPeaks } from "../../shared/api/endpoints/peaks";
import { useExplore } from "../context/ExploreContext";
import { useAnalytics } from "../../shared/context/AnalyticsContext";
import ExploreHeaderSearch from "../components/ExploreHeaderSearch/ExploreHeaderSearch";
import { getElevationSoftColor, getElevationIcon } from "../../shared/constants/elevationColors";
import { useI18n } from "../../shared/context/I18nContext";
import ShelterIcon from "../../shared/components/ShelterIcon/ShelterIcon";
import type { AdminHierarchy } from "../../shared/api/types/common";
import type { ShelterType } from "../../shared/api/types";
import styles from "./Explore.module.css";
// Use public assets via absolute paths instead of importing from public
const defaultPeak = "/icons/altitude/place.jpg";
const icMountainBlack = "/icons/altitude/ic_mountain_black.png";
const icMountainBurgundy = "/icons/altitude/ic_mountain_burgundy.png";
const icMountainRed = "/icons/altitude/ic_mountain_red.png";
const icMountainOrange = "/icons/altitude/ic_mountain_orange.png";
const icMountainYellow = "/icons/altitude/ic_mountain_yellow.png";
const icMountainGreen = "/icons/altitude/ic_mountain_green.png";
// Remove: import { Search, SlidersHorizontal } from "lucide-react";
// import ExploreNavbar from "./NavbarExplore";
// Remove: import { useRouter } from "next/router";

// Types
interface Peak {
  id: string | number;
  name: string;
  name_en?: string | null;
  elevation: number | null;
  image?: string | null;
  admin_hierarchy?: AdminHierarchy | null;
}

interface Shelter {
  id: string | number;
  name: string | null;
  name_en?: string | null;
  elevation: number | null;
  image?: string | null;
  admin_hierarchy?: AdminHierarchy | null;
  shelter_type: ShelterType;
}

type FeedCard =
  | { kind: "peak"; peak: Peak }
  | { kind: "shelter"; shelter: Shelter };

const getCardElevation = (card: FeedCard): number =>
  card.kind === "peak" ? card.peak.elevation || 0 : card.shelter.elevation || 0;

interface GridCell {
  type: "peak" | "shelter";
  x: number;
  y: number;
  width: number;
  height: number;
  special?: boolean;
}

interface GridItem extends GridCell {
  key: string;
  peak?: Peak;
  shelter?: Shelter;
}

interface GridSection {
  id: string;
  items: GridItem[];
  height: number;
  isLastSection?: boolean;
}

interface Filters {
  min_elevation: number;
  max_elevation: number;
  admin_osm_ids: number[];
  mode: "all" | "peaks" | "shelters";
  shelter_types: string[];
}

// Constants
const ELEVATION_THRESHOLDS = [
  { min: 8000, icon: icMountainBlack },
  { min: 6000, icon: icMountainBurgundy },
  { min: 4000, icon: icMountainRed },
  { min: 3000, icon: icMountainOrange },
  { min: 2000, icon: icMountainYellow },
  { min: 0, icon: icMountainGreen },
];

// Utilities
const getPeakIconImage = (elevation: number) => {
  return (
    ELEVATION_THRESHOLDS.find((t) => elevation >= t.min)?.icon ||
    icMountainGreen
  );
};



// Check if image is valid (exclude .svg.* files)
const isValidImage = (imageUrl: string | null | undefined): boolean => {
  if (!imageUrl || typeof imageUrl !== 'string') return false;
  return !imageUrl.toLowerCase().includes(".svg.");
};

const createLayoutTemplate = (
  containerWidth: number
): { cells: GridCell[]; height: number } => {
  const baseSize = Math.round(containerWidth / 3);

  const cells: GridCell[] = [
    // Row 0: 3 regular peaks
    ...Array.from({ length: 3 }, (_, i) => ({
      type: "peak" as const,
      x: baseSize * i,
      y: 0,
      width: baseSize,
      height: baseSize,
      special: false,
    })),

    // Row 1: 1 regular + 1 special 2x2
    {
      type: "peak" as const,
      x: 0,
      y: baseSize,
      width: baseSize,
      height: baseSize,
      special: false,
    },
    {
      type: "peak" as const,
      x: baseSize,
      y: baseSize,
      width: baseSize * 2,
      height: baseSize * 2,
      special: true,
    },

    // Row 2: 1 regular (space for 2x2)
    {
      type: "peak" as const,
      x: 0,
      y: baseSize * 2,
      width: baseSize,
      height: baseSize,
      special: false,
    },

    // Row 3: 3 regular peaks
    ...Array.from({ length: 3 }, (_, i) => ({
      type: "peak" as const,
      x: baseSize * i,
      y: baseSize * 3,
      width: baseSize,
      height: baseSize,
      special: false,
    })),

    // Row 4: 2 regular + 1 special 1x2 (Previously after Row 4 user row)
    {
      type: "peak" as const,
      x: 0,
      y: baseSize * 4,
      width: baseSize,
      height: baseSize,
      special: false,
    },
    {
      type: "peak" as const,
      x: baseSize,
      y: baseSize * 4,
      width: baseSize,
      height: baseSize,
      special: false,
    },
    {
      type: "peak" as const,
      x: baseSize * 2,
      y: baseSize * 4,
      width: baseSize,
      height: baseSize * 2,
      special: true,
    },

    // Row 5: 2 regular
    {
      type: "peak" as const,
      x: 0,
      y: baseSize * 5,
      width: baseSize,
      height: baseSize,
      special: false,
    },
    {
      type: "peak" as const,
      x: baseSize,
      y: baseSize * 5,
      width: baseSize,
      height: baseSize,
      special: false,
    },

    // Row 6: 1 special 2x1 + 1 regular
    {
      type: "peak" as const,
      x: 0,
      y: baseSize * 6,
      width: baseSize * 2,
      height: baseSize,
      special: true,
    },
    {
      type: "peak" as const,
      x: baseSize * 2,
      y: baseSize * 6,
      width: baseSize,
      height: baseSize,
      special: false,
    },

    // Row 7: 3 regular peaks
    ...Array.from({ length: 3 }, (_, i) => ({
      type: "peak" as const,
      x: baseSize * i,
      y: baseSize * 7,
      width: baseSize,
      height: baseSize,
      special: false,
    })),

    // Rows 8-9: 2 special 1x2 + 1 regular in between
    {
      type: "peak" as const,
      x: 0,
      y: baseSize * 8,
      width: baseSize,
      height: baseSize * 2,
      special: true,
    },
    {
      type: "peak" as const,
      x: baseSize,
      y: baseSize * 8,
      width: baseSize,
      height: baseSize,
      special: false,
    },
    {
      type: "peak" as const,
      x: baseSize * 2,
      y: baseSize * 8,
      width: baseSize,
      height: baseSize * 2,
      special: true,
    },
    {
      type: "peak" as const,
      x: baseSize,
      y: baseSize * 9,
      width: baseSize,
      height: baseSize,
      special: false,
    },

    // Row 10: 3 regular peaks
    ...Array.from({ length: 3 }, (_, i) => ({
      type: "peak" as const,
      x: baseSize * i,
      y: baseSize * 10,
      width: baseSize,
      height: baseSize,
      special: false,
    })),

    // Row 11: Remaining peaks (Previously after Row 12 user row)
    ...Array.from({ length: 3 }, (_, i) => ({
      type: "peak" as const,
      x: baseSize * i,
      y: baseSize * 11,
      width: baseSize,
      height: baseSize,
      special: false,
    })),

    {
      type: "peak" as const,
      x: 0,
      y: baseSize * 12,
      width: baseSize,
      height: baseSize,
      special: false,
    },
    {
      type: "peak" as const,
      x: baseSize,
      y: baseSize * 12,
      width: baseSize * 2,
      height: baseSize,
      special: true,
    },
  ];

  const maxY = Math.max(...cells.map((cell) => cell.y + cell.height));
  return { cells, height: maxY };
};

const createSimpleLayout = (
  containerWidth: number,
  peakCount: number
): { cells: GridCell[]; height: number } => {
  const columns = 1;
  const baseSize = Math.round(containerWidth / 3); // Keep same height as regular cells
  const cells: GridCell[] = [];

  for (let i = 0; i < peakCount; i++) {
    const row = Math.floor(i / columns);

    cells.push({
      type: "peak",
      x: 0, // Always start at left edge
      y: baseSize * row,
      width: containerWidth, // Full width
      height: baseSize,
      special: false,
    });
  }

  const totalRows = Math.ceil(peakCount / columns);
  return { cells, height: totalRows * baseSize };
};

const distributeContent = (
  cards: FeedCard[],
  template: GridCell[],
  sectionId: string
): GridItem[] => {
  const sortedCards = [...cards].sort(
    (a, b) => getCardElevation(b) - getCardElevation(a)
  );
  const specialCards = sortedCards.slice(0, 6);
  const regularCards = sortedCards.slice(6);

  let specialIndex = 0;
  let regularIndex = 0;

  const items = template
    .map((cell, index) => {
      const baseItem = { ...cell, key: `${cell.type}-${sectionId}-${index}` };

      // Assign cards to cells (special cells get the highest elevation cards)
      let card: FeedCard | undefined;

      if (cell.special && specialIndex < specialCards.length) {
        card = specialCards[specialIndex++];
      } else if (!cell.special && regularIndex < regularCards.length) {
        card = regularCards[regularIndex++];
      }

      if (!card) return null;

      if (card.kind === "peak") {
        return {
          ...baseItem,
          key: `peak-${card.peak.id}-${sectionId}-${index}`,
          type: "peak" as const,
          peak: card.peak,
        } as GridItem;
      }
      return {
        ...baseItem,
        key: `shelter-${card.shelter.id}-${sectionId}-${index}`,
        type: "shelter" as const,
        shelter: card.shelter,
      } as GridItem;
    })
    .filter((item): item is GridItem => Boolean(item));
  return items;
};

const createGridSection = (
  cards: FeedCard[],
  containerWidth: number,
  sectionId: string,
  isLastSection = false
): GridSection => {
  const { cells, height } = isLastSection
    ? createSimpleLayout(containerWidth, cards.length)
    : createLayoutTemplate(containerWidth);

  const items = isLastSection
    ? (cards
        .map((card, index) => {
          const cell = cells[index];
          if (!cell) return null;
          if (card.kind === "peak") {
            return {
              ...cell,
              key: `peak-${card.peak.id}-${sectionId}-${index}`,
              peak: card.peak,
              type: "peak" as const,
            };
          }
          return {
            ...cell,
            key: `shelter-${card.shelter.id}-${sectionId}-${index}`,
            shelter: card.shelter,
            type: "shelter" as const,
          };
        })
        .filter(Boolean) as GridItem[])
    : distributeContent(cards, cells, sectionId);

  return { id: sectionId, items, height, isLastSection };
};

// Components
const PeakCell: React.FC<{
  item: GridItem;
  sectionTop: number;
}> = ({ item, sectionTop }) => {
  const navigate = useNavigate();
  const { trackEvent } = useAnalytics();
  const { x, y, width, height } = item;
  if (item.type !== "peak" || !item.peak) return null;

  const peak = item.peak;

  const peakName = peak.name_en || peak.name || "Unknown Peak";
  const elevation = peak.elevation || 0;

  const iconImage = getPeakIconImage(elevation);
  const hasValidImage = isValidImage(peak.image);
  const elevationSoftColor = getElevationSoftColor(elevation);
  const elevationIcon = getElevationIcon(elevation);

  // Icon size: use the largest between width and height, max 20px
  const iconSize = Math.min(20, Math.max(16, Math.max(width, height) * 0.12));

  return (
    <div
      key={item.key}
      className={`${styles["explore__peak-cell"]} ${
        item.special ? styles["explore__peak-cell--special"] : ""
      }`}
      style={{
        position: "absolute",
        top: sectionTop + y,
        left: x,
        width,
        height,
        background: hasValidImage ? undefined : elevationSoftColor,
      }}
      onClick={() => {
        // Track peak view from explore page
        trackEvent("peak_click", `explore_${peak.id}`);
        navigate(`/peaks/${peak.id}`);
      }}
    >
      {hasValidImage ? (
        <img
          src={peak.image || defaultPeak}
          alt={peakName}
          className={styles["explore__peak-img"]}
        />
      ) : (
        <img
          src={elevationIcon}
          alt="Elevation icon background"
          className={styles["explore__peak-elevation-icon-bg"]}
        />
      )}
      <div className={styles["explore__peak-overlay"]} />
      <div className={styles["explore__peak-content"]}>
        <div
          className={`${styles["explore__peak-name"]} typography-title-small`}
        >
          {peakName}
        </div>
      </div>
      <img
        src={iconImage || "/placeholder.svg"}
        alt="elevation icon"
        className={styles["explore__peak-icon"]}
        style={{
          width: `${iconSize}px`,
          height: `${iconSize}px`,
        }}
      />
    </div>
  );
};

const LoadingSpinner: React.FC = () => {
  return (
    <div className={styles["explore__loading-container"]}>
      <Loader2 size={40} className={styles["explore__loading-spinner"]} />
    </div>
  );
};

const SHELTER_TYPE_COLORS: Record<string, string> = {
  alpine_hut: "#0C4A7B",
  wilderness_hut: "#2D6A4F",
  shelter: "#D92B2B",
};

const ShelterCell: React.FC<{
  item: GridItem;
  sectionTop: number;
}> = ({ item, sectionTop }) => {
  const navigate = useNavigate();
  const { trackEvent } = useAnalytics();
  const { x, y, width, height } = item;
  if (item.type !== "shelter" || !item.shelter) return null;

  const shelter = item.shelter;
  const shelterName = shelter.name_en || shelter.name || "Unknown Shelter";
  const hasValidImage = isValidImage(shelter.image);
  const typeColor =
    SHELTER_TYPE_COLORS[shelter.shelter_type] || "#D92B2B";

  // Icon size: use the largest between width and height, max 20px
  const iconSize = Math.min(20, Math.max(16, Math.max(width, height) * 0.12));

  return (
    <div
      key={item.key}
      className={`${styles["explore__peak-cell"]} ${
        item.special ? styles["explore__peak-cell--special"] : ""
      }`}
      style={{
        position: "absolute",
        top: sectionTop + y,
        left: x,
        width,
        height,
        background: hasValidImage ? undefined : typeColor,
      }}
      onClick={() => {
        trackEvent("shelter_click", `explore_${shelter.id}`);
        navigate(`/shelters/${shelter.id}`);
      }}
    >
      {hasValidImage ? (
        <img
          src={shelter.image || defaultPeak}
          alt={shelterName}
          className={styles["explore__peak-img"]}
        />
      ) : (
        <ShelterIcon
          size={Math.max(20, Math.min(width, height) * 0.3)}
          color="rgba(255, 255, 255, 0.9)"
          className={styles["explore__peak-elevation-icon-bg"]}
        />
      )}
      <div className={styles["explore__peak-overlay"]} />
      <div className={styles["explore__peak-content"]}>
        <div
          className={`${styles["explore__peak-name"]} typography-title-small`}
        >
          {shelterName}
        </div>
      </div>
      <ShelterIcon
        size={iconSize}
        color={typeColor}
        className={styles["explore__peak-icon"]}
      />
    </div>
  );
};

// Header Component
// Remove SearchHeader component definition and its usage

// Main Component

export default function Explore() {
  useI18n();
  const { trackEvent } = useAnalytics();
  const { exploreFilters: contextFilters } = useExplore();

  // Convert context filters to local format - memoized to prevent infinite re-renders
  const exploreFilters: Filters = useMemo(
    () => ({
      min_elevation: contextFilters.min_elevation,
      max_elevation: contextFilters.max_elevation,
      admin_osm_ids: contextFilters.admin_osm_ids,
      mode: contextFilters.mode,
      shelter_types: contextFilters.shelter_types,
    }),
    [
      contextFilters.min_elevation,
      contextFilters.max_elevation,
      contextFilters.admin_osm_ids,
      contextFilters.mode,
      contextFilters.shelter_types,
    ]
  );
  // Note: navigation for peak details happens inside PeakCell
  const [gridSections, setGridSections] = useState<GridSection[]>([]);
  const [loading, setLoading] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [page, setPage] = useState(1);

  const [hasMore, setHasMore] = useState(true);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isLoadingRef = useRef(false);
  const loadMoreDataRef = useRef<(() => Promise<void>) | undefined>(undefined);
  const hasTrackedNoResultsRef = useRef(false);
  const shelterCursorRef = useRef<string | number | null>(null);

  // Get context functions for closing filters and search
  const {
    setShowExploreFilters,
    handleCloseExploreSearch,
    handleExploreDragStart,
  } = useExplore();

  // Handle touch to close filters and search
  const handleContentTouch = useCallback(() => {
    setShowExploreFilters(false);
    handleCloseExploreSearch();
    handleExploreDragStart();
  }, [setShowExploreFilters, handleCloseExploreSearch, handleExploreDragStart]);

  // No manual swipe handling; rely on parent swiper

  // Check if user is on explore route and manage overlay visibility

  // Container width measurement
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        const newWidth = containerRef.current.clientWidth;
        if (newWidth > 0) setContainerWidth(newWidth);
      }
    };

    updateWidth();
    window.addEventListener("resize", updateWidth);

    if (containerRef.current) {
      const resizeObserver = new ResizeObserver(updateWidth);
      resizeObserver.observe(containerRef.current);
      return () => {
        window.removeEventListener("resize", updateWidth);
        resizeObserver.disconnect();
      };
    }

    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  // Data reset on filter changes
  const resetData = useCallback(() => {
    setPage(1);
    setHasMore(true);
    isLoadingRef.current = false;
    setGridSections([]); // Clear current grids when filters change
    shelterCursorRef.current = null;
    window.scrollTo(0, 0);
    hasTrackedNoResultsRef.current = false;
  }, []);

  useEffect(() => {
    resetData();
  }, [resetData, exploreFilters]);

  // Data loading
  const loadMoreData = useCallback(async () => {
    if (isLoadingRef.current || !hasMore || containerWidth <= 0) return;

    isLoadingRef.current = true;
    setLoading(true);

    try {
      // Collect all peak IDs from previous pages to exclude them
      const excludeIds: string[] = [];
      const excludeShelterIds: string[] = [];
      if (page > 1) {
        gridSections.forEach((section) => {
          section.items.forEach((item) => {
            if (item.type === "peak" && item.peak?.id) {
              excludeIds.push(String(item.peak.id));
            } else if (item.type === "shelter" && item.shelter?.id) {
              excludeShelterIds.push(String(item.shelter.id));
            }
          });
        });
      }

      const params: Record<string, string | number | string[] | number[]> = {
        page,
        limit: 31,
      };

      if (exploreFilters["min_elevation"] > 0)
        params["min_elevation"] = exploreFilters["min_elevation"];
      // Always send max_elevation as 8849
      params["max_elevation"] = exploreFilters["max_elevation"];
      if (exploreFilters.admin_osm_ids && exploreFilters.admin_osm_ids.length > 0)
        params["admin_osm_ids"] = exploreFilters.admin_osm_ids;
      if (excludeIds.length > 0) params["exclude_ids"] = excludeIds;
      if (excludeShelterIds.length > 0)
        params["exclude_shelter_ids"] = excludeShelterIds;
      if (shelterCursorRef.current != null)
        params["shelter_cursor"] = shelterCursorRef.current;
      if (exploreFilters.mode && exploreFilters.mode !== "all")
        params["mode"] = exploreFilters.mode;
      if (
        exploreFilters.shelter_types &&
        exploreFilters.shelter_types.length > 0
      )
        params["shelter_types"] = exploreFilters.shelter_types;

      const hasActiveFilters = Boolean(
        exploreFilters["min_elevation"] > 0 ||
          exploreFilters["max_elevation"] < 8849 ||
          exploreFilters.admin_osm_ids.length > 0
      );

      if (hasActiveFilters) {
        params["order_by"] = "elevation";
        params["order_direction"] = "desc";
      }

      const data = await discoverPeaks(params);
      shelterCursorRef.current = data.pagination?.shelter_cursor ?? null;

      const cards: FeedCard[] = [
        ...(data.peaks || []).map((peak) => ({
          kind: "peak" as const,
          peak,
        })),
        ...(data.shelters || []).map((shelter) => ({
          kind: "shelter" as const,
          shelter,
        })),
      ];

      if (cards.length > 0) {
        const hasNextPage = data.pagination?.has_next === true;
        const newSection = createGridSection(
          cards,
          containerWidth,
          `section-${page}`,
          !hasNextPage
        );

        if (page === 1) {
          setGridSections([newSection]);
        } else {
          setGridSections((prev) => [...prev, newSection]);
        }
        setHasMore(hasNextPage);
      } else {
        if (page === 1) {
          setGridSections([]);
        }
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      trackEvent("interaction", "explore_fetch_failed");
      setHasMore(false);
    } finally {
      setLoading(false);
      setIsFirstLoad(false);
      isLoadingRef.current = false;
    }
  }, [page, hasMore, containerWidth, exploreFilters, gridSections, trackEvent]);

  // Update the ref whenever loadMoreData changes
  useEffect(() => {
    loadMoreDataRef.current = loadMoreData;
  }, [loadMoreData]);

  useEffect(() => {
    if (
      containerWidth > 0 &&
      !isLoadingRef.current &&
      loadMoreDataRef.current
    ) {
      loadMoreDataRef.current();
    }
  }, [containerWidth, page, hasMore, exploreFilters]);

  // Infinite scroll - scroll-based detection (window scroll)
  useEffect(() => {
    const handleWindowScroll = () => {
      if (isLoadingRef.current || !hasMore || isFirstLoad) return;

      const windowScrollTop =
        window.scrollY || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const distanceFromBottom =
        documentHeight - windowScrollTop - windowHeight;

      if (distanceFromBottom < 1000) {
        setPage((prev) => prev + 1);
      }
    };

    window.addEventListener("scroll", handleWindowScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleWindowScroll);
    };
  }, [hasMore, isFirstLoad]);

  // Countries and regions are now loaded by the context
  useEffect(() => {
    if (!loading && !isFirstLoad && gridSections.length === 0 && !hasTrackedNoResultsRef.current) {
      hasTrackedNoResultsRef.current = true;
      trackEvent("interaction", "explore_no_results");
    }
  }, [loading, isFirstLoad, gridSections.length, trackEvent]);

  // Update local filters when props change
  useEffect(() => {
    // This useEffect was removed as per the edit hint
  }, []);

  // Event handlers - use props if available, otherwise use local handlers
  // This useEffect was removed as per the edit hint

  // Computed values
  // This useEffect was removed as per the edit hint

  return (
    <div className={styles["explore__container"]}>
      <div
        ref={containerRef}
        className={styles["explore__grid-container"]}
        onTouchStart={handleContentTouch}
        onTouchEnd={handleContentTouch}
      >
        {isFirstLoad ? (
          <LoadingSpinner />
        ) : (
          <>
            <div className={styles["explore__content-wrapper"]}>
              {gridSections.length === 0 && !loading && (
                <div className={styles["explore__no-results"]}>
                  <div
                    className={`${styles["explore__no-results-title"]} typography-title-medium`}
                  >
                    No results found
                  </div>
                  <div
                    className={`${styles["explore__no-results-subtitle"]} typography-body-medium`}
                  >
                    Try adjusting your filters
                  </div>
                </div>
              )}
              <div
                className={styles["explore__grid-section"]}
                style={{
                  width: "100%",
                  height: gridSections.reduce(
                    (total, section) => total + section.height,
                    0
                  ),
                  position: "relative",
                }}
              >
                {gridSections.map((section, sectionIndex) => {
                  const sectionTop = gridSections
                    .slice(0, sectionIndex)
                    .reduce(
                      (total, prevSection) => total + prevSection.height,
                      0
                    );
                  return section.items.map((item) =>
                    item.type === "shelter" ? (
                      <ShelterCell
                        key={item.key}
                        item={item}
                        sectionTop={sectionTop}
                      />
                    ) : (
                      <PeakCell
                        key={item.key}
                        item={item}
                        sectionTop={sectionTop}
                      />
                    )
                  );
                })}
              </div>

              {/* Always visible spinner */}
              {hasMore && (
                <div className={styles["explore__loading-more"]}>
                  <Loader2
                    size={24}
                    className={styles["explore__loading-spinner"]}
                  />
                  <span className="typography-body-medium">
                    Loading more...
                  </span>
                </div>
              )}
              {!hasMore && gridSections.length > 0 && (
                <div className={styles["explore__end-message"]}>
                  <div
                    className={`${styles["explore__end-message-text"]} typography-body-medium`}
                  >
                    {"There are no more results to explore!"}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Header */}
      <ExploreHeaderSearch />
    </div>
  );
}

