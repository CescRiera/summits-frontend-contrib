import React from "react";
import styles from "./desktop-OverlayHeader.module.css";

interface OverlayHeaderProps {
  title: string;
  rightContent?: React.ReactNode; // For save buttons, user images, etc.
  variant?: "default" | "transparent"; // For UserRouteDetails
  className?: string;
  subtitle?: string | undefined; // For peak details English name
}

const OverlayHeader: React.FC<OverlayHeaderProps> = ({
  title,
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
      <div
        className={`${styles["overlay-header__title-wrapper"]} typography-desktop-title-small`}
      >
        <h1
          className={`${styles["overlay-header__title"]} typography-desktop-title-large`}
        >
          {title}
        </h1>
        {subtitle && (
          <div
            className={`${styles["overlay-header__subtitle"]} typography-desktop-body-small`}
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
