import React, { useState, useEffect } from "react";
import styles from "./Infrastructure.module.css";
import { getPeakInfrastructure } from "../../../../shared/api/endpoints/peaks";
import type { InfrastructureData } from "../../../../shared/api/types";
import ShelterIcon from "../../../../shared/components/ShelterIcon/ShelterIcon";
import {
  MapPin,
  Trees,
  Droplets,
  ExternalLink,
  Navigation,
  X,
  Map,
  ChevronRight,
} from "lucide-react";
import MountainIcon from "../../../../shared/components/MountainIcon/MountainIcon";
import { useI18n } from "../../../../shared/context/I18nContext";
import AppModal from "../../../../shared/components/AppModal";
import { useNavigate } from "react-router-dom";
import { useUnitFormat } from "../../../../shared/hooks/useUnitFormat";
import ShimmerWrapper from "../../../components/Shimmer/ShimmerWrapper";
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

const Infrastructure: React.FC<InfrastructureProps> = ({ peakId }) => {
  const { t } = useI18n();
  const { formatDistance } = useUnitFormat();
  const { trackSectionEvent } = usePeakDetailsAnalytics(
    "mobile",
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
  usePeakDetailsView("mobile", "infrastructure", hasData, peakId);

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
    <ShimmerWrapper isLoading={loading} hasData={hasData}>
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
            className={`${styles["infrastructure__title"]} typography-title-medium`}
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
            <div className={styles["infrastructure__scroll"]}>
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
                          className={`${styles["infrastructure__card-name"]} typography-title-medium`}
                        >
                          {getItemName(item)}
                        </h4>
                        <div
                          className={`${styles["infrastructure__card-category"]} typography-body-small`}
                        >
                          {getCategoryLabel(category, t)}
                        </div>
                        <div
                          className={`${styles["infrastructure__card-distance"]} typography-body-small`}
                        >
                          <Navigation size={14} />
                          {formatDistance(distance)}
                        </div>
                      </div>
                      <button
                        className={`${styles["infrastructure__card-map-btn"]} typography-button-small`}
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
        <AppModal
          open={showAllModal}
          onClose={handleCloseAllModal}
          variant="fullscreen"
          ariaLabel={t("infrastructure.allInfrastructure")}
          contentClassName={styles["infrastructure__modal"]}
        >
          <div className={styles["infrastructure__modal-header"]}>
            <div
              className={styles["infrastructure__modal-header-content"]}
            >
              <h3
                className={`${styles["infrastructure__modal-title"]} typography-title-medium`}
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
          <div className={styles["infrastructure__modal-content"]}>
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
                      <div
                        className={styles["infrastructure__card-icon-bg"]}
                      >
                        {getCategoryIcon(category, true)}
                      </div>
                    )}
                    <div
                      className={styles["infrastructure__card-content"]}
                    >
                      <div
                        className={styles["infrastructure__card-info"]}
                      >
                        <h4
                          className={`${styles["infrastructure__card-name"]} typography-title-medium`}
                        >
                          {getItemName(item)}
                        </h4>
                        <div
                          className={`${styles["infrastructure__card-category"]} typography-body-small`}
                        >
                          {getCategoryLabel(category, t)}
                        </div>
                        <div
                          className={`${styles["infrastructure__card-distance"]} typography-body-small`}
                        >
                          <Navigation size={14} />
                          {formatDistance(distance)}
                        </div>
                      </div>
                      <button
                        className={`${styles["infrastructure__card-map-btn"]} typography-button-small`}
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
          </div>
        </AppModal>

        {/* Modal for detailed information */}
        <AppModal
          open={showModal}
          onClose={handleCloseModal}
          variant="dialog"
          ariaLabel={selectedItem ? getItemName(selectedItem) : ""}
          contentClassName={styles["infrastructure__modal"]}
        >
          <div className={styles["infrastructure__modal-header"]}>
            <div className={styles["infrastructure__modal-header-content"]}>
              <h3
                className={`${styles["infrastructure__modal-title"]} typography-title-medium`}
              >
                {selectedItem ? getItemName(selectedItem) : ""}
              </h3>
              <p className={styles["infrastructure__modal-category"]}>
                {selectedItem ? getCategoryLabel(selectedItem.category, t) : ""}
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
              {selectedItem?.image && selectedItem.image.url ? (
                <img
                  src={selectedItem.image.url}
                  alt={getItemName(selectedItem)}
                  className={styles["infrastructure__modal-img"]}
                />
              ) : (
                <div className={styles["infrastructure__modal-placeholder"]}>
                  {selectedItem && getCategoryIcon(selectedItem.category, true)}
                </div>
              )}
            </div>

            <div className={styles["infrastructure__modal-details"]}>
              <div className={styles["infrastructure__modal-section"]}>
                <h4 className="typography-title-medium">
                  {t("infrastructure.location")}
                </h4>
                <div className={styles["infrastructure__modal-coords"]}>
                  <span className="typography-body-small">
                    {selectedItem?.lat.toFixed(6)},{" "}
                    {selectedItem?.lon.toFixed(6)}
                  </span>
                  <button
                    className={`${styles["infrastructure__modal-map-btn"]} typography-button-small`}
                    onClick={() =>
                      selectedItem &&
                      openGoogleMaps(
                        selectedItem.lat,
                        selectedItem.lon,
                        "detail"
                      )
                    }
                  >
                    <Map size={16} />
                    {t("infrastructure.viewInMaps")}
                  </button>
                </div>
                <div
                  className={`${styles["infrastructure__modal-distance"]} typography-body-small`}
                >
                  <Navigation size={14} />
                  {selectedItem &&
                    formatDistance(
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

              {selectedItem?.tags &&
                Object.keys(selectedItem.tags).length > 0 && (
                  <div className={styles["infrastructure__modal-section"]}>
                    <h4 className="typography-title-medium">
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
                              className={`${styles["infrastructure__modal-tag-key"]} typography-label-small`}
                            >
                              {key
                                .replace(/_/g, " ")
                                .replace(/\b\w/g, (l) => l.toUpperCase())}
                              :
                            </span>
                            <span
                              className={`${styles["infrastructure__modal-tag-value"]} typography-body-small`}
                            >
                              {String(value)}
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

              {selectedItem?.tags?.website && (
                <div className={styles["infrastructure__modal-section"]}>
                  <a
                    href={selectedItem.tags.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${styles["infrastructure__modal-website"]} typography-button-small`}
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
      </section>
    </ShimmerWrapper>
  );
};

export default Infrastructure;
