import type { ClubVisibility } from "../api/types/clubs";

type TranslateFn = (key: string, params?: Record<string, string | number>) => string;

export type ClubFormValues = {
  name: string;
  description: string;
  visibility: ClubVisibility | "";
  hasImage: boolean;
  requireImage: boolean;
  hasRegion: boolean;
};

export type ClubFormErrors = Partial<
  Record<"name" | "description" | "visibility" | "image" | "region", string>
>;

const translateOrFallback = (
  t: TranslateFn,
  key: string,
  fallback: string
) => {
  const translated = t(key);
  return translated === key ? fallback : translated;
};

export const validateClubForm = (
  values: ClubFormValues,
  t: TranslateFn
): ClubFormErrors => {
  const errors: ClubFormErrors = {};

  if (!values.name.trim()) {
    errors.name = translateOrFallback(
      t,
      "clubs.validation.nameRequired",
      "Club name is required"
    );
  }

  if (!values.description.trim()) {
    errors.description = translateOrFallback(
      t,
      "clubs.validation.descriptionRequired",
      "Club description is required"
    );
  }

  if (values.visibility !== "public" && values.visibility !== "private") {
    errors.visibility = translateOrFallback(
      t,
      "clubs.validation.visibilityRequired",
      "Club visibility is required"
    );
  }

  if (values.requireImage && !values.hasImage) {
    errors.image = translateOrFallback(
      t,
      "clubs.validation.imageRequired",
      "A club image is required"
    );
  }

  if (!values.hasRegion) {
    errors.region = translateOrFallback(
      t,
      "clubs.validation.regionRequired",
      "A club region is required"
    );
  }

  return errors;
};

export const getClubApiErrorMessage = (
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
