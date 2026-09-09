import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useI18n } from "../../../../shared/context/I18nContext";
import { togglePrivacy } from "../../../../shared/api/endpoints/follows";
import styles from "./PrivacyToggle.module.css";

import { useAnalytics } from "../../../../shared/context/AnalyticsContext";

interface PrivacyToggleProps {
  isPrivate: boolean;
  onPrivacyChange: (isPrivate: boolean) => void;
}

const PrivacyToggle: React.FC<PrivacyToggleProps> = ({
  isPrivate,
  onPrivacyChange,
}) => {
  const { t } = useI18n();
  const { trackEvent } = useAnalytics();
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async () => {
    try {
      setIsLoading(true);
      trackEvent("button_click", "profile_menu_privacy_toggle");
      const response = await togglePrivacy();
      onPrivacyChange(response.is_private);
    } catch (error) {
      console.error("Failed to toggle privacy:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      className={styles["privacy-toggle"]}
      onClick={handleToggle}
      disabled={isLoading}
    >
      <div className={styles["privacy-toggle__icon"]}>
        {isPrivate ? <EyeOff size={20} /> : <Eye size={20} />}
      </div>
      <span
        className={`${styles["privacy-toggle__label"]} typography-label-large`}
      >
        {t("profile.privacy.profileStatus")}
      </span>
      <span
        className={`${styles["privacy-toggle__status"]} ${
          isPrivate
            ? styles["privacy-toggle__status--private"]
            : styles["privacy-toggle__status--public"]
        }`}
      >
        {isPrivate ? t("profile.privacy.private") : t("profile.privacy.public")}
      </span>
    </button>
  );
};

export default PrivacyToggle;
