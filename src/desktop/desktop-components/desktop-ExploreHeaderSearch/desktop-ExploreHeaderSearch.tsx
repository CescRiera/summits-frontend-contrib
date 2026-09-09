"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Search as SearchIcon,
  ChevronDown,
  TrendingUp,
  Mountain,
  User,
  Users,
  Lock,
  Shield,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../shared/context/AuthContext";
import { useI18n } from "../../../shared/context/I18nContext";
import { useAnalytics } from "../../../shared/context/AnalyticsContext";
import { useExplore } from "../../desktop-context/desktop-ExploreContext.tsx";
import { searchRealtime } from "../../../shared/api/endpoints/user";
import { getElevationColor } from "../../../shared/constants/elevationColors";
import { getLocationFromHierarchy } from "../../../shared/utils/adminHierarchy";
import AdminSearchIcon from "../../../shared/components/AdminSearchIcon/AdminSearchIcon";
import { useLatestSearchToken } from "../../../shared/hooks/useLatestSearchToken";
import ShelterIcon from "../../../shared/components/ShelterIcon/ShelterIcon";
import type {
  PeakSearchResult,
  UserSearchResult,
  AdminSearchResult,
  ClubSearchResult,
  ShelterSearchResult,
} from "../../../shared/api/types";
import Slider from "@mui/material/Slider";
import { useUnitFormat } from "../../../shared/hooks/useUnitFormat";
import styles from "./desktop-ExploreHeaderSearch.module.css";

type SearchResult =
  | PeakSearchResult
  | UserSearchResult
  | AdminSearchResult
  | ClubSearchResult
  | ShelterSearchResult;

// Elevation color and icon logic
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

