import { Fragment, useCallback, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import Picker, { type PickerValue } from "react-mobile-picker";
import "./desktop-ModalPicker.css";

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
    String(i + 1).padStart(2, "0")
  );
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

  const handleClose = useCallback(() => {
    if (isControlled) {
      onControlledClose?.();
    } else {
      setInternalOpen(false);
    }
  }, [isControlled, onControlledClose]);

  // Initialize with current date or provided date
  const getInitialDate = (dateStr: string | null | undefined) => {
    if (dateStr) {
      const date = new Date(dateStr);
      return {
        year: date.getFullYear().toString(),
        month: String(date.getMonth() + 1).padStart(2, "0"),
        day: String(date.getDate()).padStart(2, "0"),
      };
    }
    const now = new Date();
    return {
      year: now.getFullYear().toString(),
      month: String(now.getMonth() + 1).padStart(2, "0"),
      day: String(now.getDate()).padStart(2, "0"),
    };
  };

  const [pickerValue, setPickerValue] = useState<PickerValue>(
    () => getInitialDate(initialDate)
  );

  const handlePickerChange = useCallback(
    (newValue: PickerValue, key: string) => {
      if (key === "day") {
        setPickerValue(newValue);
        return;
      }

      const { year, month } = newValue;
      const newDayArray = getDayArray(Number(year), Number(month));
      const newDay = newDayArray.includes(newValue["day"] as string)
        ? (newValue["day"] as string)
        : newDayArray[newDayArray.length - 1];
      setPickerValue({ ...newValue, day: newDay as string });
    },
    []
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

  const formatDateForDisplay = (dateValue: PickerValue) => {
    return `${dateValue["year"]}-${dateValue["month"]}-${dateValue["day"]}`;
  };

  const getButtonContent = () => {
    if (initialDate) {
      return (
        <>
          <div className="button-label typography-desktop-button-medium">
            {buttonLabel}
          </div>
          <div className="button-date typography-desktop-body-small">
            {formatDateForDisplay(pickerValue)}
          </div>
        </>
      );
    }
    return (
      <div className="button-label typography-desktop-button-medium">{buttonLabel}</div>
    );
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setInternalOpen(true)}
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
                    className="dialog-title typography-desktop-body-small"
                  >
                    Choose {buttonLabel}
                  </Dialog.Title>

                  <div className="picker-container">
                    <Picker
                      value={pickerValue}
                      onChange={handlePickerChange}
                      wheelMode="natural"
                      data-picker="true"
                    >
                      <Picker.Column name="year">
                        {Array.from(
                          { length: 103 },
                          (_, i) => `${1923 + i}`
                        ).map((year) => (
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
                          String(i + 1).padStart(2, "0")
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
                          Number(pickerValue["month"])
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
                      <span className="typography-desktop-button-medium">Clear</span>
                    </button>
                    <button
                      type="button"
                      className="ok-button"
                      onClick={handleApplyDate}
                    >
                      <span className="typography-desktop-button-medium">Apply</span>
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
