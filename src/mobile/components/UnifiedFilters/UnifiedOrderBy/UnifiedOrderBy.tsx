import React, { useRef, useEffect } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import styles from "./UnifiedOrderBy.module.css";

export type OrderField =
  | "name"
  | "elevation"
  | "date"
  | "ascents"
  | "saved_at"
  | "peaks";
export type OrderDirection = "asc" | "desc";

type Option = { field: OrderField; direction: OrderDirection; label: string };

type Props = {
  isOpen: boolean;
  isClosing?: boolean;
  disabled?: boolean;
  label: string;
  value: { field: OrderField; direction: OrderDirection };
  sections: Array<{ title: string; options: Option[] }>;
  onToggle: () => void;
  onChange: (field: OrderField, direction: OrderDirection) => void;
};

const UnifiedOrderBy: React.FC<Props> = ({
  isOpen,
  isClosing = false,
  disabled = false,
  label,
  value,
  sections,
  onToggle,
  onChange,
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: Event) => {
      if (
        isOpen &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        onToggle();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen, onToggle]);

  return (
    <div className={styles["orderby"]} data-dropdown ref={dropdownRef}>
      <button
        className={styles["orderby__button"]}
        onClick={onToggle}
        disabled={disabled}
      >
        <ArrowUpDown size={18} />
        <span className="typography-label-large">{label}</span>
        {value.direction === "asc" ? (
          <ArrowUp size={16} />
        ) : (
          <ArrowDown size={16} />
        )}
      </button>

      {(isOpen || isClosing) && (
        <div 
          className={styles["orderby__menu"]}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
        >
          {sections.map((section, idx) => (
            <div key={idx} className={styles["orderby__section"]}>
              <div
                className={`${styles["orderby__title"]} typography-title-small`}
              >
                {section.title}
              </div>
              {section.options.map((opt) => {
                const active =
                  value.field === opt.field &&
                  value.direction === opt.direction;
                return (
                  <button
                    key={`${opt.field}-${opt.direction}`}
                    className={`${styles["orderby__item"]} ${
                      active ? styles["orderby__item--active"] : ""
                    }`}
                    onClick={() => onChange(opt.field, opt.direction)}
                  >
                    <span className="typography-body-small">{opt.label}</span>
                    {opt.direction === "asc" ? (
                      <ArrowUp size={16} />
                    ) : (
                      <ArrowDown size={16} />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default React.memo(UnifiedOrderBy);
