import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  acceptClubJoinRequest,
  cancelClubJoinRequest,
  createClub,
  deleteClub,
  getClubActivity,
  getClubDetails,
  getClubLeaderboard,
  getClubMembers,
  getClubPendingRequests,
  getClubPeriodSummary,
  getClubStats,
  getClubs,
  getClubsLeaderboard,
  getMyClubs,
  joinClub,
  leaveClub,
  rejectClubJoinRequest,
  removeClubMember,
  updateClub,
  getUserClubs,
} from "../../api/endpoints/clubs";
import type {
  ClubActivityRequest,
  ClubLeaderboardRequest,
  ClubMembersRequest,
  ClubPendingRequestsRequest,
  ClubPeriodSummaryRequest,
  ClubsBrowseRequest,
  ClubsLeaderboardRequest,
  CreateClubRequest,
  UpdateClubRequest,
} from "../../api/types/clubs";
import {
  buildClubActivityRequest,
  buildClubLeaderboardRequest,
  buildClubMembersRequest,
  buildClubPendingRequestsRequest,
  buildClubPeriodSummaryRequest,
  buildClubsBrowseRequest,
  buildClubsLeaderboardRequest,
} from "../../utils/clubQueryParams";
import {
  normalizeClubActivityResponse,
  normalizeClubCollectionResponse,
  normalizeClubLeaderboardResponse,
  normalizeClubMembersResponse,
  normalizeClubPendingRequestsResponse,
  normalizeClubPeriodSummaryResponse,
} from "../../utils/clubResponse";

const DEFAULT_PAGE_SIZE = 20;

export const clubQueryKeys = {
  all: ["clubs"] as const,
  browse: (params: ClubsBrowseRequest) =>
    [...clubQueryKeys.all, "browse", params] as const,
  leaderboard: (params: ClubsLeaderboardRequest) =>
    [...clubQueryKeys.all, "leaderboard", params] as const,
  myClubs: () => [...clubQueryKeys.all, "mine"] as const,
  detail: (clubId: number) => [...clubQueryKeys.all, "detail", clubId] as const,
  stats: (clubId: number) => [...clubQueryKeys.all, "stats", clubId] as const,
  members: (params: ClubMembersRequest) =>
    [...clubQueryKeys.all, "members", params] as const,
  clubLeaderboard: (params: ClubLeaderboardRequest) =>
    [...clubQueryKeys.all, "clubLeaderboard", params] as const,
  activity: (params: ClubActivityRequest) =>
    [...clubQueryKeys.all, "activity", params] as const,
  requests: (params: ClubPendingRequestsRequest) =>
    [...clubQueryKeys.all, "requests", params] as const,
  periodSummary: (params: ClubPeriodSummaryRequest) =>
    [...clubQueryKeys.all, "periodSummary", params] as const,
};

const getNextOffset = (
  hasMore: boolean,
  pagination: { next_offset?: number | null; offset?: number | null; limit?: number | null },
  fallbackCount: number
) => {
  if (!hasMore) return undefined;
  if (typeof pagination.next_offset === "number") return pagination.next_offset;
  return (pagination.offset ?? 0) + (pagination.limit ?? DEFAULT_PAGE_SIZE) || fallbackCount;
};

export const useClubsBrowse = (params: ClubsBrowseRequest = {}) => {
  const request = buildClubsBrowseRequest(params);
  return useInfiniteQuery({
    queryKey: clubQueryKeys.browse(request),
    initialPageParam: request.offset ?? 0,
    queryFn: async ({ pageParam }) => {
      const response = await getClubs({
        ...request,
        offset: typeof pageParam === "number" ? pageParam : 0,
      });
      return normalizeClubCollectionResponse(response);
    },
    getNextPageParam: (lastPage, pages) =>
      getNextOffset(lastPage.has_more, lastPage.pagination, pages.length * (request.limit ?? DEFAULT_PAGE_SIZE)),
  });
};

