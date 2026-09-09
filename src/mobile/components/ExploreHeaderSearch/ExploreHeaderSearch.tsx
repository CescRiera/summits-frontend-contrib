"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Search as SearchIcon,
  SlidersHorizontal,
  Mountain,
  User,
  Users,
  Lock,
  Shield,
  X as ClearIcon,
  Clock,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../shared/context/AuthContext";
import { useI18n } from "../../../shared/context/I18nContext";
import { useAnalytics } from "../../../shared/context/AnalyticsContext";
import { useExplore } from "../../context/ExploreContext";
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
import {
  mergeRecentSearchResults,
  sanitizeStoredSearchResults,
} from "../../../shared/utils/searchResultStorage";
import ExploreFiltersModal from "../ExploreFiltersModal/ExploreFiltersModal";
import { useUnitFormat } from "../../../shared/hooks/useUnitFormat";
import styles from "./ExploreHeaderSearch.module.css";

type SearchResult =
  | PeakSearchResult
  | UserSearchResult
  | AdminSearchResult
  | ClubSearchResult
  | ShelterSearchResult;

// Elevation color and icon logic
const getElevationColorWithVar = (elevation: number) => {
  const safeElevation = elevation ?? 0;
  const color = getElevationColor(safeElevation);
  return `var(--color-elevation-${color.replace("#", "")}, ${color})`;
};

const getElevationIcon = (elevation: number) => {
  const safeElevation = elevation ?? 0;
  if (safeElevation >= 8000) return "/icons/altitude/ic_mountain_black.png";
  if (elevation >= 6000) return "/icons/altitude/ic_mountain_burgundy.png";
  if (elevation >= 4000) return "/icons/altitude/ic_mountain_red.png";
  if (elevation >= 3000) return "/icons/altitude/ic_mountain_orange.png";
  if (elevation >= 2000) return "/icons/altitude/ic_mountain_yellow.png";
  return "/icons/altitude/ic_mountain_green.png";
};

