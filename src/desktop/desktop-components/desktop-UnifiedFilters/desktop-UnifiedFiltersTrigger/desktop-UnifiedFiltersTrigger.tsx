import React from "react";
import { SlidersHorizontal } from "lucide-react";
import styles from "./desktop-UnifiedFiltersTrigger.module.css";

type Props = {
  label: string;
  hasActiveFilters: boolean;
  onClick: () => void;
};

const UnifiedFiltersTrigger: React.FC<Props> = ({
  label,
  hasActiveFilters,
  onClick,
}) => {
  return (
    <button
      className={`${styles["filters"]} ${
        hasActiveFilters ? styles["filters--active"] : ""
      }`}
      onClick={onClick}
      type="button"
    >
      <SlidersHorizontal size={16} />
      <span className="typography-desktop-label-large">{label}</span>
    </button>
  );
};

export default React.memo(UnifiedFiltersTrigger);
