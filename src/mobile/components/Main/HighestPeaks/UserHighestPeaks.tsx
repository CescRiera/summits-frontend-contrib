import React, { useEffect, useState } from "react";
import { Trophy, Crown, Medal, ChevronRight, TrendingUp } from "lucide-react";
import MountainIcon from "../../../../shared/components/MountainIcon/MountainIcon";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "../../../../shared/context/I18nContext";
import { useNavigate } from "react-router-dom";
import HomeHeader from "../HomeHeader/HomeHeader";
import styles from "./UserHighestPeaks.module.css";
import { getLocationFromHierarchy } from "../../../../shared/utils/adminHierarchy";
import type { AdminHierarchy } from "../../../../shared/api/types/common";
import { useUnitFormat } from "../../../../shared/hooks/useUnitFormat";

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
  const [animatedCards, setAnimatedCards] = useState<Set<number>>(new Set());
  const [isOtherPeaksExpanded, setIsOtherPeaksExpanded] = useState(false);
  const [heroImgError, setHeroImgError] = useState(false);
  const [miniImgErrors, setMiniImgErrors] = useState<Set<string>>(new Set());
  const { t } = useI18n();
  const navigate = useNavigate();
  const { formatMetersValue, unitSystem } = useUnitFormat();

  // Sort peaks by elevation in descending order (highest first) to ensure consistent sorting
  const sortedPeaks = React.useMemo(() => {
    return [...peaks].sort((a, b) => b.elevation - a.elevation);
  }, [peaks]);

  useEffect(() => {
    if (sortedPeaks.length > 0 && !loading) {
      sortedPeaks.forEach((_, index) => {
        setTimeout(() => {
          setAnimatedCards((prev) => new Set([...prev, index]));
        }, index * 100);
      });
    }
  }, [sortedPeaks, loading]);

  const toggleOtherPeaks = () => {
    setIsOtherPeaksExpanded(!isOtherPeaksExpanded);
  };

  const handlePeakClick = (peak: HighestPeak) => {
    if (onPeakPress) {
      onPeakPress(peak);
    } else {
      navigate(`/peaks/${peak.id}`);
    }
  };

  if (loading) {
    return (
      <div className={styles["userPeaksSection"]}>
        <div className={styles["highest-peaks__skeleton-container"]}>
          <div className={styles["highest-peaks__skeleton-card"]}>
            <div className={styles["highest-peaks__skeleton-image"]} />
            <div className={styles["highest-peaks__skeleton-content"]}>
              <div className={styles["highest-peaks__skeleton-badge"]} />
              <div className={styles["highest-peaks__skeleton-row"]}>
                <div className={styles["highest-peaks__skeleton-elevation"]} />
                <div>
                  <div className={styles["highest-peaks__skeleton-name"]} />
                  <div
                    className={styles["highest-peaks__skeleton-location"]}
                    style={{ marginTop: 6 }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles["userPeaksSection"]}>
        <div className={`${styles["errorContainer"]} typography-body-small`}>
          <MountainIcon size={24} color="rgb(71, 85, 105)" />
          <p className="typography-body-medium">{error}</p>
        </div>
      </div>
    );
  }

  if (peaks.length === 0) {
    return (
      <div className={styles["userPeaksSection"]}>
        <div className={styles["emptyContainer"]}>
          <div className={styles["emptyIcon"]}>
            <MountainIcon size={32} color="rgb(71, 85, 105)" />
            <Trophy
              size={16}
              className={styles["floatingTrophy"]}
              color="#c2cf94"
            />
          </div>
          <h3 className="typography-title-medium">
            {t("highestPeaks.emptyTitle")}
          </h3>
          <p className="typography-body-medium">
            {t("highestPeaks.emptySubtitle")}
          </p>
        </div>
      </div>
    );
  }

  const topPeak = sortedPeaks[0];

  return (
    <div className={styles["userPeaksSection"]}>
      <HomeHeader
        title={t("highestPeaks.yourRecords")}
        subtitle={t("highestPeaks.personalClimbingAchievements")}
        rightContent={{
          type: "seeAll",
          onSeeAllClick: () => navigate("/userpeaks"),
          seeAllText: t("highestPeaks.seeAll"),
        }}
      />

      {/* Hero Peak Card */}
      <div className={styles["heroPeakCardContainer"]}>
        <div
          className={`${styles["heroPeakCard"]} ${
            animatedCards.has(0) ? styles["animateIn"] : ""
          }`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (topPeak) handlePeakClick(topPeak);
          }}
        >
          <div className={styles["heroImageContainer"]}>
            {topPeak?.image_url && !heroImgError ? (
              <img
                src={topPeak.image_url}
                alt={topPeak.name || ""}
                className={styles["heroImage"]}
                loading="lazy"
                onError={() => setHeroImgError(true)}
              />
            ) : (
              <div className={styles["heroIconBg"]}>
                <MountainIcon size={64} />
              </div>
            )}
            <div className={styles["heroOverlay"]}></div>
          </div>

          <div className={styles["heroContent"]}>
            <div className={styles["crownBadge"]}>
              <Crown size={16} />
              <span className="typography-label-medium">
                {t("highestPeaks.highestPeak")}
              </span>
            </div>
            <div className={styles["heroAscentCount"]}>
              <TrendingUp size={14} />
              <span className="typography-label-medium">
                {topPeak?.count || 1}{" "}
                {topPeak?.count !== 1
                  ? t("highestPeaks.ascents")
                  : t("highestPeaks.ascent")}
              </span>
            </div>

            <div className={styles["heroInfo"]}>
              <div className={styles["elevationDisplay"]}>
                <span
                  className={`${styles["elevationNumber"]} typography-headline-large`}
                >
                  {formatMetersValue(topPeak?.elevation)}
                </span>
                <span
                  className={`${styles["elevationUnit"]} typography-title-medium`}
                >
                  {unitSystem === "imperial" ? "ft" : "m"}
                </span>
              </div>

              <div className={styles["peakDetails"]}>
                <h3 className="typography-title-large">
                  {topPeak?.name_en || topPeak?.name || ""}
                </h3>
                {topPeak?.name_en && topPeak?.name !== topPeak?.name_en && (
                  <p
                    className={`${styles["nativeName"]} typography-title-medium`}
                  >
                    {topPeak?.name}
                  </p>
                )}
                <div className={styles["location"]}>
                  <div className={`${styles["region"]} typography-body-small`}>
                    {getLocationFromHierarchy(topPeak?.admin_hierarchy)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Other Peaks */}
        {sortedPeaks.length > 1 && (
          <div className={styles["otherPeaks"]}>
            <div
              className={styles["otherPeaksHeader"]}
              onClick={toggleOtherPeaks}
            >
              <div className={styles["headerContent"]}>
                <Medal size={20} color="rgb(0, 0, 0)" />
                <span className="typography-title-medium">
                  {t("highestPeaks.otherAchievements")}
                </span>
              </div>
              <div className={styles["chevronContainer"]}>
                <ChevronRight
                  size={16}
                  color="rgb(0, 0, 0)"
                  className={`${styles["chevron"]} ${
                    isOtherPeaksExpanded ? styles["expanded"] : ""
                  }`}
                />
              </div>
            </div>
            <AnimatePresence>
              {isOtherPeaksExpanded && (
                <motion.div
                  className={styles["peaksList"]}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{
                    opacity: 1,
                    height: "auto",
                    transition: {
                      height: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
                      opacity: { duration: 0.25, delay: 0.08 },
                    },
                  }}
                  exit={{
                    opacity: 0,
                    height: 0,
                    transition: {
                      opacity: { duration: 0.15, ease: "easeIn" },
                      height: {
                        duration: 0.3,
                        ease: [0.4, 0, 0.2, 1],
                        delay: 0.12,
                      },
                    },
                  }}
                  style={{ overflow: "hidden" }}
                >
                  {sortedPeaks.slice(1).map((peak) => (
                    <div
                      key={peak.id}
                      className={styles["miniPeakCard"]}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handlePeakClick(peak);
                      }}
                    >
                      <div className={styles["miniImage"]}>
                        {peak.image_url && !miniImgErrors.has(peak.id) ? (
                          <img
                            src={peak.image_url}
                            alt={peak.name}
                            loading="lazy"
                            onError={() =>
                              setMiniImgErrors(
                                (prev) =>
                                  new Set([...Array.from(prev), peak.id])
                              )
                            }
                          />
                        ) : (
                          <div className={styles["miniIconBg"]}>
                            <MountainIcon size={32} />
                          </div>
                        )}
                      </div>
                      <div className={styles["miniOverlay"]}></div>
                      <div className={styles["miniContent"]}>
                        <div className={styles["miniHeader"]}>
                          <div
                            className={`${styles["miniElevation"]} typography-title-medium`}
                          >
                            {formatMetersValue(peak.elevation)}
                            <span
                              className={`${styles["miniElevationUnit"]} typography-body-small`}
                            >
                              {unitSystem === "imperial" ? "ft" : "m"}
                            </span>
                          </div>
                          <div className={styles["ascentCount"]}>
                            <span className="typography-label-small">
                              {peak.count || 1}{" "}
                              {peak.count !== 1
                                ? t("highestPeaks.ascents")
                                : t("highestPeaks.ascent")}
                            </span>
                          </div>
                        </div>
                        <h4 className="typography-title-small">
                          {peak.name_en || peak.name}
                        </h4>
                        <div className={styles["miniLocation"]}>
                          <span
                            className={`${styles["miniRegion"]} typography-body-small`}
                          >
                            {getLocationFromHierarchy(peak.admin_hierarchy)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserHighestPeaks;
