import React, { useState, useEffect, useRef } from "react";
import { ChevronRight, SlidersHorizontal, Check } from "lucide-react";
import styles from "./HomeHeader.module.css";

interface HomeHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  // Right side - either "See All" link or dropdown filter
  rightContent?: {
    type: "seeAll" | "dropdown";
    // For "See All" type
    onSeeAllClick?: () => void;
    seeAllText?: string;
    // For dropdown type
    dropdownOptions?: Array<{ value: string; label: string }>;
    selectedValue?: string;
    onDropdownChange?: (value: string) => void;
  };
  // Expandable functionality
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

const HomeHeader: React.FC<HomeHeaderProps> = ({
  title,
  rightContent,
  icon,
  isExpanded,
  onToggleExpand,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownOpen]);

  const handleDropdownChange = (value: string) => {
    if (rightContent?.onDropdownChange) {
      rightContent.onDropdownChange(value);
    }
    setDropdownOpen(false);
  };

  const renderRightContent = () => {
    if (onToggleExpand) {
      return (
        <div
          className={styles["home-header__expand-button"]}
          aria-expanded={isExpanded}
          aria-label={isExpanded ? "Collapse section" : "Expand section"}
        >
          <svg
            width="34"
            height="34"
            viewBox="0 0 34 34"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={`${styles["home-header__chevron"]} ${
              isExpanded ? styles["home-header__chevron--expanded"] : ""
            }`}
          >
            <rect
              width="34"
              height="34"
              rx="17"
              fill="var(--color-accent)"
            />
            <path
              d="M22 19.5L17 14.5L12 19.5"
              stroke="var(--c-black)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      );
    }

    if (!rightContent) return null;

    if (rightContent.type === "seeAll") {
      return (
        <div
          className={styles["home-header__see-all"]}
          onClick={rightContent.onSeeAllClick}
        >
          <span className="typography-button-small">
            {rightContent.seeAllText || "See All"}
          </span>
          <ChevronRight size={16} />
        </div>
      );
    }

    if (rightContent.type === "dropdown") {
      return (
        <div className={styles["home-header__dropdown-container"]}>
          <div
            ref={dropdownRef}
            className={styles["home-header__dropdown-wrap"]}
          >
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className={styles["home-header__filter-button"]}
            >
              <SlidersHorizontal
                size={16}
                className={dropdownOpen ? styles["home-header__filter-icon-open"] : ""}
              />
            </button>
            {dropdownOpen && rightContent.dropdownOptions && (
              <div className={styles["home-header__dropdown-menu"]}>
                {rightContent.dropdownOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleDropdownChange(option.value)}
                    className={`${styles["home-header__dropdown-option"]} ${
                      rightContent.selectedValue === option.value
                        ? styles["home-header__dropdown-option-active"]
                        : ""
                    } typography-body-small`}
                  >
                    <span>{option.label}</span>
                    {rightContent.selectedValue === option.value && (
                      <Check size={14} className={styles["home-header__dropdown-tick"]} />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  const handleHeaderClick = () => {
    if (onToggleExpand) {
      onToggleExpand();
    } else if (rightContent?.type === "dropdown") {
      setDropdownOpen(!dropdownOpen);
    }
  };

  return (
    <div
      className={`${styles["home-header"]} ${
        (onToggleExpand || rightContent?.type === "dropdown")
          ? styles["home-header--clickable"]
          : ""
      }`}
      onClick={handleHeaderClick}
    >
      <div className={styles["home-header__content"]}>
        <div className={styles["home-header__text"]}>
          {icon && <div className={styles["home-header__icon"]}>{icon}</div>}
          <h2 className={`${styles["home-header__title"]} typography-title-medium`}>
            {title}
          </h2>
        </div>
      </div>
      <div className={styles["home-header__right"]}>{renderRightContent()}</div>
    </div>
  );
};

export default HomeHeader;
