import React, { useState, useEffect, useRef } from "react";
import styles from "./desktop-InfrastructureMap.module.css";
import { getPeakInfrastructure } from "../../../../../shared/api/endpoints/peaks";
import type { InfrastructureData } from "../../../../../shared/api/types";
import ShelterIcon from "../../../../../shared/components/ShelterIcon/ShelterIcon";
import {
  MapPin,
  Trees,
  Droplets,
  ExternalLink,
  Navigation,
  X,
  Map,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import MountainIcon from "../../../../../shared/components/MountainIcon/MountainIcon";
import { useI18n } from "../../../../../shared/context/I18nContext";
import AppModal from "../../../../../shared/components/AppModal";
import { useNavigate } from "react-router-dom";
import { useUnitFormat } from "../../../../../shared/hooks/useUnitFormat";
import { smoothScrollHorizontal } from "../../../../desktop-utils/desktop-smoothScroll";
import {
  usePeakDetailsAnalytics,
  usePeakDetailsView,
} from "../../../../../shared/hooks/usePeakDetailsAnalytics";

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

const InfrastructureMap: React.FC<InfrastructureProps> = ({ peakId }) => {
  const { formatDistance } = useUnitFormat();
  const { t } = useI18n();
  const { trackSectionEvent } = usePeakDetailsAnalytics(
    "desktop_map",
    "infrastructure",
    peakId
  );
  const navigate = useNavigate();
  const [infrastructure, setInfrastructure] =
    useState<InfrastructureData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [showAllModal, setShowAllModal] = useState(false);
  const infrastructureScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const hideArrowTimeoutRef = useRef<{
    left: NodeJS.Timeout | null;
    right: NodeJS.Timeout | null;
  }>({ left: null, right: null });

  useEffect(() => {
    if (!peakId) return;

    getPeakInfrastructure(peakId, 5000)
      .then((data) => {
        setInfrastructure(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [peakId]);

  const hasData = Boolean(
    infrastructure?.infrastructure &&
      Object.keys(infrastructure.infrastructure).length > 0
  );
  usePeakDetailsView("desktop_map", "infrastructure", hasData, peakId);

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

  // Check scroll position for infrastructure scroll
  const checkScrollPosition = () => {
    if (!infrastructureScrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } =
      infrastructureScrollRef.current;
    const canScrollLeftNow = scrollLeft > 0;
    const canScrollRightNow = scrollLeft < scrollWidth - clientWidth - 1;

    // Clear existing timeouts
    if (hideArrowTimeoutRef.current.left) {
      clearTimeout(hideArrowTimeoutRef.current.left);
      hideArrowTimeoutRef.current.left = null;
    }
    if (hideArrowTimeoutRef.current.right) {
      clearTimeout(hideArrowTimeoutRef.current.right);
      hideArrowTimeoutRef.current.right = null;
    }

    // If can scroll, show immediately
    if (canScrollLeftNow) {
      setCanScrollLeft(true);
    } else {
      // If can't scroll, hide after 1 second
      hideArrowTimeoutRef.current.left = setTimeout(() => {
        setCanScrollLeft(false);
      }, 1000);
    }

    if (canScrollRightNow) {
      setCanScrollRight(true);
    } else {
      // If can't scroll, hide after 1 second
      hideArrowTimeoutRef.current.right = setTimeout(() => {
        setCanScrollRight(false);
      }, 1000);
    }
  };

  useEffect(() => {
    if (!infrastructureScrollRef.current) return;
    checkScrollPosition();
    const scrollElement = infrastructureScrollRef.current;
    scrollElement.addEventListener("scroll", checkScrollPosition);
    window.addEventListener("resize", checkScrollPosition);
    return () => {
      scrollElement.removeEventListener("scroll", checkScrollPosition);
      window.removeEventListener("resize", checkScrollPosition);
      // Clear timeouts on cleanup
      if (hideArrowTimeoutRef.current.left) {
        clearTimeout(hideArrowTimeoutRef.current.left);
      }
      if (hideArrowTimeoutRef.current.right) {
        clearTimeout(hideArrowTimeoutRef.current.right);
      }
    };
  }, [allItems]);

  const scrollInfrastructure = (direction: "left" | "right") => {
    trackSectionEvent("button_click", `scroll_${direction}`);
    smoothScrollHorizontal(infrastructureScrollRef.current, direction);
  };

  // Don't render anything if there's no data or no items
  if (!loading && (!hasData || allItems.length === 0)) {
    return null;
  }

  const getItemName = (item: any) => {
    return (
      item.tags?.name || item.tags?.tourism || item.tags?.amenity || "Unnamed"
    );
  };

  // This returns only the numeric value in kilometers (not a string with "km")
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

  const openGoogleMaps = (lat: number, lon: number, source = "card") => {
    trackSectionEvent("navigation", "open_maps", source);
    const url = `https://www.google.com/maps?q=${lat},${lon}`;
    window.open(url, "_blank");
  };

  const handleItemClick = (item: any, category: string) => {
    trackSectionEvent("button_click", "item_open", category);
    if (item.shelter_id) {
      setShowAllModal(false);
      navigate(`/shelters/${item.shelter_id}`);
      return;
    }
    setSelectedItem({ ...item, category });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    trackSectionEvent("interaction", "modal_close");
    setShowModal(false);
    setSelectedItem(null);
  };

  const handleCloseAllModal = () => {
    trackSectionEvent("interaction", "see_all_close");
    setShowAllModal(false);
  };

  // Function to get card classes for horizontal scroll
  const getHorizontalCardClasses = (item: any) => {
    const classes = [styles["infrastructure__card"]];
    if (!item.image || !item.image.url) {
      classes.push(styles["infrastructure__card--no-image"]);
    }
    return classes.filter(Boolean).join(" ");
  };

  // Function to get card classes for modal list
  const getModalCardClasses = (item: any) => {
    const classes = [
      styles["infrastructure__card"],
      styles["infrastructure__card--fullwidth"],
    ];
    if (!item.image || !item.image.url) {
      classes.push(styles["infrastructure__card--no-image"]);
    }
    return classes.filter(Boolean).join(" ");
  };

  return (
    <section className={styles["infrastructure"]}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: 16,
        }}
      >
        <h3
          className={`${styles["infrastructure__title"]} typography-desktop-body-small`}
        >
          <MapPin className={styles["infrastructure__icon"]} />
          {t("infrastructure.nearbyInfrastructure")}
        </h3>
        {allItems.length > 5 && (
          <button
            className={styles["infrastructure__see-all-btn"]}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              background: "none",
              border: "none",
              color: "#007bff",
              fontWeight: 500,
              fontSize: 15,
            }}
            onClick={() => {
              trackSectionEvent("button_click", "see_all_open");
              setShowAllModal(true);
            }}
          >
            {t("common.seeAll")} <ChevronRight size={18} />
          </button>
        )}
      </div>
      {allItems.length > 0 && (
        <div className={styles["infrastructure__scroll-container"]}>
          {canScrollLeft && (
            <button
              className={`${styles["infrastructure__scroll-arrow"]} ${styles["infrastructure__scroll-arrow--left"]}`}
              onClick={() => scrollInfrastructure("left")}
              aria-label="Scroll left"
            >
              <ChevronLeft size={20} />
            </button>
          )}
          {canScrollRight && (
            <button
              className={`${styles["infrastructure__scroll-arrow"]} ${styles["infrastructure__scroll-arrow--right"]}`}
              onClick={() => scrollInfrastructure("right")}
              aria-label="Scroll right"
            >
              <ChevronRight size={20} />
            </button>
          )}
          <div
            className={styles["infrastructure__scroll"]}
            ref={infrastructureScrollRef}
          >
            {allItems.slice(0, 5).map(({ item, category }, idx) => {
              const distance = calculateDistance(
                infrastructure?.coordinates?.lat || 0,
                infrastructure?.coordinates?.lng || 0,
                item.lat,
                item.lon
              );

              return (
                <div
                  key={`${category}-${idx}`}
                  className={getHorizontalCardClasses(item)}
                  onClick={() => handleItemClick(item, category)}
                  style={
                    item.image &&
                    typeof item.image === "object" &&
                    item.image.url
                      ? { backgroundImage: `url(${item.image.url})` }
                      : undefined
                  }
                >
                  {!item.image && (
                    <div className={styles["infrastructure__card-icon-bg"]}>
                      {getCategoryIcon(category, true)}
                    </div>
                  )}
                  <div className={styles["infrastructure__card-content"]}>
                    <div className={styles["infrastructure__card-info"]}>
                      <h4
                        className={`${styles["infrastructure__card-name"]} typography-desktop-body-small`}
                      >
                        {getItemName(item)}
                      </h4>
                      <div
                        className={`${styles["infrastructure__card-category"]} typography-desktop-label-medium`}
                      >
                        {getCategoryLabel(category, t)}
                      </div>
                      <div
                        className={`${styles["infrastructure__card-distance"]} typography-desktop-label-medium`}
                      >
                        <Navigation size={14} />
                        {formatDistance(distance)}
                      </div>
                    </div>
                    <button
                      className={`${styles["infrastructure__card-map-btn"]} typography-desktop-button-small`}
                      onClick={(e) => {
                        e.stopPropagation();
                        openGoogleMaps(item.lat, item.lon, "card");
                      }}
                      title={t("infrastructure.openMaps")}
                    >
                      <Map size={16} />
                      {t("infrastructure.openMaps")}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* See All Modal */}
      {showAllModal && (
        <AppModal
          open={showAllModal}
          onClose={handleCloseAllModal}
          variant="dialog"
          ariaLabel={t("infrastructure.allInfrastructure")}
          contentClassName={styles["infrastructure__modal"]}
        >
              <div className={styles["infrastructure__modal-header"]}>
                <div className={styles["infrastructure__modal-header-content"]}>
                  <h3
                    className={`${styles["infrastructure__modal-title"]} typography-desktop-body-small`}
                  >
                    {t("infrastructure.allInfrastructure")}
                  </h3>
                </div>
                <button
                  className={styles["infrastructure__modal-close"]}
                  onClick={handleCloseAllModal}
                  aria-label="Close modal"
                >
                  <X size={20} />
                </button>
              </div>
              <div className={styles["infrastructure__modal-all-list"]}>
                {allItems.map(({ item, category }, idx) => {
                  const distance = calculateDistance(
                    infrastructure?.coordinates?.lat || 0,
                    infrastructure?.coordinates?.lng || 0,
                    item.lat,
                    item.lon
                  );
                  return (
                    <div
                      key={`all-${category}-${idx}`}
                      className={getModalCardClasses(item)}
                      onClick={() => handleItemClick(item, category)}
                      style={
                        item.image &&
                        typeof item.image === "object" &&
                        item.image.url
                          ? { backgroundImage: `url(${item.image.url})` }
                          : undefined
                      }
                    >
                      {!item.image && (
                        <div className={styles["infrastructure__card-icon-bg"]}>
                          {getCategoryIcon(category, true)}
                        </div>
                      )}
                      <div className={styles["infrastructure__card-content"]}>
                        <div className={styles["infrastructure__card-info"]}>
                          <h4
                            className={`${styles["infrastructure__card-name"]} typography-desktop-body-small`}
                          >
                            {getItemName(item)}
                          </h4>
                          <div
                            className={`${styles["infrastructure__card-category"]} typography-desktop-label-medium`}
                          >
                            {getCategoryLabel(category, t)}
                          </div>
                          <div
                            className={`${styles["infrastructure__card-distance"]} typography-desktop-label-medium`}
                          >
                            <Navigation size={14} />
                            {formatDistance(distance)}
                          </div>
                        </div>
                        <button
                        className={`${styles["infrastructure__card-map-btn"]} typography-desktop-button-small`}
                        onClick={(e) => {
                          e.stopPropagation();
                          openGoogleMaps(item.lat, item.lon, "see_all");
                        }}
                          title={t("infrastructure.openMaps")}
                        >
                          <Map size={16} />
                          {t("infrastructure.openMaps")}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
        </AppModal>
      )}

      {/* Modal for detailed information */}
      {showModal && selectedItem && (
        <AppModal
          open={showModal}
          onClose={handleCloseModal}
          variant="dialog"
          ariaLabel={getItemName(selectedItem)}
          contentClassName={styles["infrastructure__modal"]}
        >
              <div className={styles["infrastructure__modal-header"]}>
                <div className={styles["infrastructure__modal-header-content"]}>
                  <h3
                    className={`${styles["infrastructure__modal-title"]} typography-desktop-body-small`}
                  >
                    {getItemName(selectedItem)}
                  </h3>
                  <p className={styles["infrastructure__modal-category"]}>
                    {getCategoryLabel(selectedItem.category, t)}
                  </p>
                </div>
                <button
                  className={styles["infrastructure__modal-close"]}
                  onClick={handleCloseModal}
                  aria-label="Close modal"
                >
                  <X size={20} />
                </button>
              </div>
              <div className={styles["infrastructure__modal-content"]}>
                <div className={styles["infrastructure__modal-image"]}>
                  {selectedItem.image && selectedItem.image.url ? (
                    <img
                      src={selectedItem.image.url}
                      alt={getItemName(selectedItem)}
                      className={styles["infrastructure__modal-img"]}
                    />
                  ) : (
                    <div
                      className={styles["infrastructure__modal-placeholder"]}
                    >
                      {getCategoryIcon(selectedItem.category, true)}
                    </div>
                  )}
                </div>

                <div className={styles["infrastructure__modal-details"]}>
                  <div className={styles["infrastructure__modal-section"]}>
                    <h4 className="typography-desktop-body-small">
                      {t("infrastructure.location")}
                    </h4>
                    <div className={styles["infrastructure__modal-coords"]}>
                      <span className="typography-desktop-label-medium">
                        {selectedItem.lat.toFixed(6)},{" "}
                        {selectedItem.lon.toFixed(6)}
                      </span>
                      <button
                        className={`${styles["infrastructure__modal-map-btn"]} typography-desktop-button-small`}
                        onClick={() =>
                          openGoogleMaps(selectedItem.lat, selectedItem.lon, "detail")
                        }
                      >
                        <Map size={16} />
                        {t("infrastructure.viewInMaps")}
                      </button>
                    </div>
                    <div
                      className={`${styles["infrastructure__modal-distance"]} typography-desktop-label-medium`}
                    >
                      <Navigation size={14} />
                      {formatDistance(
                        calculateDistance(
                          infrastructure?.coordinates?.lat || 0,
                          infrastructure?.coordinates?.lng || 0,
                          selectedItem.lat,
                          selectedItem.lon
                        )
                      )}{" "}
                      {t("infrastructure.kmFromPeak")}
                    </div>
                  </div>

                  {selectedItem.tags &&
                    Object.keys(selectedItem.tags).length > 0 && (
                      <div className={styles["infrastructure__modal-section"]}>
                        <h4 className="typography-desktop-body-small">
                          {t("infrastructure.details")}
                        </h4>
                        <div className={styles["infrastructure__modal-tags"]}>
                          {Object.entries(selectedItem.tags).map(
                            ([key, value]) => (
                              <div
                                key={key}
                                className={styles["infrastructure__modal-tag"]}
                              >
                                <span
                                  className={`${styles["infrastructure__modal-tag-key"]} typography-desktop-label-small`}
                                >
                                  {key
                                    .replace(/_/g, " ")
                                    .replace(/\b\w/g, (l) => l.toUpperCase())}
                                  :
                                </span>
                                <span
                                  className={`${styles["infrastructure__modal-tag-value"]} typography-desktop-label-medium`}
                                >
                                  {String(value)}
                                </span>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}

                  {selectedItem.tags?.website && (
                    <div className={styles["infrastructure__modal-section"]}>
                      <a
                        href={selectedItem.tags.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${styles["infrastructure__modal-website"]} typography-desktop-button-small`}
                        onClick={() =>
                          trackSectionEvent("navigation", "open_website")
                        }
                      >
                        <ExternalLink size={16} />
                        {t("infrastructure.visitWebsite")}
                      </a>
                    </div>
                  )}
                </div>
              </div>
        </AppModal>
      )}
    </section>
  );
};

export default InfrastructureMap;
