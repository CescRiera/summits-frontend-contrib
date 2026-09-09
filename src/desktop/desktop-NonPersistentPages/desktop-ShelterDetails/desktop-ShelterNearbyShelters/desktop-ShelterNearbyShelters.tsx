import React, { useState, useEffect } from "react";
import styles from "./desktop-ShelterNearbyShelters.module.css";
import { getShelterNearbyShelters } from "../../../../shared/api/endpoints/shelters";
import type { ShelterNearbyShelter } from "../../../../shared/api/types";
import { Navigation } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ShelterIcon from "../../../../shared/components/ShelterIcon/ShelterIcon";
import ShimmerWrapper from "../../../desktop-components/desktop-Shimmer/desktop-ShimmerWrapper";
import { useUnitFormat } from "../../../../shared/hooks/useUnitFormat";
import { useI18n } from "../../../../shared/context/I18nContext";

const shelterTypeColors: Record<string, string> = {
  alpine_hut: "#0C4A7B",
  wilderness_hut: "#2D6A4F",
  shelter: "#D92B2B",
};

const getShelterGradient = (type: string) => {
  const color = shelterTypeColors[type] || "#D92B2B";
  return `linear-gradient(135deg, ${color}dd, ${color}88)`;
};

type ShelterNearbySheltersProps = {
  shelterId: number;
};

const ShelterNearbyShelters: React.FC<ShelterNearbySheltersProps> = ({
  shelterId,
}) => {
  const { formatDistance, formatMeters } = useUnitFormat();
  const { t } = useI18n();
  const [nearbyShelters, setNearbyShelters] = useState<ShelterNearbyShelter[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!shelterId) return;
    getShelterNearbyShelters(shelterId, 10000, undefined, 10)
      .then((data) => {
        setNearbyShelters(data.nearby_shelters || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [shelterId]);

  const hasData = nearbyShelters.length > 0;

  const handleCardClick = (targetShelterId: number) => {
    navigate(`/shelters/${targetShelterId}`);
  };

  return (
    <ShimmerWrapper isLoading={loading} hasData={hasData}>
      <section className={styles["nearby-shelters"]}>
        <div className={styles["nearby-shelters__header"]}>
          <h3
            className={`${styles["nearby-shelters__title"]} typography-desktop-title-small`}
          >
            <ShelterIcon size={20} className={styles["nearby-shelters__icon"]} />
            {t("shelterDetails.nearbyShelters")}
          </h3>
        </div>
        {nearbyShelters.length > 0 ? (
          <div className={styles["nearby-shelters__list"]}>
            {nearbyShelters.map((shelter) => {
              const hasImage = Boolean(shelter.image);
              const typeColor =
                shelterTypeColors[shelter.type] || "#D92B2B";
              const typeLabel =
                t(`shelterDetails.type.${shelter.type}`) || shelter.type;
              return (
                <div
                  key={shelter.id}
                  className={styles["nearby-shelters__card"]}
                  onClick={() => handleCardClick(shelter.id)}
                  style={
                    hasImage
                      ? { backgroundImage: `url(${shelter.image})` }
                      : {
                          background: getShelterGradient(shelter.type),
                          position: "relative",
                        }
                  }
                >
                  <div
                    className={styles["nearby-shelters__card-overlay"]}
                  />
                  {!hasImage && (
                    <ShelterIcon
                      size={60}
                      className={styles["nearby-shelters__card-icon-bg"]}
                    />
                  )}
                  <div className={styles["nearby-shelters__card-content"]}>
                    <div className={styles["nearby-shelters__card-info-row"]}>
                      <div className={`${styles["nearby-shelters__card-name"]} typography-desktop-body-small`}>
                        {shelter.name || t("shelterDetails.unnamedShelter")}
                      </div>
                      <span
                        className={`${styles["nearby-shelters__card-type-badge"]} typography-button-small`}
                        style={{
                          backgroundColor: `${typeColor}30`,
                          color: "white",
                          borderColor: `${typeColor}60`,
                        }}
                      >
                        {typeLabel}
                      </span>
                      {shelter.elevation && (
                        <div className={styles["nearby-shelters__card-elevation"]}>
                          <span>{formatMeters(shelter.elevation)}</span>
                        </div>
                      )}
                      <div className={styles["nearby-shelters__card-distance"]}>
                        <Navigation size={14} />
                        <span>{formatDistance(shelter.distance_km)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div
            className={`${styles["nearby-shelters__no-data"]} typography-desktop-body-small`}
          >
            {t("shelterDetails.nearbySheltersNoData")}
          </div>
        )}
      </section>
    </ShimmerWrapper>
  );
};

export default ShelterNearbyShelters;
