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
import { useExplore } from "../desktop-context/desktop-ExploreContext";
import { useAnalytics } from "../../shared/context/AnalyticsContext";
import ShelterIcon from "../../shared/components/ShelterIcon/ShelterIcon";
import ExploreSidebar from "../desktop-components/desktop-ExploreSidebar/desktop-ExploreSidebar";
import { getElevationColor } from "../../shared/constants/elevationColors";
import { getOptimizedThumbnailUrl } from "../../shared/utils/imageUtils";
import { getLocationFromHierarchy } from "../../shared/utils/adminHierarchy";
import type { AdminHierarchy } from "../../shared/api/types/common";
import type { ShelterType } from "../../shared/api/types";
import styles from "./desktop-Explore.module.css";

// Use public assets via absolute paths instead of importing from public
const defaultPeak = "/icons/altitude/place.jpg";
const icMountainBlack = "/icons/altitude/ic_mountain_black.png";
const icMountainBurgundy = "/icons/altitude/ic_mountain_burgundy.png";
const icMountainRed = "/icons/altitude/ic_mountain_red.png";
const icMountainOrange = "/icons/altitude/ic_mountain_orange.png";
const icMountainYellow = "/icons/altitude/ic_mountain_yellow.png";
const icMountainGreen = "/icons/altitude/ic_mountain_green.png";

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

const getCardId = (card: FeedCard): string =>
  String(card.kind === "peak" ? card.peak.id : card.shelter.id);

interface GridCell {
  type: "peak" | "shelter";
  x: number;
  y: number;
  width: number;
  height: number;
  special?: boolean;
}

type CellSize = "small" | "medium" | "large" | "wide" | "tall" | "extra-wide";

interface GridItem extends GridCell {
  key: string;
  peak?: Peak;
  shelter?: Shelter;
  size?: CellSize;
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

// Size patterns for gallery layout - creates varied, interesting layouts
const SIZE_PATTERNS: CellSize[] = [
  "small",
  "small",
  "medium",
  "small",
  "wide",
  "small",
  "tall",
  "small",
  "medium",
  "large",
  "small",
  "wide",
  "small",
  "small",
  "extra-wide",
  "small",
  "tall",
  "small",
  "medium",
  "small",
];

// Get size for an item based on its index to create varied gallery layout
const getSizeForIndex = (index: number): CellSize => {
  return SIZE_PATTERNS[index % SIZE_PATTERNS.length] || "small";
};

// Create flexible gallery layout with varied sizes
const createGalleryLayout = (
  cards: FeedCard[],
  sectionId: string
): GridItem[] => {
  const items: GridItem[] = [];

  // Identify which indices have "big" cells (not "small")
  const bigCellIndices: number[] = [];
  const smallCellIndices: number[] = [];

  for (let i = 0; i < cards.length; i++) {
    const size = getSizeForIndex(i);
    if (size !== "small") {
      bigCellIndices.push(i);
    } else {
      smallCellIndices.push(i);
    }
  }

  // Sort cards by elevation to find highest ones for big cells
  const cardsSortedByElevation = [...cards].sort(
    (a, b) => getCardElevation(b) - getCardElevation(a)
  );

  // Create a set to track which cards have been used
  const usedCardIds = new Set<string>();

  // Assign highest elevation cards to big cells
  const assignedCards: (FeedCard | null)[] = new Array(cards.length).fill(null);

  bigCellIndices.forEach((index, bigIndex) => {
    if (bigIndex < cardsSortedByElevation.length) {
      const card = cardsSortedByElevation[bigIndex];
      if (card) {
        assignedCards[index] = card;
        usedCardIds.add(getCardId(card));
      }
    }
  });

  // Fill remaining positions with cards in original order
  let originalCardIndex = 0;
  smallCellIndices.forEach((index) => {
    // Find next unused card from original order
    while (originalCardIndex < cards.length) {
      const currentCard = cards[originalCardIndex];
      if (currentCard && !usedCardIds.has(getCardId(currentCard))) {
        break;
      }
      originalCardIndex++;
    }
    if (originalCardIndex < cards.length) {
      const card = cards[originalCardIndex];
      if (card) {
        assignedCards[index] = card;
        usedCardIds.add(getCardId(card));
        originalCardIndex++;
      }
    }
  });

  // Fill any remaining null positions with remaining cards
  const remainingCards = cards.filter((c) => !usedCardIds.has(getCardId(c)));
  let remainingIndex = 0;
  for (let i = 0; i < assignedCards.length; i++) {
    if (assignedCards[i] === null && remainingIndex < remainingCards.length) {
      const card = remainingCards[remainingIndex];
      if (card) {
        assignedCards[i] = card;
        remainingIndex++;
      }
    }
  }

  // Create grid items with assigned cards
  assignedCards.forEach((card, index) => {
    if (card) {
      const baseItem = {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        special: false,
        key: `${card.kind}-${getCardId(card)}-${sectionId}-${index}`,
        size: getSizeForIndex(index),
      };
      if (card.kind === "peak") {
        items.push({ ...baseItem, type: "peak" as const, peak: card.peak });
      } else {
        items.push({
          ...baseItem,
          type: "shelter" as const,
          shelter: card.shelter,
        });
      }
    }
  });

  return items;
};

const createGridSection = (
  cards: FeedCard[],
  _containerWidth: number,
  sectionId: string,
  isLastSection = false
): GridSection => {
  const items = createGalleryLayout(cards, sectionId);
  // Height will be calculated by CSS Grid
  return { id: sectionId, items, height: 0, isLastSection };
};

// Components
const PeakCell: React.FC<{
  item: GridItem;
}> = ({ item }) => {
  const navigate = useNavigate();
  const { trackEvent } = useAnalytics();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  if (item.type !== "peak" || !item.peak) return null;

  const peak = item.peak;
  const peakName = peak.name_en || peak.name || "Unknown Peak";
  const elevation = peak.elevation || 0;
  const locationText = getLocationFromHierarchy(peak.admin_hierarchy);
  const iconImage = getPeakIconImage(elevation);
  const hasValidImage = isValidImage(peak.image);
  const elevationColor = getElevationColor(elevation);

  const sizeClass = item.size
    ? styles[`explore__peak-cell--${item.size}`]
    : styles["explore__peak-cell--small"];

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoaded(true);
  };

