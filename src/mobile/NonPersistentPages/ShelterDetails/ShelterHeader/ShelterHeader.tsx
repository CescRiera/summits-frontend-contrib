import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./ShelterHeader.module.css";
import type { ShelterBasic } from "../../../../shared/api/types";
import { useMapNavigation } from "../../../context/MapNavigationContext";
import ShimmerWrapper from "../../../components/Shimmer/ShimmerWrapper";
import { useUnitFormat } from "../../../../shared/hooks/useUnitFormat";
import { useI18n } from "../../../../shared/context/I18nContext";
import { getLocationFromHierarchy } from "../../../../shared/utils/adminHierarchy";
import ShelterChangeModal from "../../../components/Map/ShelterChangeModal/ShelterChangeModal";
import { Pencil } from "lucide-react";

type ShelterHeaderProps = {
  shelterId: number;
  shelterBasic: ShelterBasic;
};

const shelterTypeColors: Record<string, string> = {
  alpine_hut: "#0C4A7B",
  wilderness_hut: "#2D6A4F",
  shelter: "#D92B2B",
};

const ShelterHeader: React.FC<ShelterHeaderProps> = ({
  shelterId,
  shelterBasic,
}) => {
  const { navigateToMapWithShelter } = useMapNavigation();
  const navigate = useNavigate();
  const { t } = useI18n();
  const { formatMeters } = useUnitFormat();
  const [showEditModal, setShowEditModal] = useState(false);

  const handleSeeOnMap = () => {
    const { lat, lng } = shelterBasic.coordinates;
    const shelterData = {
      name: shelterBasic.name || shelterBasic.name_en || t("shelterDetails.unknownShelter"),
      name_en: shelterBasic.name_en || null,
      elevation: shelterBasic.elevation,
      shelter_type: shelterBasic.type,
    };
    navigateToMapWithShelter(shelterId, { lat, lng }, shelterData, true);
    navigate("/map");
  };

  const typeColor = shelterTypeColors[shelterBasic.type] || "#D92B2B";
  const typeLabel =
    t(`shelterDetails.type.${shelterBasic.type}`) || shelterBasic.type;

  return (
    <ShimmerWrapper isLoading={false} hasData={true}>
      <div className={styles["shelter-header"]}>
        <div className={styles["shelter-header__details-section"]}>
          <div className={styles["shelter-header__location-block"]}>
            <div className={styles["shelter-header__location-text"]}>
              <span
                className={`${styles["shelter-header__location-region"]} typography-body-medium`}
              >
                {getLocationFromHierarchy(shelterBasic.admin_hierarchy)}
              </span>
            </div>
          </div>

          <div className={styles["shelter-header__top-row"]}>
            <div className={styles["shelter-header__badges"]}>
              <span
                className={`${styles["shelter-header__type-badge"]} typography-button-small`}
                style={{
                  backgroundColor: `${typeColor}18`,
                  color: typeColor,
                  borderColor: `${typeColor}40`,
                }}
              >
                {typeLabel}
              </span>
              {shelterBasic.elevation && (
                <span className={`${styles["shelter-header__elevation-text"]} typography-title-small`}>
                  {formatMeters(shelterBasic.elevation)}
                </span>
              )}
            </div>

            <div className={styles["shelter-header__actions"]}>
              <button
                className={styles["shelter-header__edit-btn"]}
                onClick={() => setShowEditModal(true)}
                aria-label={t("shelterDetails.suggestEdit")}
              >
                <Pencil size={16} />
              </button>
              <button
                className={`${styles["shelter-header__map-button"]} typography-button-medium`}
                onClick={handleSeeOnMap}
              >
                {t("common.seeOnMap")}
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  style={{
                    marginLeft: 6,
                    display: "inline",
                    verticalAlign: "middle",
                  }}
                >
                  <path
                    d="M6 4l4 4-4 4"
                    stroke="rgb(15, 23, 42)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {shelterBasic && (
        <ShelterChangeModal
          key={`edit-${shelterBasic.id}-${showEditModal}`}
          open={showEditModal}
          onClose={() => setShowEditModal(false)}
          mode="edit"
          shelterData={{
            id: shelterBasic.id,
            name: shelterBasic.name ?? null,
            name_en: shelterBasic.name_en ?? null,
            shelter_type: shelterBasic.type,
            elevation: shelterBasic.elevation,
            lat: shelterBasic.coordinates.lat,
            lng: shelterBasic.coordinates.lng,
            wikipedia: shelterBasic.wikipedia ?? null,
          }}
        />
      )}
    </ShimmerWrapper>
  );
};

export default ShelterHeader;
