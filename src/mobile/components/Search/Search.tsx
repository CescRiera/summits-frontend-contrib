import React, { useState, useRef, useEffect } from "react";
import { Search, X, Clock, Sparkles, User, Users, Lock, Shield } from "lucide-react";
import MountainIcon from "../../../shared/components/MountainIcon/MountainIcon";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../shared/context/AuthContext";
import { useI18n } from "../../../shared/context/I18nContext";
import { useAnalytics } from "../../../shared/context/AnalyticsContext";
import styles from "./Search.module.css";
import { searchRealtime } from "../../../shared/api/endpoints/user";
import { getElevationColor } from "../../../shared/constants/elevationColors";
import { getLocationFromHierarchy } from "../../../shared/utils/adminHierarchy";
import { useLatestSearchToken } from "../../../shared/hooks/useLatestSearchToken";
import ShelterIcon from "../../../shared/components/ShelterIcon/ShelterIcon";
import { useUnitFormat } from "../../../shared/hooks/useUnitFormat";
import type {
  PeakSearchResult,
  UserSearchResult,
  ClubSearchResult,
  ShelterSearchResult,
} from "../../../shared/api/types";
import {
  mergeRecentSearchResults,
  sanitizeStoredSearchResults,
} from "../../../shared/utils/searchResultStorage";

type SearchResult = PeakSearchResult | UserSearchResult | ClubSearchResult | ShelterSearchResult;

interface SearchProps {
  embedded?: boolean;
  onClose?: () => void;
  autoExpand?: boolean;
}

const COLLAPSE_ANIM_MS = 280; // match CSS transition

// Elevation color and icon logic (mirrors UserPeaks but compact for Search)
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