const ExploreHeaderSearch: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useI18n();
  const { trackEvent } = useAnalytics();
  const { formatMeters } = useUnitFormat();
  const {
    selectAdminSearchResult,
    isExploreFiltersCollapsed,
    setIsExploreFiltersCollapsed,
  } = useExplore();

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [completedQuery, setCompletedQuery] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<
    (PeakSearchResult | UserSearchResult | ClubSearchResult | ShelterSearchResult)[]
  >([]);
  const searchTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);
  const {
    nextSearchToken,
    invalidateSearchToken,
    isLatestSearchToken,
  } = useLatestSearchToken();

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

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("searchmap_recentSearches");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setRecentSearches(sanitizeStoredSearchResults(parsed));
        }
      } catch (error) {
        console.error("Failed to parse recent searches:", error);
        setRecentSearches([]);
      }
    }
  }, []);

  const addToRecentSearches = useCallback(
    (result: PeakSearchResult | UserSearchResult | ClubSearchResult | ShelterSearchResult) => {
      if (!result) return;
      const updated = mergeRecentSearchResults(recentSearches, result, 10);
      setRecentSearches(updated);
      localStorage.setItem("searchmap_recentSearches", JSON.stringify(updated));
    },
    [recentSearches]
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
        setShowSearchDropdown(recentSearches.length > 0);
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
        addToRecentSearches(result);
        navigate(`/peaks/${result.id}`);
      } else if (result.type === "user") {
        addToRecentSearches(result);
        if (user && user.internalUserId === result.id) {
          navigate("/profile");
        } else {
          navigate(`/externalprofile/${result.id}`);
        }
      } else if (result.type === "club") {
        addToRecentSearches(result);
        navigate(`/clubs/${result.id}`);
      } else if (result.type === "shelter") {
        addToRecentSearches(result);
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

  const clearSearch = useCallback(() => {
    invalidateSearchToken();
    setSearchQuery("");
    setSearchResults([]);
    setShowSearchDropdown(recentSearches.length > 0);
    setIsSearching(false);
    setCompletedQuery(null);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [invalidateSearchToken]);

  // Filter toggle
  const handleFilterToggle = useCallback(() => {
    trackEvent(
      "button_click",
      isExploreFiltersCollapsed ? "explore_filters_show" : "explore_filters_hide"
    );
    setIsExploreFiltersCollapsed(!isExploreFiltersCollapsed);
  }, [isExploreFiltersCollapsed, trackEvent]);

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
    };
  }, []);

  const isImageUrl = useCallback((value?: string | null) => {
    if (!value) return false;
    return value.startsWith("http://") || value.startsWith("https://");
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
        position: "fixed",
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
              className={`${styles["explore-header-search__search-input"]} typography-body-small`}
              aria-label={t("search.searchLabel")}
              onFocus={() => {
                if (!searchQuery.trim() && recentSearches.length > 0) {
                  setShowSearchDropdown(true);
                }
              }}
            />
            {searchQuery && (
              <button
                type="button"
                className={styles["explore-header-search__clear-button"]}
                onClick={clearSearch}
                aria-label={t("search.clearSearch")}
              >
                <ClearIcon size={18} />
              </button>
            )}
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
                              className={`${styles["explore-header-search__result-title"]} typography-title-medium`}
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
                                className={`${styles["explore-header-search__result-elevation"]} typography-body-small`}
                              >
                                {formatMeters(peakResult.elevation)}
                              </span>
                              {getLocationFromHierarchy(peakResult.admin_hierarchy) && (
                                <span
                                  className={`${styles["explore-header-search__result-location"]} typography-body-small`}
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
                              className={`${styles["explore-header-search__result-title"]} typography-title-medium`}
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
                                  className={`${styles["explore-header-search__result-elevation"]} typography-body-small`}
                                >
                                  {formatMeters(shelterResult.elevation)}
                                </span>
                              )}
                              {getLocationFromHierarchy(shelterResult.admin_hierarchy) && (
                                <span
                                  className={`${styles["explore-header-search__result-location"]} typography-body-small`}
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
                                  color="white"
                                  className={
                                    styles[
                                      "explore-header-search__result-elevation-icon_user"
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
                              className={`${styles["explore-header-search__result-title"]} typography-title-medium`}
                            >
                              {result.name}
                            </div>
                            <div
                              className={
                                styles["explore-header-search__result-details"]
                              }
                            >
                              <span
                                className={`${styles["explore-header-search__result-elevation"]} typography-body-small`}
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
                                      "explore-header-search__result-elevation-icon_user"
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
                              className={`${styles["explore-header-search__result-title"]} typography-title-medium`}
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
                                className={`${styles["explore-header-search__result-elevation"]} typography-body-small`}
                              >
                                {result.member_count}{" "}
                                {t("clubs.metrics.members") || "members"}
                              </span>
                              <span
                                className={`${styles["explore-header-search__result-elevation"]} typography-body-small`}
                              >
                                {result.distinct_peak_count || 0}{" "}
                                {t("clubs.metrics.distinctPeaks") || "peaks"}
                              </span>
                              {getLocationFromHierarchy(result.admin_hierarchy) && (
                                <span
                                  className={`${styles["explore-header-search__result-location"]} typography-body-small`}
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
                    const hasImageUrl = isImageUrl(adminResult.image);

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
                                  justifyContent: "center",
                                }}
                              >
                                {adminResult.image && !hasImageUrl ? (
                                  <span
                                    className={
                                      styles[
                                        "explore-header-search__result-title"
                                      ]
                                    }
                                  >
                                    {adminResult.image}
                                  </span>
                                ) : (
                                  <AdminSearchIcon
                                    size={28}
                                    className={
                                      styles[
                                        "explore-header-search__result-elevation-icon_user"
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
                              className={`${styles["explore-header-search__result-title"]} typography-title-medium`}
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
                                  className={`${styles["explore-header-search__result-location"]} typography-body-small`}
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
              ) : !searchQuery.trim() && !isSearching && recentSearches.length > 0 ? (
                <div className={styles["explore-header-search__recent"]}>
                  <div className={styles["explore-header-search__recent-header"]}>
                    <Clock size={16} />
                    <span className="typography-label-medium">
                      {t("search.recentSearches")}
                    </span>
                    <button
                      className={styles["explore-header-search__clear-recent"]}
                      onClick={(e) => {
                        e.stopPropagation();
                        clearRecentSearches();
                      }}
                      title={t("search.clearRecentSearches")}
                    >
                      <ClearIcon size={14} />
                    </button>
                  </div>
                  <div className={styles["explore-header-search__recent-list"]}>
                    {recentSearches.slice(0, 3).map((item) => {
                      if (item.type === "peak") {
                        const hasImage = Boolean(item.image);
                        const elevationColor = getElevationColorWithVar(
                          item.elevation
                        );
                        const elevationIcon = getElevationIcon(item.elevation);

                        return (
                          <div
                            key={`recent-peak-${item.id}`}
                            className={styles["explore-header-search__recent-item"]}
                            onClick={() => handleResultSelect(item)}
                          >
                            <div
                              className={
                                styles["explore-header-search__recent-item-content"]
                              }
                            >
                              <div
                                className={
                                  styles["explore-header-search__recent-item-image"]
                                }
                              >
                                {hasImage ? (
                                  <img
                                    src={item.image}
                                    alt={item.name}
                                    className={
                                      styles[
                                        "explore-header-search__recent-item-image-img"
                                      ]
                                    }
                                  />
                                ) : (
                                  <div
                                    className={
                                      styles[
                                        "explore-header-search__recent-item-image-placeholder"
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
                                          "explore-header-search__recent-item-elevation-icon"
                                        ]
                                      }
                                    />
                                  </div>
                                )}
                              </div>
                              <div
                                className={
                                  styles["explore-header-search__recent-item-info"]
                                }
                              >
                                <div
                                  className={`${styles["explore-header-search__recent-item-title"]} typography-title-medium`}
                                >
                                  {item.name_en || item.name}
                                </div>
                                <div
                                  className={
                                    styles["explore-header-search__recent-item-details"]
                                  }
                                >
                                  <img
                                    src={elevationIcon}
                                    alt=""
                                    className={
                                      styles[
                                        "explore-header-search__recent-item-details-icon"
                                      ]
                                    }
                                  />
                                  <span className="typography-body-small">
                                    {formatMeters(item.elevation)}
                                  </span>
                                  {getLocationFromHierarchy(
                                    item.admin_hierarchy
                                  ) && (
                                    <span className="typography-body-small">
                                      {getLocationFromHierarchy(
                                        item.admin_hierarchy
                                      )}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      } else if (item.type === "shelter") {
                        const shelter = item as ShelterSearchResult;
                        return (
                          <div
                            key={`recent-shelter-${shelter.id}`}
                            className={styles["explore-header-search__recent-item"]}
                            onClick={() => handleResultSelect(shelter)}
                          >
                            <div
                              className={
                                styles["explore-header-search__recent-item-content"]
                              }
                            >
                              <div
                                className={
                                  styles["explore-header-search__recent-item-image"]
                                }
                              >
                                <div
                                  className={
                                    styles[
                                      "explore-header-search__recent-item-image-placeholder"
                                    ]
                                  }
                                  style={{
                                    backgroundColor: "rgba(155, 89, 182, 0.35)",
                                    justifyContent: "center",
                                  }}
                                >
                                  <ShelterIcon
                                    size={24}
                                    className={
                                      styles[
                                        "explore-header-search__recent-item-elevation-icon"
                                      ]
                                    }
                                  />
                                </div>
                              </div>
                              <div
                                className={
                                  styles["explore-header-search__recent-item-info"]
                                }
                              >
                                <div
                                  className={`${styles["explore-header-search__recent-item-title"]} typography-title-medium`}
                                >
                                  {shelter.name_en || shelter.name}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      } else if (item.type === "club") {
                        const hasImage = Boolean(item.image);
                        return (
                          <div
                            key={`recent-club-${item.id}`}
                            className={styles["explore-header-search__recent-item"]}
                            onClick={() => handleResultSelect(item)}
                          >
                            <div
                              className={
                                styles["explore-header-search__recent-item-content"]
                              }
                            >
                              <div
                                className={
                                  styles["explore-header-search__recent-item-image"]
                                }
                              >
                                {hasImage ? (
                                  <img
                                    src={item.image || ""}
                                    alt={item.name}
                                    className={
                                      styles[
                                        "explore-header-search__recent-item-image-img"
                                      ]
                                    }
                                  />
                                ) : (
                                  <div
                                    className={
                                      styles[
                                        "explore-header-search__recent-item-image-placeholder"
                                      ]
                                    }
                                    style={{
                                      backgroundColor: "rgba(194, 207, 148, 0.35)",
                                    }}
                                  >
                                    <Users
                                      size={24}
                                      className={
                                        styles[
                                          "explore-header-search__recent-item-elevation-icon"
                                        ]
                                      }
                                    />
                                  </div>
                                )}
                              </div>
                              <div
                                className={
                                  styles["explore-header-search__recent-item-info"]
                                }
                              >
                                <div
                                  className={`${styles["explore-header-search__recent-item-title"]} typography-title-medium`}
                                >
                                  {item.name}
                                </div>
                                <div
                                  className={
                                    styles["explore-header-search__recent-item-details"]
                                  }
                                >
                                  <span className="typography-body-small">
                                    {item.member_count}{" "}
                                    {t("clubs.metrics.members") || "members"}
                                  </span>
                                  {getLocationFromHierarchy(
                                    item.admin_hierarchy
                                  ) && (
                                    <span className="typography-body-small">
                                      {getLocationFromHierarchy(
                                        item.admin_hierarchy
                                      )}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      } else {
                        const hasImage = Boolean(item.image);
                        return (
                          <div
                            key={`recent-user-${item.id}`}
                            className={styles["explore-header-search__recent-item"]}
                            onClick={() => handleResultSelect(item)}
                          >
                            <div
                              className={
                                styles["explore-header-search__recent-item-content"]
                              }
                            >
                              <div
                                className={
                                  styles["explore-header-search__recent-item-image"]
                                }
                              >
                                {hasImage ? (
                                  <img
                                    src={item.image}
                                    alt={item.name}
                                    className={
                                      styles[
                                        "explore-header-search__recent-item-image-img"
                                      ]
                                    }
                                  />
                                ) : (
                                  <div
                                    className={
                                      styles[
                                        "explore-header-search__recent-item-image-placeholder"
                                      ]
                                    }
                                    style={{
                                      backgroundColor: "black",
                                      opacity: 0.7,
                                    }}
                                  >
                                    <User
                                      size={24}
                                      color="white"
                                      className={
                                        styles[
                                          "explore-header-search__recent-item-elevation-icon"
                                        ]
                                      }
                                    />
                                  </div>
                                )}
                              </div>
                              <div
                                className={
                                  styles["explore-header-search__recent-item-info"]
                                }
                              >
                                <div
                                  className={`${styles["explore-header-search__recent-item-title"]} typography-title-medium`}
                                >
                                  {item.name}
                                </div>
                                <div
                                  className={
                                    styles["explore-header-search__recent-item-details"]
                                  }
                                >
                                  <span className="typography-body-small">
                                    {item.total_peaks} {t("search.peaks")}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      }
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Show/Hide filters button */}
        <button
          className={`${styles["explore-header-search__filters-button"]} ${
            !isExploreFiltersCollapsed
              ? styles["explore-header-search__filters-button--active"]
              : ""
          }`}
          onClick={handleFilterToggle}
          aria-label={
            isExploreFiltersCollapsed
              ? t("filters.showFilters")
              : t("filters.hideFilters")
          }
          aria-pressed={!isExploreFiltersCollapsed}
        >
          <SlidersHorizontal size={18} />
        </button>
      </div>

      {/* Filters modal */}
      <ExploreFiltersModal
        open={!isExploreFiltersCollapsed}
        onClose={handleFilterToggle}
      />
    </div>
  );
};

export default React.memo(ExploreHeaderSearch);
