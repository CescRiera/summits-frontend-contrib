import { Fragment, useCallback, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import Picker, { type PickerValue } from "react-mobile-picker";
import "./ModalPicker.css";

interface SingleDatePickerProps {
  onDateChange?: (date: string | null) => void;
  initialDate?: string | null;
  buttonLabel: string;
  isActive?: boolean;
  controlledOpen?: boolean;
  onControlledClose?: () => void;
}

function getDayArray(year: number, month: number) {
  const dayCount = new Date(year, month, 0).getDate();
  return Array.from({ length: dayCount }, (_, i) =>
    String(i + 1).padStart(2, "0"),
  );
}

function getTodayPickerValue(): PickerValue {
  const now = new Date();
  return {
    year: String(now.getFullYear()),
    month: String(now.getMonth() + 1).padStart(2, "0"),
    day: String(now.getDate()).padStart(2, "0"),
  };
}

export default function SingleDatePicker({
  onDateChange,
  initialDate,
  buttonLabel,
  isActive = false,
  controlledOpen,
  onControlledClose,
}: SingleDatePickerProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;
  const [pickerValue, setPickerValue] = useState<PickerValue>(
    () => getTodayPickerValue(),
  );

  const handleClose = useCallback(() => {
    if (isControlled) {
      onControlledClose?.();
    } else {
      setInternalOpen(false);
    }
  }, [isControlled, onControlledClose]);

  const currentYear = new Date().getFullYear();
  const yearRange = Array.from({ length: 50 }, (_, i) =>
    String(currentYear - i),
  );

  const handlePickerChange = useCallback(
    (newValue: PickerValue, key: string) => {
      const year = newValue["year"];
      const month = newValue["month"];
      const day = newValue["day"];

      if (year === undefined || month === undefined || day === undefined)
        return;

      if (key === "day") {
        setPickerValue({
          year,
          month,
          day,
        } as PickerValue);
        return;
      }

      const daysInMonth = getDayArray(Number(year), Number(month));
      const dayStr = String(day);
      const validDay = daysInMonth.includes(dayStr)
        ? dayStr
        : daysInMonth[daysInMonth.length - 1];

      setPickerValue({
        year,
        month,
        day: validDay,
      } as PickerValue);
    },
    [],
  );

  const handleApplyDate = useCallback(() => {
    const dateStr = `${pickerValue["year"]}-${pickerValue["month"]}-${pickerValue["day"]}`;
    onDateChange?.(dateStr);
    handleClose();
  }, [pickerValue, onDateChange, handleClose]);

  const handleClearDate = useCallback(() => {
    onDateChange?.(null);
    handleClose();
  }, [onDateChange, handleClose]);

  const formatDateForDisplay = (date: string) => {
    const parsed = new Date(date);
    return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(
      2,
      "0",
    )}-${String(parsed.getDate()).padStart(2, "0")}`;
  };

  const getButtonContent = () => {
    if (initialDate) {
      return (
        <>
          <div className="button-label typography-button-medium">
            {buttonLabel}
          </div>
          <div className="button-date typography-body-medium">
            {formatDateForDisplay(initialDate)}
          </div>
        </>
      );
    }

    return (
      <div className="button-label typography-button-medium">{buttonLabel}</div>
    );
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setPickerValue(getTodayPickerValue());
          setInternalOpen(true);
        }}
        className={`trigger-button ${isActive ? "trigger-button--active" : ""}`}
      >
        {getButtonContent()}
      </button>

      <Transition appear show={isOpen} as={Fragment}>
        <Dialog
          as="div"
          className="dialog-overlay"
          onClose={handleClose}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="dialog-overlay" />
          </Transition.Child>

          <div className="dialog-container">
            <div className="dialog-content">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="dialog-panel">
                  <Dialog.Title
                    as="h3"
                    className="dialog-title typography-title-medium"
                  >
                    Choose {buttonLabel}
                  </Dialog.Title>

                  <div className="picker-container">
                    <Picker
                      value={pickerValue}
                      onChange={handlePickerChange}
                      wheelMode="natural"
                    >
                      <Picker.Column name="year">
                        {yearRange.map((year) => (
                          <Picker.Item key={year} value={year}>
                            {({ selected }) => (
                              <div
                                className={
                                  selected
                                    ? "picker-item picker-item-selected"
                                    : "picker-item picker-item-unselected"
                                }
                              >
                                {year}
                              </div>
                            )}
                          </Picker.Item>
                        ))}
                      </Picker.Column>

                      <Picker.Column name="month">
                        {Array.from({ length: 12 }, (_, i) =>
                          String(i + 1).padStart(2, "0"),
                        ).map((month) => (
                          <Picker.Item key={month} value={month}>
                            {({ selected }) => (
                              <div
                                className={
                                  selected
                                    ? "picker-item picker-item-selected"
                                    : "picker-item picker-item-unselected"
                                }
                              >
                                {month}
                              </div>
                            )}
                          </Picker.Item>
                        ))}
                      </Picker.Column>

                      <Picker.Column name="day">
                        {getDayArray(
                          Number(pickerValue["year"]),
                          Number(pickerValue["month"]),
                        ).map((day) => (
                          <Picker.Item key={day} value={day}>
                            {({ selected }) => (
                              <div
                                className={
                                  selected
                                    ? "picker-item picker-item-selected"
                                    : "picker-item picker-item-unselected"
                                }
                              >
                                {day}
                              </div>
                            )}
                          </Picker.Item>
                        ))}
                      </Picker.Column>
                    </Picker>
                  </div>

                  <div className="button-container">
                    <button
                      type="button"
                      className="clear-button"
                      onClick={handleClearDate}
                    >
                      <span className="typography-button-medium">Clear</span>
                    </button>
                    <button
                      type="button"
                      className="ok-button"
                      onClick={handleApplyDate}
                    >
                      <span className="typography-button-medium">Apply</span>
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
}
