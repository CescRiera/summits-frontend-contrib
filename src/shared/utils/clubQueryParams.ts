import type {
  ClubActivityRequest,
  ClubLeaderboardRequest,
  ClubMembersRequest,
  ClubPendingRequestsRequest,
  ClubPeriodSummaryRequest,
  ClubsBrowseRequest,
  ClubsLeaderboardRequest,
} from "../api/types/clubs";

const DEFAULT_LIMIT = 20;

const withPagination = <T extends { limit?: number; offset?: number }>(
  params: T
) => ({
  ...params,
  limit: params.limit ?? DEFAULT_LIMIT,
  offset: params.offset ?? 0,
});

export const buildClubsBrowseRequest = (
  params: ClubsBrowseRequest = {}
): ClubsBrowseRequest => {
  const trimmedSearch = params.search?.trim();
  return {
    ...withPagination(params),
    ...(trimmedSearch ? { search: trimmedSearch } : {}),
    ...(params.admin_osm_ids && params.admin_osm_ids.length > 0
      ? { admin_osm_ids: params.admin_osm_ids }
      : {}),
  };
};

export const buildClubsLeaderboardRequest = (
  params: ClubsLeaderboardRequest = {}
): ClubsLeaderboardRequest => {
  return {
    ...withPagination(params),
    ...(params.admin_osm_ids && params.admin_osm_ids.length > 0
      ? { admin_osm_ids: params.admin_osm_ids }
      : {}),
    ...(params.date_from ? { date_from: params.date_from } : {}),
    ...(params.date_to ? { date_to: params.date_to } : {}),
  };
};

export const buildClubMembersRequest = (
  params: ClubMembersRequest
): ClubMembersRequest => {
  const trimmedSearch = params.search?.trim();
  return {
    ...withPagination(params),
    ...(trimmedSearch ? { search: trimmedSearch } : {}),
  };
};

export const buildClubLeaderboardRequest = (
  params: ClubLeaderboardRequest
): ClubLeaderboardRequest => {
  return {
    ...withPagination(params),
    ...(params.date_from ? { date_from: params.date_from } : {}),
    ...(params.date_to ? { date_to: params.date_to } : {}),
  };
};

export const buildClubActivityRequest = (
  params: ClubActivityRequest
): ClubActivityRequest => {
  return {
    ...withPagination(params),
    ...(params.filter ? { filter: params.filter } : {}),
  };
};

export const buildClubPendingRequestsRequest = (
  params: ClubPendingRequestsRequest
): ClubPendingRequestsRequest => {
  return withPagination(params);
};

export const buildClubPeriodSummaryRequest = (
  params: ClubPeriodSummaryRequest
): ClubPeriodSummaryRequest => {
  return {
    ...withPagination(params),
    date_from: params.date_from,
    date_to: params.date_to,
    ...(typeof params.category_id === "number"
      ? { category_id: params.category_id }
      : {}),
    ...(params.only_with_peaks ? { only_with_peaks: true } : {}),
  };
};
