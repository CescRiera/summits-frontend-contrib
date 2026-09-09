import React, { useState, useEffect, useRef } from "react";
import styles from "./desktop-WeatherMap.module.css";
import { getPeakWeather } from "../../../../../shared/api/endpoints/peaks";
import type { WeatherData } from "../../../../../shared/api/types";
import {
  getWeatherIcon,
  type SupportedLanguage,
} from "./desktop-utils/desktop-WeatherIcons.ts";
import { useI18n } from "../../../../../shared/context/I18nContext";
import {
  DEFAULT_LANGUAGE,
  getIntlLocale,
  isAppLanguage,
} from "../../../../../shared/i18n/languages";
import AppModal from "../../../../../shared/components/AppModal";
import { formatSnowRange } from "../../../../../shared/utils/weatherUtils";
import {
  Cloud,
  CloudRain,
  CloudSnow,
  Wind,
  Thermometer,
  X,
  SunMedium,
  Sunrise,
  Sunset,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { smoothScrollHorizontal } from "../../../../../desktop/desktop-utils/desktop-smoothScroll";
import {
  usePeakDetailsAnalytics,
  usePeakDetailsView,
} from "../../../../../shared/hooks/usePeakDetailsAnalytics";

type WeatherProps = {
  peakId: number;
};

const WeatherMap: React.FC<WeatherProps> = ({ peakId }) => {
  const { t, language } = useI18n();
  const locale = getIntlLocale(language);
  const weatherLanguage: SupportedLanguage = isAppLanguage(language)
    ? language
    : DEFAULT_LANGUAGE;
  const { trackSectionEvent } = usePeakDetailsAnalytics(
    "desktop_map",
    "weather",
    peakId
  );
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [showHourlyModal, setShowHourlyModal] = useState(false);
  const forecastScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const hideArrowTimeoutRef = useRef<{
    left: NodeJS.Timeout | null;
    right: NodeJS.Timeout | null;
  }>({ left: null, right: null });

  useEffect(() => {
    if (!peakId) return;

    getPeakWeather(peakId, 7, weatherLanguage)
      .then((data) => {
        setWeather(data);
      })
      .catch(() => {});
  }, [peakId, weatherLanguage]);

  // Check scroll position for forecast scroll
  const checkScrollPosition = () => {
    if (!forecastScrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = forecastScrollRef.current;
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
    if (!forecastScrollRef.current) return;
    checkScrollPosition();
    const scrollElement = forecastScrollRef.current;
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
  }, [weather?.daily_forecast]);

  const scrollForecast = (direction: "left" | "right") => {
    trackSectionEvent("button_click", `scroll_${direction}`);
    smoothScrollHorizontal(forecastScrollRef.current, direction);
  };

  // Get today's forecast (first day)
  const today = weather?.daily_forecast?.[0];
  const todayWeatherIcon = today
    ? getWeatherIcon(
        today.pictocode.toString().padStart(2, "0"),
        weatherLanguage,
        true
      )
    : null;

  // Find hourly data for selected day
  const hourlyForSelectedDay =
    selectedDay && weather?.hourly_forecast
      ? weather.hourly_forecast.filter((h) => h.time.startsWith(selectedDay))
      : [];

  // Helper function to get weather icon based on isdaylight
  const getWeatherIconWithDaylight = (
    pictocode: number,
    isdaylight: number
  ) => {
    const code = pictocode.toString().padStart(2, "0");
    // isdaylight: 1 = day, 0 = night
    return getWeatherIcon(
      code,
      weatherLanguage,
      false,
      isdaylight === 1
    );
  };

  // Helper function to get wind direction arrow
  const getWindDirectionArrow = (direction: number) => {
    return (
      <svg
        className={styles["weather__wind-arrow"]}
        style={{ transform: `rotate(${direction}deg)` }}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 2L12 22" />
        <path d="M12 2L16 6" />
        <path d="M12 2L8 6" />
      </svg>
    );
  };

  // Helper function to convert wind direction degrees to cardinal directions
  const getWindDirectionText = (direction: number) => {
    const directions = [
      "N",
      "NNE",
      "NE",
      "ENE",
      "E",
      "ESE",
      "SE",
      "SSE",
      "S",
      "SSW",
      "SW",
      "WSW",
      "W",
      "WNW",
      "NW",
      "NNW",
    ];
    const index = Math.round(direction / 22.5) % 16;
    return directions[index];
  };

  // Helper function to get UV index color class
  const getUvIndexClass = (uv: number) => {
    if (uv >= 11) return styles["uv-extreme"];
    if (uv >= 8) return styles["uv-very-high"];
    if (uv >= 6) return styles["uv-high"];
    if (uv >= 3) return styles["uv-moderate"];
    return styles["uv-low"];
  };

  const handleCloseModal = () => {
    trackSectionEvent("interaction", "hourly_close");
    setShowHourlyModal(false);
  };

  const openHourlyModal = (date: string, source: string) => {
    trackSectionEvent("interaction", "hourly_open", source);
    setSelectedDay(date);
    setShowHourlyModal(true);
  };

  usePeakDetailsView(
    "desktop_map",
    "weather",
    Boolean(weather?.daily_forecast && weather.daily_forecast.length > 0),
    peakId
  );

  return (
    <section className={styles["weather"]}>
      <h3
        className={`${styles["weather__title"]} typography-desktop-body-small`}
      >
        <Cloud className={styles["weather__icon"]} />
        {t("weather.title")}
      </h3>

      {/* Current/Today's Weather */}
      {today && todayWeatherIcon && (
        <div
          className={styles["weather__current"]}
          tabIndex={0}
          role="button"
          aria-label={t("weather.showHourlyForecastForToday")}
          onClick={() => {
            openHourlyModal(today.date, "today");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              openHourlyModal(today.date, "today");
            }
          }}
        >
          <div className={styles["weather__header"]}>
            <div className={styles["weather__icon-container"]}>
              <img
                src={todayWeatherIcon.icon}
                alt={todayWeatherIcon.description}
                className={styles["weather__main-icon"]}
                style={{ width: 70, height: 70, filter: "none" }}
              />
            </div>
            <div className={styles["weather__main"]}>
              <div
                className={`${styles["weather__current-desc"]} typography-desktop-body-small`}
              >
                {todayWeatherIcon.description}
              </div>
              <div className={styles["weather__current-temp-row"]}>
                <span
                  className={`${styles["weather__current-temp"]} typography-desktop-body-medium`}
                >
                  {Math.round(today.temperature.instant)}°C
                </span>
                <span
                  className={`${styles["weather__current-feelslike"]} typography-desktop-body-small`}
                >
                  {t("weather.feelsLike")}{" "}
                  {Math.round(today.apparent_temperature.mean)}°
                </span>
              </div>
            </div>
          </div>
          <div className={styles["weather__today-row"]}>
            <div className={styles["weather__today-col"]}>
              <div
                className={`${styles["weather__today-col-label"]} typography-desktop-label-medium`}
              >
                <Thermometer className={styles["weather__today-col-icon"]} />
                {t("weather.temperature").toUpperCase()}
              </div>
              <div
                className={`${styles["weather__today-col-value"]} typography-desktop-body-small`}
              >
                {Math.round(today.temperature.max)}°{" "}
                <span className={styles["weather__today-divider"]}>|</span>{" "}
                {Math.round(today.temperature.min)}°
              </div>
            </div>
            <div className={styles["weather__today-col"]}>
              <div
                className={`${styles["weather__today-col-label"]} typography-desktop-label-medium`}
              >
                <Wind className={styles["weather__today-col-icon"]} />
                {t("weather.wind").toUpperCase()}
              </div>
              <div
                className={`${styles["weather__today-col-value"]} typography-desktop-body-small`}
              >
                <span className={styles["weather__wind-arrow-container"]}>
                  {getWindDirectionArrow(today.wind.direction)}
                </span>
                <span
                  className={`${styles["weather__wind-direction"]} typography-desktop-label-medium`}
                >
                  {getWindDirectionText(today.wind.direction)}
                </span>
                <span className={styles["weather__today-wind-values-col"]}>
                  <span className="typography-desktop-label-medium">
                    {Math.round(today.wind.speed_max * 3.6)}{" "}
                    <span className={styles["weather__today-divider"]}>|</span>{" "}
                    {Math.round(today.wind.speed_min * 3.6)}
                  </span>
                  <span
                    className={`${styles["weather__today-wind-kmh"]} typography-desktop-label-medium`}
                  >
                    {t("weather.kmh")}
                  </span>
                </span>
              </div>
            </div>
          </div>
          <div className={styles["weather__today-row"]}>
            <div className={styles["weather__today-col"]}>
              <div
                className={`${styles["weather__today-col-label"]} typography-desktop-label-medium`}
              >
                {today.snow_fraction === 1 ? (
                  <>
                    <CloudSnow className={styles["weather__today-col-icon"]} />{" "}
                    {t("weather.snow").toUpperCase()}
                  </>
                ) : (
                  <>
                    <CloudRain className={styles["weather__today-col-icon"]} />{" "}
                    {t("weather.precipitation").toUpperCase()}
                  </>
                )}
              </div>
              <div
                className={`${styles["weather__today-col-value"]} typography-desktop-body-small`}
              >
                <span
                  className={`${styles["weather__today-precip-value"]} typography-desktop-body-small`}
                >
                  {today.snow_fraction === 1
                    ? formatSnowRange(
                        today.precipitation.amount,
                        t("weather.cm")
                      )
                    : `${today.precipitation.amount}${t("weather.mm")}`}
                </span>
                <span className={styles["weather__today-divider"]}>|</span>
                <span
                  className={`${styles["weather__today-precip-value"]} typography-desktop-body-small`}
                >
                  {today.precipitation.probability}%
                </span>
              </div>
            </div>
            <div className={styles["weather__today-col"]}>
              <div
                className={`${styles["weather__today-col-label"]} typography-desktop-label-medium`}
              >
                <SunMedium className={styles["weather__today-col-icon"]} />{" "}
                {t("weather.uvIndex").toUpperCase()}
              </div>
              <div
                className={`${styles["weather__today-col-value"]} typography-desktop-body-small`}
              >
                <span
                  className={`${getUvIndexClass(
                    today.uvindex
                  )} typography-desktop-body-small`}
                >
                  {today.uvindex}
                </span>
              </div>
            </div>
          </div>
          <div className={styles["weather__today-row"]}>
            <div className={styles["weather__today-col"]}>
              <div
                className={`${styles["weather__today-col-label"]} typography-desktop-label-medium`}
              >
                <Sunrise className={styles["weather__today-col-icon"]} />
                {t("weather.sunrise").toUpperCase()}
              </div>
              <div
                className={`${styles["weather__today-col-value"]} typography-desktop-body-small`}
              >
                {today.sunrise}
              </div>
            </div>
            <div className={styles["weather__today-col"]}>
              <div
                className={`${styles["weather__today-col-label"]} typography-desktop-label-medium`}
              >
                <Sunset className={styles["weather__today-col-icon"]} />
                {t("weather.sunset").toUpperCase()}
              </div>
              <div
                className={`${styles["weather__today-col-value"]} typography-desktop-body-small`}
              >
                {today.sunset}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Individual forecast cards in horizontal scroller with date headers */}
      {weather?.daily_forecast && (
        <div className={styles["weather__forecast-scroll-container"]}>
          {canScrollLeft && (
            <button
              className={`${styles["weather__forecast-scroll-arrow"]} ${styles["weather__forecast-scroll-arrow--left"]}`}
              onClick={() => scrollForecast("left")}
              aria-label="Scroll left"
            >
              <ChevronLeft size={20} />
            </button>
          )}
          {canScrollRight && (
            <button
              className={`${styles["weather__forecast-scroll-arrow"]} ${styles["weather__forecast-scroll-arrow--right"]}`}
              onClick={() => scrollForecast("right")}
              aria-label="Scroll right"
            >
              <ChevronRight size={20} />
            </button>
          )}
          <div
            className={styles["weather__forecast-scroll"]}
            ref={forecastScrollRef}
          >
            {weather.daily_forecast.slice(1).map((day, idx) => {
              const dayWeatherIcon = getWeatherIcon(
                day.pictocode.toString().padStart(2, "0"),
                weatherLanguage,
                true
              );
              const isSnow = day.snow_fraction === 1;
              const date = new Date(day.date);
              const formattedDate = date.toLocaleDateString(locale, {
                weekday: "long",
                month: "short",
                day: "numeric",
              });

              return (
                <div
                  key={idx}
                  className={styles["weather__forecast-day-container"]}
                >
                  {/* Date header outside the card */}
                  <div
                    className={`${styles["weather__forecast-date-header"]} typography-desktop-body-small`}
                  >
                    {formattedDate}
                  </div>

                  {/* Forecast card */}
                  <div
                    className={styles["weather__forecast-card"]}
                    tabIndex={0}
                    role="button"
                    aria-label={t("weather.showHourlyForecastFor", {
                      date: day.date,
                    })}
                    onClick={() => {
                      openHourlyModal(day.date, day.date);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        openHourlyModal(day.date, day.date);
                      }
                    }}
                  >
                    {/* Row 1: Icon + Description */}
                    <div className={styles["weather__forecast-icon-desc-row"]}>
                      <div
                        className={
                          styles["weather__forecast-icon"] +
                          " " +
                          styles["weather__hourly-icon--day"]
                        }
                      >
                        <img
                          src={dayWeatherIcon.icon}
                          alt={dayWeatherIcon.description}
                          className={styles["weather__small-icon"]}
                          title={dayWeatherIcon.description}
                        />
                      </div>
                      <div
                        className={`${styles["weather__forecast-desc-main"]} typography-desktop-body-small`}
                      >
                        {dayWeatherIcon.description}
                      </div>
                    </div>
                    {/* Row 2: 2x2 Grid for metrics */}
                    <div className={styles["weather__forecast-grid"]}>
                      {/* Top-left: Temperature */}
                      <div className={styles["weather__forecast-info-2block"]}>
                        <div
                          className={`${styles["weather__forecast-info-2label"]} typography-desktop-label-medium`}
                        >
                          <Thermometer
                            className={styles["weather__forecast-info-2icon"]}
                          />
                          {t("weather.temperature").toUpperCase()}
                        </div>
                        <span
                          className={`${styles["weather__forecast-info-2value"]} typography-desktop-label-medium`}
                        >
                          {Math.round(day.temperature.mean)}°
                        </span>
                      </div>

                      {/* Top-right: Wind */}
                      <div className={styles["weather__forecast-info-2block"]}>
                        <div
                          className={`${styles["weather__forecast-info-2label"]} typography-desktop-label-medium`}
                        >
                          <Wind
                            className={styles["weather__forecast-info-2icon"]}
                          />
                          {t("weather.wind").toUpperCase()}
                        </div>
                        <span
                          className={styles["weather__wind-arrow-container"]}
                        >
                          {getWindDirectionArrow(day.wind.direction)}
                        </span>
                        <span
                          className={`${styles["weather__wind-direction"]} typography-desktop-label-medium`}
                        >
                          {getWindDirectionText(day.wind.direction)}
                        </span>
                        <span
                          className={`${styles["weather__forecast-info-2value"]} typography-desktop-label-medium`}
                        >
                          {Math.round(day.wind.speed_mean * 3.6)}{" "}
                          {t("weather.kmh")}
                        </span>
                      </div>

                      {/* Bottom-left: UV */}
                      <div className={styles["weather__forecast-info-2block"]}>
                        <div
                          className={`${styles["weather__forecast-info-2label"]} typography-desktop-label-medium`}
                        >
                          <SunMedium
                            className={styles["weather__forecast-info-2icon"]}
                          />
                          {t("weather.uvIndex").toUpperCase()}
                        </div>
                        <span
                          className={`${getUvIndexClass(
                            day.uvindex
                          )} typography-desktop-body-small`}
                        >
                          {day.uvindex}
                        </span>
                      </div>

                      {/* Bottom-right: Precipitation / Snow */}
                      <div className={styles["weather__forecast-info-2block"]}>
                        <div
                          className={`${styles["weather__forecast-info-2label"]} typography-desktop-label-medium`}
                        >
                          {isSnow ? (
                            <>
                              <CloudSnow
                                className={
                                  styles["weather__forecast-info-2icon"]
                                }
                              />{" "}
                              {t("weather.snow").toUpperCase()}
                            </>
                          ) : (
                            <>
                              <CloudRain
                                className={
                                  styles["weather__forecast-info-2icon"]
                                }
                              />{" "}
                              {t("weather.precipitation").toUpperCase()}
                            </>
                          )}
                        </div>
                        <span
                          className={`${styles["weather__forecast-info-2value"]} typography-desktop-label-medium`}
                        >
                          {isSnow
                            ? formatSnowRange(
                                day.precipitation.amount,
                                t("weather.cm")
                              )
                            : `${day.precipitation.amount}${t("weather.mm")}`}
                        </span>
                        <span
                          className={`${styles["weather__forecast-info-2value"]} typography-desktop-label-medium`}
                        >
                          {day.precipitation.probability}%
                        </span>
                      </div>
                    </div>

                    {/* Row 3: Sunrise and Sunset */}
                    <div className={styles["weather__forecast-sun-times"]}>
                      <div className={styles["weather__forecast-sun-time"]}>
                        <div
                          className={`${styles["weather__forecast-sun-label"]} typography-desktop-label-medium`}
                        >
                          <Sunrise
                            className={styles["weather__forecast-sun-icon"]}
                          />
                          {t("weather.sunrise").toUpperCase()}
                        </div>
                        <span
                          className={`${styles["weather__forecast-sun-value"]} typography-desktop-body-small`}
                        >
                          {day.sunrise}
                        </span>
                      </div>
                      <div className={styles["weather__forecast-sun-time"]}>
                        <div
                          className={`${styles["weather__forecast-sun-label"]} typography-desktop-label-medium`}
                        >
                          <Sunset
                            className={styles["weather__forecast-sun-icon"]}
                          />
                          {t("weather.sunset").toUpperCase()}
                        </div>
                        <span
                          className={`${styles["weather__forecast-sun-value"]} typography-desktop-body-small`}
                        >
                          {day.sunset}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Weather Info Footer removed */}

      {/* Hourly Modal - Same format for today and other days */}
      {showHourlyModal && selectedDay && (
        <AppModal
          open={showHourlyModal}
          onClose={handleCloseModal}
          variant="dialog"
          ariaLabel={t("weather.hourlyForecast")}
          contentClassName={styles["weather__modal"]}
        >
              <div className={styles["weather__modal-header"]}>
                <div className={styles["weather__modal-header-content"]}>
                  <h3
                    className={`${styles["weather__modal-title"]} typography-desktop-body-small`}
                  >
                    {t("weather.hourlyForecast")}
                  </h3>
                  <p
                    className={`${styles["weather__modal-date"]} typography-desktop-body-small`}
                  >
                    {new Date(selectedDay).toLocaleDateString(locale, {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <button
                  className={styles["weather__modal-close"]}
                  onClick={handleCloseModal}
                  aria-label={t("weather.closeHourlyForecast")}
                >
                  <X size={20} />
                </button>
              </div>
              <div className={styles["weather__hourly-list"]}>
                {hourlyForSelectedDay.map((h, i) => {
                  const hourlyIcon = getWeatherIconWithDaylight(
                    h.pictocode,
                    h.isdaylight
                  );

                  return (
                    <div key={i} className={styles["weather__hourly-row"]}>
                      <div
                        className={`${styles["weather__hourly-time"]} typography-desktop-body-small`}
                      >
                        {h.time.slice(11, 16)}
                      </div>
                      <div className={styles["weather__hourly-main"]}>
                        <div className={styles["weather__hourly-temp-row"]}>
                          <div
                            className={
                              `${styles["weather__hourly-icon"]} ` +
                              (h.isdaylight === 1
                                ? styles["weather__hourly-icon--day"]
                                : styles["weather__hourly-icon--night"])
                            }
                          >
                            <img
                              src={hourlyIcon.icon}
                              alt={hourlyIcon.description}
                              className={styles["weather__hourly-weather-icon"]}
                              title={hourlyIcon.description}
                            />
                          </div>
                          <div className={styles["weather__hourly-temp-info"]}>
                            <div
                              className={`${styles["weather__hourly-temp"]} typography-desktop-body-small`}
                            >
                              {Math.round(h.temperature)}°
                            </div>
                            <div
                              className={`${styles["weather__hourly-feels"]} typography-desktop-label-medium`}
                            >
                              {t("weather.feelsLike")}{" "}
                              {Math.round(h.apparent_temperature)}°
                            </div>
                          </div>
                          <div
                            className={styles["weather__hourly-precip-info"]}
                          >
                            {h.snow_fraction === 1 ? (
                              <>
                                <CloudSnow
                                  className={
                                    styles["weather__hourly-precip-icon"]
                                  }
                                />
                                <span className="typography-desktop-label-medium">
                                  {formatSnowRange(
                                    h.precipitation.amount,
                                    t("weather.cm")
                                  )}
                                </span>
                              </>
                            ) : (
                              <>
                                <CloudRain
                                  className={
                                    styles["weather__hourly-precip-icon"]
                                  }
                                />
                                <span className="typography-desktop-label-medium">
                                  {h.precipitation.amount}
                                  {t("weather.mm")}
                                </span>
                              </>
                            )}
                            <span className="typography-desktop-label-medium">
                              {h.precipitation.probability}%
                            </span>
                          </div>
                        </div>
                        <div className={styles["weather__hourly-details-row"]}>
                          <div className={styles["weather__hourly-wind"]}>
                            <span
                              className={`${styles["weather__wind-label"]} typography-desktop-label-medium`}
                            >
                              {t("weather.wind").toUpperCase()}
                            </span>
                            <div
                              className={
                                styles["weather__wind-direction-container"]
                              }
                            >
                              <span
                                className={`${styles["weather__wind-direction"]} typography-desktop-label-medium`}
                              >
                                {getWindDirectionText(h.wind.direction)}
                              </span>
                              <span
                                className={
                                  styles["weather__wind-arrow-container"]
                                }
                              >
                                {getWindDirectionArrow(h.wind.direction)}
                              </span>
                              <span
                                className={`${styles["weather__wind-speed"]} typography-desktop-label-medium`}
                              >
                                {Math.round(h.wind.speed * 3.6)}{" "}
                                {t("weather.kmh")}
                              </span>
                            </div>
                          </div>
                          <div className={styles["weather__uv-section"]}>
                            <span
                              className={`${styles["weather__uv-label"]} typography-desktop-label-medium`}
                            >
                              UV
                            </span>
                            <span
                              className={`${getUvIndexClass(
                                h.uvindex
                              )} typography-desktop-body-small`}
                            >
                              {h.uvindex}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
        </AppModal>
      )}
    </section>
  );
};

export default WeatherMap;
