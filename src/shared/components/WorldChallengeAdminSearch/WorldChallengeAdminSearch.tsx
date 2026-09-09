import React, { useCallback, useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import type { AdminSearchResult } from "../../api/types";
import { searchAdmin } from "../../api/endpoints/user";
import { useLatestSearchToken } from "../../hooks/useLatestSearchToken";
import AdminSearchIcon from "../AdminSearchIcon/AdminSearchIcon";
import styles from "./WorldChallengeAdminSearch.module.css";

interface WorldChallengeAdminSearchProps {
  selectedName: string | null;
  placeholder: string;
  emptyText: (query: string) => string;
  ariaLabel: string;
  onSelect: (result: AdminSearchResult) => void | Promise<void>;
  onClear: () => void;
  className?: string | undefined;
}

const SEARCH_SHIMMER_ROWS = 2;

const WorldChallengeAdminSearch: React.FC<WorldChallengeAdminSearchProps> = ({
  selectedName,
  placeholder,
  emptyText,
  ariaLabel,
  onSelect,
  onClear,
  className = "",
}) => {
  const [searchQuery, setSearchQuery] = useState(selectedName ?? "");
  const [results, setResults] = useState<AdminSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [completedQuery, setCompletedQuery] = useState<string | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    nextSearchToken,
    invalidateSearchToken,
    isLatestSearchToken,
  } = useLatestSearchToken();

  const restoreSelectedName = useCallback(() => {
    if (selectedName) {
      setSearchQuery(selectedName);
    }
  }, [selectedName]);

  const runSearch = useCallback(
    async (query: string, searchToken: number) => {
      const trimmedQuery = query.trim();
      if (trimmedQuery.length < 2) {
        setResults([]);
        setShowDropdown(false);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);

      try {
        const response = await searchAdmin(trimmedQuery, 10);
        if (!isLatestSearchToken(searchToken)) return;
        setResults(response.results || []);
        setCompletedQuery(trimmedQuery);
        setShowDropdown(true);
      } catch (error) {
        if (!isLatestSearchToken(searchToken)) return;
        console.error("Admin search failed:", error);
        setResults([]);
        setCompletedQuery(trimmedQuery);
        setShowDropdown(true);
      } finally {
        if (isLatestSearchToken(searchToken)) {
          setIsSearching(false);
        }
      }
    },
    [isLatestSearchToken]
  );

  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const query = event.target.value;
      setSearchQuery(query);
      setCompletedQuery(null);
      const searchToken = nextSearchToken();

      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      if (query.trim().length < 2) {
        setResults([]);
        setShowDropdown(false);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      setShowDropdown(true);
      searchTimeoutRef.current = setTimeout(() => {
        void runSearch(query, searchToken);
      }, 300);
    },
    [nextSearchToken, runSearch]
  );

  const handleClear = useCallback(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    invalidateSearchToken();
    setSearchQuery("");
    setResults([]);
    setShowDropdown(false);
    setIsSearching(false);
    setCompletedQuery(null);
    onClear();
  }, [invalidateSearchToken, onClear]);

  const handleSelect = useCallback(
    async (result: AdminSearchResult) => {
      invalidateSearchToken();
      setSearchQuery(result.name_only || result.name);
      setResults([]);
      setShowDropdown(false);
      setIsSearching(false);
      setCompletedQuery(null);
      await onSelect(result);
    },
    [invalidateSearchToken, onSelect]
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        if (searchTimeoutRef.current) {
          clearTimeout(searchTimeoutRef.current);
        }
        invalidateSearchToken();
        setShowDropdown(false);
        setResults([]);
        setIsSearching(false);
        setCompletedQuery(null);
        restoreSelectedName();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [restoreSelectedName]);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const showClearButton = Boolean(searchQuery || selectedName);
  const shouldShowEmptyState =
    showDropdown &&
    !isSearching &&
    results.length === 0 &&
    completedQuery === searchQuery.trim() &&
    searchQuery.trim().length >= 2;

  return (
    <div
      ref={containerRef}
      className={`${styles["world-challenge-admin-search"]} ${className}`.trim()}
    >
      <div className={styles["world-challenge-admin-search__input-wrapper"]}>
        <Search
          size={18}
          className={styles["world-challenge-admin-search__icon"]}
        />
        <input
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={() => {
            if (searchQuery.trim().length >= 2) {
              setShowDropdown(true);
            }
          }}
          placeholder={placeholder}
          aria-label={ariaLabel}
          className={`${styles["world-challenge-admin-search__input"]} typography-label-large`}
        />
        {showClearButton && (
          <button
            type="button"
            className={styles["world-challenge-admin-search__clear"]}
            onClick={handleClear}
            aria-label={ariaLabel}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {showDropdown && (
        <div className={styles["world-challenge-admin-search__dropdown"]}>
          {isSearching ? (
            <div className={styles["world-challenge-admin-search__loading"]}>
              {Array.from({ length: SEARCH_SHIMMER_ROWS }, (_, index) => (
                <div
                  key={`admin-search-loading-${index}`}
                  className={styles["world-challenge-admin-search__skeleton-row"]}
                >
                  <div
                    className={`${styles["world-challenge-admin-search__skeleton-block"]} ${styles["world-challenge-admin-search__skeleton-image"]}`}
                  />
                  <div
                    className={
                      styles["world-challenge-admin-search__skeleton-info"]
                    }
                  >
                    <div
                      className={`${styles["world-challenge-admin-search__skeleton-block"]} ${styles["world-challenge-admin-search__skeleton-title"]}`}
                    />
                    <div
                      className={`${styles["world-challenge-admin-search__skeleton-block"]} ${styles["world-challenge-admin-search__skeleton-subtitle"]}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : results.length > 0 ? (
            results.map((result) => {
              const title = result.name_only || result.name;
              const subtitle =
                result.parent_name ||
                (result.name_only && result.name !== result.name_only
                  ? result.name
                  : null);
              const hasImageUrl =
                typeof result.image === "string" &&
                (result.image.startsWith("http://") ||
                  result.image.startsWith("https://"));

              return (
                <button
                  key={result.id}
                  type="button"
                  className={styles["world-challenge-admin-search__result"]}
                  onClick={() => void handleSelect(result)}
                >
                  <div
                    className={styles["world-challenge-admin-search__result-image"]}
                  >
                    {hasImageUrl ? (
                      <img
                        src={result.image || ""}
                        alt={title}
                        className={
                          styles["world-challenge-admin-search__result-image-img"]
                        }
                      />
                    ) : (
                      <div
                        className={
                          styles["world-challenge-admin-search__result-image-placeholder"]
                        }
                      >
                        {result.image && !hasImageUrl ? (
                          <span>{result.image}</span>
                        ) : (
                          <AdminSearchIcon
                            size={24}
                            className={
                              styles["world-challenge-admin-search__result-icon"]
                            }
                          />
                        )}
                      </div>
                    )}
                  </div>

                  <div
                    className={styles["world-challenge-admin-search__result-info"]}
                  >
                    <div
                      className={`${styles["world-challenge-admin-search__result-title"]} typography-title-medium`}
                    >
                      {title}
                    </div>
                    {subtitle && (
                      <div
                        className={`${styles["world-challenge-admin-search__result-subtitle"]} typography-body-small`}
                      >
                        {subtitle}
                      </div>
                    )}
                  </div>
                </button>
              );
            })
          ) : shouldShowEmptyState ? (
            <div className={`${styles["world-challenge-admin-search__status"]} typography-body-medium`}>
              <span>{emptyText(searchQuery)}</span>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default WorldChallengeAdminSearch;