  return (
    <div
      key={item.key}
      className={`${styles["explore__peak-cell"]} ${sizeClass}`}
      style={{
        background: hasValidImage ? undefined : elevationColor,
      }}
      onClick={() => {
        // Track peak view from explore page
        trackEvent("peak_click", `explore_desktop_${peak.id}`);
        navigate(`/peaks/${peak.id}`);
      }}
    >
      {/* Shimmer loading effect - show while image is loading */}
      {hasValidImage && (
        <div
          className={`${styles["explore__peak-shimmer"]} ${
            imageLoaded || imageError
              ? styles["explore__peak-shimmer--hidden"]
              : ""
          }`}
        />
      )}

      {/* Background - Always visible */}
      {hasValidImage ? (
        <img
          src={getOptimizedThumbnailUrl(peak.image, 1000) || defaultPeak}
          alt={peakName}
          className={`${styles["explore__peak-img"]} ${
            imageLoaded ? styles["explore__peak-img--loaded"] : ""
          }`}
          onLoad={handleImageLoad}
          onError={handleImageError}
          loading="lazy"
          decoding="async"
        />
      ) : null}

      {/* Default: Show only icon */}
      <div
        className={`${styles["explore__peak-icon-default"]} ${
          hasValidImage
            ? styles["explore__peak-icon-default--top-right"]
            : styles["explore__peak-icon-default--center"]
        }`}
      >
        <img
          src={iconImage || "/placeholder.svg"}
          alt="elevation icon"
          className={`${styles["explore__peak-icon-img"]} ${
            hasValidImage
              ? styles["explore__peak-icon-img--small"]
              : styles["explore__peak-icon-img--large"]
          }`}
        />
      </div>

      {/* Overlay - Always visible for peaks without image, only on hover for peaks with image */}
      {!hasValidImage && <div className={styles["explore__peak-overlay"]} />}

      {/* Hover: Show overlay and text */}
      <div className={styles["explore__peak-hover-content"]}>
        {hasValidImage && <div className={styles["explore__peak-overlay"]} />}
        <div className={styles["explore__peak-content"]}>
          <div
            className={`${styles["explore__peak-name"]} typography-desktop-title-small`}
          >
            {peakName}
          </div>
          <div
            className={`${styles["explore__peak-details"]} typography-desktop-body-small`}
          >
            {elevation ? `${elevation}m` : ""}
            {locationText ? ` - ${locationText}` : ""}
          </div>
        </div>
      </div>
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
}> = ({ item }) => {
  const navigate = useNavigate();
  const { trackEvent } = useAnalytics();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  if (item.type !== "shelter" || !item.shelter) return null;

  const shelter = item.shelter;
  const shelterName = shelter.name_en || shelter.name || "Unknown Shelter";
  const elevation = shelter.elevation || 0;
  const locationText = getLocationFromHierarchy(shelter.admin_hierarchy);
  const hasValidImage = isValidImage(shelter.image);
  const typeColor =
    SHELTER_TYPE_COLORS[shelter.shelter_type] || "#D92B2B";

  const sizeClass = item.size
    ? styles[`explore__peak-cell--${item.size}`]
    : styles["explore__peak-cell--small"];

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoaded(true);
  };

