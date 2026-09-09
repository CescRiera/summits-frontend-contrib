import {
  toDurationSecondsFromHoursInput,
  toIsoFromDateTimeLocal,
} from "./peakListFormatting";

type TranslateFn = (key: string, params?: Record<string, any>) => string;

export type PeakListFormValues = {
  name: string;
  description: string;
  hasPrimaryImage: boolean;
  selectedPeakCount: number;
  startDate: string;
  endDate: string;
  maxDurationHours: string;
};

export type PeakListFormErrors = Partial<
  Record<
    | "name"
    | "description"
    | "primaryImage"
    | "selectedPeaks"
    | "startDate"
    | "endDate"
    | "maxDurationHours",
    string
  >
>;

const translateOrFallback = (
  t: TranslateFn,
  key: string,
  fallback: string
): string => {
  const translated = t(key);
  return translated === key ? fallback : translated;
};

export const validatePeakListForm = (
  values: PeakListFormValues,
  t: TranslateFn
): PeakListFormErrors => {
  const errors: PeakListFormErrors = {};

  if (!values.name.trim()) {
    errors.name = translateOrFallback(
      t,
      "peakLists.validation.nameRequired",
      "Challenge name is required."
    );
  }

  if (!values.description.trim()) {
    errors.description = translateOrFallback(
      t,
      "peakLists.validation.descriptionRequired",
      "Description is required."
    );
  }

  if (!values.hasPrimaryImage) {
    errors.primaryImage = translateOrFallback(
      t,
      "peakLists.validation.imageRequired",
      "Cover image is required."
    );
  }

  if (values.selectedPeakCount < 1) {
    errors.selectedPeaks = translateOrFallback(
      t,
      "peakLists.validation.peaksRequired",
      "Select at least one peak."
    );
  }

  const normalizedStartDate = toIsoFromDateTimeLocal(values.startDate);
  const normalizedEndDate = toIsoFromDateTimeLocal(values.endDate);

  if (values.startDate && !normalizedStartDate) {
    errors.startDate = translateOrFallback(
      t,
      "peakLists.validation.startDateInvalid",
      "Enter a valid start date."
    );
  }

  if (values.endDate && !normalizedEndDate) {
    errors.endDate = translateOrFallback(
      t,
      "peakLists.validation.endDateInvalid",
      "Enter a valid end date."
    );
  }

  if (
    normalizedStartDate &&
    normalizedEndDate &&
    new Date(normalizedEndDate).getTime() < new Date(normalizedStartDate).getTime()
  ) {
    errors.endDate = translateOrFallback(
      t,
      "peakLists.validation.endDateBeforeStart",
      "End date must be after the start date."
    );
  }

  if (
    values.maxDurationHours.trim() &&
    toDurationSecondsFromHoursInput(values.maxDurationHours) === null
  ) {
    errors.maxDurationHours = translateOrFallback(
      t,
      "peakLists.validation.maxDurationInvalid",
      "Enter a valid max duration greater than 0."
    );
  }

  return errors;
};

export const getApiErrorMessage = (
  error: unknown,
  fallbackMessage: string
): string => {
  if (!error || typeof error !== "object") {
    return fallbackMessage;
  }

  const apiError = error as {
    response?: {
      data?: {
        error?: unknown;
        message?: unknown;
      };
    };
    message?: unknown;
  };

  const responseError = apiError.response?.data?.error;
  if (typeof responseError === "string" && responseError.trim()) {
    return responseError;
  }

  const responseMessage = apiError.response?.data?.message;
  if (typeof responseMessage === "string" && responseMessage.trim()) {
    return responseMessage;
  }

  if (typeof apiError.message === "string" && apiError.message.trim()) {
    return apiError.message;
  }

  return fallbackMessage;
};
