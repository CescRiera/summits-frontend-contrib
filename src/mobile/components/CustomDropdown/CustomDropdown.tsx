"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Search as SearchIcon, ChevronDown, X, Check } from "lucide-react";
import styles from "./CustomDropdown.module.css";

interface Option {
  id: string | number;
  name: string;
  name_en?: string;
}

interface CustomDropdownProps {
  options: Option[];
  value: string | number | null;
  onChange: (value: string | number | null) => void;
  placeholder: string;
  disabled?: boolean;
  searchPlaceholder?: string;
  showSearch?: boolean;
  showClear?: boolean;
  className?: string;
}

const CustomDropdown: React.FC<CustomDropdownProps> = ({
  options,
  value,
  onChange,
  placeholder,
  disabled = false,
  searchPlaceholder = "Search...",
  showSearch = true,
  showClear = true,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter options based on search query
  const filteredOptions = options.filter((option) => {
    const displayName = option.name_en || option.name || "";
    return displayName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Get selected option for display
  const selectedOption = options.find((option) => String(option.id) === String(value));
  const displayValue = selectedOption ? (selectedOption.name_en || selectedOption.name) : placeholder;

  // Handle opening dropdown
  const handleOpen = useCallback(() => {
    if (!disabled) {
      setIsOpen(true);
      setSearchQuery("");
      setHighlightedIndex(-1);
      // Focus search input after dropdown opens
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [disabled]);

  // Handle closing dropdown
  const handleClose = useCallback(() => {
    setIsOpen(false);
    setSearchQuery("");
    setHighlightedIndex(-1);
  }, []);

  // Handle option selection
  const handleSelect = useCallback(
    (option: Option) => {
      onChange(option.id);
      handleClose();
    },
    [onChange, handleClose]
  );

  // Handle clear selection
  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange(null);
      handleClose();
    },
    [onChange, handleClose]
  );

  // Handle click outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        handleClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, handleClose]);

  const baseClassName = styles["custom-dropdown"];
  const selectedClass = value ? styles["custom-dropdown--selected"] : "";
  const disabledClass = disabled ? styles["custom-dropdown--disabled"] : "";
  const openClass = isOpen ? styles["custom-dropdown--open"] : "";

  return (
    <div
      ref={dropdownRef}
      className={`${baseClassName} ${selectedClass} ${disabledClass} ${openClass} ${className}`.trim()}
    >
      {/* Trigger Button */}
      <div
        className={styles["custom-dropdown__trigger"]}
        onClick={isOpen ? handleClose : handleOpen}
      >
        <span className={`${styles["custom-dropdown__value"]} typography-body-small`}>
          {displayValue}
        </span>
        <div className={styles["custom-dropdown__icons"]}>
          {value && showClear && (
            <button
              className={styles["custom-dropdown__clear"]}
              onClick={handleClear}
              aria-label="Clear selection"
              type="button"
            >
              <X size={14} />
            </button>
          )}
          <ChevronDown
            className={styles["custom-dropdown__arrow"]}
            size={16}
          />
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className={styles["custom-dropdown__menu"]}>
          {/* Search Bar */}
          {showSearch && (
            <div className={styles["custom-dropdown__search-container"]}>
              <div className={styles["custom-dropdown__search-input-wrapper"]}>
                <SearchIcon
                  className={styles["custom-dropdown__search-icon"]}
                  size={16}
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  className={`${styles["custom-dropdown__search-input"]} typography-body-small`}
                  placeholder={searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
          )}

          {/* Options List */}
          <div className={styles["custom-dropdown__options"]}>
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => {
                const isSelected = String(option.id) === String(value);
                const isHighlighted = index === highlightedIndex;
                const optionClass = [
                  styles["custom-dropdown__option"],
                  isSelected ? styles["custom-dropdown__option--selected"] : "",
                  isHighlighted ? styles["custom-dropdown__option--highlighted"] : "",
                ]
                  .filter(Boolean)
                  .join(" ");

                return (
                  <div
                    key={option.id}
                    className={optionClass}
                    onClick={() => handleSelect(option)}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <span className={`${styles["custom-dropdown__option-text"]} typography-body-small`}>
                      {option.name_en || option.name} 
                    </span>
                    {isSelected && (
                      <Check
                        className={styles["custom-dropdown__option-check"]}
                        size={14}
                      />
                    )}
                  </div>
                );
              })
            ) : (
              <div className={`${styles["custom-dropdown__no-results"]} typography-body-small`}>
                No results found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomDropdown;
