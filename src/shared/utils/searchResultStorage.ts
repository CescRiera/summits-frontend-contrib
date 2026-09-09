import type {
  ClubSearchResult,
  PeakSearchResult,
  UserSearchResult,
} from "../api/types";
import type { ShelterSearchResult } from "../api/types/shelters";

export type StorableSearchResult =
  | PeakSearchResult
  | UserSearchResult
  | ClubSearchResult
  | ShelterSearchResult;

export const isStorableSearchResult = (
  value: unknown
): value is StorableSearchResult => {
  if (!value || typeof value !== "object") return false;

  const result = value as {
    type?: string;
    id?: number;
    name?: string;
  };

  return (
    (result.type === "peak" ||
      result.type === "user" ||
      result.type === "club" ||
      result.type === "shelter") &&
    typeof result.id === "number" &&
    typeof result.name === "string"
  );
};

export const sanitizeStoredSearchResults = (
  value: unknown
): StorableSearchResult[] => {
  if (!Array.isArray(value)) return [];
  return value.filter(isStorableSearchResult);
};

export const mergeRecentSearchResults = <T extends StorableSearchResult>(
  current: T[],
  next: T,
  limit: number
): T[] => {
  return [
    next,
    ...current.filter(
      (item) => !(item.id === next.id && item.type === next.type)
    ),
  ].slice(0, limit);
};
