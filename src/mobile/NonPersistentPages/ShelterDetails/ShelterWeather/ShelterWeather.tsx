import React, { useState, useEffect } from "react";
import styles from "./ShelterWeather.module.css";
import { getShelterWeather } from "../../../../shared/api/endpoints/shelters";
import type { ShelterWeatherData } from "../../../../shared/api/types";
import { getWeatherIcon, type SupportedLanguage } from "../../PeakDetails/Weather/utils/WeatherIcons";
import { useI18n } from "../../../../shared/context/I18nContext";
import {
  DEFAULT_LANGUAGE,
  getIntlLocale,
  isAppLanguage,
} from "../../../../shared/i18n/languages";
import AppModal from "../../../../shared/components/AppModal";
import { formatSnowRange } from "../../../../shared/utils/weatherUtils";
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
} from "lucide-react";
import ShimmerWrapper from "../../../components/Shimmer/ShimmerWrapper";

type ShelterWeatherProps = {
  shelterId: number;
};

const ShelterWeather: React.FC<ShelterWeatherProps> = ({ shelterId }) => {
  const { t, language } = useI18n();
  const locale = getIntlLocale(language);
  const weatherLanguage: SupportedLanguage = isAppLanguage(language)
    ? language
    : DEFAULT_LANGUAGE;
  const [weather, setWeather] = useState<ShelterWeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [showHourlyModal, setShowHourlyModal] = useState(false);
  useEffect(() => {
    if (!shelterId) return;

    getShelterWeather(shelterId, 7, weatherLanguage)
      .then((data) => {
        setWeather(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [shelterId, weatherLanguage]);

  const hasData = !!(
    weather?.daily_forecast && weather.daily_forecast.length > 0
  );

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
    setShowHourlyModal(false);
  };

  const openHourlyModal = (date: string) => {
    setSelectedDay(date);
    setShowHourlyModal(true);
  };

  return (
    <ShimmerWrapper isLoading={loading} hasData={hasData}>
      <section className={styles["weather"]}>
        <h3 className={`${styles["weather__title"]} typography-title-medium`}>
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
              openHourlyModal(today.date);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                openHourlyModal(today.date);
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
                  className={`${styles["weather__current-desc"]} typography-body-medium`}
                >
                  {todayWeatherIcon.description}
                </div>
                <div className={styles["weather__current-temp-row"]}>
                  <span
                    className={`${styles["weather__current-temp"]} typography-title-large`}
                  >
                    {Math.round(today.temperature.instant)}°C
                  </span>
                  <span
                    className={`${styles["weather__current-feelslike"]} typography-body-medium`}
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
                  className={`${styles["weather__today-col-label"]} typography-label-medium`}
                >
                  <Thermometer className={styles["weather__today-col-icon"]} />
                  {t("weather.temperature").toUpperCase()}
                </div>
                <div
                  className={`${styles["weather__today-col-value"]} typography-title-medium`}
                >
                  {Math.round(today.temperature.max)}°{" "}
                  <span className={styles["weather__today-divider"]}>|</span>{" "}
                  {Math.round(today.temperature.min)}°
                </div>
              </div>
              <div className={styles["weather__today-col"]}>
                <div
                  className={`${styles["weather__today-col-label"]} typography-label-medium`}
                >
                  <Wind className={styles["weather__today-col-icon"]} />
                  {t("weather.wind").toUpperCase()}
                </div>
                <div
                  className={`${styles["weather__today-col-value"]} typography-title-medium`}
                >
                  <span className={styles["weather__wind-arrow-container"]}>
                    {getWindDirectionArrow(today.wind.direction)}
                  </span>
                  <span
                    className={`${styles["weather__wind-direction"]} typography-body-small`}
                  >
                    {getWindDirectionText(today.wind.direction)}
                  </span>
                  <span className={styles["weather__today-wind-values-col"]}>
                    <span className="typography-body-small">
                      {Math.round(today.wind.speed_max * 3.6)}{" "}
                      <span className={styles["weather__today-divider"]}>
                        |
                      </span>{" "}
                      {Math.round(today.wind.speed_min * 3.6)}
                    </span>
                    <span
                      className={`${styles["weather__today-wind-kmh"]} typography-body-small`}
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
                  className={`${styles["weather__today-col-label"]} typography-label-medium`}
                >
                  {today.snow_fraction === 1 ? (
                    <>
                      <CloudSnow
                        className={styles["weather__today-col-icon"]}
                      />{" "}
                      {t("weather.snow").toUpperCase()}
                    </>
                  ) : (
                    <>
                      <CloudRain
                        className={styles["weather__today-col-icon"]}
                      />{" "}
                      {t("weather.precipitation").toUpperCase()}
                    </>
                  )}
                </div>
                <div
                  className={`${styles["weather__today-col-value"]} typography-title-medium`}
                >
                  <span
                    className={`${styles["weather__today-precip-value"]} typography-body-medium`}
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
                    className={`${styles["weather__today-precip-value"]} typography-body-medium`}
                  >
                    {today.precipitation.probability}%
                  </span>
                </div>
              </div>
              <div className={styles["weather__today-col"]}>
                <div
                  className={`${styles["weather__today-col-label"]} typography-label-medium`}
                >
                  <SunMedium className={styles["weather__today-col-icon"]} />{" "}
                  {t("weather.uvIndex").toUpperCase()}
                </div>
                <div
                  className={`${styles["weather__today-col-value"]} typography-title-medium`}
                >
                  <span
                    className={`${getUvIndexClass(
                      today.uvindex
                    )} typography-body-medium`}
                  >
                    {today.uvindex}
                  </span>
                </div>
              </div>
            </div>
            <div className={styles["weather__today-row"]}>
              <div className={styles["weather__today-col"]}>
                <div
                  className={`${styles["weather__today-col-label"]} typography-label-medium`}
                >
                  <Sunrise className={styles["weather__today-col-icon"]} />
                  {t("weather.sunrise").toUpperCase()}
                </div>
                <div
                  className={`${styles["weather__today-col-value"]} typography-title-medium`}
                >
                  {today.sunrise}
                </div>
              </div>
              <div className={styles["weather__today-col"]}>
                <div
                  className={`${styles["weather__today-col-label"]} typography-label-medium`}
                >
                  <Sunset className={styles["weather__today-col-icon"]} />
                  {t("weather.sunset").toUpperCase()}
                </div>
                <div
                  className={`${styles["weather__today-col-value"]} typography-title-medium`}
                >
                  {today.sunset}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Individual forecast cards in horizontal scroller with date headers */}
        {weather?.daily_forecast && (
          <div className={styles["weather__forecast-scroll"]}>
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
                    className={`${styles["weather__forecast-date-header"]} typography-title-medium`}
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
                      openHourlyModal(day.date);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        openHourlyModal(day.date);
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
                        className={`${styles["weather__forecast-desc-main"]} typography-body-medium`}
                      >
                        {dayWeatherIcon.description}
                      </div>
                    </div>
                    {/* Row 2: 2x2 Grid for metrics */}
                    <div className={styles["weather__forecast-grid"]}>
                      {/* Top-left: Temperature */}
                      <div className={styles["weather__forecast-info-2block"]}>
                        <div
                          className={`${styles["weather__forecast-info-2label"]} typography-label-medium`}
                        >
                          <Thermometer
                            className={styles["weather__forecast-info-2icon"]}
                          />
                          {t("weather.temperature").toUpperCase()}
                        </div>
                        <span
                          className={`${styles["weather__forecast-info-2value"]} typography-title-small`}
                        >
                          {Math.round(day.temperature.mean)}°
                        </span>
                      </div>

                      {/* Top-right: Wind */}
                      <div className={styles["weather__forecast-info-2block"]}>
                        <div
                          className={`${styles["weather__forecast-info-2label"]} typography-label-medium`}
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
                          className={`${styles["weather__wind-direction"]} typography-label-medium`}
                        >
                          {getWindDirectionText(day.wind.direction)}
                        </span>
                        <span
                          className={`${styles["weather__forecast-info-2value"]} typography-title-small`}
                        >
                          {Math.round(day.wind.speed_mean * 3.6)}{" "}
                          {t("weather.kmh")}
                        </span>
                      </div>

                      {/* Bottom-left: UV */}
                      <div className={styles["weather__forecast-info-2block"]}>
                        <div
                          className={`${styles["weather__forecast-info-2label"]} typography-label-medium`}
                        >
                          <SunMedium
                            className={styles["weather__forecast-info-2icon"]}
                          />
                          {t("weather.uvIndex").toUpperCase()}
                        </div>
                        <span
                          className={`${getUvIndexClass(
                            day.uvindex
                          )} typography-body-medium`}
                        >
                          {day.uvindex}
                        </span>
                      </div>

                      {/* Bottom-right: Precipitation / Snow */}
                      <div className={styles["weather__forecast-info-2block"]}>
                        <div
                          className={`${styles["weather__forecast-info-2label"]} typography-label-medium`}
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
                          className={`${styles["weather__forecast-info-2value"]} typography-title-small`}
                        >
                          {isSnow
                            ? formatSnowRange(
                                day.precipitation.amount,
                                t("weather.cm")
                              )
                            : `${day.precipitation.amount}${t("weather.mm")}`}
                        </span>
                        <span
                          className={`${styles["weather__forecast-info-2value"]} typography-title-small`}
                        >
                          {day.precipitation.probability}%
                        </span>
                      </div>
                    </div>

                    {/* Row 3: Sunrise and Sunset */}
                    <div className={styles["weather__forecast-sun-times"]}>
                      <div className={styles["weather__forecast-sun-time"]}>
                        <div
                          className={`${styles["weather__forecast-sun-label"]} typography-label-medium`}
                        >
                          <Sunrise
                            className={styles["weather__forecast-sun-icon"]}
                          />
                          {t("weather.sunrise").toUpperCase()}
                        </div>
                        <span
                          className={`${styles["weather__forecast-sun-value"]} typography-body-medium`}
                        >
                          {day.sunrise}
                        </span>
                      </div>
                      <div className={styles["weather__forecast-sun-time"]}>
                        <div
                          className={`${styles["weather__forecast-sun-label"]} typography-label-medium`}
                        >
                          <Sunset
                            className={styles["weather__forecast-sun-icon"]}
                          />
                          {t("weather.sunset").toUpperCase()}
                        </div>
                        <span
                          className={`${styles["weather__forecast-sun-value"]} typography-body-medium`}
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
        )}

        {/* Hourly Modal - Same format for today and other days */}
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
                className={`${styles["weather__modal-title"]} typography-title-medium`}
              >
                {t("weather.hourlyForecast")}
              </h3>
              <p
                className={`${styles["weather__modal-date"]} typography-body-medium`}
              >
                {selectedDay ? new Date(selectedDay).toLocaleDateString(locale, {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                }) : ""}
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
                    className={`${styles["weather__hourly-time"]} typography-body-medium`}
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
                          className={
                            styles["weather__hourly-weather-icon"]
                          }
                          title={hourlyIcon.description}
                        />
                      </div>
                      <div
                        className={styles["weather__hourly-temp-info"]}
                      >
                        <div
                          className={`${styles["weather__hourly-temp"]} typography-title-medium`}
                        >
                          {Math.round(h.temperature)}°
                        </div>
                        <div
                          className={`${styles["weather__hourly-feels"]} typography-body-small`}
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
                            <span className="typography-body-small">
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
                            <span className="typography-body-small">
                              {h.precipitation.amount}
                              {t("weather.mm")}
                            </span>
                          </>
                        )}
                        <span className="typography-body-small">
                          {h.precipitation.probability}%
                        </span>
                      </div>
                    </div>
                    <div
                      className={styles["weather__hourly-details-row"]}
                    >
                      <div className={styles["weather__hourly-wind"]}>
                        <span
                          className={`${styles["weather__wind-label"]} typography-label-medium`}
                        >
                          {t("weather.wind").toUpperCase()}
                        </span>
                        <div
                          className={
                            styles["weather__wind-direction-container"]
                          }
                        >
                          <span
                            className={`${styles["weather__wind-direction"]} typography-body-small`}
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
                            className={`${styles["weather__wind-speed"]} typography-body-small`}
                          >
                            {Math.round(h.wind.speed * 3.6)}{" "}
                            {t("weather.kmh")}
                          </span>
                        </div>
                      </div>
                      <div className={styles["weather__uv-section"]}>
                        <span
                          className={`${styles["weather__uv-label"]} typography-label-medium`}
                        >
                          UV
                        </span>
                        <span
                          className={`${getUvIndexClass(
                            h.uvindex
                          )} typography-body-medium`}
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
      </section>
    </ShimmerWrapper>
  );
};

export default ShelterWeather;
