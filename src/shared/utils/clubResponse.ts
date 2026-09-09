import type {
  ClubActivityItem,
  ClubActivityResponse,
  ClubCollectionResponse,
  ClubLeaderboardResponse,
  ClubLeaderboardRow,
  ClubMember,
  ClubMembersResponse,
  ClubPendingRequest,
  ClubPendingRequestsResponse,
  ClubPeriodMember,
  ClubPeriodSummaryResponse,
  ClubSummary,
  GetMyClubsResponse,
} from "../api/types/clubs";

const emptyPagination = {
  limit: 20,
  offset: 0,
};

const normalizeClubPeriodSummaryCategories = (
  response: Partial<ClubPeriodSummaryResponse> | null | undefined
) => {
  const payload = response as
    | (Partial<ClubPeriodSummaryResponse> & { activity_categories?: unknown })
    | null
    | undefined;
  const rawCategories = Array.isArray(response?.categories)
    ? response.categories
    : Array.isArray(payload?.activity_categories)
      ? payload.activity_categories
      : [];

  return rawCategories
    .map((item) => {
      if (typeof item !== "object" || item === null) return null;
      const id = (item as { id?: unknown }).id;
      const name = (item as { name?: unknown }).name;
      const fallbackCode = (item as { code?: unknown }).code;
      if (typeof id !== "number") return null;
      if (typeof name === "string") return { id, name };
      if (typeof fallbackCode === "string") return { id, name: fallbackCode };
      return null;
    })
    .filter((item): item is { id: number; name: string } => item !== null);
};

export const normalizeClubCollectionResponse = (
  response: Partial<ClubCollectionResponse> | null | undefined
): ClubCollectionResponse => ({
  clubs: response?.clubs ?? [],
  total: response?.total ?? response?.total_count ?? 0,
  total_count: response?.total_count ?? response?.total ?? 0,
  total_countries: response?.total_countries ?? 0,
  has_more: response?.has_more ?? false,
  pagination: response?.pagination ?? emptyPagination,
});

export const normalizeMyClubsResponse = (
  response: GetMyClubsResponse | null | undefined
): {
  createdClubs: ClubSummary[];
  joinedClubs: ClubSummary[];
  pendingClubs: ClubSummary[];
} => {
  const created = response?.created_clubs ?? [];
  const joined = response?.joined_clubs ?? [];
  const pending = response?.pending_clubs ?? [];

  if (created.length > 0 || joined.length > 0 || pending.length > 0) {
    return {
      createdClubs: created,
      joinedClubs: joined,
      pendingClubs: pending,
    };
  }

  const clubs = response?.clubs ?? [];

  const isCreator = (club: ClubSummary) =>
    club.is_creator === true || club.membership?.role === "creator";

  return {
    createdClubs: clubs.filter((club) => isCreator(club)),
    joinedClubs: clubs.filter(
      (club) => !isCreator(club) && club.membership?.status === "accepted"
    ),
    pendingClubs: clubs.filter(
      (club) => !isCreator(club) && club.membership?.status === "pending"
    ),
  };
};

export const normalizeClubMembersResponse = (
  response: Partial<ClubMembersResponse> | null | undefined
): ClubMembersResponse => ({
  members: response?.members ?? [],
  total: response?.total ?? response?.total_count ?? 0,
  total_count: response?.total_count ?? response?.total ?? 0,
  has_more: response?.has_more ?? false,
  pagination: response?.pagination ?? emptyPagination,
});

export const normalizeClubLeaderboardResponse = (
  response: Partial<ClubLeaderboardResponse> | null | undefined
): ClubLeaderboardResponse => ({
  leaderboard: response?.leaderboard ?? [],
  total: response?.total ?? response?.total_count ?? 0,
  total_count: response?.total_count ?? response?.total ?? 0,
  has_more: response?.has_more ?? false,
  pagination: response?.pagination ?? emptyPagination,
});

