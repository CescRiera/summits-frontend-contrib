import React, { useState, useEffect, useCallback } from "react";
import { Users } from "lucide-react";
import MountainIcon from "../../../../shared/components/MountainIcon/MountainIcon";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../../shared/context/AuthContext";
import {
  getRecentCommunityPeaks,
  getRecentFollowingPeaks,
  getRecentUserPeaks,
} from "../../../../shared/api/endpoints/user";
import { getElevationColor, getElevationSoftColor } from "../../../../shared/constants/elevationColors";
import { removeImageSizeRestriction } from "../../../../shared/utils/imageUtils";
import { getLocationFromHierarchy } from "../../../../shared/utils/adminHierarchy";
import type { RecentCommunityPeak, RecentFollowingPeak } from "../../../../shared/api/types/user";
import { useUnitFormat } from "../../../../shared/hooks/useUnitFormat";
import styles from "./desktop-RecentPeaks.module.css";


interface RecentPeaksProps {
  onPeakPress?: (peak: RecentCommunityPeak | RecentFollowingPeak) => void;
  refreshTrigger?: number;
  filterMode: "community" | "following" | "user";
}

const RecentPeaks: React.FC<RecentPeaksProps> = ({
  onPeakPress,
  refreshTrigger,
  filterMode,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [imgErrors, setImgErrors] = useState<Set<number>>(new Set());
  const [avatarErrors, setAvatarErrors] = useState<Set<number>>(new Set());
  const [peaks, setPeaks] = useState<
    (RecentCommunityPeak | RecentFollowingPeak)[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { formatMeters } = useUnitFormat();

  // Fetch data based on current mode
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (filterMode === "community") {
        const response = await getRecentCommunityPeaks();
        setPeaks(response.peaks || []);
      } else if (filterMode === "following") {
        const response = await getRecentFollowingPeaks();
        setPeaks(response.peaks || []);
      } else if (filterMode === "user") {
        const response = await getRecentUserPeaks();
        setPeaks(response.peaks || []);
      }
    } catch (err) {
      console.error("Error fetching peaks:", err);
      setError("Failed to load peaks");
    } finally {
      setLoading(false);
    }
  }, [filterMode]);

  // Fetch data when mode changes
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fetch data when refresh trigger changes
  useEffect(() => {
    if (refreshTrigger !== undefined) {
      fetchData();
    }
  }, [refreshTrigger, fetchData]);

  // Get mountain icon based on elevation (same logic as MapPopup)
  const getMountainIcon = (elevation: number): string => {
    if (elevation >= 8000) return "/icons/altitude/ic_mountain_black.png";
    if (elevation >= 6000) return "/icons/altitude/ic_mountain_burgundy.png";
    if (elevation >= 4000) return "/icons/altitude/ic_mountain_red.png";
    if (elevation >= 3000) return "/icons/altitude/ic_mountain_orange.png";
    if (elevation >= 2000) return "/icons/altitude/ic_mountain_yellow.png";
    if (elevation >= 1000) return "/icons/altitude/ic_mountain_green.png";
    return "/icons/altitude/ic_mountain_green.png";
  };

  const getPeakPlaceholderImage = (elevation: number): string => {
    if (elevation >= 8000) return "/images/peak_placeholder/black.jpg";
    if (elevation >= 6000) return "/images/peak_placeholder/burgundy.jpg";
    if (elevation >= 4000) return "/images/peak_placeholder/red.jpg";
    if (elevation >= 3000) return "/images/peak_placeholder/orange.jpg";
    if (elevation >= 2000) return "/images/peak_placeholder/yellow.jpg";
    return "/images/peak_placeholder/green.jpg";
  };

  // Handle user badge click navigation
  const handleUserBadgeClick = (userId: number, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent peak card click
    // Check if user is trying to view their own profile
    if (user && user.internalUserId === userId) {
      navigate("/profile");
    } else {
      navigate(`/externalprofile/${userId}`);
    }
  };

  if (error) {
    return (
      <div className={styles["recent-peaks"]}>
        <div
          className={`${styles["recent-peaks__error"]} typography-desktop-label-medium`}
        >
          <MountainIcon size={24} color="rgb(71, 85, 105)" />
          <p className="typography-desktop-body-small">{error}</p>
        </div>
      </div>
    );
  }

  const handlePeakClick = (peak: RecentCommunityPeak | RecentFollowingPeak) => {
    if (onPeakPress) {
      onPeakPress(peak);
    } else {
      // Navigate to the peak details page
      navigate(`/peaks/${peak.id}`);
    }
  };

  if (peaks.length === 0) {
    return (
      <div className={styles["recent-peaks"]}>
        <div className={styles["recent-peaks__empty"]}>
          <div className={styles["recent-peaks__empty-icon"]}>
            <MountainIcon size={32} color="rgb(71, 85, 105)" />
            <Users
              size={16}
              className={styles["recent-peaks__floating-icon"]}
              color="#c2cf94"
            />
          </div>
          <h3 className="typography-desktop-body-small">No Recent Activity</h3>
          <p className="typography-desktop-body-small">
            Check back later for recent peak completions!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles["recent-peaks"]}>
      <div className={styles["recent-peaks__container"]}>
        <div className={styles["recent-peaks__grid"]}>
          {peaks.length === 0 && !loading ? (
            <div className={styles["recent-peaks__empty"]}>
              <div className={styles["recent-peaks__empty-icon"]}>
                <MountainIcon size={32} color="rgb(71, 85, 105)" />
                <Users
                  size={16}
                  className={styles["recent-peaks__floating-icon"]}
                  color="#c2cf94"
                />
              </div>
              <h3 className="typography-desktop-body-small">
                No Recent Activity
              </h3>
              <p className="typography-desktop-body-small">
                Check back later for recent peak completions!
              </p>
            </div>
          ) : (
            <>
              {peaks.map((peak) => (
                <div
                  key={peak.id}
                  className={styles["recent-peaks__card"]}
                  onClick={() => handlePeakClick(peak)}
                >
                  {/* Peak Image */}
                  <div
                    className={`${styles["recent-peaks__image-section"]} ${
                      !peak.image || imgErrors.has(peak.id)
                        ? styles["recent-peaks__image-section--placeholder"]
                        : ""
                    }`}
                    style={
                      !peak.image || imgErrors.has(peak.id)
                        ? { backgroundColor: getElevationSoftColor(peak.elevation) }
                        : {}
                    }
                  >
                    {peak.image && !imgErrors.has(peak.id) ? (
                      <img
                        src={removeImageSizeRestriction(peak.image) || ""}
                        alt={peak.name}
                        className={styles["recent-peaks__image"]}
                        onError={() =>
                          setImgErrors(
                            (prev) => new Set([...Array.from(prev), peak.id])
                          )
                        }
                      />
                    ) : (
                      <img
                        src={getPeakPlaceholderImage(peak.elevation)}
                        alt={peak.name}
                        className={styles["recent-peaks__image--placeholder"]}
                      />
                    )}

                    {/* User Badge */}
                    <div
                      className={styles["recent-peaks__user-badge"]}
                      onClick={(e) => handleUserBadgeClick(peak.user.id, e)}
                    >
                      {peak.user.image && !avatarErrors.has(peak.user.id) ? (
                        <img
                          src={peak.user.image}
                          alt={peak.user.name}
                          className={styles["recent-peaks__user-avatar"]}
                          onError={() =>
                            setAvatarErrors(
                              (prev) =>
                                new Set([...Array.from(prev), peak.user.id])
                            )
                          }
                        />
                      ) : (
                        <div
                          className={`${styles["recent-peaks__user-avatar-placeholder"]} typography-button-small`}
                        >
                          {peak.user.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span
                        className={`${styles["recent-peaks__user-name"]} typography-desktop-label-medium`}
                      >
                        {peak.user.name}
                      </span>
                    </div>

                    {/* Date Badge */}
                    <div className={styles["recent-peaks__date-badge"]}>
                      <span className="typography-desktop-label-medium">
                        {new Date(peak.most_recent_date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Peak Info */}
                  <div className={styles["recent-peaks__info"]}>
                    {/* Row 1: Name (left) | Elevation (right) */}
                    <div className={styles["recent-peaks__row"]}>
                      <h3
                        className={`${styles["recent-peaks__name"]} typography-desktop-body-small`}
                      >
                        {peak.name_en || peak.name}
                      </h3>
                      <div
                        className={styles["recent-peaks__elevation-container"]}
                      >
                        <img
                          src={getMountainIcon(peak.elevation)}
                          alt="Mountain icon"
                          className={styles["recent-peaks__elevation-icon"]}
                        />
                        <span
                          className={`${styles["recent-peaks__elevation-text"]} typography-desktop-label-medium`}
                          style={{ color: getElevationColor(peak.elevation) }}
                        >
                          {formatMeters(peak.elevation)}
                        </span>
                      </div>
                    </div>
                    {/* Row 2: Region, Country */}
                    <div className={styles["recent-peaks__row"]}>
                      <span
                        className={`${styles["recent-peaks__location-text"]} typography-desktop-label-medium`}
                      >
                        {getLocationFromHierarchy(peak.admin_hierarchy)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Shimmer skeleton loading */}
          {loading && (
            <div className={styles["recent-peaks__loading-overlay"]}>
              {[0, 1, 2].map((i) => (
                <div key={i} className={styles["recent-peaks__skeleton-card"]}>
                  <div className={styles["recent-peaks__skeleton-image"]} />
                  <div className={styles["recent-peaks__skeleton-info"]}>
                    <div className={styles["recent-peaks__skeleton-title"]} />
                    <div className={styles["recent-peaks__skeleton-subtitle"]} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecentPeaks;
