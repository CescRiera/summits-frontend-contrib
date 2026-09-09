import React, { useCallback } from "react";
import { Calendar } from "lucide-react";
import styles from "./desktop-SimpleCalendar.module.css";

type SimpleCalendarProps = {
  startDate: string | null;
  endDate: string | null;
  startDateLabel: string;
  endDateLabel: string;
  onStartDateChange: (date: string | null) => void;
  onEndDateChange: (date: string | null) => void;
};

const SimpleCalendar: React.FC<SimpleCalendarProps> = ({
  startDate,
  endDate,
  startDateLabel,
  endDateLabel,
  onStartDateChange,
  onEndDateChange,
}) => {
  const handleStartDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      if (value) {
        // Validate that start date is not after end date
        if (endDate && new Date(value) > new Date(endDate)) {
          onStartDateChange(value);
          onEndDateChange(null);
          return;
        }
        onStartDateChange(value);
      } else {
        onStartDateChange(null);
      }
    },
    [endDate, onStartDateChange, onEndDateChange]
  );

  const handleEndDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      if (value) {
        // Validate that end date is not before start date
        if (startDate && new Date(value) < new Date(startDate)) {
          onEndDateChange(value);
          onStartDateChange(null);
          return;
        }
        onEndDateChange(value);
      } else {
        onEndDateChange(null);
      }
    },
    [startDate, onStartDateChange, onEndDateChange]
  );

  const handleStartDateClear = useCallback(() => {
    onStartDateChange(null);
  }, [onStartDateChange]);

  const handleEndDateClear = useCallback(() => {
    onEndDateChange(null);
  }, [onEndDateChange]);

  return (
    <div className={styles["calendar"]}>
      <div className={styles["calendar__field"]}>
        <label
          className={`${styles["calendar__label"]} typography-desktop-label-medium`}
        >
          {startDateLabel}
        </label>
        <div className={styles["calendar__input-wrapper"]}>
          <Calendar
            size={16}
            className={styles["calendar__icon"]}
            style={{ color: startDate ? "#1e3a8a" : "#6b7280" }}
          />
          <input
            type="date"
            value={startDate || ""}
            onChange={handleStartDateChange}
            className={`${styles["calendar__input"]} typography-body-small ${
              startDate ? styles["calendar__input--active"] : ""
            }`}
            max={endDate || undefined}
          />
          {startDate && (
            <button
              type="button"
              onClick={handleStartDateClear}
              className={`${styles["calendar__clear"]} typography-desktop-title-small`}
              aria-label="Clear start date"
            >
              ×
            </button>
          )}
        </div>
      </div>

      <div className={styles["calendar__field"]}>
        <label
          className={`${styles["calendar__label"]} typography-desktop-label-medium`}
        >
          {endDateLabel}
        </label>
        <div className={styles["calendar__input-wrapper"]}>
          <Calendar
            size={16}
            className={styles["calendar__icon"]}
            style={{ color: endDate ? "#1e3a8a" : "#6b7280" }}
          />
          <input
            type="date"
            value={endDate || ""}
            onChange={handleEndDateChange}
            className={`${styles["calendar__input"]} typography-body-small ${
              endDate ? styles["calendar__input--active"] : ""
            }`}
            min={startDate || undefined}
          />
          {endDate && (
            <button
              type="button"
              onClick={handleEndDateClear}
              className={`${styles["calendar__clear"]} typography-desktop-title-small`}
              aria-label="Clear end date"
            >
              ×
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(SimpleCalendar);