  return (
    <div
      key={item.key}
      className={`${styles["explore__peak-cell"]} ${sizeClass}`}
      style={{
        background: hasValidImage ? undefined : typeColor,
      }}
      onClick={() => {
        trackEvent("shelter_click", `explore_desktop_${shelter.id}`);
        navigate(`/shelters/${shelter.id}`);
      }}
    >
      {/* Shimmer loading effect - show while image is loading */}
      {hasValidImage && (
        <div
          className={`${styles["explore__peak-shimmer"]} ${
            imageLoaded || imageError
              ? styles["explore__peak-shimmer--hidden"]
              : ""
          }`}
        />
      )}

      {/* Background - Always visible */}
      {hasValidImage ? (
        <img
          src={getOptimizedThumbnailUrl(shelter.image, 1000) || defaultPeak}
          alt={shelterName}
          className={`${styles["explore__peak-img"]} ${
            imageLoaded ? styles["explore__peak-img--loaded"] : ""
          }`}
          onLoad={handleImageLoad}
          onError={handleImageError}
          loading="lazy"
          decoding="async"
        />
      ) : null}

      {/* Default: Show only shelter icon */}
      <div
        className={`${styles["explore__peak-icon-default"]} ${
          hasValidImage
            ? styles["explore__peak-icon-default--top-right"]
            : styles["explore__peak-icon-default--center"]
        }`}
      >
        <ShelterIcon
          size={hasValidImage ? 18 : 48}
          color={hasValidImage ? typeColor : "rgba(255, 255, 255, 0.9)"}
          className={`${styles["explore__peak-icon-img"]} ${
            hasValidImage
              ? styles["explore__peak-icon-img--small"]
              : styles["explore__peak-icon-img--large"]
          }`}
        />
      </div>

      {/* Overlay - Always visible for shelters without image, only on hover for shelters with image */}
      {!hasValidImage && <div className={styles["explore__peak-overlay"]} />}

      {/* Hover: Show overlay and text */}
      <div className={styles["explore__peak-hover-content"]}>
        {hasValidImage && <div className={styles["explore__peak-overlay"]} />}
        <div className={styles["explore__peak-content"]}>
          <div
            className={`${styles["explore__peak-name"]} typography-desktop-title-small`}
          >
            {shelterName}
          </div>
          <div
            className={`${styles["explore__peak-details"]} typography-desktop-body-small`}
          >
            {elevation ? `${elevation}m` : ""}
            {locationText ? ` - ${locationText}` : ""}
          </div>
        </div>
      </div>
    </div>
  );
};

