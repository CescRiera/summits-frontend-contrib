import React from "react";
import { ChevronRight } from "lucide-react";
import styles from "./WikilocRoute.module.css";
import { useI18n } from "../../../../shared/context/I18nContext";
import { useAuth } from "../../../../shared/context/AuthContext";
import ShimmerWrapper from "../../../components/Shimmer/ShimmerWrapper";
import {
  usePeakDetailsAnalytics,
  usePeakDetailsView,
} from "../../../../shared/hooks/usePeakDetailsAnalytics";

type WikilocRouteProps = {
  peakId: number;
  peakName: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
};

const WikilocRoute: React.FC<WikilocRouteProps> = ({
  peakId,
  peakName,
  coordinates,
}) => {
  const { t } = useI18n();
  const { user } = useAuth();
  const { trackSectionEvent } = usePeakDetailsAnalytics(
    "mobile",
    "wikiloc_route",
    peakId
  );
  usePeakDetailsView("mobile", "wikiloc_route", Boolean(peakName), peakId);

  const handleClick = () => {
    const wikilocLanguages = [
      "ca", "de", "es", "fr", "is", "hu", "no", "pt", "sv", "el", "sr", "ko",
      "da", "en", "eu", "gl", "it", "nl", "pl", "fi", "tr", "ru", "uk", "zh"
    ];

    const userLang = user?.language;
    const browserLang = ((navigator.language || "en").split("-")[0] || "en").toLowerCase();
    
    const langToUse = userLang || browserLang;
    
    const subdomain = wikilocLanguages.includes(langToUse) ? `${langToUse}.` : "www.";

    let url: string;
    if (
      coordinates &&
      typeof coordinates.lat === "number" &&
      typeof coordinates.lng === "number"
    ) {
      // Build a ~5km bbox around the point using degree conversion
      const radiusKm = 5; // half-width/height in km
      const latRad = (coordinates.lat * Math.PI) / 180;
      const degPerKmLat = 1 / 111; // ~111 km per degree latitude
      const degPerKmLng = 1 / (111 * Math.cos(latRad));
      const dLat = radiusKm * degPerKmLat;
      const dLng = radiusKm * (isFinite(degPerKmLng) ? degPerKmLng : 0);

      const swLat = coordinates.lat - dLat;
      const swLng = coordinates.lng - dLng;
      const neLat = coordinates.lat + dLat;
      const neLng = coordinates.lng + dLng;
      const sw = encodeURIComponent(`${swLat},${swLng}`);
      const ne = encodeURIComponent(`${neLat},${neLng}`);
      const place = encodeURIComponent(peakName);
      url = `https://${subdomain}wikiloc.com/wikiloc/map.do?sw=${sw}&ne=${ne}&q=${place}&page=1`;
    } else {
      url = `https://${subdomain}wikiloc.com/wikiloc/map.do?q=${encodeURIComponent(
        peakName
      )}`;
    }
    trackSectionEvent("navigation", "open_wikiloc");
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <ShimmerWrapper isLoading={false} hasData={true}>
      <section className={styles["wikilocRoute__container"]}>
        <button
          className={styles["wikilocRoute__card"]}
          onClick={handleClick}
          type="button"
          aria-label={`Search routes for ${peakName} on Wikiloc`}
        >
          <div className={styles["wikilocRoute__content"]}>
            <div className={styles["wikilocRoute__icon"]}>
              <img
                src="/icons/wikiloc/wikiloc.jpeg"
                alt="Wikiloc"
                className={styles["wikilocRoute__logo"]}
              />
            </div>

            <div className={styles["wikilocRoute__text"]}>
              <h3
                className={`${styles["wikilocRoute__title"]} typography-title-medium`}
              >
                {t("peakDetails.searchRoutesFor")} {peakName}
              </h3>
            </div>

            <div className={styles["wikilocRoute__arrow"]}>
              <ChevronRight size={20} />
            </div>
          </div>
        </button>
      </section>
    </ShimmerWrapper>
  );
};

export default WikilocRoute;
