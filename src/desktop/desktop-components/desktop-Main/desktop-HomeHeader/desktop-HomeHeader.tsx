import React from "react";
import { ChevronRight } from "lucide-react";
import styles from "./desktop-HomeHeader.module.css";

interface HomeHeaderProps {
  title: string;
  subtitle: string;
  // Right side - either "See All" link or switch toggle
  rightContent?: {
    type: "seeAll" | "switch";
    // For "See All" type
    onSeeAllClick?: () => void;
    seeAllText?: string;
    // For switch type
    switchOptions?: Array<{ value: string; label: string }>;
    selectedValue?: string;
    onSwitchChange?: (value: string) => void;
  };
  // If true, switch appears below title/subtitle (column layout)
  switchBelow?: boolean;
}

const HomeHeader: React.FC<HomeHeaderProps> = ({
  title,
  subtitle,
  rightContent,
  switchBelow = false,
}) => {
  const handleSwitchChange = (value: string) => {
    if (rightContent?.onSwitchChange) {
      rightContent.onSwitchChange(value);
    }
  };

  const renderRightContent = () => {
    if (!rightContent) return null;

    if (rightContent.type === "seeAll") {
      return (
        <div
          className={styles["home-header__see-all"]}
          onClick={rightContent.onSeeAllClick}
        >
          <span className="typography-desktop-button-medium">
            {rightContent.seeAllText || "See All"}
          </span>
          <ChevronRight size={16} />
        </div>
      );
    }

    if (rightContent.type === "switch") {
      const switchOptions = rightContent.switchOptions || [];
      const selectedValue =
        rightContent.selectedValue || switchOptions[0]?.value;

      return (
        <div className={styles["home-header__switch-container"]}>
          {switchOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => handleSwitchChange(option.value)}
              className={`${styles["home-header__switch-option"]} ${
                selectedValue === option.value
                  ? styles["home-header__switch-option-active"]
                  : ""
              } typography-desktop-label-medium`}
            >
              {option.label}
            </button>
          ))}
        </div>
      );
    }

    return null;
  };

  return (
    <div
      className={`${styles["home-header"]} ${
        switchBelow ? styles["home-header--switch-below"] : ""
      }`}
    >
      <div className={styles["home-header__content"]}>

        <div className={styles["home-header__text"]}>
          <h2
            className={`${styles["home-header__title"]} ${
              !subtitle ? styles["home-header__title--no-subtitle"] : ""
            } typography-desktop-headline-small`}
          >
            {title}
          </h2>
          {subtitle && (
            <p
              className={`${styles["home-header__subtitle"]} typography-desktop-body-medium`}
            >
              {subtitle}
            </p>
          )}
        </div>
      </div>
      <div className={styles["home-header__right"]}>{renderRightContent()}</div>
    </div>
  );
};

export default HomeHeader;
