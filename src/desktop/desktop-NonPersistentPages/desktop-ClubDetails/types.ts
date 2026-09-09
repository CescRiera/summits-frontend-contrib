import type { ClubPeriodSummarySortBy } from "../../../shared/api/types/clubs";

export type ClubTab = "members" | "activity" | "challenges";
export type OverviewPreset = "this_year" | "last_year" | "all_time" | "custom";
export type DatePreset = OverviewPreset | "custom";
export type MembersSortMode =
  | "most_peaks"
  | "elevation_gain"
  | "distance"
  | "ascents"
  | "routes"
  | "moving_time";

export interface MembersFilterState {
  preset: DatePreset;
  dateFrom: string | null;
  dateTo: string | null;
  sortMode: MembersSortMode;
  onlyWithPeaks: boolean;
  categoryId: number | null;
}

export const ALL_MEMBERS_SORT_MODES: MembersSortMode[] = [
  "most_peaks",
  "elevation_gain",
  "distance",
  "ascents",
  "routes",
  "moving_time",
];

export const isOverviewPreset = (value: unknown): value is OverviewPreset =>
  value === "this_year" || value === "last_year" || value === "all_time";

export const isDatePreset = (value: unknown): value is DatePreset =>
  value === "this_year" ||
  value === "last_year" ||
  value === "all_time" ||
  value === "custom";

export const isMembersSortMode = (value: unknown): value is MembersSortMode =>
  ALL_MEMBERS_SORT_MODES.includes(value as MembersSortMode);

export const getPresetRange = (
  preset: DatePreset
): { dateFrom: string | null; dateTo: string | null } => {
  if (preset === "custom") {
    return { dateFrom: null, dateTo: null };
  }

  const now = new Date();
  const todayIso = now.toISOString().slice(0, 10);

  if (preset === "all_time") {
    return { dateFrom: null, dateTo: null };
  }

  if (preset === "last_year") {
    const year = now.getFullYear() - 1;
    return { dateFrom: `${year}-01-01`, dateTo: `${year}-12-31` };
  }

  const year = now.getFullYear();
  return { dateFrom: `${year}-01-01`, dateTo: todayIso };
};

export const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    date
  );
};

export const formatDuration = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0m";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours === 0 ? `${minutes}m` : `${hours}h ${minutes}m`;
};

export const mapMembersSortToApi = (
  sortMode: MembersSortMode
): ClubPeriodSummarySortBy => {
  switch (sortMode) {
    case "most_peaks":
      return "distinct_peaks";
    case "elevation_gain":
      return "total_elevation_gain";
    case "distance":
      return "total_distance_km";
    case "ascents":
      return "total_ascents";
    case "routes":
      return "total_routes";
    case "moving_time":
      return "total_moving_time_seconds";
    default:
      return "distinct_peaks";
  }
};

export type ClubPeriodSummaryCategory = {
  id: number;
  name: string;
};
