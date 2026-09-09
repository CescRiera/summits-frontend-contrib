import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, EffectFade } from "swiper/modules";
import { useI18n } from "../../../shared/context/I18nContext";
// @ts-ignore
import "swiper/css";
// @ts-ignore
import "swiper/css/effect-fade";
import { useActivate } from "react-activation";
import styles from "./desktop-AuthShell.module.css";

type AuthShellProps = {
  mode: "login" | "register";
  children: React.ReactNode;
  footer?: React.ReactNode;
};

const HERO_SLIDES = [
  {
    image: "/icons/register/1.png",
    location: "Aguja de Perramó, Huesca",
  },
  {
    image: "/icons/register/2.png",
    location: "Núria, Girona",
  },
  {
    image: "/icons/register/3.png",
    location: "Pedraforca, Barcelona",
  },
  {
    image: "/icons/register/4.png",
    location: "Montserrat, Barcelona",
  },
  {
    image: "/icons/register/5.png",
    location: "Bastiments, Girona",
  },
  {
    image: "/icons/register/6.png",
    location: "Valle de Ordesa, Huesca",
  },
  {
    image: "/icons/register/7.png",
    location: "Chauki Pass, Juta, Georgia",
  },
] as const;

let authShellLastSlideIndex = 0;

const getTabIndex = (mode: AuthShellProps["mode"]) =>
  mode === "register" ? 0 : 1;

const AuthShell: React.FC<AuthShellProps> = ({
  mode,
  children,
  footer,
}) => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const currentTabIndex = getTabIndex(mode);
  const swiperRef = React.useRef<any>(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState(authShellLastSlideIndex);

  // Ensure autoplay starts correctly
  React.useEffect(() => {
    if (swiperRef.current && swiperRef.current.autoplay) {
      swiperRef.current.autoplay.start();
    }
  }, []);

  // Handle reactivation from KeepAlive
  useActivate(() => {
    if (swiperRef.current && swiperRef.current.autoplay) {
      swiperRef.current.autoplay.start();
    }
  });

  return (
    <div className={styles["auth-shell"]}>
      <div className={styles["auth-shell__frame"]}>
        <section className={styles["auth-shell__media"]}>
          <div className={styles["auth-shell__media-location"]}>
            <span className="typography-desktop-label-small">
              {HERO_SLIDES[activeSlideIndex]?.location}
            </span>
          </div>

          <Swiper
            onSwiper={(swiper) => {
              swiperRef.current = swiper;
            }}
            allowTouchMove={false}
            autoplay={{
              delay: 4000,
              disableOnInteraction: false,
            }}
            effect="fade"
            fadeEffect={{ crossFade: true }}
            initialSlide={authShellLastSlideIndex}
            loop={true}
            simulateTouch={false}
            speed={1000}
            observer={true}
            observeParents={true}
            modules={[Autoplay, EffectFade]}
            className={styles["auth-shell__media-swiper"]}
            onRealIndexChange={(swiper) => {
              authShellLastSlideIndex = swiper.realIndex;
              setActiveSlideIndex(swiper.realIndex);
            }}
          >
            {HERO_SLIDES.map((slide) => (
              <SwiperSlide key={slide.image} className={styles["auth-shell__slide"]}>
                <img
                  src={slide.image}
                  alt={slide.location}
                  className={styles["auth-shell__slide-image"]}
                />
                <div className={styles["auth-shell__slide-overlay"]} />
              </SwiperSlide>
            ))}
          </Swiper>
        </section>

        <section className={styles["auth-shell__panel"]}>
          <div className={styles["auth-shell__panel-inner"]}>
            <div className={styles["auth-shell__tabs"]}>
              <span
                className={styles["auth-shell__tab-indicator"]}
                style={{
                  left: currentTabIndex === 0 ? "6px" : "calc(50% + 4px)",
                }}
              />
              <button
                type="button"
                className={`${styles["auth-shell__tab"]} ${
                  mode === "register" ? styles["auth-shell__tab--active"] : ""
                } typography-desktop-button-medium`}
                onClick={() => navigate("/register")}
              >
                {t("auth.signUp")}
              </button>
              <button
                type="button"
                className={`${styles["auth-shell__tab"]} ${
                  mode === "login" ? styles["auth-shell__tab--active"] : ""
                } typography-desktop-button-medium`}
                onClick={() => navigate("/profile")}
              >
                {t("auth.signInButton")}
              </button>
            </div>

            <div className={styles["auth-shell__content"]}>
              <div className={styles["auth-shell__content-inner"]}>
                {children}
              </div>
            </div>

            {footer ? (
              <div className={styles["auth-shell__footer"]}>{footer}</div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
};

export default AuthShell;
