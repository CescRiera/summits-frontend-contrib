import type { ClubSearchResult } from "../api/types/clubs";

export const isClubSearchResult = (
  value: unknown
): value is ClubSearchResult => {
  if (!value || typeof value !== "object") return false;
  const result = value as { type?: string; id?: number; name?: string };
  return (
    result.type === "club" &&
    typeof result.id === "number" &&
    typeof result.name === "string"
  );
};
