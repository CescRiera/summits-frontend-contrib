import React, { useState } from "react";
import { Trophy, Crown, TrendingUp } from "lucide-react";
import MountainIcon from "../../../../shared/components/MountainIcon/MountainIcon";
import { useI18n } from "../../../../shared/context/I18nContext";
import { useNavigate } from "react-router-dom";
import HomeHeader from "../desktop-HomeHeader/desktop-HomeHeader.tsx";
import { removeImageSizeRestriction } from "../../../../shared/utils/imageUtils";
import { getLocationFromHierarchy } from "../../../../shared/utils/adminHierarchy";
import type { AdminHierarchy } from "../../../../shared/api/types/common";
import { useUnitFormat } from "../../../../shared/hooks/useUnitFormat";
import styles from "./desktop-UserHighestPeaks.module.css";

interface HighestPeak {
  id: string;
  elevation: number;
  name: string;
  name_en?: string;
  admin_hierarchy?: AdminHierarchy;
  image_url?: string;
  count?: number;
}

interface UserHighestPeaksProps {
  peaks: HighestPeak[];
  loading?: boolean;
  error?: string | null;
  onPeakPress?: (peak: HighestPeak) => void;
}

const UserHighestPeaks: React.FC<UserHighestPeaksProps> = ({
  peaks,
  loading = false,
  error = null,
  onPeakPress,
}) => {
  const [heroImgError, setHeroImgError] = useState(false);
  const [miniImgErrors, setMiniImgErrors] = useState<Set<string>>(new Set());
  const { t } = useI18n();
  const navigate = useNavigate();
  const { formatMetersValue, unitSystem } = useUnitFormat();

  const handlePeakClick = (peak: HighestPeak) => {
    if (onPeakPress) {
      onPeakPress(peak);
    } else {
      navigate(`/peaks/${peak.id}`);
    }
  };

  // Get mountain icon based on elevation (same logic as RecentPeaks)
  const getMountainIcon = (elevation: number): string => {
    if (elevation >= 8000) return "/icons/altitude/ic_mountain_black.png";
    if (elevation >= 6000) return "/icons/altitude/ic_mountain_burgundy.png";
    if (elevation >= 4000) return "/icons/altitude/ic_mountain_red.png";
    if (elevation >= 3000) return "/icons/altitude/ic_mountain_orange.png";
    if (elevation >= 2000) return "/icons/altitude/ic_mountain_yellow.png";
    if (elevation >= 1000) return "/icons/altitude/ic_mountain_green.png";
    return "/icons/altitude/ic_mountain_green.png";
  };



  if (loading) {
    return (
      <div
        className={`${styles["user-highest-peaks__section"]} ${styles["user-highest-peaks__section--loading"]}`}
      >
        <div className={styles["user-highest-peaks__skeleton-featured"]}>
          <div className={styles["user-highest-peaks__skeleton-image"]} />
          <div className={styles["user-highest-peaks__skeleton-content"]}>
            <div className={styles["user-highest-peaks__skeleton-badge"]} />
            <div className={styles["user-highest-peaks__skeleton-elevation"]} />
            <div className={styles["user-highest-peaks__skeleton-name"]} />
            <div className={styles["user-highest-peaks__skeleton-location"]} />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles["user-highest-peaks__section"]}>
        <div
          className={`${styles["user-highest-peaks__state"]} typography-desktop-label-medium`}
        >
          <MountainIcon size={24} color="rgb(71, 85, 105)" />
          <p className="typography-desktop-body-small">{error}</p>
        </div>
      </div>
    );
  }

  if (peaks.length === 0) {
    return (
      <div className={styles["user-highest-peaks__section"]}>
        <div className={styles["user-highest-peaks__state"]}>
          <div className={styles["user-highest-peaks__empty-icon"]}>
            <MountainIcon size={32} color="rgb(71, 85, 105)" />
            <Trophy
              size={16}
              className={styles["user-highest-peaks__empty-trophy"]}
              color="#c2cf94"
            />
          </div>
          <h3 className="typography-desktop-body-small">
            {t("highestPeaks.emptyTitle")}
          </h3>
          <p className="typography-desktop-body-small">
            {t("highestPeaks.emptySubtitle")}
          </p>
        </div>
      </div>
    );
  }

  // Sort peaks by elevation in descending order (highest first) to ensure consistent sorting
  const sortedPeaks = [...peaks].sort((a, b) => b.elevation - a.elevation);
  const featuredPeak = sortedPeaks.length > 0 ? sortedPeaks[0] : null;
  const otherPeaks = sortedPeaks.length > 1 ? sortedPeaks.slice(1) : [];

  return (
    <div className={styles["user-highest-peaks__section"]}>
      <HomeHeader
        title={t("highestPeaks.yourRecords")}
        subtitle={t("highestPeaks.personalClimbingAchievements")}
        rightContent={{
          type: "seeAll",
          onSeeAllClick: () => navigate("/userpeaks"),
          seeAllText: t("highestPeaks.seeAll"),
        }}
      />

      {featuredPeak && (
        <div
          className={styles["user-highest-peaks__featured"]}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handlePeakClick(featuredPeak);
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ")
              handlePeakClick(featuredPeak);
          }}
        >
          <div className={styles["user-highest-peaks__featured-image"]}>
            {featuredPeak?.image_url && !heroImgError ? (
              <img
                src={removeImageSizeRestriction(featuredPeak.image_url) || ""}
                alt={featuredPeak.name || ""}
                onError={() => setHeroImgError(true)}
              />
            ) : (
              <div className={styles["user-highest-peaks__featured-icon-bg"]}>
                <MountainIcon size={64} />
              </div>
            )}
            <div
              className={styles["user-highest-peaks__featured-overlay"]}
            ></div>
            <div
              className={`${styles["user-highest-peaks__featured-badge"]} typography-desktop-label-medium`}
            >
              <Crown size={18} />
              <span className="typography-desktop-label-medium">
                {t("highestPeaks.highestPeak")}
              </span>
            </div>
            <div
              className={`${styles["user-highest-peaks__featured-ascent"]} typography-desktop-label-medium`}
            >
              <TrendingUp size={14} />
              <span className="typography-desktop-label-medium">
                {featuredPeak?.count || 1}{" "}
                {featuredPeak?.count !== 1
                  ? t("highestPeaks.ascents")
                  : t("highestPeaks.ascent")}
              </span>
            </div>
          </div>

          <div className={styles["user-highest-peaks__featured-meta"]}>
            <div className={styles["user-highest-peaks__featured-elevation"]}>
              <span className="typography-desktop-display-xxl">
                {formatMetersValue(featuredPeak?.elevation)}
              </span>
              <span className="typography-desktop-body-small">
                {unitSystem === "imperial" ? "ft" : "m"}
              </span>
            </div>

            <div className={styles["user-highest-peaks__featured-name"]}>
              <h3 className="typography-desktop-headline-small">
                {featuredPeak?.name_en || featuredPeak?.name || ""}
              </h3>
              {featuredPeak?.name_en &&
                featuredPeak?.name !== featuredPeak?.name_en && (
                  <p className="typography-desktop-body-small">
                    {featuredPeak?.name}
                  </p>
                )}
            </div>

            <div className={styles["user-highest-peaks__featured-location"]}>
              <span className="typography-desktop-label-medium">
                {getLocationFromHierarchy(featuredPeak?.admin_hierarchy)}
              </span>
            </div>
          </div>
        </div>
      )}

      {otherPeaks.length > 0 && (
        <div className={styles["user-highest-peaks__list"]}>
          {otherPeaks.map((peak) => (
            <div
              key={peak.id}
              className={`${styles["user-highest-peaks__card"]} ${styles["user-highest-peaks__card--compact"]}`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handlePeakClick(peak);
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") handlePeakClick(peak);
              }}
            >
              <div className={styles["user-highest-peaks__card-image"]}>
                {peak.image_url && !miniImgErrors.has(peak.id) ? (
                  <img
                    src={removeImageSizeRestriction(peak.image_url) || ""}
                    alt={peak.name}
                    onError={() =>
                      setMiniImgErrors(
                        (prev) => new Set([...Array.from(prev), peak.id])
                      )
                    }
                  />
                ) : (
                  <div className={styles["user-highest-peaks__card-icon-bg"]}>
                    <MountainIcon size={32} />
                  </div>
                )}
                <div
                  className={styles["user-highest-peaks__card-overlay"]}
                ></div>
              </div>

              <div className={styles["user-highest-peaks__card-meta"]}>
                <div className={styles["user-highest-peaks__card-stats"]}>
                  <div className={styles["user-highest-peaks__card-elevation"]}>
                    <img
                      src={getMountainIcon(peak.elevation)}
                      alt="Mountain icon"
                      className={
                        styles["user-highest-peaks__card-elevation-icon"]
                      }
                    />
                    <span className="typography-desktop-label-large">
                      {formatMetersValue(peak.elevation)}
                    </span>
                    <span className="typography-desktop-body-small">
                      {unitSystem === "imperial" ? "ft" : "m"}
                    </span>
                  </div>
                  <div
                    className={`${styles["user-highest-peaks__card-ascent"]} typography-button-small`}
                  >
                    <TrendingUp size={12} />
                    <span className="typography-desktop-label-medium">
                      {peak.count || 1}{" "}
                      {peak.count !== 1
                        ? t("highestPeaks.ascents")
                        : t("highestPeaks.ascent")}
                    </span>
                  </div>
                </div>
                <div className={styles["user-highest-peaks__card-text"]}>
                  <h4 className="typography-desktop-body-medium">
                    {peak.name_en || peak.name}
                  </h4>
                  <div className={styles["user-highest-peaks__card-location"]}>
                    <span className="typography-desktop-label-medium">
                      {getLocationFromHierarchy(peak.admin_hierarchy)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserHighestPeaks;