export const useClubsLeaderboard = (params: ClubsLeaderboardRequest = {}) => {
  const request = buildClubsLeaderboardRequest(params);
  return useInfiniteQuery({
    queryKey: clubQueryKeys.leaderboard(request),
    initialPageParam: request.offset ?? 0,
    queryFn: async ({ pageParam }) => {
      const response = await getClubsLeaderboard({
        ...request,
        offset: typeof pageParam === "number" ? pageParam : 0,
      });
      return normalizeClubCollectionResponse(response);
    },
    getNextPageParam: (lastPage, pages) =>
      getNextOffset(lastPage.has_more, lastPage.pagination, pages.length * (request.limit ?? DEFAULT_PAGE_SIZE)),
  });
};

export const useMyClubs = (enabled = true) => {
  return useQuery({
    queryKey: clubQueryKeys.myClubs(),
    queryFn: getMyClubs,
    enabled,
  });
};

export const useUserClubs = (userId?: string | number, enabled = true) => {
  return useQuery({
    queryKey: [...clubQueryKeys.all, "user", userId],
    queryFn: () => getUserClubs(userId as string | number),
    enabled: enabled && userId !== undefined,
  });
};

export const useClubDetails = (clubId?: number) => {
  return useQuery({
    queryKey: clubId ? clubQueryKeys.detail(clubId) : [...clubQueryKeys.all, "detail", "missing"],
    queryFn: () => getClubDetails(clubId as number),
    enabled: typeof clubId === "number" && Number.isFinite(clubId),
  });
};

export const useClubStats = (clubId?: number, enabled = true) => {
  return useQuery({
    queryKey: clubId ? clubQueryKeys.stats(clubId) : [...clubQueryKeys.all, "stats", "missing"],
    queryFn: () => getClubStats(clubId as number),
    enabled: enabled && typeof clubId === "number" && Number.isFinite(clubId),
  });
};

export const useClubMembers = (
  params: ClubMembersRequest,
  enabled = true
) => {
  const request = buildClubMembersRequest(params);
  return useInfiniteQuery({
    queryKey: clubQueryKeys.members(request),
    initialPageParam: request.offset ?? 0,
    queryFn: async ({ pageParam }) => {
      const response = await getClubMembers({
        ...request,
        offset: typeof pageParam === "number" ? pageParam : 0,
      });
      return normalizeClubMembersResponse(response);
    },
    enabled,
    getNextPageParam: (lastPage, pages) =>
      getNextOffset(lastPage.has_more, lastPage.pagination, pages.length * (request.limit ?? DEFAULT_PAGE_SIZE)),
  });
};

export const useClubLeaderboard = (
  params: ClubLeaderboardRequest,
  enabled = true
) => {
  const request = buildClubLeaderboardRequest(params);
  return useInfiniteQuery({
    queryKey: clubQueryKeys.clubLeaderboard(request),
    initialPageParam: request.offset ?? 0,
    queryFn: async ({ pageParam }) => {
      const response = await getClubLeaderboard({
        ...request,
        offset: typeof pageParam === "number" ? pageParam : 0,
      });
      return normalizeClubLeaderboardResponse(response);
    },
    enabled,
    getNextPageParam: (lastPage, pages) =>
      getNextOffset(lastPage.has_more, lastPage.pagination, pages.length * (request.limit ?? DEFAULT_PAGE_SIZE)),
  });
};

export const useClubActivity = (
  params: ClubActivityRequest,
  enabled = true
) => {
  const request = buildClubActivityRequest(params);
  return useInfiniteQuery({
    queryKey: clubQueryKeys.activity(request),
    initialPageParam: request.offset ?? 0,
    queryFn: async ({ pageParam }) => {
      const response = await getClubActivity({
        ...request,
        offset: typeof pageParam === "number" ? pageParam : 0,
      });
      return normalizeClubActivityResponse(response);
    },
    enabled,
    getNextPageParam: (lastPage, pages) =>
      getNextOffset(lastPage.has_more, lastPage.pagination, pages.length * (request.limit ?? DEFAULT_PAGE_SIZE)),
  });
};

