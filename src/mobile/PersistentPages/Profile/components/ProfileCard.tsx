import React from "react";
import { BarChart3 } from "lucide-react";
import { useI18n } from "../../../../shared/context/I18nContext";
import styles from "./ProfileCard.module.css";

interface ProfileCardProps {
  type: "statistics" | "peaks";
  onClick: () => void;
  value?: string | number | undefined;
}

const ProfileCard: React.FC<ProfileCardProps> = ({ type, onClick, value }) => {
  const { t } = useI18n();
  const isStatistics = type === "statistics";

  const getDisplayValue = () => {
    if (value !== undefined) {
      return isStatistics ? `` : value.toString();
    }
    return isStatistics ? "NoData" : "NoData";
  };

  return (
    <div className={styles["profile-card"]} onClick={onClick}>
      <div className={styles["profile-card__icon"]}>
        {isStatistics ? (
          <BarChart3 size={24} color="#0f172a" />
        ) : (
          <img
            src="/icons/common/ic_saved.png"
            alt="Saved"
            width={24}
            height={24}
            style={{ filter: "none" }}
          />
        )}
      </div>
      <div
        className={`${styles["profile-card__number"]} typography-title-large`}
      >
        {getDisplayValue()}
      </div>
      <div className={styles["profile-card__content"]}>
        <div
          className={`${styles["profile-card__title"]} typography-title-medium`}
        >
          {isStatistics ? t("profile.statistics") : t("profile.savedPeaks")}
        </div>
        <div
          className={`${styles["profile-card__subtitle"]} typography-body-small`}
        >
          {isStatistics
            ? t("profile.viewAllStats")
            : t("profile.seeAllSavedPeaks")}
        </div>
      </div>
    </div>
  );
};

export default ProfileCard;
