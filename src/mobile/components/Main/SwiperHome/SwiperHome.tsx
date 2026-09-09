import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination } from "swiper/modules";
// Swiper CSS imports are fine at runtime; add ts-ignore to satisfy TS bundler typing
// @ts-ignore
import "swiper/css";
// @ts-ignore
import "swiper/css/pagination";
import styles from "./SwiperHome.module.css";
import { useI18n } from "../../../../shared/context/I18nContext";
import { useAuth } from "../../../../shared/context/AuthContext";
import LoginRequiredPopup from "../../LoginRequiredPopup/LoginRequiredPopup";
import HomeHeader from "../HomeHeader/HomeHeader";
import { Target } from "lucide-react";
import { getPeakListsWithPeaks } from "../../../../shared/api/endpoints/peakLists";

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
  geojson?: {
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

const SwiperHome = () => {
  const { t } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showLoginPopup, setShowLoginPopup] = useState(false);

  // Internal state for peak lists data
  const [peakLists, setPeakLists] = useState<PeakListType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allPeaksCount, setAllPeaksCount] = useState(0);
  const [totalUserPeaks, setTotalUserPeaks] = useState(0);
  const [totalCommunityPeaks, setTotalCommunityPeaks] = useState(0);

  // Fetch peak lists data
  const fetchLists = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getPeakListsWithPeaks();
      const lists = response.lists || [];
      setPeakLists(lists);
      setAllPeaksCount(response.all_peaks || 0);
      setTotalCommunityPeaks(response.total_community_peaks || 0);
      if ("total_user_peaks" in response && typeof response.total_user_peaks === "number") {
        setTotalUserPeaks(response.total_user_peaks);
      } else {
        setTotalUserPeaks(0);
      }
    } catch (err) {
      console.error("Error fetching peak lists:", err);
      setError("Failed to load peak lists");
    } finally {
      setLoading(false);
    }
  }, [t]);

  // Fetch data on mount and when user changes
  useEffect(() => {
    fetchLists();
  }, [user?.externalUserId, fetchLists]);

  // Listen for refresh events (e.g., after scraping)
  useEffect(() => {
    const handleRefresh = () => {
      fetchLists();
    };
    window.addEventListener("refresh-swiper-home", handleRefresh);
    return () => window.removeEventListener("refresh-swiper-home", handleRefresh);
  }, [fetchLists]);

  // Compose all peaks list
  const allPeaksList = useMemo(() => ({
    list_id: 0,
    list_name: t("main.allPeaks"),
    description: "",
    num_peaks: allPeaksCount,
    user_completed: totalUserPeaks,
    total_community_peaks: totalCommunityPeaks,
    user_authenticated: !!user?.externalUserId,
    primary_image: "/icons/peaklist/tot.jpg",
    images: [],
    peaks_status: [] as Array<{ done: boolean }>,
    geojson: {
      type: "FeatureCollection" as const,
      features: [],
    },
  }), [allPeaksCount, totalUserPeaks, t, user?.externalUserId, totalCommunityPeaks]);

  // Combine all peaks list with other peak lists
  const peakListsForSwiper = useMemo(() => [allPeaksList, ...peakLists], [allPeaksList, peakLists]);

  const extendedPeakLists = peakListsForSwiper;

  const handleSeeMore = (listId: number) => {
    navigate(`/list-details/${listId}`);
  };

  const handleMyPeaksClick = () => {
    if (!user) {
      setShowLoginPopup(true);
      return;
    }
    navigate("/userpeaks");
  };

  if (loading) {
    return (
      <div className={styles["swiper-home__container"]}>
        <HomeHeader
          title={t("home.challenges.title")}
        />
        <div className={styles["swiper-home__loading-container"]}>
          <div className={styles["swiper-home__skeleton-slide"]} />
          <div className={styles["swiper-home__skeleton-slide"]} />
          <div className={styles["swiper-home__skeleton-slide"]} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles["swiper-home__container"]}>
        <HomeHeader
          title={t("home.challenges.title")}
        />
        <div className={styles["swiper-home__error-container"]}>
          <Target size={24} color="rgb(71, 85, 105)" />
          <p className="typography-body-medium">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles["swiper-home__container"]}>
      <HomeHeader
        title={t("home.challenges.title")}
      />
      <Swiper
        spaceBetween={16}
        slidesPerView={1.15}
        loop={extendedPeakLists.length > 1}
        centeredSlides
        observer={true}
        observeParents={true}
        pagination={{
          clickable: true,
          dynamicBullets: true,
        }}
        modules={[Pagination]}
        className={styles["swiper-home__swiper"]}
      >
        {extendedPeakLists.map((list, idx) => {
          let completed = 0;
          if (typeof list.user_completed === "number") {
            completed = list.user_completed;
          } else if (Array.isArray(list.peaks_status)) {
            completed = list.peaks_status.filter(
              (p: { done: boolean }) => p.done
            ).length;
          }

          // Determine background image for the slide
          const bgImage = list.primary_image || undefined;

          // Use API response directly for name and description
          const listName = list.list_name ?? "";

          // Enhanced landing slide for the first list (All Peaks)
          if (idx === 0) {
            const landingNameKey = !!user
              ? "main.allPeaksList.nameLoggedIn"
              : "main.allPeaksList.nameGuest";
            const landingNameRaw = t(landingNameKey);
            const landingName =
              landingNameRaw === landingNameKey ? listName : landingNameRaw;
            
            return (
              <SwiperSlide
                key={`list-${list.list_id || idx}`}
                className={`${styles["swiper-home__slide"]} ${styles["swiper-home__slide--landing"]}`}
                style={{
                  backgroundImage: bgImage ? `url(${bgImage})` : undefined,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  borderRadius: "12px",
                  overflow: "hidden",
                }}
              >
                <div className={styles["swiper-home__landing-overlay"]} />
                <div
                  className={`${styles["swiper-home__item"]} ${styles["swiper-home__landing-content"]}`}
                  onClick={handleMyPeaksClick}
                >
                  <div className={styles["swiper-home__landing-header"]}>
                    <h1
                      className={`${styles["swiper-home__landing-title"]} typography-headline-small`}
                    >
                      {landingName}
                    </h1>
                  </div>
                  
                  <div className={styles["swiper-home__landing-stats"]}>
                    <div className={styles["swiper-home__stat-item"]}>
                      <div
                        className={`${styles["swiper-home__stat-label"]} typography-label-medium`}
                      >
                        {t("main.totalPeaks")}
                      </div>
                      <div
                        className={`${styles["swiper-home__stat-number"]} typography-title-large`}
                      >
                        {list.num_peaks?.toLocaleString()}
                      </div>
                    </div>
                    <div className={styles["swiper-home__stat-divider"]} />
                    <div className={styles["swiper-home__stat-item"]}>
                      <div
                        className={`${styles["swiper-home__stat-label"]} typography-label-medium`}
                      >
                        {t("main.completed")}
                      </div>
                      <div
                        className={`${styles["swiper-home__stat-number"]} typography-title-large`}
                      >
                        {completed}
                      </div>
                    </div>
                  </div>
                </div>
              </SwiperSlide>
            );
          }

          // Enhanced slide design for other lists
          return (
            <SwiperSlide
              key={`list-${list.list_id || idx}`}
              className={`${styles["swiper-home__slide"]} ${styles["swiper-home__slide--list"]}`}
              style={{
                backgroundImage: bgImage ? `url(${bgImage})` : undefined,
                backgroundSize: "cover",
                backgroundPosition: "center",
                borderRadius: "12px",
                overflow: "hidden",
              }}
            >
              <div className={styles["swiper-home__list-overlay"]} />
              <div
                className={`${styles["swiper-home__item"]} ${styles["swiper-home__list-content"]}`}
                onClick={() => handleSeeMore(list.list_id)}
              >
          
                <div className={styles["swiper-home__list-header"]}>
                  <h2
                    className={`${styles["swiper-home__list-title"]} typography-headline-small`}
                  >
                    {listName}
                  </h2>
                </div>
                
                <div className={styles["swiper-home__list-stats"]}>
                  <div className={styles["swiper-home__stat-item"]}>
                    <div
                      className={`${styles["swiper-home__stat-label"]} typography-label-medium`}
                    >
                      {t("main.totalPeaks")}
                    </div>
                    <div
                      className={`${styles["swiper-home__stat-number"]} typography-title-large`}
                    >
                      {list.num_peaks}
                    </div>
                  </div>
                  <div className={styles["swiper-home__stat-divider"]} />
                  <div className={styles["swiper-home__stat-item"]}>
                    <div
                      className={`${styles["swiper-home__stat-label"]} typography-label-medium`}
                    >
                      {t("main.completed")}
                    </div>
                    <div
                      className={`${styles["swiper-home__stat-number"]} typography-title-large`}
                    >
                      {completed}
                    </div>
                  </div>
                </div>
              </div>
            </SwiperSlide>
          );
        })}
      </Swiper>

      {/* Login Required Popup */}
      <LoginRequiredPopup
        isOpen={showLoginPopup}
        onClose={() => setShowLoginPopup(false)}
        message="auth.loginRequired.myPeaks"
      />
    </div>
  );
};

export default SwiperHome;