const ExploreHeaderSearch: React.FC = () => {
  const { formatMeters: formatElevation } = useUnitFormat();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useI18n();
  const { trackEvent } = useAnalytics();
  const {
    exploreFilters,
    adminLevels,
    selectAdminLevel,
    selectAdminSearchResult,
    isExploreFiltersCollapsed,
    setIsExploreFiltersCollapsed,
    handleExploreElevationChange,
  } = useExplore();

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [completedQuery, setCompletedQuery] = useState<string | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);
  const {
    nextSearchToken,
    invalidateSearchToken,
    isLatestSearchToken,
  } = useLatestSearchToken();

  // Filter animation state
  const [isFiltersClosing, setIsFiltersClosing] = useState(false);
  const filterCloseTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Filter state
  const [pendingRange, setPendingRange] = useState<[number, number]>([
    exploreFilters.min_elevation,
    exploreFilters.max_elevation,
  ]);

  // Keep local state in sync with context
  useEffect(() => {
    setPendingRange([
      exploreFilters.min_elevation,
      exploreFilters.max_elevation,
    ]);
  }, [exploreFilters.min_elevation, exploreFilters.max_elevation]);

  // Search functionality
  const handleSearch = useCallback(
    async (query: string, searchToken: number) => {
      const trimmedQuery = query.trim();
      if (!trimmedQuery) {
        setSearchResults([]);
        setShowSearchDropdown(false);
        setIsSearching(false);
        setCompletedQuery(null);
        return;
      }

      setIsSearching(true);
      trackEvent("search_query", trimmedQuery);
      try {
        const response = await searchRealtime(trimmedQuery);
        const filteredResults = response.results.filter(
          (result) =>
            result.type === "peak" ||
            result.type === "user" ||
            result.type === "admin" ||
            result.type === "club" ||
            result.type === "shelter"
        ) as SearchResult[];
        // Sort results to prioritize users over peaks, then by relevance score
        const sortedResults = filteredResults.sort((a, b) => {
          if (a.type === "club" && b.type !== "club") return -1;
          if (a.type !== "club" && b.type === "club") return 1;
          // Users come first
          if (a.type === "user" && b.type !== "user") return -1;
          if (a.type !== "user" && b.type === "user") return 1;
          // Within same type, sort by relevance score (higher first)
          return b.relevance_score - a.relevance_score;
        });
        if (!isLatestSearchToken(searchToken)) return;
        setSearchResults(sortedResults);
        setCompletedQuery(trimmedQuery);
        setShowSearchDropdown(true);
      } catch (error) {
        if (!isLatestSearchToken(searchToken)) return;
        console.error("Search failed:", error);
        setSearchResults([]);
        setCompletedQuery(trimmedQuery);
        setShowSearchDropdown(true);
      } finally {
        if (isLatestSearchToken(searchToken)) {
          setIsSearching(false);
        }
      }
    },
    [isLatestSearchToken, trackEvent]
  );

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
        setShowSearchDropdown(false);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      setShowSearchDropdown(true);
      searchTimeoutRef.current = setTimeout(() => {
        handleSearch(query, searchToken);
      }, 300);
    },
    [handleSearch, nextSearchToken]
  );

  const handleResultSelect = useCallback(
    async (result: SearchResult) => {
      invalidateSearchToken();
      trackEvent("search_result_select", `${result.type}_${result.id}`);
      if (result.type === "peak") {
        navigate(`/peaks/${result.id}`);
      } else if (result.type === "user") {
        if (user && user.internalUserId === result.id) {
          navigate("/profile");
        } else {
          navigate(`/externalprofile/${result.id}`);
        }
      } else if (result.type === "club") {
        navigate(`/clubs/${result.id}`);
      } else if (result.type === "shelter") {
        navigate(`/shelters/${result.id}`);
      } else if (result.type === "admin") {
        await selectAdminSearchResult(result);
      }

      setSearchQuery("");
      setSearchResults([]);
      setShowSearchDropdown(false);
      setIsSearching(false);
      setCompletedQuery(null);
    },
    [invalidateSearchToken, navigate, selectAdminSearchResult, trackEvent, user]
  );

  // Filter functionality - cascading admin levels
  const handleAdminLevelChange = useCallback(
    (levelIndex: number, value: string | number | null) => {
      const id = value ? Number(value) : null;
      selectAdminLevel(levelIndex, id);
      trackEvent("filter_change", `explore_admin_level_${levelIndex}_${id || "all"}`);
    },
    [selectAdminLevel, trackEvent]
  );

  const sanitizeRange = (value: number | number[]): [number, number] | null => {
    if (!Array.isArray(value) || value.length !== 2) return null;
    const min = Math.max(0, Math.min(8849, Math.round(value[0] || 0)));
    const max = Math.max(min, Math.min(8849, Math.round(value[1] || 0)));
    return [min, max];
  };

  const handleSliderChange = (_: Event, value: number | number[]) => {
    const sanitized = sanitizeRange(value);
    if (!sanitized) return;
    setPendingRange(sanitized);
  };

  const handleSliderChangeCommitted = (
    _: Event | React.SyntheticEvent,
    value: number | number[]
  ) => {
    const sanitized = sanitizeRange(value);
    if (!sanitized) return;
    setPendingRange(sanitized);
    handleExploreElevationChange(sanitized[0], sanitized[1]);
  };

  // Filter toggle with animation
  const handleFilterToggle = useCallback(() => {
    if (isExploreFiltersCollapsed) {
      // Opening filters
      setIsFiltersClosing(false);
      setIsExploreFiltersCollapsed(false);
    } else {
      // Closing filters with animation
      setIsFiltersClosing(true);
      // Clear any existing timeout
      if (filterCloseTimeoutRef.current) {
        clearTimeout(filterCloseTimeoutRef.current);
      }
      // Set timeout to actually close after animation
      filterCloseTimeoutRef.current = setTimeout(() => {
        setIsExploreFiltersCollapsed(true);
        setIsFiltersClosing(false);
      }, 200); // Match CSS animation duration
    }
  }, [isExploreFiltersCollapsed]);

  // Handle clicks outside search dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (
        !target.closest(`.${styles["explore-header-search__search-container"]}`)
      ) {
        setShowSearchDropdown(false);
      }
    };

    if (showSearchDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showSearchDropdown]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      if (filterCloseTimeoutRef.current) {
        clearTimeout(filterCloseTimeoutRef.current);
      }
    };
  }, []);

  const shouldShowEmptyState =
    showSearchDropdown &&
    !isSearching &&
    searchResults.length === 0 &&
    completedQuery === searchQuery.trim() &&
    searchQuery.trim().length > 0;

  return (
    <div
      className={styles["explore-header-search"]}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        zIndex: 100,
      }}
    >
      <div className={styles["explore-header-search__header-row"]}>
        {/* Search container */}
        <div className={styles["explore-header-search__search-container"]}>
          <div
            className={styles["explore-header-search__search-input-wrapper"]}
          >
            <SearchIcon
              className={styles["explore-header-search__search-icon"]}
              size={20}
            />
            <input
              ref={inputRef}
              type="text"
              placeholder={
                isSearching ? t("search.searching") : t("search.searchForPeaks")
              }
              value={searchQuery}
              onChange={handleInputChange}
              className={`${styles["explore-header-search__search-input"]} typography-desktop-label-medium`}
              aria-label={t("search.searchLabel")}
            />
          </div>

          {/* Search dropdown */}
          {showSearchDropdown && (
            <div className={styles["explore-header-search__search-dropdown"]}>
              {isSearching ? (
                // Shimmer loading state
                <div className={styles["explore-header-search__shimmer"]}>
                  <div
                    className={styles["explore-header-search__shimmer-item"]}
                  >
                    <div
                      className={styles["explore-header-search__shimmer-thumb"]}
                    />
                    <div
                      className={styles["explore-header-search__shimmer-text"]}
                    >
                      <div
                        className={
                          styles["explore-header-search__shimmer-title"]
                        }
                      />
                      <div
                        className={
                          styles["explore-header-search__shimmer-subtitle"]
                        }
                      />
                    </div>
                  </div>
                </div>
              ) : searchResults.length > 0 ? (
                searchResults.map((result) => {
                  if (result.type === "peak") {
                    const peakResult = result as PeakSearchResult;
                    const hasImage = Boolean(peakResult.image);
                    const elevationColor = getElevationColorWithVar(
                      peakResult.elevation
                    );
                    const elevationIcon = getElevationIcon(
                      peakResult.elevation
                    );

                    return (
                      <div
                        key={`peak-${result.id}`}
                        className={styles["explore-header-search__result"]}
                        onClick={() => void handleResultSelect(peakResult)}
                      >
                        <div
                          className={
                            styles["explore-header-search__result-content"]
                          }
                        >
                          <div
                            className={
                              styles["explore-header-search__result-image"]
                            }
                          >
                            {hasImage ? (
                              <img
                                src={result.image}
                                alt={result.name}
                                className={
                                  styles[
                                    "explore-header-search__result-image-img"
                                  ]
                                }
                              />
                            ) : (
                              <div
                                className={
                                  styles[
                                    "explore-header-search__result-image-placeholder"
                                  ]
                                }
                                style={{
                                  background: `linear-gradient(rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.3)), ${elevationColor}`,
                                }}
                              >
                                <img
                                  src={elevationIcon}
                                  alt={t("search.elevationIcon")}
                                  className={
                                    styles[
                                      "explore-header-search__result-elevation-icon"
                                    ]
                                  }
                                />
                              </div>
                            )}
                          </div>

                          <div
                            className={
                              styles["explore-header-search__result-info"]
                            }
                          >
                            <div
                              className={`${styles["explore-header-search__result-title"]} typography-desktop-body-small`}
                            >
                              {peakResult.name_en || peakResult.name}
                            </div>
                            <div
                              className={
                                styles["explore-header-search__result-details"]
                              }
                            >
                              <img
                                src={elevationIcon}
                                alt=""
                                className={
                                  styles[
                                    "explore-header-search__result-details-icon"
                                  ]
                                }
                              />
                              <span
                                className={`${styles["explore-header-search__result-elevation"]} typography-desktop-label-medium`}
                              >
                                {formatElevation(peakResult.elevation)}
                              </span>
                              {getLocationFromHierarchy(peakResult.admin_hierarchy) && (
                                <span
                                  className={`${styles["explore-header-search__result-location"]} typography-desktop-label-medium`}
                                >
                                  {getLocationFromHierarchy(peakResult.admin_hierarchy)}
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
                        className={styles["explore-header-search__result"]}
                        onClick={() => void handleResultSelect(shelterResult)}
                      >
                        <div
                          className={
                            styles["explore-header-search__result-content"]
                          }
                        >
                          <div
                            className={
                              styles["explore-header-search__result-image"]
                            }
                          >
                            {hasImage ? (
                              <img
                                src={shelterResult.image || ""}
                                alt={shelterResult.name}
                                className={
                                  styles[
                                    "explore-header-search__result-image-img"
                                  ]
                                }
                              />
                            ) : (
                              <div
                                className={
                                  styles[
                                    "explore-header-search__result-image-placeholder"
                                  ]
                                }
                                style={{
                                  background: `linear-gradient(rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.3)), ${typeColor}`,
                                }}
                              >
                                <ShelterIcon
                                  size={20}
                                  className={
                                    styles[
                                      "explore-header-search__result-elevation-icon"
                                    ]
                                  }
                                />
                              </div>
                            )}
                          </div>

                          <div
                            className={
                              styles["explore-header-search__result-info"]
                            }
                          >
                            <div
                              className={`${styles["explore-header-search__result-title"]} typography-desktop-body-small`}
                            >
                              {shelterResult.name_en || shelterResult.name}
                            </div>
                            <div
                              className={
                                styles["explore-header-search__result-details"]
                              }
                            >
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
                                  className={`${styles["explore-header-search__result-elevation"]} typography-desktop-label-medium`}
                                >
                                  {formatElevation(shelterResult.elevation)}
                                </span>
                              )}
                              {getLocationFromHierarchy(shelterResult.admin_hierarchy) && (
                                <span
                                  className={`${styles["explore-header-search__result-location"]} typography-desktop-label-medium`}
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
                        className={styles["explore-header-search__result"]}
                        onClick={() => void handleResultSelect(result)}
                      >
                        <div
                          className={
                            styles["explore-header-search__result-content"]
                          }
                        >
                          <div
                            className={
                              styles["explore-header-search__result-image"]
                            }
                          >
                            {hasImage ? (
                              <img
                                src={result.image}
                                alt={result.name}
                                className={
                                  styles[
                                    "explore-header-search__result-image-img"
                                  ]
                                }
                              />
                            ) : (
                              <div
                                className={
                                  styles[
                                    "explore-header-search__result-image-placeholder"
                                  ]
                                }
                                style={{
                                  backgroundColor: "black",
                                  opacity: 0.7,
                                }}
                              >
                                <User
                                  size={28}
                                  className={
                                    styles[
                                      "explore-header-search__result-elevation-icon"
                                    ]
                                  }
                                />
                              </div>
                            )}
                          </div>

                          <div
                            className={
                              styles["explore-header-search__result-info"]
                            }
                          >
                            <div
                              className={`${styles["explore-header-search__result-title"]} typography-desktop-body-small`}
                            >
                              {result.name}
                            </div>
                            <div
                              className={
                                styles["explore-header-search__result-details"]
                              }
                            >
                              <User
                                size={16}
                                className={
                                  styles[
                                    "explore-header-search__result-details-icon"
                                  ]
                                }
                              />
                              <span
                                className={`${styles["explore-header-search__result-elevation"]} typography-desktop-label-medium`}
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
                        className={styles["explore-header-search__result"]}
                        onClick={() => void handleResultSelect(result)}
                      >
                        <div
                          className={
                            styles["explore-header-search__result-content"]
                          }
                        >
                          <div
                            className={
                              styles["explore-header-search__result-image"]
                            }
                          >
                            {hasImage ? (
                              <img
                                src={result.image || ""}
                                alt={result.name}
                                className={
                                  styles[
                                    "explore-header-search__result-image-img"
                                  ]
                                }
                              />
                            ) : (
                              <div
                                className={
                                  styles[
                                    "explore-header-search__result-image-placeholder"
                                  ]
                                }
                                style={{
                                  backgroundColor: "rgba(194, 207, 148, 0.35)",
                                  justifyContent: "center",
                                }}
                              >
                                <Users
                                  size={28}
                                  className={
                                    styles[
                                      "explore-header-search__result-elevation-icon"
                                    ]
                                  }
                                />
                              </div>
                            )}
                          </div>

                          <div
                            className={
                              styles["explore-header-search__result-info"]
                            }
                          >
                            <div
                              className={`${styles["explore-header-search__result-title"]} typography-desktop-body-small`}
                            >
                              {result.name}
                            </div>
                            <div
                              className={
                                styles["explore-header-search__result-details"]
                              }
                            >
                              {result.visibility === "private" ? (
                                <Lock
                                  size={16}
                                  className={
                                    styles[
                                      "explore-header-search__result-details-icon"
                                    ]
                                  }
                                />
                              ) : (
                                <Shield
                                  size={16}
                                  className={
                                    styles[
                                      "explore-header-search__result-details-icon"
                                    ]
                                  }
                                />
                              )}
                              <span
                                className={`${styles["explore-header-search__result-elevation"]} typography-desktop-label-medium`}
                              >
                                {result.member_count} {t("clubs.metrics.members") || "members"}
                              </span>
                              <span
                                className={`${styles["explore-header-search__result-elevation"]} typography-desktop-label-medium`}
                              >
                                {result.distinct_peak_count || 0}{" "}
                                {t("clubs.metrics.distinctPeaks") || "peaks"}
                              </span>
                              {getLocationFromHierarchy(result.admin_hierarchy) && (
                                <span
                                  className={`${styles["explore-header-search__result-location"]} typography-desktop-label-medium`}
                                >
                                  {getLocationFromHierarchy(result.admin_hierarchy)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  } else if (result.type === "admin") {
                    const adminResult = result as AdminSearchResult;
                    const adminTitle =
                      adminResult.name_only || adminResult.name;
                    const adminSubtitle =
                      adminResult.parent_name ||
                      (adminResult.name_only &&
                      adminResult.name !== adminResult.name_only
                        ? adminResult.name
                        : null);
                    const hasImageUrl =
                      typeof adminResult.image === "string" &&
                      (adminResult.image.startsWith("http://") ||
                        adminResult.image.startsWith("https://"));

                    return (
                      <div
                        key={`admin-${adminResult.id}`}
                        className={styles["explore-header-search__result"]}
                        onClick={() => void handleResultSelect(adminResult)}
                      >
                        <div
                          className={
                            styles["explore-header-search__result-content"]
                          }
                        >
                          <div
                            className={
                              styles["explore-header-search__result-image"]
                            }
                          >
                            {hasImageUrl ? (
                              <img
                                src={adminResult.image || ""}
                                alt={adminTitle}
                                className={
                                  styles[
                                    "explore-header-search__result-image-img"
                                  ]
                                }
                              />
                            ) : (
                              <div
                                className={
                                  styles[
                                    "explore-header-search__result-image-placeholder"
                                  ]
                                }
                                style={{
                                  backgroundColor: "rgba(15, 23, 42, 0.08)",
                                }}
                              >
                                {adminResult.image && !hasImageUrl ? (
                                  <span className="typography-desktop-body-small">
                                    {adminResult.image}
                                  </span>
                                ) : (
                                  <AdminSearchIcon
                                    size={28}
                                    className={
                                      styles[
                                        "explore-header-search__result-elevation-icon"
                                      ]
                                    }
                                  />
                                )}
                              </div>
                            )}
                          </div>

                          <div
                            className={
                              styles["explore-header-search__result-info"]
                            }
                          >
                            <div
                              className={`${styles["explore-header-search__result-title"]} typography-desktop-body-small`}
                            >
                              {adminTitle}
                            </div>
                            {adminSubtitle && (
                              <div
                                className={
                                  styles[
                                    "explore-header-search__result-details"
                                  ]
                                }
                              >
                                <span
                                  className={`${styles["explore-header-search__result-location"]} typography-desktop-label-medium`}
                                >
                                  {adminSubtitle}
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
                <div className={styles["explore-header-search__empty"]}>
                  <Mountain
                    className={styles["explore-header-search__empty-icon"]}
                    size={32}
                  />
                  <span>
                    {t("search.noPeaksOrUsersFound", { query: searchQuery })}
                  </span>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Show/Hide filters button */}
        <button
          className={styles["explore-header-search__filters-button"]}
          onClick={handleFilterToggle}
          aria-label={
            isExploreFiltersCollapsed
              ? t("filters.showFilters")
              : t("filters.hideFilters")
          }
        >
          <span className="typography-desktop-label-medium">
            {isExploreFiltersCollapsed
              ? t("filters.showFilters")
              : t("filters.hideFilters")}
          </span>
          <ChevronDown
            size={16}
            style={{
              transform: isExploreFiltersCollapsed
                ? "rotate(0deg)"
                : "rotate(180deg)",
            }}
          />
        </button>
      </div>

      {/* Filters dropdown */}
      {(!isExploreFiltersCollapsed || isFiltersClosing) && (
        <div
          className={`${styles["explore-header-search__filters-container"]} ${
            isFiltersClosing
              ? styles["explore-header-search__filters-container--closing"]
              : ""
          }`}
        >
          <div className={styles["explore-header-search__filters-content"]}>
            {/* Cascading Admin Level Selects */}
            <div className={styles["explore-header-search__filters-row"]}>
              {adminLevels.map((level, index) => {
                if (level.loading) {
                  return (
                    <div key={`level-${index}`} className={styles["explore-header-search__filter-selector"]}>
                      <select
                        className={styles["explore-header-search__select"]}
                        disabled
                      >
                        <option value="">...</option>
                      </select>
                    </div>
                  );
                }
                if (level.options.length === 0) return null;
                const placeholder = index === 0 ? t("common.allCountries") : t("common.allRegions");
                return (
                  <div key={`level-${index}`} className={styles["explore-header-search__filter-selector"]}>
                    <select
                      className={`${styles["explore-header-search__select"]} ${
                        level.selectedId
                          ? styles["explore-header-search__select--selected"]
                          : ""
                      }`}
                      value={level.selectedId ?? ""}
                      onChange={(e) =>
                        handleAdminLevelChange(index, e.target.value || null)
                      }
                    >
                      <option value="" className="typography-desktop-body-small">
                        {placeholder}
                      </option>
                      {level.options.map((area) => (
                        <option key={area.osm_id} value={area.osm_id}>
                          {area.name}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>

            {/* Elevation Slider */}
            <div className={styles["explore-header-search__elevation-card"]}>
              <div
                className={styles["explore-header-search__elevation-header"]}
              >
                <div
                  className={`${styles["explore-header-search__elevation-title"]} typography-desktop-label-large`}
                >
                  <TrendingUp size={14} />
                  <span className="typography-desktop-label-large">
                    {t("filters.altitude")}
                  </span>
                </div>
                <div
                  className={styles["explore-header-search__elevation-values"]}
                >
                  <span className="typography-desktop-label-medium">
                    {formatElevation(pendingRange[0])}
                  </span>{" "}
                  <span className="typography-desktop-label-medium">—</span>{" "}
                  <span className="typography-desktop-label-medium">
                    {formatElevation(pendingRange[1])}
                  </span>
                </div>
              </div>
              <Slider
                value={pendingRange}
                min={0}
                max={8849}
                onChange={handleSliderChange}
                onChangeCommitted={handleSliderChangeCommitted}
                valueLabelDisplay="off"
                size="small"
                sx={{
                  color: "rgba(0, 0, 0, 0.6)",
                  height: 4,
                  padding: "0px !important",
                  margin: "0 4px !important",
                  width: "auto",
                  "& .MuiSlider-thumb": {
                    width: 14,
                    height: 14,
                    background: "rgba(0, 0, 0, 0.8)",
                    border: "2px solid rgba(0, 0, 0, 0.6)",
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
                  },
                  "& .MuiSlider-rail": {
                    height: 4,
                    background: "rgba(0, 0, 0, 0.2)",
                    borderRadius: 2,
                    width: "auto !important",
                  },
                  "& .MuiSlider-track": {
                    height: 4,
                    background: "rgba(0, 0, 0, 0.4)",
                    borderRadius: 2,
                  },
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(ExploreHeaderSearch);
