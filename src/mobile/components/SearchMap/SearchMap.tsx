"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Search as SearchIcon, X, Clock, User, Users, Lock, Shield } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import AdminSearchIcon from "../../../shared/components/AdminSearchIcon/AdminSearchIcon";
import MountainIcon from "../../../shared/components/MountainIcon/MountainIcon";
import MountainRangeIcon from "../../../shared/components/MountainRangeIcon/MountainRangeIcon";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../shared/context/AuthContext";
import { useI18n } from "../../../shared/context/I18nContext";
import { useAnalytics } from "../../../shared/context/AnalyticsContext";
import styles from "./SearchMap.module.css";
import { searchRealtime } from "../../../shared/api/endpoints/user";
import { getElevationColor } from "../../../shared/constants/elevationColors";
import { getLocationFromHierarchy } from "../../../shared/utils/adminHierarchy";
import { useLatestSearchToken } from "../../../shared/hooks/useLatestSearchToken";
import ShelterIcon from "../../../shared/components/ShelterIcon/ShelterIcon";
import { useUnitFormat } from "../../../shared/hooks/useUnitFormat";
import type {
  PeakSearchResult,
  UserSearchResult,
  AdminSearchResult,
  MountainRangeSearchResult,
  ClubSearchResult,
  ShelterSearchResult,
} from "../../../shared/api/types";
import {
  mergeRecentSearchResults,
  sanitizeStoredSearchResults,
} from "../../../shared/utils/searchResultStorage";

type SearchResult =
  | PeakSearchResult
  | UserSearchResult
  | AdminSearchResult
  | MountainRangeSearchResult
  | ClubSearchResult
  | ShelterSearchResult;

type SearchAreaResult = AdminSearchResult | MountainRangeSearchResult;

interface SearchMapProps {
  onPeakSelect: (peak: PeakSearchResult) => void;
  onShelterSelect?: (shelter: ShelterSearchResult) => void;
  onAreaSelect?: (result: SearchAreaResult) => void;
  onClose?: () => void;
}

// Elevation color and icon logic (mirrors Search component)
const getElevationColorWithVar = (elevation: number) => {
  const color = getElevationColor(elevation);
  return `var(--color-elevation-${color.replace("#", "")}, ${color})`;
};

const getElevationIcon = (elevation: number) => {
  if (elevation >= 8000) return "/icons/altitude/ic_mountain_black.png";
  if (elevation >= 6000) return "/icons/altitude/ic_mountain_burgundy.png";
  if (elevation >= 4000) return "/icons/altitude/ic_mountain_red.png";
  if (elevation >= 3000) return "/icons/altitude/ic_mountain_orange.png";
  if (elevation >= 2000) return "/icons/altitude/ic_mountain_yellow.png";
  return "/icons/altitude/ic_mountain_green.png";
};

