import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./desktop-Infrastructure.module.css";
import { getPeakInfrastructure } from "../../../../shared/api/endpoints/peaks";
import type { InfrastructureData } from "../../../../shared/api/types";
import ShelterIcon from "../../../../shared/components/ShelterIcon/ShelterIcon";
import {
  MapPin,
  Trees,
  Droplets,
  ExternalLink,
  Navigation,
  Map,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import MountainIcon from "../../../../shared/components/MountainIcon/MountainIcon";
import { useI18n } from "../../../../shared/context/I18nContext";
import { useNavigate } from "react-router-dom";
import { useUnitFormat } from "../../../../shared/hooks/useUnitFormat";
import ShimmerWrapper from "../../../desktop-components/desktop-Shimmer/desktop-ShimmerWrapper.tsx";
import {
  usePeakDetailsAnalytics,
  usePeakDetailsView,
} from "../../../../shared/hooks/usePeakDetailsAnalytics";

type InfrastructureProps = {
  peakId: number;
};

const getCategoryIcon = (category: string, isLarge: boolean = false) => {
  const size = isLarge ? 48 : 24;
  switch (category) {
    case "huts":
      return <ShelterIcon size={size} />;
    case "shelters":
      return <ShelterIcon size={size} />;
    case "natural_features":
      return <Trees size={size} />;
    case "drinking_water":
      return <Droplets size={size} />;
    case "other":
      return <MountainIcon size={size} />;
    default:
      return <MapPin size={size} />;
  }
};

const getCategoryLabel = (category: string, t: any) => {
  switch (category) {
    case "huts":
      return t("infrastructure.category.hut");
    case "shelters":
      return t("infrastructure.category.shelter");
    case "natural_features":
      return t("infrastructure.category.naturalFeature");
    case "drinking_water":
      return t("infrastructure.category.waterSource");
    case "other":
      return t("infrastructure.category.other");
    default:
      return category;
  }
};

type InfrastructureListItemProps = {
  item: any;
  category: string;
  distance: number;
  peakCoordinates?: { lat: number; lng: number } | undefined;
  onMapClick: (lat: number, lon: number) => void;
  onShelterClick: (shelterId: number) => void;
  getItemName: (item: any) => string;
  getCategoryLabel: (category: string, t: any) => string;
  getCategoryIcon: (category: string, isLarge: boolean) => React.ReactNode;
  calculateDistance: (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ) => number;
  formatDistance: (distance: number) => string;
  t: any;
  onTrackAction: (
    type: string,
    action: string,
    ...details: Array<string | number | boolean | null | undefined>
  ) => void | Promise<void>;
};

const InfrastructureListItem = React.memo(
  ({
    item,
    category,
    distance,
    peakCoordinates,
    onMapClick,
    onShelterClick,
    getItemName,
    getCategoryLabel,
    getCategoryIcon,
    calculateDistance,
    formatDistance,
    t,
    onTrackAction,
  }: InfrastructureListItemProps) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const handleListItemClick = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        if (item.shelter_id) {
          onTrackAction("shelter_click", "open", item.shelter_id);
          onShelterClick(item.shelter_id);
          return;
        }
        onTrackAction(
          "interaction",
          isExpanded ? "item_collapse" : "item_expand",
          category
        );
        setIsExpanded(!isExpanded);
      },
      [category, isExpanded, item.shelter_id, onShelterClick, onTrackAction]
    );

    const handleChevronClick = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onTrackAction(
          "interaction",
          isExpanded ? "item_collapse" : "item_expand",
          category
        );
        setIsExpanded(!isExpanded);
      },
      [category, isExpanded, onTrackAction]
    );

    const handleMapClick = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onTrackAction("navigation", "open_maps", category);
        onMapClick(item.lat, item.lon);
      },
      [category, item.lat, item.lon, onMapClick, onTrackAction]
    );

    const hasImage = Boolean(item.image && item.image.url);

    const distanceFromPeak = peakCoordinates
      ? calculateDistance(
          peakCoordinates.lat,
          peakCoordinates.lng,
          item.lat,
          item.lon
        )
      : distance;

    return (
      <motion.div
        className={`${styles["infrastructure__list-item"]} ${
          isExpanded ? styles["infrastructure__list-item--expanded"] : ""
        }`}
      >
        {/* Main list item content */}
        <div
          className={styles["infrastructure__list-item-content"]}
          onClick={handleListItemClick}
        >
          {/* Square image on the left */}
          <motion.div
            className={styles["infrastructure__list-item-image"]}
            animate={{
              x: isExpanded ? -100 : 0,
              opacity: isExpanded ? 0 : 1,
            }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            {hasImage ? (
              <img
                src={item.image.url}
                alt={getItemName(item)}
                className={styles["infrastructure__list-item-image-img"]}
              />
            ) : (
              <div
                className={
                  styles["infrastructure__list-item-image-placeholder"]
                }
              >
                {getCategoryIcon(category, true)}
              </div>
            )}
          </motion.div>

          {/* Content on the right */}
          <div className={styles["infrastructure__list-item-info-wrapper"]}>
            <motion.div
              className={styles["infrastructure__list-item-info"]}
              animate={{
                x: isExpanded ? -100 : 0,
                width: isExpanded ? "calc(100% + 110px)" : "100%",
                marginLeft: isExpanded ? "6px" : "0",
              }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              {/* First row: Title */}
              <div
                className={`${styles["infrastructure__list-item-title"]} typography-desktop-body-small`}
              >
                {getItemName(item)}
              </div>

              {/* Second row: Category and distance */}
              <div className={styles["infrastructure__list-item-details"]}>
                <span className={styles["infrastructure__list-item-category"]}>
                  {getCategoryLabel(category, t)}
                </span>
                <div
                  className={`${styles["infrastructure__list-item-distance"]} typography-desktop-label-medium`}
                >
                  <Navigation size={14} />
                  {formatDistance(distance)}
                </div>
              </div>
            </motion.div>
          </div>

          {/* Chevron on the far right */}
          <motion.button
            className={`${styles["infrastructure__list-item-chevron"]} ${
              isExpanded
                ? styles["infrastructure__list-item-chevron--expanded"]
                : ""
            }`}
            onClick={handleChevronClick}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <ChevronDown size={20} />
            </motion.div>
          </motion.button>
        </div>

        {/* Expanded content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              className={styles["infrastructure__list-item-expanded"]}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              {/* Full-width image */}
              <motion.div
                className={styles["infrastructure__list-item-expanded-image"]}
                initial={{ opacity: 0, x: -100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ duration: 0.3, ease: "easeInOut", delay: 0.1 }}
              >
                {hasImage ? (
                  <img
                    src={item.image.url}
                    alt={getItemName(item)}
                    className={
                      styles["infrastructure__list-item-expanded-image-img"]
                    }
                  />
                ) : (
                  <div
                    className={
                      styles[
                        "infrastructure__list-item-expanded-image-placeholder"
                      ]
                    }
                  >
                    {getCategoryIcon(category, true)}
                  </div>
                )}
              </motion.div>

              {/* Expanded details */}
              <motion.div
                className={styles["infrastructure__list-item-expanded-details"]}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.3, ease: "easeInOut", delay: 0.15 }}
              >
                {/* Location section */}
                <div
                  className={styles["infrastructure__list-item-detail-section"]}
                >
                  <h4 className="typography-desktop-body-small">
                    {t("infrastructure.location")}
                  </h4>
                  <div className={styles["infrastructure__list-item-coords"]}>
                    <span className="typography-desktop-label-medium">
                      {item.lat.toFixed(6)}, {item.lon.toFixed(6)}
                    </span>
                    <button
                      className={`${styles["infrastructure__list-item-map-btn"]} typography-desktop-button-small`}
                      onClick={handleMapClick}
                    >
                      <Map size={16} />
                      {t("infrastructure.viewInMaps")}
                    </button>
                  </div>
                  <div
                    className={`${styles["infrastructure__list-item-distance-detail"]} typography-desktop-label-medium`}
                  >
                    <Navigation size={14} />
                    {formatDistance(distanceFromPeak)}{" "}
                    {t("infrastructure.kmFromPeak")}
                  </div>
                </div>

                {/* Tags section */}
                {item.tags && Object.keys(item.tags).length > 0 && (
                  <div
                    className={
                      styles["infrastructure__list-item-detail-section"]
                    }
                  >
                    <h4 className="typography-desktop-body-small">
                      {t("infrastructure.details")}
                    </h4>
                    <div className={styles["infrastructure__list-item-tags"]}>
                      {Object.entries(item.tags).map(([key, value]) => (
                        <div
                          key={key}
                          className={styles["infrastructure__list-item-tag"]}
                        >
                          <span
                            className={`${styles["infrastructure__list-item-tag-key"]} typography-desktop-label-small`}
                          >
                            {key
                              .replace(/_/g, " ")
                              .replace(/\b\w/g, (l) => l.toUpperCase())}
                            :
                          </span>
                          <span
                            className={`${styles["infrastructure__list-item-tag-value"]} typography-desktop-label-medium`}
                          >
                            {String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Website section */}
                {item.tags?.website && (
                  <div
                    className={
                      styles["infrastructure__list-item-detail-section"]
                    }
                  >
                    <a
                      href={item.tags.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`${styles["infrastructure__list-item-website"]} typography-desktop-button-small`}
                      onClick={() =>
                        onTrackAction("navigation", "open_website", category)
                      }
                    >
                      <ExternalLink size={16} />
                      {t("infrastructure.visitWebsite")}
                    </a>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }
);

InfrastructureListItem.displayName = "InfrastructureListItem";

const Infrastructure: React.FC<InfrastructureProps> = ({ peakId }) => {
  const { t } = useI18n();
  const { formatDistance } = useUnitFormat();
  const { trackSectionEvent } = usePeakDetailsAnalytics(
    "desktop",
    "infrastructure",
    peakId
  );
  const navigate = useNavigate();
  const [infrastructure, setInfrastructure] =
    useState<InfrastructureData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAllItems, setShowAllItems] = useState(false);

  useEffect(() => {
    if (!peakId) return;

    getPeakInfrastructure(peakId, 5000)
      .then((data) => {
        setInfrastructure(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [peakId]);

  const INITIAL_ITEMS_SHOWN = 4;

  const hasData = Boolean(
    infrastructure?.infrastructure &&
      Object.keys(infrastructure.infrastructure).length > 0
  );
  usePeakDetailsView("desktop", "infrastructure", hasData, peakId);

  const categories = infrastructure?.infrastructure || {};
  const allItems: Array<{ item: any; category: string }> = [];

  // Flatten all items from all categories
  Object.keys(categories).forEach((cat) => {
    const items = categories[cat as keyof typeof categories] as any[];
    if (Array.isArray(items)) {
      items.forEach((item: any) => {
        allItems.push({ item, category: cat });
      });
    }
  });

  // Don't render anything if there's no data or no items
  if (!loading && (!hasData || allItems.length === 0)) {
    return null;
  }

  const getItemName = (item: any) => {
    return (
      item.tags?.name || item.tags?.tourism || item.tags?.amenity || "Unnamed"
    );
  };

  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ) => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const openGoogleMaps = (lat: number, lon: number) => {
    trackSectionEvent("navigation", "open_maps");
    const url = `https://www.google.com/maps?q=${lat},${lon}`;
    window.open(url, "_blank");
  };

  const handleShelterClick = (shelterId: number) => {
    navigate(`/shelters/${shelterId}`);
  };

  const displayedItems = showAllItems
    ? allItems
    : allItems.slice(0, INITIAL_ITEMS_SHOWN);

  const hasMoreItems = allItems.length > INITIAL_ITEMS_SHOWN;

  return (
    <ShimmerWrapper isLoading={loading} hasData={hasData}>
      <section className={styles["infrastructure"]}>
        <div className={styles["infrastructure__header"]}>
          <h3
            className={`${styles["infrastructure__title"]} typography-desktop-title-small`}
          >
            <MapPin className={styles["infrastructure__icon"]} />
            {t("infrastructure.nearbyInfrastructure")}
          </h3>
        </div>
        {allItems.length > 0 && (
          <div className={styles["infrastructure__list-container"]}>
            <div className={styles["infrastructure__list"]}>
              {displayedItems.map(({ item, category }, idx) => {
                const distance = calculateDistance(
                  infrastructure?.coordinates?.lat || 0,
                  infrastructure?.coordinates?.lng || 0,
                  item.lat,
                  item.lon
                );
                return (
                  <InfrastructureListItem
                    key={`${category}-${idx}`}
                    item={item}
                    category={category}
                    distance={distance}
                    peakCoordinates={
                      infrastructure?.coordinates
                        ? {
                            lat: infrastructure.coordinates.lat,
                            lng: infrastructure.coordinates.lng,
                          }
                        : undefined
                    }
                    onMapClick={openGoogleMaps}
                    onShelterClick={handleShelterClick}
                    getItemName={getItemName}
                    getCategoryLabel={getCategoryLabel}
                    getCategoryIcon={getCategoryIcon}
                    calculateDistance={calculateDistance}
                    formatDistance={formatDistance}
                    t={t}
                    onTrackAction={trackSectionEvent}
                  />
                );
              })}
            </div>
            {hasMoreItems && (
              <button
                className={`${styles["infrastructure__expand-button"]} typography-desktop-body-small`}
                onClick={() => {
                  trackSectionEvent(
                    "interaction",
                    showAllItems ? "see_all_collapse" : "see_all_expand"
                  );
                  setShowAllItems(!showAllItems);
                }}
              >
                {showAllItems ? (
                  <>
                    {t("common.showLess")}
                    <ChevronUp size={16} />
                  </>
                ) : (
                  <>
                    {t("communityInfo.seeMore")} (
                    {allItems.length - INITIAL_ITEMS_SHOWN}{" "}
                    {t("communityInfo.more")})
                    <ChevronDown size={16} />
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </section>
    </ShimmerWrapper>
  );
};

export default Infrastructure;