export const useClubPendingRequests = (
  params: ClubPendingRequestsRequest,
  enabled = true
) => {
  const request = buildClubPendingRequestsRequest(params);
  return useInfiniteQuery({
    queryKey: clubQueryKeys.requests(request),
    initialPageParam: request.offset ?? 0,
    queryFn: async ({ pageParam }) => {
      const response = await getClubPendingRequests({
        ...request,
        offset: typeof pageParam === "number" ? pageParam : 0,
      });
      return normalizeClubPendingRequestsResponse(response);
    },
    enabled,
    getNextPageParam: (lastPage, pages) =>
      getNextOffset(lastPage.has_more, lastPage.pagination, pages.length * (request.limit ?? DEFAULT_PAGE_SIZE)),
  });
};

export const useClubPeriodSummary = (
  params: ClubPeriodSummaryRequest,
  enabled = true
) => {
  const request = buildClubPeriodSummaryRequest(params);
  return useInfiniteQuery({
    queryKey: clubQueryKeys.periodSummary(request),
    initialPageParam: request.offset ?? 0,
    queryFn: async ({ pageParam }) => {
      const response = await getClubPeriodSummary({
        ...request,
        offset: typeof pageParam === "number" ? pageParam : 0,
      });
      return normalizeClubPeriodSummaryResponse(response);
    },
    enabled,
    getNextPageParam: (lastPage, pages) =>
      getNextOffset(
        lastPage.has_more,
        lastPage.pagination,
        pages.length * (request.limit ?? DEFAULT_PAGE_SIZE)
      ),
  });
};

export const useClubMutations = () => {
  const queryClient = useQueryClient();

  const invalidateClub = async (clubId?: number) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: clubQueryKeys.all }),
      ...(typeof clubId === "number"
        ? [
            queryClient.invalidateQueries({
              queryKey: clubQueryKeys.detail(clubId),
            }),
            queryClient.invalidateQueries({
              queryKey: clubQueryKeys.stats(clubId),
            }),
          ]
        : []),
    ]);
  };

  return {
    createClub: useMutation({
      mutationFn: (payload: CreateClubRequest) => createClub(payload),
      onSuccess: async (data) => {
        await invalidateClub(data.club?.id);
      },
    }),
    updateClub: useMutation({
      mutationFn: (payload: UpdateClubRequest) => updateClub(payload),
      onSuccess: async (_, variables) => {
        await invalidateClub(variables.club_id);
      },
    }),
    deleteClub: useMutation({
      mutationFn: (clubId: number) => deleteClub(clubId),
      onSuccess: async () => {
        await invalidateClub();
      },
    }),
    joinClub: useMutation({
      mutationFn: (clubId: number) => joinClub(clubId),
      onSuccess: async (_, clubId) => {
        await invalidateClub(clubId);
      },
    }),
    cancelJoinRequest: useMutation({
      mutationFn: (clubId: number) => cancelClubJoinRequest(clubId),
      onSuccess: async (_, clubId) => {
        await invalidateClub(clubId);
      },
    }),
    leaveClub: useMutation({
      mutationFn: (clubId: number) => leaveClub(clubId),
      onSuccess: async (_, clubId) => {
        await invalidateClub(clubId);
      },
    }),
    removeMember: useMutation({
      mutationFn: ({ clubId, userId }: { clubId: number; userId: number }) =>
        removeClubMember(clubId, userId),
      onSuccess: async (_, variables) => {
        await invalidateClub(variables.clubId);
      },
    }),
    acceptJoinRequest: useMutation({
      mutationFn: ({ clubId, userId }: { clubId: number; userId: number }) =>
        acceptClubJoinRequest(clubId, userId),
      onSuccess: async (_, variables) => {
        await invalidateClub(variables.clubId);
      },
    }),
    rejectJoinRequest: useMutation({
      mutationFn: ({ clubId, userId }: { clubId: number; userId: number }) =>
        rejectClubJoinRequest(clubId, userId),
      onSuccess: async (_, variables) => {
        await invalidateClub(variables.clubId);
      },
    }),
  };
};