const SearchComponent: React.FC<SearchProps> = ({
  embedded = false,
  onClose,
  autoExpand = false,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useI18n();
  const { trackEvent } = useAnalytics();
  const { formatMeters } = useUnitFormat();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [completedQuery, setCompletedQuery] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(autoExpand);
  const [recentSearches, setRecentSearches] = useState<SearchResult[]>([]);
  const searchTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);
  const collapseTimerRef = useRef<number | undefined>(undefined);
  const {
    nextSearchToken,
    invalidateSearchToken,
    isLatestSearchToken,
  } = useLatestSearchToken();

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("search_recentSearches");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          if (parsed.length > 0 && typeof parsed[0] === "string") {
            // Old format: clear it and start fresh
            setRecentSearches([]);
            localStorage.removeItem("search_recentSearches");
          } else {
            // Accept stored peaks or users; basic validation on required fields
            setRecentSearches(sanitizeStoredSearchResults(parsed));
          }
        }
      } catch (error) {
        console.error("Failed to parse recent searches:", error);
        setRecentSearches([]);
      }
    }
  }, []);

  // Auto-focus input when autoExpand is true
  useEffect(() => {
    if (autoExpand && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [autoExpand]);

  const handleSearch = async (query: string, searchToken: number) => {
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
      // Use searchRealtime to show both peaks and users
      const response = await searchRealtime(trimmedQuery);
      const filteredResults = response.results.filter(
        (result) =>
          result.type === "peak" ||
          result.type === "user" ||
          result.type === "club" ||
          result.type === "shelter"
      ) as SearchResult[];
      if (!isLatestSearchToken(searchToken)) return;
      setSearchResults(filteredResults);
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
  };

  const addToRecentSearches = (result: SearchResult) => {
    if (!result) return;

    const updated = mergeRecentSearchResults(recentSearches, result, 5);
    setRecentSearches(updated);
    localStorage.setItem("search_recentSearches", JSON.stringify(updated));
  };

  const handleResultSelect = (result: SearchResult) => {
    invalidateSearchToken();
    setCompletedQuery(null);
    trackEvent("search_result_select", `${result.type}_${result.id}`);
    if (result.type === "peak") {
      // Add to recent searches
      addToRecentSearches(result);

      // Navigate to peak details page
      navigate(`/peaks/${result.id}`);
    } else if (result.type === "user") {
      // Add to recent searches and navigate to user statistics page
      addToRecentSearches(result);
      // Check if user is trying to view their own profile
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
    }

    // Close the search interface
    setSearchQuery("");
    setSearchResults([]);
    setIsExpanded(false);
    setIsSearching(false);
    // Delay dropdown hide to let collapse animation play
    window.clearTimeout(collapseTimerRef.current);
    collapseTimerRef.current = window.setTimeout(() => {
      setShowDropdown(false);
    }, COLLAPSE_ANIM_MS);

    onClose?.();
  };

  // Removed unused handlePeakSelect to satisfy linting

  const handleRecentSearchClick = (item: SearchResult) => {
    handleResultSelect(item);
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem("search_recentSearches");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
  };

  const handleResultMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  const handleCollapse = () => {
    invalidateSearchToken();
    setIsExpanded(false);
    setSearchQuery("");
    setSearchResults([]);
    setIsSearching(false);
    setCompletedQuery(null);
    // Delay dropdown hide to allow animation to play smoothly
    window.clearTimeout(collapseTimerRef.current);
    collapseTimerRef.current = window.setTimeout(() => {
      setShowDropdown(false);
    }, COLLAPSE_ANIM_MS);
    onClose?.();
  };

  const handleInputFocus = () => {
    setShowDropdown(true);
  };

  const handleInputBlur = () => {
    // Don't close dropdown on blur
  };

  const handleInputClick = () => {
    setShowDropdown(true);
  };

  // Handle clicks outside the search component
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;

      if (
        target.closest("canvas") ||
        target.closest(".map-container") ||
        target.closest(".leaflet-container")
      ) {
        setIsExpanded(false);
        setSearchQuery("");
        setSearchResults([]);
        setIsSearching(false);
        setCompletedQuery(null);
        // Delay dropdown hide to allow animation to play
        window.clearTimeout(collapseTimerRef.current);
        collapseTimerRef.current = window.setTimeout(() => {
          setShowDropdown(false);
        }, COLLAPSE_ANIM_MS);

        onClose?.();
      }
    };

    if (isExpanded) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isExpanded, onClose]);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      window.clearTimeout(collapseTimerRef.current);
    };
  }, []);

  const shouldShowEmptyState =
    showDropdown &&
    !isSearching &&
    searchResults.length === 0 &&
    completedQuery === searchQuery.trim() &&
    searchQuery.trim().length > 0;

  return (
    <div
      className={`${styles["search-container"]} ${
        embedded ? styles["search-container--embedded"] : ""
      }`}
    >
      <div
        className={`${styles["search-wrapper"]} ${
          isExpanded ? styles["search-wrapper--expanded"] : ""
        } ${isSearching ? styles["search-wrapper--loading"] : ""}`}
      >
        {/* Search Icon */}
        <div
          className={`${styles["search-icon-container"]} ${
            isExpanded ? styles["search-icon-container--expanded"] : ""
          }`}
        >
          <Search
            className={`${styles["search-icon"]} ${
              isExpanded ? styles["search-icon--expanded"] : ""
            }`}
            size={20}
          />
        </div>

        {/* Input - expands from icon to the right */}
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
          className={`${styles["search-input"]} ${
            isExpanded
              ? styles["search-input--expanded"]
              : styles["search-input--collapsed"]
          }`}
          aria-label={t("search.searchLabel")}
        />

        {/* Close button */}
        <button
          className={`${styles["search-close"]} ${
            isExpanded
              ? styles["search-close--visible"]
              : styles["search-close--hidden"]
          }`}
          onClick={handleCollapse}
          title={t("search.closeSearch")}
          aria-label={t("search.closeSearch")}
        >
          <X size={18} />
        </button>
      </div>

      {showDropdown && (
        <div
          className={styles["search-dropdown"]}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          {isSearching ? (
            // Shimmer loading state: keep dropdown height while loading
            <div className={styles["search-dropdown__shimmer"]}>
              <div className={styles["search-dropdown__shimmer-item"]}>
                <div className={styles["search-dropdown__shimmer-thumb"]} />
                <div className={styles["search-dropdown__shimmer-text"]}>
                  <div
                    className={`${styles["search-dropdown__shimmer-title"]} typography-title-medium`}
                  />
                  <div
                    className={`${styles["search-dropdown__shimmer-subtitle"]} typography-title-medium`}
                  />
                </div>
              </div>
              <div className={styles["search-dropdown__shimmer-item"]}>
                <div className={styles["search-dropdown__shimmer-thumb"]} />
                <div className={styles["search-dropdown__shimmer-text"]}>
                  <div
                    className={`${styles["search-dropdown__shimmer-title"]} typography-title-medium`}
                  />
                  <div
                    className={`${styles["search-dropdown__shimmer-subtitle"]} typography-title-medium`}
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
                const elevationIcon = getElevationIcon(peakResult.elevation);

                return (
                  <div
                    key={`peak-${result.id}`}
                    className={styles["search-result"]}
                    onClick={() => handleResultSelect(peakResult)}
                    onMouseDown={handleResultMouseDown}
                  >
                    <div className={styles["search-result-content"]}>
                      <div className={styles["search-result-image"]}>
                        {hasImage ? (
                          <img
                            src={result.image}
                            alt={result.name}
                            className={styles["search-result-image-img"]}
                          />
                        ) : (
                          <div
                            className={
                              styles["search-result-image-placeholder"]
                            }
                            style={{
                              background: `linear-gradient(rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.3)), ${elevationColor}`,
                            }}
                          >
                            <img
                              src={elevationIcon}
                              alt={t("search.elevationIcon")}
                              className={styles["search-result-elevation-icon"]}
                            />
                          </div>
                        )}
                      </div>

                      <div className={styles["search-result-info"]}>
                        <div
                          className={`${styles["search-result-title"]} typography-title-medium`}
                        >
                          {peakResult.name_en || peakResult.name}
                        </div>
                        <div className={styles["search-result-details"]}>
                          <img
                            src={elevationIcon}
                            alt=""
                            className={styles["search-result-details-icon"]}
                          />
                          <span
                            className={`${styles["search-result-elevation"]} typography-body-small`}
                          >
                            {formatMeters(peakResult.elevation)}
                          </span>
                          {getLocationFromHierarchy(peakResult.admin_hierarchy) && (
                            <span
                              className={`${styles["search-result-location"]} typography-body-small`}
                            >
                              {getLocationFromHierarchy(peakResult.admin_hierarchy)}
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
                    className={styles["search-result"]}
                    onClick={() => handleResultSelect(result)}
                    onMouseDown={handleResultMouseDown}
                  >
                    <div className={styles["search-result-content"]}>
                      <div className={styles["search-result-image"]}>
                        {hasImage ? (
                          <img
                            src={result.image}
                            alt={result.name}
                            className={styles["search-result-image-img"]}
                          />
                        ) : (
                          <div
                            className={
                              styles["search-result-image-placeholder"]
                            }
                            style={{ backgroundColor: "black", opacity: 0.7 }}
                          >
                            <User
                              size={28}
                              className={styles["search-result-elevation-icon"]}
                            />
                          </div>
                        )}
                      </div>

                      <div className={styles["search-result-info"]}>
                        <div
                          className={`${styles["search-result-title"]} typography-title-medium`}
                        >
                          {result.name}
                        </div>
                        <div className={styles["search-result-details"]}>
                          <User
                            size={16}
                            className={styles["search-result-details-icon"]}
                          />
                          <span
                            className={`${styles["search-result-elevation"]} typography-body-small`}
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
                    className={styles["search-result"]}
                    onClick={() => handleResultSelect(result)}
                    onMouseDown={handleResultMouseDown}
                  >
                    <div className={styles["search-result-content"]}>
                      <div className={styles["search-result-image"]}>
                        {hasImage ? (
                          <img
                            src={result.image || ""}
                            alt={result.name}
                            className={styles["search-result-image-img"]}
                          />
                        ) : (
                          <div
                            className={styles["search-result-image-placeholder"]}
                            style={{ backgroundColor: "rgba(194, 207, 148, 0.35)" }}
                          >
                            <Users
                              size={28}
                              className={styles["search-result-elevation-icon"]}
                            />
                          </div>
                        )}
                      </div>

                      <div className={styles["search-result-info"]}>
                        <div
                          className={`${styles["search-result-title"]} typography-title-medium`}
                        >
                          {result.name}
                        </div>
                        <div className={styles["search-result-details"]}>
                          {result.visibility === "private" ? (
                            <Lock
                              size={16}
                              className={styles["search-result-details-icon"]}
                            />
                          ) : (
                            <Shield
                              size={16}
                              className={styles["search-result-details-icon"]}
                            />
                          )}
                          <span
                            className={`${styles["search-result-elevation"]} typography-body-small`}
                          >
                            {result.member_count} {t("clubs.metrics.members") || "members"}
                          </span>
                          <span
                            className={`${styles["search-result-elevation"]} typography-body-small`}
                          >
                            {result.distinct_peak_count || 0} {t("clubs.metrics.distinctPeaks") || "peaks"}
                          </span>
                          {getLocationFromHierarchy(result.admin_hierarchy) && (
                            <span
                              className={`${styles["search-result-location"]} typography-body-small`}
                            >
                              {getLocationFromHierarchy(result.admin_hierarchy)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }
              if (result.type === "shelter") {
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
                    className={styles["search-result"]}
                    onClick={() => handleResultSelect(shelterResult)}
                    onMouseDown={handleResultMouseDown}
                  >
                    <div className={styles["search-result-content"]}>
                      <div className={styles["search-result-image"]}>
                        {hasImage ? (
                          <img
                            src={shelterResult.image || ""}
                            alt={shelterResult.name}
                            className={styles["search-result-image-img"]}
                          />
                        ) : (
                          <div
                            className={styles["search-result-image-placeholder"]}
                            style={{
                              background: `linear-gradient(rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.3)), ${typeColor}`,
                            }}
                          >
                            <ShelterIcon
                              size={20}
                              className={styles["search-result-elevation-icon"]}
                            />
                          </div>
                        )}
                      </div>
                      <div className={styles["search-result-info"]}>
                        <div className={`${styles["search-result-title"]} typography-title-medium`}>
                          {shelterResult.name_en || shelterResult.name}
                        </div>
                        <div className={styles["search-result-details"]}>
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
                            <span className={`${styles["search-result-elevation"]} typography-body-small`}>
                              {formatMeters(shelterResult.elevation)}
                            </span>
                          )}
                          {getLocationFromHierarchy(shelterResult.admin_hierarchy) && (
                            <span className={`${styles["search-result-location"]} typography-body-small`}>
                              {getLocationFromHierarchy(shelterResult.admin_hierarchy)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            })
          ) : shouldShowEmptyState ? (
            <div className={styles["search-empty"]}>
              <MountainIcon className={styles["search-empty-icon"]} size={32} />
              <span>
                {t("search.noPeaksOrUsersFound", { query: searchQuery })}
              </span>
            </div>
          ) : !searchQuery.trim() && !isSearching ? (
            <div className={styles["search-initial"]}>
              {recentSearches.length === 0 ? (
                <div className={styles["search-initial-content"]}>
                  <div className={styles["search-initial-header"]}>
                    <Sparkles
                      className={styles["search-initial-icon"]}
                      size={24}
                    />
                    <span
                      className={`${styles["search-initial-title"]} typography-title-medium`}
                    >
                      {t("search.searchPeaksAndUsers")}
                    </span>
                  </div>
                  <p
                    className={`${styles["search-initial-description"]} typography-body-small`}
                  >
                    {t("search.discoverPeaksAndUsers")}
                  </p>
                </div>
              ) : null}

              {recentSearches.length > 0 && (
                <div className={styles["search-recent"]}>
                  <div className={styles["search-recent-header"]}>
                    <Clock size={16} />
                    <span className="typography-label-medium">
                      {t("search.recentSearches")}
                    </span>
                    <button
                      className={styles["search-clear-recent"]}
                      onClick={clearRecentSearches}
                      title={t("search.clearRecentSearches")}
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div className={styles["search-recent-list"]}>
                    {recentSearches.map((item) => {
                      if (item.type === "peak") {
                        const peak = item as PeakSearchResult;
                        return (
                          <div
                            key={`recent-peak-${peak.id}`}
                            className={styles["search-recent-item"]}
                            onClick={() => handleRecentSearchClick(peak)}
                            onMouseDown={handleResultMouseDown}
                          >
                            <MountainIcon size={14} />
                            <span className="typography-body-small">
                              {peak.name_en || peak.name}
                            </span>
                          </div>
                        );
                      }
                      if (item.type === "shelter") {
                        const shelter = item as ShelterSearchResult;
                        return (
                          <div
                            key={`recent-shelter-${shelter.id}`}
                            className={styles["search-recent-item"]}
                            onClick={() => handleRecentSearchClick(shelter)}
                            onMouseDown={handleResultMouseDown}
                          >
                            <ShelterIcon size={14} />
                            <span className="typography-body-small">
                              {shelter.name_en || shelter.name}
                            </span>
                          </div>
                        );
                      }
                      if (item.type === "club") {
                        const club = item as ClubSearchResult;
                        return (
                          <div
                            key={`recent-club-${club.id}`}
                            className={styles["search-recent-item"]}
                            onClick={() => handleRecentSearchClick(club)}
                            onMouseDown={handleResultMouseDown}
                          >
                            <Users size={14} />
                            <span className="typography-body-medium">
                              {club.name}
                            </span>
                          </div>
                        );
                      }
                      const user = item as UserSearchResult;
                      return (
                        <div
                          key={`recent-user-${user.id}`}
                          className={styles["search-recent-item"]}
                          onClick={() => handleRecentSearchClick(user)}
                          onMouseDown={handleResultMouseDown}
                        >
                          <User size={14} />
                          <span className="typography-body-medium">
                            {user.name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default SearchComponent;
