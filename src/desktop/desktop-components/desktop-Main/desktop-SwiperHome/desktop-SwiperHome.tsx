import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import type { Swiper as SwiperType } from "swiper";
import { Navigation, Autoplay, Pagination } from "swiper/modules";
import { ArrowRight, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";

// @ts-ignore
import "swiper/css";
// @ts-ignore
import "swiper/css/navigation";
// @ts-ignore
import "swiper/css/pagination";

import styles from "./desktop-SwiperHome.module.css";
import { useI18n } from "../../../../shared/context/I18nContext";
import { useAuth } from "../../../../shared/context/AuthContext";
import CreatorBadge from "../../../../shared/components/CreatorBadge/CreatorBadge";

interface PeakListType {
  list_id: number;
  list_name: string;
  description: string;
  num_peaks: number;
  primary_image: string | null;
  images: string[];
  user_completed: number;
  total_community_peaks?: number;
  user_authenticated?: boolean;
  creator_id?: number | null;
  creator_name?: string | null;
  creator_image?: string | null;
  peaks_status?: Array<{
    done: boolean;
  }>;
  geojson: {
    type: "FeatureCollection";
    features: Array<{
      type: "Feature";
      geometry: {
        type: "Point";
        coordinates: [number, number];
      };
      properties: {
        id: number;
        completed: boolean;
      };
    }>;
  };
}

interface SwiperHomeProps {
  peakLists: PeakListType[];
  onRefreshUserData?: () => void;
  isRefreshing?: boolean;
}

const SwiperHome: React.FC<SwiperHomeProps> = ({
  peakLists,
  onRefreshUserData,
  isRefreshing = false,
}) => {
  const { t } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Use state for navigation elements to ensure they are re-registered if they change
  const [prevEl, setPrevEl] = useState<HTMLButtonElement | null>(null);
  const [nextEl, setNextEl] = useState<HTMLButtonElement | null>(null);
  const swiperRef = useRef<SwiperType | null>(null);

  const handleSeeMore = (listId: number) => {
    navigate(`/list-details/${listId}`);
  };

  const handleMyPeaksClick = () => {
    if (user) {
      navigate("/userpeaks");
    }
  };

  return (
    <div className={styles["swiper-home__container"]}>
      <Swiper
        spaceBetween={0}
        slidesPerView={1}
        loop={peakLists.length > 1}
        observer={true}
        observeParents={true}
        allowTouchMove={true}
        simulateTouch={true}
        navigation={{
          prevEl,
          nextEl,
        }}
        pagination={{
          clickable: true,
          dynamicBullets: true,
          type: "bullets",
        }}
        speed={1000}
        autoplay={{
          delay: 10000,
          disableOnInteraction: false,
        }}
        modules={[Navigation, Autoplay, Pagination]}
        className={styles["swiper-home__swiper"]}
        onSwiper={(swiper) => {
          swiperRef.current = swiper;
        }}
      >
        {peakLists.map((list, idx) => {
          let completed = 0;
          if (typeof list.user_completed === "number") {
            completed = list.user_completed;
          } else if (Array.isArray(list.peaks_status)) {
            completed = list.peaks_status.filter(
              (p: { done: boolean }) => p.done
            ).length;
          }

          const bgImage = list.primary_image || undefined;
          const listName = list.list_name ?? "";
          const listDescription = list.description ?? "";

          // Enhanced landing slide for the first list (All Peaks)
          if (idx === 0) {
            const isLoggedIn = !!user;
            const landingNameKey = isLoggedIn
              ? "main.allPeaksList.nameLoggedIn"
              : "main.allPeaksList.nameGuest";
            const landingDescKey = isLoggedIn
              ? "main.allPeaksList.descriptionLoggedIn"
              : "main.allPeaksList.descriptionGuest";
            
            const landingNameRaw = t(landingNameKey);
            const landingName = landingNameRaw === landingNameKey ? listName : landingNameRaw;
            
            const landingDescRaw = t(landingDescKey);
            const landingDesc = landingDescRaw === landingDescKey ? listDescription : landingDescRaw;

            return (
              <SwiperSlide
                key={list.list_id || idx}
                className={`${styles["swiper-home__slide"]} ${styles["swiper-home__slide--landing"]}`}
                style={{
                  backgroundImage: bgImage ? `url(${bgImage})` : undefined,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  borderRadius: "0",
                  overflow: "hidden",
                }}
              >
                <div className={styles["swiper-home__landing-overlay"]} />
                <div
                  className={`${styles["swiper-home__item"]} ${styles["swiper-home__landing-content"]}`}
                  onClick={isLoggedIn ? handleMyPeaksClick : undefined}
                >
                  <div className={styles["swiper-home__landing-header"]}>
                    <h1 className={`${styles["swiper-home__landing-title"]} typography-desktop-headline-large`}>
                      {landingName}
                    </h1>
                  </div>

                  <div className={styles["swiper-home__landing-stats"]}>
                    <div className={styles["swiper-home__stat-item"]}>
                      <div className={`${styles["swiper-home__stat-label"]} typography-desktop-label-large`}>
                        {t("main.totalPeaks")}
                      </div>
                      <div className={`${styles["swiper-home__stat-number"]} typography-desktop-headline-medium`}>
                        {list.num_peaks?.toLocaleString()}
                      </div>
                    </div>
                    <div className={styles["swiper-home__stat-divider"]} />
                    <div className={styles["swiper-home__stat-item"]}>
                      <div className={`${styles["swiper-home__stat-label"]} typography-desktop-label-large`}>
                        {t("main.completed")}
                      </div>
                      <div className={`${styles["swiper-home__stat-number"]} typography-desktop-headline-medium`}>
                        {completed}
                      </div>
                    </div>
                  </div>

                  <div className={styles["swiper-home__landing-description"]}>
                    <div className="typography-desktop-body-large">
                      {landingDesc}
                    </div>
                  </div>

                  {isLoggedIn && (
                    <div
                      className={`${styles["swiper-home__landing-footer"]} ${
                        !(onRefreshUserData && user?.type === "wikiloc")
                          ? styles["swiper-home__landing-footer--centered"]
                          : ""
                      }`}
                    >
                      {onRefreshUserData && user?.type === "wikiloc" && (
                        <button
                          className={`${styles["swiper-home__refresh-btn"]} typography-desktop-button-large`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onRefreshUserData();
                          }}
                          disabled={isRefreshing}
                        >
                          {t("main.loadNewPeaks")}
                          <RefreshCw
                            className={styles["swiper-home__refresh-icon"]}
                            size={20}
                            strokeWidth={2.5}
                          />
                        </button>
                      )}
                      {onRefreshUserData && user?.type === "wikiloc" && (
                        <div className={styles["swiper-home__footer-divider"]} />
                      )}
                      <button
                        className={`${styles["swiper-home__my-peaks-btn"]} typography-desktop-button-large`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMyPeaksClick();
                        }}
                      >
                        {t("main.myPeaks")}
                        <ArrowRight
                          className={styles["swiper-home__arrow-icon"]}
                          size={20}
                        />
                      </button>
                    </div>
                  )}
                </div>
              </SwiperSlide>
            );
          }

          // Enhanced slide design for other lists
          return (
            <SwiperSlide
              key={list.list_id || idx}
              className={`${styles["swiper-home__slide"]} ${styles["swiper-home__slide--list"]}`}
              style={{
                backgroundImage: bgImage ? `url(${bgImage})` : undefined,
                backgroundSize: "cover",
                backgroundPosition: "center",
                borderRadius: "0",
                overflow: "hidden",
              }}
            >
              <div className={styles["swiper-home__list-overlay"]} />
              <div
                className={`${styles["swiper-home__item"]} ${styles["swiper-home__list-content"]}`}
              >
                {list.list_id !== 0 && (list.creator_name || list.creator_image) && (
                  <CreatorBadge
                    name={list.creator_name ?? null}
                    imageUrl={list.creator_image ?? null}
                    className={styles["swiper-home__creator-badge"]}
                    size="lg"
                    variant="dark"
                  />
                )}
                <div className={styles["swiper-home__list-header"]}>
                  <h2 className={`${styles["swiper-home__list-title"]} typography-desktop-headline-large`}>
                    {listName}
                  </h2>
                </div>

                <div className={styles["swiper-home__list-stats"]}>
                  <div className={styles["swiper-home__stat-item"]}>
                    <div className={`${styles["swiper-home__stat-label"]} typography-desktop-label-large`}>
                      {t("main.totalPeaks")}
                    </div>
                    <div className={`${styles["swiper-home__stat-number"]} typography-desktop-headline-medium`}>
                      {list.num_peaks}
                    </div>
                  </div>
                  <div className={styles["swiper-home__stat-divider"]} />
                  <div className={styles["swiper-home__stat-item"]}>
                    <div className={`${styles["swiper-home__stat-label"]} typography-desktop-label-large`}>
                      {t("main.completed")}
                    </div>
                    <div className={`${styles["swiper-home__stat-number"]} typography-desktop-headline-medium`}>
                      {completed}
                    </div>
                  </div>
                </div>

                <div className={styles["swiper-home__list-description"]}>
                  <div className="typography-desktop-body-large">
                    {listDescription}
                  </div>
                </div>

                <div className={styles["swiper-home__list-footer"]}>
                  <button
                    className={`${styles["swiper-home__see-more-btn"]} typography-desktop-button-large`}
                    onClick={() => handleSeeMore(list.list_id)}
                  >
                    {t("main.seeMore")}
                    <ArrowRight
                      className={styles["swiper-home__arrow-icon"]}
                      size={20}
                    />
                  </button>
                </div>
              </div>
            </SwiperSlide>
          );
        })}
      </Swiper>

      <button
        ref={setPrevEl}
        className={`${styles["swiper-home__nav-button"]} ${styles["swiper-home__nav-button--prev"]}`}
        aria-label="Previous slide"
      >
        <ChevronLeft size={24} />
      </button>
      <button
        ref={setNextEl}
        className={`${styles["swiper-home__nav-button"]} ${styles["swiper-home__nav-button--next"]}`}
        aria-label="Next slide"
      >
        <ChevronRight size={24} />
      </button>
    </div>
  );
};

export default SwiperHome;