const SearchMap: React.FC<SearchMapProps> = ({
  onPeakSelect,
  onShelterSelect,
  onAreaSelect,
  onClose,
}) => {
  const { t } = useI18n();
  const { trackEvent } = useAnalytics();
  const { formatMeters } = useUnitFormat();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [completedQuery, setCompletedQuery] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDropdownClosing, setIsDropdownClosing] = useState(false);
  const [recentSearches, setRecentSearches] = useState<
    (PeakSearchResult | UserSearchResult | ClubSearchResult | ShelterSearchResult)[]
  >([]);
  const searchTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);
  const collapseTimerRef = useRef<number | undefined>(undefined);
  const {
    nextSearchToken,
    invalidateSearchToken,
    isLatestSearchToken,
  } = useLatestSearchToken();

  // Helper function to close dropdown with animation
  const closeDropdownWithAnimation = useCallback(() => {
    setIsDropdownClosing(true);
    // Hide dropdown after animation completes
    window.clearTimeout(collapseTimerRef.current);
    collapseTimerRef.current = window.setTimeout(() => {
      setShowDropdown(false);
      setIsDropdownClosing(false);
    }, 200); // Match CSS animation duration
  }, []);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("searchmap_recentSearches");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Accept stored peaks; basic validation on required fields
          setRecentSearches(sanitizeStoredSearchResults(parsed));
        }
      } catch (error) {
        console.error("Failed to parse recent searches:", error);
        setRecentSearches([]);
      }
    }
  }, []);

  const handleSearch = useCallback(async (query: string, searchToken: number) => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      setSearchResults([]);
      setShowDropdown(false);
      setIsSearching(false);
      setCompletedQuery(null);
      return;
    }

    setIsSearching(true);
    try {
      const response = await searchRealtime(trimmedQuery);
      // Sort results by relevance score (higher first)
      const getScore = (item: SearchResult) =>
        typeof item.relevance_score === "number" ? item.relevance_score : 0;
      const sortedResults = response.results.sort(
        (a, b) => getScore(b) - getScore(a)
      );
      if (!isLatestSearchToken(searchToken)) return;
      setSearchResults(sortedResults);
      setCompletedQuery(trimmedQuery);
      setShowDropdown(true);
    } catch (error) {
      if (!isLatestSearchToken(searchToken)) return;
      console.error("Search failed:", error);
      setSearchResults([]);
      setCompletedQuery(trimmedQuery);
      setShowDropdown(true);
    } finally {
      if (isLatestSearchToken(searchToken)) {
        setIsSearching(false);
      }
    }
  }, [isLatestSearchToken]);

  const addToRecentSearches = useCallback(
    (result: PeakSearchResult | UserSearchResult | ClubSearchResult | ShelterSearchResult) => {
      if (!result) return;

      const updated = mergeRecentSearchResults(recentSearches, result, 10);
      setRecentSearches(updated);
      localStorage.setItem("searchmap_recentSearches", JSON.stringify(updated));
    },
    [recentSearches]
  );

  const handleResultSelect = useCallback(
    (result: SearchResult) => {
      invalidateSearchToken();
      setCompletedQuery(null);
      if (result.type === "peak") {
        trackEvent("search_result_select", `peak_${result.id}`);
        // Add to recent searches
        addToRecentSearches(result);

        // Call the onPeakSelect callback for map navigation
        onPeakSelect(result);

        // Close the search interface
        setSearchQuery("");
        setSearchResults([]);
        setIsExpanded(false);
        setIsSearching(false);
        // Close dropdown with animation
        closeDropdownWithAnimation();

        onClose?.();
      } else if (result.type === "shelter") {
        trackEvent("search_result_select", `shelter_${result.id}`);
        addToRecentSearches(result);

        if (onShelterSelect) {
          onShelterSelect(result);
        } else {
          navigate(`/shelters/${result.id}`);
        }

        // Close the search interface
        setSearchQuery("");
        setSearchResults([]);
        setIsExpanded(false);
        setIsSearching(false);
        // Close dropdown with animation
        closeDropdownWithAnimation();

        onClose?.();
      } else if (result.type === "user") {
        trackEvent("search_result_select", `user_${result.id}`);
        addToRecentSearches(result);
        // Navigate to profile
        if (user && user.internalUserId === result.id) {
          navigate("/profile");
        } else {
          navigate(`/externalprofile/${result.id}`);
        }

        // Close the search interface
        setSearchQuery("");
        setSearchResults([]);
        setIsExpanded(false);
        setIsSearching(false);
        // Close dropdown with animation
        closeDropdownWithAnimation();

        onClose?.();
      } else if (result.type === "club") {
        trackEvent("search_result_select", `club_${result.id}`);
        addToRecentSearches(result);
        navigate(`/clubs/${result.id}`);

        setSearchQuery("");
        setSearchResults([]);
        setIsExpanded(false);
        setIsSearching(false);
        closeDropdownWithAnimation();

        onClose?.();
      } else if (result.type === "admin" || result.type === "mountain_range") {
        trackEvent("search_result_select", `${result.type}_${result.id}`);
        onAreaSelect?.(result);

        // Close the search interface
        setSearchQuery("");
        setSearchResults([]);
        setIsExpanded(false);
        setIsSearching(false);
        // Close dropdown with animation
        closeDropdownWithAnimation();

        onClose?.();
      }
    },
    [
      invalidateSearchToken,
      addToRecentSearches,
      onPeakSelect,
      onAreaSelect,
      onClose,
      closeDropdownWithAnimation,
      trackEvent,
      navigate,
      user,
    ]
  );

  const handleRecentSearchClick = useCallback(
    (item: PeakSearchResult | UserSearchResult | ClubSearchResult | ShelterSearchResult) => {
      handleResultSelect(item);
    },
    [handleResultSelect]
  );

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    localStorage.removeItem("searchmap_recentSearches");
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const query = e.target.value;
      setSearchQuery(query);
      setCompletedQuery(null);
      const searchToken = nextSearchToken();

      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      if (!query.trim()) {
        setSearchResults([]);
        setShowDropdown(true);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      setShowDropdown(true);
      searchTimeoutRef.current = setTimeout(() => {
        handleSearch(query, searchToken);
      }, 300);
    },
    [handleSearch, nextSearchToken]
  );

  const handleResultMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  const handleExpand = useCallback(() => {
    setIsExpanded(true);
    setIsDropdownClosing(false);
    // Only show dropdown if there are recent searches
    setShowDropdown(recentSearches.length > 0);
  }, [recentSearches.length]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (isExpanded) {
      timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 200);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isExpanded]);

  const handleCollapse = useCallback(() => {
    invalidateSearchToken();
    setIsExpanded(false);
    setSearchQuery("");
    setSearchResults([]);
    setIsSearching(false);
    setCompletedQuery(null);
    // Close dropdown with animation
    closeDropdownWithAnimation();
    onClose?.();
  }, [closeDropdownWithAnimation, invalidateSearchToken, onClose]);

  const handleInputFocus = useCallback(() => {
    setIsDropdownClosing(false);
    setShowDropdown(true);
  }, []);

  const handleInputBlur = useCallback(() => {
    // Don't close dropdown on blur
  }, []);

  const handleInputClick = useCallback(() => {
    setIsDropdownClosing(false);
    setShowDropdown(true);
  }, []);

  // Handle clicks outside the search component
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;

      if (
        target.closest("canvas") ||
        target.closest(".map-container") ||
        target.closest(".leaflet-container")
      ) {
        invalidateSearchToken();
        setIsExpanded(false);
        setSearchQuery("");
        setSearchResults([]);
        setIsSearching(false);
        setCompletedQuery(null);
        // Close dropdown with animation
        closeDropdownWithAnimation();

        onClose?.();
      }
    };

    if (isExpanded) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [closeDropdownWithAnimation, invalidateSearchToken, isExpanded, onClose]);

  // Handle ESC key to collapse
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isExpanded) {
        handleCollapse();
      }
    };

    if (isExpanded) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isExpanded, handleCollapse]);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      window.clearTimeout(collapseTimerRef.current);
    };
  }, []);

  const isImageUrl = useCallback((value?: string | null) => {
    if (!value) return false;
    return value.startsWith("http://") || value.startsWith("https://");
  }, []);

  const shouldShowEmptyState =
    showDropdown &&
    !isSearching &&
    searchResults.length === 0 &&
    completedQuery === searchQuery.trim() &&
    searchQuery.trim().length > 0;

  return (
    <motion.div
      className={`${styles["search-map-container"]} ${
        isExpanded ? styles["search-map-container--expanded"] : ""
      }`}
      initial={false}
      animate={{
        width: isExpanded ? "calc(100% - 32px)" : "52px",
      }}
      transition={{
        type: "spring",
        stiffness: 320,
        damping: 32,
        mass: 0.8,
      }}
    >
      <AnimatePresence mode="wait" initial={false}>
        {!isExpanded ? (
          <motion.button
            key="collapsed"
            onClick={handleExpand}
            className={styles["search-map-button"]}
            aria-label="Open search"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
          >
            <SearchIcon size={24} />
          </motion.button>
        ) : (
          <motion.div
            key="expanded"
            className={styles["search-map-input-wrapper"]}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
          >
            <SearchIcon className={styles["search-map-icon"]} size={24} />
            <input
              ref={inputRef}
              type="text"
              placeholder={
                isSearching ? t("search.searching") : t("search.searchForPeaks")
              }
              value={searchQuery}
              onChange={handleInputChange}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              onClick={handleInputClick}
              className={`${styles["search-map-input"]} typography-body-medium`}
              aria-label={t("search.searchLabel")}
            />
            <button
              className={styles["search-map-close"]}
              onClick={handleCollapse}
              title={t("search.closeSearch")}
              aria-label={t("search.closeSearch")}
            >
              <X size={18} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {showDropdown &&
        (isSearching ||
          searchResults.length > 0 ||
          (searchQuery.trim() && !isSearching) ||
          (!searchQuery.trim() &&
            !isSearching &&
            recentSearches.length > 0)) && (
          <div
            className={`${styles["search-map-dropdown"]} ${
              isDropdownClosing ? styles["search-map-dropdown--closing"] : ""
            }`}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            {isSearching ? (
              // Shimmer loading state
              <div className={styles["search-map-dropdown__shimmer"]}>
                <div className={styles["search-map-dropdown__shimmer-item"]}>
                  <div
                    className={styles["search-map-dropdown__shimmer-thumb"]}
                  />
                  <div className={styles["search-map-dropdown__shimmer-text"]}>
                    <div
                      className={`${styles["search-map-dropdown__shimmer-title"]} typography-title-medium`}
                    />
                    <div
                      className={`${styles["search-map-dropdown__shimmer-subtitle"]} typography-title-medium`}
                    />
                  </div>
                </div>
                <div className={styles["search-map-dropdown__shimmer-item"]}>
                  <div
                    className={styles["search-map-dropdown__shimmer-thumb"]}
                  />
                  <div className={styles["search-map-dropdown__shimmer-text"]}>
                    <div
                      className={`${styles["search-map-dropdown__shimmer-title"]} typography-title-medium`}
                    />
                    <div
                      className={`${styles["search-map-dropdown__shimmer-subtitle"]} typography-title-medium`}
                    />
                  </div>
                </div>
              </div>
            ) : searchResults.length > 0 ? (
              searchResults.map((result) => {
                if (result.type === "peak") {
                  const hasImage = Boolean(result.image);
                  const elevationColor = getElevationColorWithVar(
                    result.elevation
                  );
                  const elevationIcon = getElevationIcon(result.elevation);

                  return (
                    <div
                      key={`peak-${result.id}`}
                      className={styles["search-map-result"]}
                      onClick={() => handleResultSelect(result)}
                      onMouseDown={handleResultMouseDown}
                    >
                      <div className={styles["search-map-result-content"]}>
                        <div className={styles["search-map-result-image"]}>
                          {hasImage ? (
                            <img
                              src={result.image}
                              alt={result.name}
                              className={styles["search-map-result-image-img"]}
                            />
                          ) : (
                            <div
                              className={
                                styles["search-map-result-image-placeholder"]
                              }
                              style={{
                                background: `linear-gradient(rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.3)), ${elevationColor}`,
                              }}
                            >
                              <img
                                src={elevationIcon}
                                alt={t("search.elevationIcon")}
                                className={
                                  styles["search-map-result-elevation-icon"]
                                }
                              />
                            </div>
                          )}
                        </div>

                        <div className={styles["search-map-result-info"]}>
                          <div
                            className={`${styles["search-map-result-title"]} typography-title-medium`}
                          >
                            {result.name_en || result.name}
                          </div>
                          <div className={styles["search-map-result-details"]}>
                            <img
                              src={elevationIcon}
                              alt=""
                              className={
                                styles["search-map-result-details-icon"]
                              }
                            />
                            <span
                              className={`${styles["search-map-result-elevation"]} typography-body-small`}
                            >
                              {formatMeters(result.elevation)}
                            </span>
                            {getLocationFromHierarchy(result.admin_hierarchy) && (
                                <span
                                  className={`${styles["search-map-result-location"]} typography-body-small`}
                                >
                                  {getLocationFromHierarchy(result.admin_hierarchy)}
                                </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                } else if (result.type === "shelter") {
                  const shelterResult = result as ShelterSearchResult;
                  const shelterTypeColors: Record<string, string> = {
                    alpine_hut: "#0C4A7B",
                    wilderness_hut: "#2D6A4F",
                    shelter: "#D92B2B",
                  };
                  const hasImage = Boolean(shelterResult.image);
                  const typeLabel = t(`shelterDetails.type.${shelterResult.shelter_type}`) || "Shelter";
                  const typeColor = shelterTypeColors[shelterResult.shelter_type] || "#D92B2B";

                  return (
                    <div
                      key={`shelter-${result.id}`}
                      className={styles["search-map-result"]}
                      onClick={() => handleResultSelect(shelterResult)}
                      onMouseDown={handleResultMouseDown}
                    >
                      <div className={styles["search-map-result-content"]}>
                        <div className={styles["search-map-result-image"]}>
                          {hasImage ? (
                            <img
                              src={shelterResult.image || ""}
                              alt={shelterResult.name}
                              className={styles["search-map-result-image-img"]}
                            />
                          ) : (
                            <div
                              className={
                                styles["search-map-result-image-placeholder"]
                              }
                              style={{
                                background: `linear-gradient(rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.3)), ${typeColor}`,
                              }}
                            >
                              <ShelterIcon
                                size={20}
                                className={
                                  styles["search-map-result-elevation-icon"]
                                }
                              />
                            </div>
                          )}
                        </div>

                        <div className={styles["search-map-result-info"]}>
                          <div
                            className={`${styles["search-map-result-title"]} typography-title-medium`}
                          >
                            {shelterResult.name_en || shelterResult.name}
                          </div>
                          <div className={styles["search-map-result-details"]}>
                            <span
                              style={{
                                fontSize: 10,
                                padding: "1px 6px",
                                borderRadius: 4,
                                backgroundColor: typeColor,
                                color: "white",
                                fontWeight: 600,
                              }}
                            >
                              {typeLabel}
                            </span>
                            {shelterResult.elevation != null && (
                              <span
                                className={`${styles["search-map-result-elevation"]} typography-body-small`}
                              >
                                {formatMeters(shelterResult.elevation)}
                              </span>
                            )}
                            {getLocationFromHierarchy(shelterResult.admin_hierarchy) && (
                                <span
                                  className={`${styles["search-map-result-location"]} typography-body-small`}
                                >
                                  {getLocationFromHierarchy(shelterResult.admin_hierarchy)}
                                </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                } else if (result.type === "user") {
                  const hasImage = Boolean(result.image);

                  return (
                    <div
                      key={`user-${result.id}`}
                      className={styles["search-map-result"]}
                      onClick={() => handleResultSelect(result)}
                      onMouseDown={handleResultMouseDown}
                    >
                      <div className={styles["search-map-result-content"]}>
                        <div className={styles["search-map-result-image"]}>
                          {hasImage ? (
                            <img
                              src={result.image}
                              alt={result.name}
                              className={styles["search-map-result-image-img"]}
                            />
                          ) : (
                            <div
                              className={
                                styles["search-map-result-image-placeholder"]
                              }
                              style={{
                                backgroundColor: "black",
                                opacity: 0.7,
                              }}
                            >
                              <User
                                size={28}
                                color="white"
                                className={
                                  styles[
                                    "search-map-result-elevation-icon_user"
                                  ]
                                }
                              />
                            </div>
                          )}
                        </div>

                        <div className={styles["search-map-result-info"]}>
                          <div
                            className={`${styles["search-map-result-title"]} typography-title-medium`}
                          >
                            {result.name}
                          </div>
                          <div className={styles["search-map-result-details"]}>
                            <span
                              className={`${styles["search-map-result-elevation"]} typography-body-small`}
                            >
                              {result.total_peaks} {t("search.peaks")}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                } else if (result.type === "club") {
                  const hasImage = Boolean(result.image);

                  return (
                    <div
                      key={`club-${result.id}`}
                      className={styles["search-map-result"]}
                      onClick={() => handleResultSelect(result)}
                      onMouseDown={handleResultMouseDown}
                    >
                      <div className={styles["search-map-result-content"]}>
                        <div className={styles["search-map-result-image"]}>
                          {hasImage ? (
                            <img
                              src={result.image || ""}
                              alt={result.name}
                              className={styles["search-map-result-image-img"]}
                            />
                          ) : (
                            <div
                              className={
                                styles["search-map-result-image-placeholder"]
                              }
                              style={{
                                backgroundColor: "rgba(194, 207, 148, 0.35)",
                                justifyContent: "center",
                              }}
                            >
                              <Users
                                size={28}
                                className={
                                  styles["search-map-result-elevation-icon_user"]
                                }
                              />
                            </div>
                          )}
                        </div>

                        <div className={styles["search-map-result-info"]}>
                          <div
                            className={`${styles["search-map-result-title"]} typography-title-medium`}
                          >
                            {result.name}
                          </div>
                          <div className={styles["search-map-result-details"]}>
                            {result.visibility === "private" ? (
                              <Lock
                                size={16}
                                className={styles["search-map-result-details-icon"]}
                              />
                            ) : (
                              <Shield
                                size={16}
                                className={styles["search-map-result-details-icon"]}
                              />
                            )}
                            <span
                              className={`${styles["search-map-result-elevation"]} typography-body-small`}
                            >
                              {result.member_count} {t("clubs.metrics.members") || "members"}
                            </span>
                            <span
                              className={`${styles["search-map-result-elevation"]} typography-body-small`}
                            >
                              {result.distinct_peak_count || 0} {t("clubs.metrics.distinctPeaks") || "peaks"}
                            </span>
                            {getLocationFromHierarchy(result.admin_hierarchy) && (
                              <div className={styles["search-map-result-location-container"]}>
                                <span
                                  className={`${styles["search-map-result-location"]} typography-body-small`}
                                >
                                  {getLocationFromHierarchy(result.admin_hierarchy)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                } else if (result.type === "admin") {
                  const adminTitle = result.name_only || result.name;
                  const adminSubtitle =
                    result.parent_name ||
                    (result.name_only && result.name !== result.name_only
                      ? result.name
                      : null);
                  const hasImageUrl = isImageUrl(result.image);

                  return (
                    <div
                      key={`admin-${result.id}`}
                      className={styles["search-map-result"]}
                      onClick={() => handleResultSelect(result)}
                      onMouseDown={handleResultMouseDown}
                    >
                      <div className={styles["search-map-result-content"]}>
                        <div className={styles["search-map-result-image"]}>
                          {hasImageUrl ? (
                            <img
                              src={result.image || ""}
                              alt={adminTitle}
                              className={styles["search-map-result-image-img"]}
                            />
                          ) : (
                            <div
                              className={
                                styles["search-map-result-image-placeholder"]
                              }
                              style={{
                                backgroundColor: "rgba(15, 23, 42, 0.08)",
                                justifyContent: "center",
                              }}
                            >
                              {result.image && !hasImageUrl ? (
                                <span
                                  className={
                                    styles["search-map-result-title"]
                                  }
                                >
                                  {result.image}
                                </span>
                              ) : (
                                <AdminSearchIcon
                                  size={28}
                                  className={
                                    styles["search-map-result-elevation-icon_user"]
                                  }
                                />
                              )}
                            </div>
                          )}
                        </div>

                        <div className={styles["search-map-result-info"]}>
                          <div
                            className={`${styles["search-map-result-title"]} typography-title-medium`}
                          >
                            {adminTitle}
                          </div>
                          {adminSubtitle && (
                            <div
                              className={styles["search-map-result-details"]}
                            >
                              <span
                                className={`${styles["search-map-result-location"]} typography-body-small`}
                              >
                                {adminSubtitle}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                } else if (result.type === "mountain_range") {
                  const rangeTitle = result.name_en || result.name;
                  const rangeSubtitle =
                    result.name_en && result.name_en !== result.name
                      ? result.name
                      : null;

                  return (
                    <div
                      key={`range-${result.id}`}
                      className={styles["search-map-result"]}
                      onClick={() => handleResultSelect(result)}
                      onMouseDown={handleResultMouseDown}
                    >
                      <div className={styles["search-map-result-content"]}>
                        <div className={styles["search-map-result-image"]}>
                          <div
                            className={
                              styles["search-map-result-image-placeholder"]
                            }
                            style={{
                              backgroundColor: "rgba(75, 140, 46, 0.1)",
                              justifyContent: "center",
                            }}
                          >
                            <MountainRangeIcon
                              size={32}
                              className={
                                styles["search-map-result-elevation-icon_user"]
                              }
                            />
                          </div>
                        </div>

                        <div className={styles["search-map-result-info"]}>
                          <div
                            className={`${styles["search-map-result-title"]} typography-title-medium`}
                          >
                            {rangeTitle}
                          </div>
                          {rangeSubtitle && (
                            <div
                              className={styles["search-map-result-details"]}
                            >
                              <MountainRangeIcon
                                size={16}
                                className={
                                  styles["search-map-result-details-icon"]
                                }
                              />
                              <span
                                className={`${styles["search-map-result-location"]} typography-body-small`}
                              >
                                {rangeSubtitle}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              })
            ) : shouldShowEmptyState ? (
              <div className={styles["search-map-empty"]}>
                <MountainIcon
                  className={styles["search-map-empty-icon"]}
                  size={32}
                />
                <span>{t("search.noPeaksFound", { query: searchQuery })}</span>
              </div>
            ) : !searchQuery.trim() &&
              !isSearching &&
              recentSearches.length > 0 ? (
              <div className={styles["search-map-recent"]}>
                <div className={styles["search-map-recent-header"]}>
                  <Clock size={16} />
                  <span className="typography-label-medium">
                    {t("search.recentSearches")}
                  </span>
                  <button
                    className={styles["search-map-clear-recent"]}
                    onClick={clearRecentSearches}
                    title={t("search.clearRecentSearches")}
                  >
                    <X size={14} />
                  </button>
                </div>
                <div className={styles["search-map-recent-list"]}>
                  {recentSearches.slice(0, 3).map((item) => (
                    <div
                      key={`recent-${item.type}-${item.id}`}
                      className={styles["search-map-recent-item"]}
                      onClick={() => handleRecentSearchClick(item)}
                      onMouseDown={handleResultMouseDown}
                    >
                      {item.type === "peak" ? (
                        <MountainIcon size={14} />
                      ) : item.type === "shelter" ? (
                        <ShelterIcon size={14} />
                      ) : item.type === "club" ? (
                        <Users size={14} />
                      ) : (
                        <User size={14} />
                      )}
                      <span className="typography-body-small">
                        {item.type === "peak" ? (item.name_en || item.name) : item.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
    </motion.div>
  );
};

export default React.memo(SearchMap);
