"use client";

import React, { useState, useRef, useEffect, useCallback, useId } from "react";
import { Search as SearchIcon, ChevronDown, X, Check } from "lucide-react";
import styles from "./desktop-CustomDropdown.module.css";

interface Option {
  id: string | number;
  name: string;
  name_en?: string;
  gid_0?: string;
}

interface CustomDropdownProps {
  options: Option[];
  value: string | number | null;
  onChange: (value: string | number | null) => void;
  placeholder: string;
  disabled?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  className?: string;
}

const CustomDropdown: React.FC<CustomDropdownProps> = ({
  options,
  value,
  onChange,
  placeholder,
  disabled = false,
  searchable = true,
  searchPlaceholder = "Search...",
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();

  // Filter options based on search query
  const filteredOptions = searchable
    ? options.filter((option) => {
        const displayName = option.name_en || option.name || "";
        return displayName.toLowerCase().includes(searchQuery.toLowerCase());
      })
    : options;

  // Get selected option for display
  const selectedOption = options.find((option) => String(option.id) === String(value));
  const displayValue = selectedOption ? (selectedOption.name_en || selectedOption.name) : placeholder;

  // Handle opening dropdown
  const handleOpen = useCallback(() => {
    if (!disabled) {
      setIsOpen(true);
      setSearchQuery("");
      setHighlightedIndex(-1);
      // Focus search input after dropdown opens when search is enabled
      if (searchable) {
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 100);
      }
    }
  }, [disabled, searchable]);

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

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen) {
        if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
          e.preventDefault();
          handleOpen();
        }
        return;
      }

      switch (e.key) {
        case "Escape":
          e.preventDefault();
          handleClose();
          break;
        case "Enter":
          e.preventDefault();
          if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
            const selectedOption = filteredOptions[highlightedIndex];
            if (selectedOption) {
              handleSelect(selectedOption);
            }
          }
          break;
        case "ArrowDown":
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev < filteredOptions.length - 1 ? prev + 1 : prev
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
          break;
      }
    },
    [isOpen, highlightedIndex, filteredOptions, handleOpen, handleClose, handleSelect]
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

  // Scroll highlighted option into view
  useEffect(() => {
    if (highlightedIndex >= 0 && isOpen) {
      const highlightedElement = dropdownRef.current?.querySelector(
        `.custom-dropdown__option:nth-child(${highlightedIndex + (searchable ? 2 : 1)})`
      ) as HTMLElement;
      highlightedElement?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [highlightedIndex, isOpen, searchable]);

  const baseClassName = styles["custom-dropdown"];
  const selectedClass = value ? styles["custom-dropdown--selected"] : "";
  const disabledClass = disabled ? styles["custom-dropdown--disabled"] : "";
  const openClass = isOpen ? styles["custom-dropdown--open"] : "";

  return (
    <div
      ref={dropdownRef}
      className={`${baseClassName} ${selectedClass} ${disabledClass} ${openClass} ${className}`.trim()}
      onKeyDown={handleKeyDown}
      tabIndex={disabled ? -1 : 0}
      role="combobox"
      aria-expanded={isOpen}
      aria-haspopup="listbox"
      aria-controls={listboxId}
    >
      {/* Trigger Button */}
      <div
        className={styles["custom-dropdown__trigger"]}
        onClick={isOpen ? handleClose : handleOpen}
      >
        <span className={`${styles["custom-dropdown__value"]} typography-desktop-body-small`}>
          {displayValue}
        </span>
        <div className={styles["custom-dropdown__icons"]}>
          {value && (
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
          {searchable && (
            <div className={styles["custom-dropdown__search-container"]}>
              <div className={styles["custom-dropdown__search-input-wrapper"]}>
                <SearchIcon
                  className={styles["custom-dropdown__search-icon"]}
                  size={16}
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  className={`${styles["custom-dropdown__search-input"]} typography-desktop-body-small`}
                  placeholder={searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
          )}

          {/* Options List */}
          <div
            id={listboxId}
            role="listbox"
            className={styles["custom-dropdown__options"]}
          >
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
                    <span className={`${styles["custom-dropdown__option-text"]} typography-desktop-body-small`}>
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
              <div className={`${styles["custom-dropdown__no-results"]} typography-desktop-body-small`}>
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