export const normalizeClubActivityResponse = (
  response: Partial<ClubActivityResponse> | null | undefined
): ClubActivityResponse => ({
  activity:
    response?.activity?.map((item) => ({
      ...item,
      distance: item.distance ?? 0,
      elevation_gain: item.elevation_gain ?? 0,
      time_seconds: item.time_seconds ?? 0,
      moving_time_seconds: item.moving_time_seconds ?? 0,
      peaks: item.peaks ?? [],
    })) ?? [],
  total: response?.total ?? response?.total_count ?? 0,
  total_count: response?.total_count ?? response?.total ?? 0,
  has_more: response?.has_more ?? false,
  pagination: response?.pagination ?? emptyPagination,
  filter: response?.filter ?? "all_routes",
});

export const normalizeClubPendingRequestsResponse = (
  response: Partial<ClubPendingRequestsResponse> | null | undefined
): ClubPendingRequestsResponse => ({
  requests: response?.requests ?? [],
  total: response?.total ?? response?.total_count ?? 0,
  total_count: response?.total_count ?? response?.total ?? 0,
  has_more: response?.has_more ?? false,
  pagination: response?.pagination ?? emptyPagination,
});

export const normalizeClubPeriodSummaryResponse = (
  response: Partial<ClubPeriodSummaryResponse> | null | undefined
): ClubPeriodSummaryResponse => ({
  club_id: response?.club_id ?? 0,
  date_from: response?.date_from ?? "",
  date_to: response?.date_to ?? "",
  sort_by: response?.sort_by ?? "distinct_peaks",
  categories: normalizeClubPeriodSummaryCategories(response),
  summary: {
    member_count: response?.summary?.member_count ?? 0,
    active_members: response?.summary?.active_members ?? 0,
    total_routes: response?.summary?.total_routes ?? 0,
    distinct_peaks: response?.summary?.distinct_peaks ?? 0,
    total_ascents: response?.summary?.total_ascents ?? 0,
    total_distance_km: response?.summary?.total_distance_km ?? 0,
    total_elevation_gain: response?.summary?.total_elevation_gain ?? 0,
    total_time_seconds: response?.summary?.total_time_seconds ?? 0,
    total_moving_time_seconds: response?.summary?.total_moving_time_seconds ?? 0,
    active_days: response?.summary?.active_days ?? 0,
    highest_peak_elevation: response?.summary?.highest_peak_elevation ?? null,
    top_member: response?.summary?.top_member ?? null,
  },
  members: response?.members ?? [],
  total: response?.total ?? response?.total_count ?? 0,
  total_count: response?.total_count ?? response?.total ?? 0,
  has_more: response?.has_more ?? false,
  pagination: response?.pagination ?? emptyPagination,
});

export const flattenClubPages = (pages: ClubCollectionResponse[] | undefined) => {
  return pages?.flatMap((page) => page.clubs) ?? [];
};

export const flattenClubMembersPages = (
  pages: ClubMembersResponse[] | undefined
): ClubMember[] => {
  return pages?.flatMap((page) => page.members) ?? [];
};

export const flattenClubLeaderboardPages = (
  pages: ClubLeaderboardResponse[] | undefined
): ClubLeaderboardRow[] => {
  return pages?.flatMap((page) => page.leaderboard) ?? [];
};

export const flattenClubActivityPages = (
  pages: ClubActivityResponse[] | undefined
): ClubActivityItem[] => {
  return pages?.flatMap((page) => page.activity) ?? [];
};

export const flattenClubPendingRequestsPages = (
  pages: ClubPendingRequestsResponse[] | undefined
): ClubPendingRequest[] => {
  return pages?.flatMap((page) => page.requests) ?? [];
};

export const flattenClubPeriodSummaryPages = (
  pages: ClubPeriodSummaryResponse[] | undefined
): ClubPeriodMember[] => {
  return pages?.flatMap((page) => page.members) ?? [];
};
