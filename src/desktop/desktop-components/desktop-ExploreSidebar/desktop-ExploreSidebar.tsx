"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Search as SearchIcon, X, User, Users, Lock, Shield } from "lucide-react";
import AdminSearchIcon from "../../../shared/components/AdminSearchIcon/AdminSearchIcon";
import MountainIcon from "../../../shared/components/MountainIcon/MountainIcon";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../shared/context/AuthContext";
import { useI18n } from "../../../shared/context/I18nContext";
import { useExplore } from "../../desktop-context/desktop-ExploreContext.tsx";
import { searchRealtime } from "../../../shared/api/endpoints/user";
import { getElevationColor } from "../../../shared/constants/elevationColors";
import { getLocationFromHierarchy } from "../../../shared/utils/adminHierarchy";
import { removeImageSizeRestriction } from "../../../shared/utils/imageUtils";
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
import CustomDropdown from "../desktop-CustomDropdown";
import { useUnitFormat } from "../../../shared/hooks/useUnitFormat";
import styles from "./desktop-ExploreSidebar.module.css";

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

interface ExploreSidebarProps {
  isVisible?: boolean;
}

const ExploreSidebar: React.FC<ExploreSidebarProps> = ({ isVisible = true }) => {
  const { formatMeters: formatElevation } = useUnitFormat();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useI18n();
  const {
    exploreFilters,
    adminLevels,
    selectAdminLevel,
    selectAdminSearchResult,
    handleExploreElevationChange,
  } = useExplore();

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [completedQuery, setCompletedQuery] = useState<string | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);
  const {
    nextSearchToken,
    invalidateSearchToken,
    isLatestSearchToken,
  } = useLatestSearchToken();

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
      const filteredResults = response.results.filter(
        (result) =>
          result.type === "peak" ||
          result.type === "user" ||
          result.type === "admin" ||
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
  }, [isLatestSearchToken]);

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
        setShowDropdown(false);
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

  const handleInputFocus = useCallback(() => {
    setShowDropdown(true);
  }, []);

  const handleResultSelect = useCallback(
    async (result: SearchResult) => {
      invalidateSearchToken();
      setCompletedQuery(null);
      if (result.type === "peak") {
        const peakResult = result as PeakSearchResult;
        navigate(`/peaks/${peakResult.id}`);
      } else if (result.type === "user") {
        const userResult = result as UserSearchResult;
        if (user && user.internalUserId === userResult.id) {
          navigate("/profile");
        } else {
          navigate(`/externalprofile/${userResult.id}`);
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
      setShowDropdown(false);
      setIsSearching(false);
    },
    [invalidateSearchToken, navigate, selectAdminSearchResult, user]
  );

  // Filter functionality - cascading admin levels
  const handleAdminLevelChange = useCallback(
    (levelIndex: number, value: string | number | null) => {
      const id = value ? Number(value) : null;
      selectAdminLevel(levelIndex, id);
    },
    [selectAdminLevel]
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

  // Handle clicks outside search dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showDropdown &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node) &&
        !(event.target as Element).closest(
          `.${styles["explore-sidebar__search-dropdown"]}`
        )
      ) {
        setShowDropdown(false);
        setCompletedQuery(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showDropdown]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
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
      className={`${styles["explore-sidebar"]} ${
        isVisible ? styles["explore-sidebar--visible"] : styles["explore-sidebar--hidden"]
      }`}
    >
      {/* Searchbar */}
      <div className={styles["explore-sidebar__search-container"]}>
        <div className={styles["explore-sidebar__search-input-wrapper"]}>
          <SearchIcon
            className={styles["explore-sidebar__search-icon"]}
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
            onFocus={handleInputFocus}
            className={`${styles["explore-sidebar__search-input"]} typography-desktop-label-small`}
            aria-label={t("search.searchLabel")}
          />
          {searchQuery && (
            <button
              className={styles["explore-sidebar__search-clear"]}
              onClick={() => {
                invalidateSearchToken();
                setSearchQuery("");
                setSearchResults([]);
                setShowDropdown(false);
                setIsSearching(false);
              }}
              title={t("search.closeSearch")}
              aria-label={t("search.closeSearch")}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Search Dropdown */}
        {showDropdown && (
          <div className={styles["explore-sidebar__search-dropdown"]}>
            {isSearching ? (
              // Loading shimmer
              <div className={styles["explore-sidebar__search-shimmer"]}>
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className={styles["explore-sidebar__search-shimmer-item"]}
                  >
                    <div
                      className={
                        styles["explore-sidebar__search-shimmer-thumb"]
                      }
                    />
                    <div
                      className={styles["explore-sidebar__search-shimmer-text"]}
                    >
                      <div
                        className={
                          styles["explore-sidebar__search-shimmer-title"]
                        }
                      />
                      <div
                        className={
                          styles["explore-sidebar__search-shimmer-subtitle"]
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : searchResults.length > 0 ? (
              // Search results
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
                      key={`peak-${peakResult.id}`}
                      className={styles["explore-sidebar__search-result"]}
                      onClick={() => void handleResultSelect(peakResult)}
                    >
                      <div
                        className={
                          styles["explore-sidebar__search-result-image"]
                        }
                      >
                        {hasImage ? (
                          <img
                            src={removeImageSizeRestriction(peakResult.image) || ""}
                            alt={peakResult.name}
                            className={
                              styles["explore-sidebar__search-result-img"]
                            }
                          />
                        ) : (
                          <div
                            className={
                              styles[
                                "explore-sidebar__search-result-placeholder"
                              ]
                            }
                            style={{
                              background: `linear-gradient(rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.3)), ${elevationColor}`,
                            }}
                          >
                            <img
                              src={elevationIcon}
                              alt=""
                              className={
                                styles["explore-sidebar__search-result-icon"]
                              }
                            />
                          </div>
                        )}
                      </div>
                      <div
                        className={
                          styles["explore-sidebar__search-result-info"]
                        }
                      >
                        <div className="typography-desktop-body-medium">
                          {peakResult.name_en || peakResult.name}
                        </div>
                        <div
                          className={
                            styles["explore-sidebar__search-result-details"]
                          }
                        >
                          <img
                            src={elevationIcon}
                            alt=""
                            style={{ width: 14, height: 14 }}
                          />
                          <span className="typography-desktop-body-small">
                            {formatElevation(peakResult.elevation)}
                          </span>
                          {getLocationFromHierarchy(peakResult.admin_hierarchy) && (
                            <span
                              className="typography-desktop-body-small"
                              style={{ color: "#6b7280" }}
                            >
                              {getLocationFromHierarchy(peakResult.admin_hierarchy)}
                            </span>
                          )}
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
                      key={`shelter-${shelterResult.id}`}
                      className={styles["explore-sidebar__search-result"]}
                      onClick={() => void handleResultSelect(shelterResult)}
                    >
                      <div
                        className={
                          styles["explore-sidebar__search-result-image"]
                        }
                      >
                        {hasImage ? (
                          <img
                            src={shelterResult.image || ""}
                            alt={shelterResult.name}
                            className={
                              styles["explore-sidebar__search-result-img"]
                            }
                          />
                        ) : (
                          <div
                            className={
                              styles[
                                "explore-sidebar__search-result-placeholder"
                              ]
                            }
                            style={{
                              background: `linear-gradient(rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.3)), ${typeColor}`,
                            }}
                          >
                            <ShelterIcon
                              size={20}
                              className={
                                styles["explore-sidebar__search-result-icon"]
                              }
                            />
                          </div>
                        )}
                      </div>
                      <div
                        className={
                          styles["explore-sidebar__search-result-info"]
                        }
                      >
                        <div className="typography-desktop-body-medium">
                          {shelterResult.name_en || shelterResult.name}
                        </div>
                        <div
                          className={
                            styles["explore-sidebar__search-result-details"]
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
                            <span className="typography-desktop-body-small">
                              {formatElevation(shelterResult.elevation)}
                            </span>
                          )}
                          {getLocationFromHierarchy(shelterResult.admin_hierarchy) && (
                            <span
                              className="typography-desktop-body-small"
                              style={{ color: "#6b7280" }}
                            >
                              {getLocationFromHierarchy(shelterResult.admin_hierarchy)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                } else if (result.type === "user") {
                  const userResult = result as UserSearchResult;
                  const hasImage = Boolean(userResult.image);

                  return (
                    <div
                      key={`user-${userResult.id}`}
                      className={styles["explore-sidebar__search-result"]}
                      onClick={() => void handleResultSelect(userResult)}
                    >
                      <div
                        className={
                          styles["explore-sidebar__search-result-image"]
                        }
                      >
                        {hasImage ? (
                          <img
                            src={userResult.image}
                            alt={userResult.name}
                            className={
                              styles["explore-sidebar__search-result-img"]
                            }
                          />
                        ) : (
                          <div
                            className={
                              styles[
                                "explore-sidebar__search-result-placeholder"
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
                                styles["explore-sidebar__search-result-icon"]
                              }
                            />
                          </div>
                        )}
                      </div>
                      <div
                        className={
                          styles["explore-sidebar__search-result-info"]
                        }
                      >
                        <div className="typography-desktop-body-medium">
                          {userResult.name}
                        </div>
                        <div
                          className={
                            styles["explore-sidebar__search-result-details"]
                          }
                        >
                          <span
                            className="typography-desktop-body-small"
                            style={{ color: "#6b7280" }}
                          >
                            {userResult.total_peaks} {t("search.peaks")}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                } else if (result.type === "club") {
                  const clubResult = result as ClubSearchResult;
                  const hasImage = Boolean(clubResult.image);

                  return (
                    <div
                      key={`club-${clubResult.id}`}
                      className={styles["explore-sidebar__search-result"]}
                      onClick={() => void handleResultSelect(clubResult)}
                    >
                      <div
                        className={
                          styles["explore-sidebar__search-result-image"]
                        }
                      >
                        {hasImage ? (
                          <img
                            src={clubResult.image || ""}
                            alt={clubResult.name}
                            className={
                              styles["explore-sidebar__search-result-img"]
                            }
                          />
                        ) : (
                          <div
                            className={
                              styles[
                                "explore-sidebar__search-result-placeholder"
                              ]
                            }
                            style={{
                              backgroundColor: "rgba(194, 207, 148, 0.35)",
                            }}
                          >
                            <Users
                              size={28}
                              className={
                                styles["explore-sidebar__search-result-icon"]
                              }
                            />
                          </div>
                        )}
                      </div>
                      <div
                        className={
                          styles["explore-sidebar__search-result-info"]
                        }
                      >
                        <div className="typography-desktop-body-medium">
                          {clubResult.name}
                        </div>
                        <div
                          className={
                            styles["explore-sidebar__search-result-details"]
                          }
                        >
                          {clubResult.visibility === "private" ? (
                            <Lock size={14} />
                          ) : (
                            <Shield size={14} />
                          )}
                          <span
                            className="typography-desktop-body-small"
                            style={{ color: "#6b7280" }}
                          >
                            {clubResult.member_count} {t("clubs.metrics.members") || "members"}
                          </span>
                          {getLocationFromHierarchy(clubResult.admin_hierarchy) && (
                            <span
                              className="typography-desktop-body-small"
                              style={{ color: "#6b7280" }}
                            >
                              {getLocationFromHierarchy(clubResult.admin_hierarchy)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                } else if (result.type === "admin") {
                  const adminResult = result as AdminSearchResult;
                  const adminTitle = adminResult.name_only || adminResult.name;
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
                      className={styles["explore-sidebar__search-result"]}
                      onClick={() => void handleResultSelect(adminResult)}
                    >
                      <div
                        className={
                          styles["explore-sidebar__search-result-image"]
                        }
                      >
                        {hasImageUrl ? (
                          <img
                            src={adminResult.image || ""}
                            alt={adminTitle}
                            className={
                              styles["explore-sidebar__search-result-img"]
                            }
                          />
                        ) : (
                          <div
                            className={
                              styles[
                                "explore-sidebar__search-result-placeholder"
                              ]
                            }
                            style={{
                              backgroundColor: "rgba(15, 23, 42, 0.08)",
                            }}
                          >
                            {adminResult.image && !hasImageUrl ? (
                              <span className="typography-desktop-body-medium">
                                {adminResult.image}
                              </span>
                            ) : (
                              <AdminSearchIcon
                                size={28}
                                className={
                                  styles["explore-sidebar__search-result-icon"]
                                }
                              />
                            )}
                          </div>
                        )}
                      </div>
                      <div
                        className={
                          styles["explore-sidebar__search-result-info"]
                        }
                      >
                        <div className="typography-desktop-body-medium">
                          {adminTitle}
                        </div>
                        {adminSubtitle && (
                          <div
                            className={
                              styles["explore-sidebar__search-result-details"]
                            }
                          >
                            <span
                              className="typography-desktop-body-small"
                              style={{ color: "#6b7280" }}
                            >
                              {adminSubtitle}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }
                return null;
              })
            ) : shouldShowEmptyState ? (
              // No results
              <div className={styles["explore-sidebar__search-empty"]}>
                <MountainIcon size={32} color="rgb(148, 163, 184)" />
                <span
                  className="typography-desktop-body-medium"
                  style={{ color: "#6b7280" }}
                >
                  {t("search.noPeaksOrUsersFound", { query: searchQuery })}
                </span>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Filters - Always Visible */}
      <div className={styles["explore-sidebar__filters"]}>
        {/* Cascading Admin Level Custom Dropdowns */}
        {adminLevels.map((level, index) => {
          if (level.loading) {
            return (
              <div key={`level-${index}`} className={styles["explore-sidebar__filter-row"]}>
                <CustomDropdown
                  options={[]}
                  value={null}
                  onChange={() => {}}
                  placeholder="..."
                  disabled={true}
                />
              </div>
            );
          }
          if (level.options.length === 0) return null;
          const placeholder = index === 0 ? t("common.allCountries") : t("common.allRegions");
          const dropdownOptions = level.options.map((area) => ({
            id: area.osm_id,
            name: area.name,
          }));
          return (
            <div key={`level-${index}`} className={styles["explore-sidebar__filter-row"]}>
              <CustomDropdown
                options={dropdownOptions}
                value={level.selectedId}
                onChange={(value) => handleAdminLevelChange(index, value)}
                placeholder={placeholder}
                searchPlaceholder={`Search...`}
                disabled={false}
              />
            </div>
          );
        })}

        {/* Elevation Slider */}
        <div className={styles["explore-sidebar__elevation-filter"]}>
          <div className={styles["explore-sidebar__elevation-slider"]}>
            <div className={styles["explore-sidebar__elevation-range"]}>
              <span className="typography-desktop-label-medium">
                {formatElevation(pendingRange[0])}
              </span>
              <span className="typography-desktop-label-medium">
                {formatElevation(pendingRange[1])}
              </span>
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
                color: "#1e3a8a",
                height: 6,
                padding: "0px !important",
                margin: "8px 0 !important",
                width: "100%",
                "& .MuiSlider-thumb": {
                  width: 18,
                  height: 18,
                  background: "#1e3a8a",
                  border: "2px solid rgb(255, 255, 255)",
                  boxShadow: "0 2px 8px rgba(30, 58, 138, 0.3)",
                },
                "& .MuiSlider-rail": {
                  height: 6,
                  background: "rgba(30, 58, 138, 0.15)",
                  borderRadius: 3,
                  width: "100% !important",
                },
                "& .MuiSlider-track": {
                  height: 6,
                  background: "#1e3a8a",
                  borderRadius: 3,
                },
              }}
            />
          </div>
        </div>

        </div>
    </div>
  );
};

export default React.memo(ExploreSidebar);
