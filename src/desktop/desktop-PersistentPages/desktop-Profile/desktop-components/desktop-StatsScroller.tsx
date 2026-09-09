import React, { useEffect, useRef } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, FreeMode } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";
import {
  MapPin,
  TrendingUp,
  Clock,
  Timer,
  Route,
} from "lucide-react";
import MountainIcon from "../../../../shared/components/MountainIcon/MountainIcon";
import styles from "./desktop-StatsScroller.module.css";

// Import Swiper styles
import "swiper/swiper-bundle.css";

interface StatItem {
  icon: React.ReactNode;
  value: string;
  label: string;
  color: string;
}

const StatCard: React.FC<{ item: StatItem }> = ({ item }) => (
  <div className={styles["stats-scroller__item"]}>
    <div
      className={styles["stats-scroller__icon"]}
      style={{ color: item.color }}
    >
      {item.icon}
    </div>
    <div className={styles["stats-scroller__content"]}>
      <div
        className={`${styles["stats-scroller__value"]} typography-desktop-body-small`}
        style={{ color: item.color }}
      >
        {item.value}
      </div>
      <div
        className={`${styles["stats-scroller__label"]} typography-desktop-label-medium`}
      >
        {item.label}
      </div>
    </div>
  </div>
);

const StatPair: React.FC<{ pair: StatItem[] }> = ({ pair }) => (
  <div className={styles["stats-scroller__pair"]}>
    {pair.map((stat, index) => (
      <StatCard key={index} item={stat} />
    ))}
  </div>
);

const StatsScroller: React.FC = () => {
  const swiperRef = useRef<SwiperType | null>(null);
  const pauseTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const stats: StatItem[] = [
    {
      icon: <Route className={styles["stats__icon"]} />,
      value: "156.7km",
      label: "Total Distance",
      color: "#0a2540",
    },
    {
      icon: <TrendingUp className={styles["stats__icon"]} />,
      value: "12,450m",
      label: "Elevation Gain",
      color: "#059669",
    },
    {
      icon: <Clock className={styles["stats__icon"]} />,
      value: "24h 32m",
      label: "Total Time",
      color: "#7c3aed",
    },
    {
      icon: <Timer className={styles["stats__icon"]} />,
      value: "18h 15m",
      label: "Moving Time",
      color: "#ff0000",
    },
    {
      icon: <MapPin className={styles["stats__icon"]} />,
      value: "42",
      label: "Total Routes",
      color: "#ff7300",
    },
    {
      icon: <MountainIcon className={styles["stats__icon"]} />,
      value: "28",
      label: "Total Peaks",
      color: "#0891b2",
    },
  ];

  // Group stats into pairs for each slide
  const statPairs: StatItem[][] = [];
  for (let i = 0; i < stats.length; i += 2) {
    statPairs.push(stats.slice(i, i + 2));
  }

  // Duplicate the pairs to create more slides for smooth looping
  const duplicatedStatPairs = [...statPairs, ...statPairs];

  const handleUserInteraction = () => {
    if (!swiperRef.current) return;

    // Pause autoplay
    swiperRef.current.autoplay.stop();

    // Clear any existing timeout
    if (pauseTimeoutRef.current) {
      clearTimeout(pauseTimeoutRef.current);
    }

    // Resume after 5 seconds
    pauseTimeoutRef.current = setTimeout(() => {
      if (swiperRef.current && swiperRef.current.autoplay) {
        swiperRef.current.autoplay.start();
      }
    }, 5000);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pauseTimeoutRef.current) {
        clearTimeout(pauseTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className={styles["stats-scroller"]}>
      <div className={styles["stats-scroller__container"]}>
        <Swiper
          onSwiper={(swiper) => {
            swiperRef.current = swiper;
          }}
          modules={[Autoplay, FreeMode]}
          spaceBetween={-16}
          slidesPerView={1}
          centeredSlides={true}
          observer={true}
          observeParents={true}
          freeMode={{
            enabled: true,
            sticky: true,
          }}
          autoplay={{
            delay: 3000,
            disableOnInteraction: true,
            pauseOnMouseEnter: true,
            reverseDirection: false,
          }}
          speed={1500}
          loop={true}
          allowTouchMove={true}
          grabCursor={true}
          watchSlidesProgress={true}
          resistance={true}
          resistanceRatio={0.85}
          onTouchStart={handleUserInteraction}
          onTouchMove={handleUserInteraction}
          onTouchEnd={handleUserInteraction}
          onMouseEnter={handleUserInteraction}
          onMouseLeave={handleUserInteraction}
          className={styles["stats-scroller__track"]}
        >
          {duplicatedStatPairs.map((pair, index) => (
            <SwiperSlide
              key={index}
              className={styles["stats-scroller__slide"]}
            >
              <StatPair pair={pair} />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </div>
  );
};

export default StatsScroller;