// Main Component
export default function Explore() {
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

  const [gridSections, setGridSections] = useState<GridSection[]>([]);
  const [loading, setLoading] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [page, setPage] = useState(1);

  const [hasMore, setHasMore] = useState(true);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isLoadingRef = useRef(false);
  const loadMoreDataRef = useRef<(() => Promise<void>) | undefined>(undefined);
  const hasInitializedRef = useRef(false);
  const shelterCursorRef = useRef<string | number | null>(null);

  // Sidebar visibility state for scroll-based show/hide
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const lastScrollTopRef = useRef(0);

  // Get context functions for closing filters and search
  const {
    setShowExploreFilters,
    handleCloseExploreSearch,
    handleExploreDragStart,
  } = useExplore();

  // Handle click to close filters and search (desktop uses mouse instead of touch)
  const handleContentClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Only close filters if clicking directly on the container, not on child elements
      if (e.target === e.currentTarget) {
        setShowExploreFilters(false);
        handleCloseExploreSearch();
        handleExploreDragStart();
      }
    },
    [setShowExploreFilters, handleCloseExploreSearch, handleExploreDragStart]
  );

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
    setGridSections([]); // Clear existing data immediately
    isLoadingRef.current = false;
    shelterCursorRef.current = null;
    if (containerRef.current) containerRef.current.scrollTop = 0;
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
      setHasMore(false);
    } finally {
      setLoading(false);
      setIsFirstLoad(false);
      isLoadingRef.current = false;
    }
  }, [page, hasMore, containerWidth, exploreFilters, gridSections]);

  // Update the ref whenever loadMoreData changes
  useEffect(() => {
    loadMoreDataRef.current = loadMoreData;
  }, [loadMoreData]);

  // Initial load when containerWidth is first set
  useEffect(() => {
    if (
      containerWidth > 0 &&
      !hasInitializedRef.current &&
      !isLoadingRef.current &&
      loadMoreDataRef.current
    ) {
      hasInitializedRef.current = true;
      loadMoreDataRef.current();
    }
  }, [containerWidth]);

  // Trigger data loading when page, hasMore, or filters change (NOT on resize)
  useEffect(() => {
    if (
      containerWidth > 0 &&
      hasInitializedRef.current &&
      !isLoadingRef.current &&
      loadMoreDataRef.current
    ) {
      // Small delay to ensure state updates are processed
      const timeoutId = setTimeout(() => {
        if (loadMoreDataRef.current && !isLoadingRef.current) {
          loadMoreDataRef.current();
        }
      }, 0);
      return () => clearTimeout(timeoutId);
    }
    return undefined;
  }, [page, hasMore, exploreFilters]);

  // Infinite scroll - scroll-based detection
  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;

      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;

      // Sidebar visibility logic: hide on scroll down, show on scroll up
      const currentScrollTop = scrollTop;
      const scrollDifference = currentScrollTop - lastScrollTopRef.current;

      // Always show sidebar if scrolled less than 500px
      if (currentScrollTop <= 300) {
        setIsSidebarVisible(true);
        lastScrollTopRef.current = currentScrollTop;
        return;
      }

      // Only apply hide/show logic after 500px scroll
      // Only update visibility if scroll difference is significant (more than 5px to avoid jitter)
      if (Math.abs(scrollDifference) > 5) {
        if (scrollDifference > 0) {
          // Scrolling down - hide sidebar
          setIsSidebarVisible(false);
        } else if (scrollDifference < 0) {
          // Scrolling up - show sidebar
          setIsSidebarVisible(true);
        }
        lastScrollTopRef.current = currentScrollTop;
      }

      // Infinite scroll logic
      if (isLoadingRef.current || !hasMore || isFirstLoad) return;

      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

      // Trigger when 1000px from bottom
      if (distanceFromBottom < 1000) {
        setPage((prev) => {
          const newPage = prev + 1;
          return newPage;
        });
      }
    };

    const container = containerRef.current;
    if (!container) return;

    // Use passive listener for better performance
    container.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, [hasMore, isFirstLoad]);

  return (
    <div className={styles["explore__container"]}>
      <div
        ref={containerRef}
        className={styles["explore__grid-container"]}
        onClick={handleContentClick}
      >
        {isFirstLoad ? (
          <LoadingSpinner />
        ) : (
          <>
            <div className={styles["explore__content-wrapper"]}>
              {gridSections.length === 0 && !loading && (
                <div className={styles["explore__no-results"]}>
                  <div
                    className={`${styles["explore__no-results-title"]} typography-desktop-title-medium`}
                  >
                    No results found
                  </div>
                  <div
                    className={`${styles["explore__no-results-subtitle"]} typography-desktop-body-medium`}
                  >
                    Try adjusting your filters
                  </div>
                </div>
              )}
              <div className={styles["explore__grid-section"]}>
                {gridSections.map((section) =>
                  section.items.map((item) =>
                    item.type === "shelter" ? (
                      <ShelterCell key={item.key} item={item} />
                    ) : (
                      <PeakCell key={item.key} item={item} />
                    )
                  )
                )}
              </div>

              {/* Always visible spinner */}
              {hasMore && (
                <div className={styles["explore__loading-more"]}>
                  <Loader2
                    size={24}
                    className={styles["explore__loading-spinner"]}
                  />
                  <span className="typography-desktop-body-medium">
                    Loading more...
                  </span>
                </div>
              )}
              {!hasMore && gridSections.length > 0 && (
                <div className={styles["explore__end-message"]}>
                  <div
                    className={`${styles["explore__end-message-text"]} typography-desktop-body-medium`}
                  >
                    {"There are no more results to explore!"}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Sidebar */}
      <ExploreSidebar isVisible={isSidebarVisible} />
    </div>
  );
}
