import React from "react";
import { ArrowLeft } from "lucide-react";
import styles from "./OverlayHeader.module.css";

interface OverlayHeaderProps {
  title: string;
  onBack: () => void;
  rightContent?: React.ReactNode; // For save buttons, user images, etc.
  variant?: "default" | "transparent"; // For UserRouteDetails
  className?: string;
  subtitle?: string | undefined; // For peak details English name
}

const OverlayHeader: React.FC<OverlayHeaderProps> = ({
  title,
  onBack,
  rightContent,
  variant = "default",
  className = "",
  subtitle,
}) => {
  const headerClass =
    variant === "transparent"
      ? styles["overlay-header--transparent"]
      : styles["overlay-header"];

  return (
    <div className={`${headerClass} ${className}`}>
      <button
        className={styles["overlay-header__back-button"]}
        onClick={onBack}
        aria-label="Go back"
      >
        <ArrowLeft size={20} />
      </button>

      <div
        className={`${styles["overlay-header__title-wrapper"]} typography-headline-small`}
      >
        <h1
          className={`${styles["overlay-header__title"]} typography-title-medium`}
        >
          {title}
        </h1>
        {subtitle && (
          <div
            className={`${styles["overlay-header__subtitle"]} typography-title-medium`}
          >
            {subtitle}
          </div>
        )}
      </div>

      <div className={styles["overlay-header__right-content"]}>
        {rightContent}
      </div>
    </div>
  );
};

export default OverlayHeader;
