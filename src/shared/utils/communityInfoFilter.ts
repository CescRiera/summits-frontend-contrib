import type {
  PeakCommunityInfo,
  PeakCommunityRoute,
  PeakCommunityUser,
} from "../api/types";

export type CommunityInfoScope = "all" | "club";

export interface CommunityInfoScopeData {
  scope: CommunityInfoScope;
  totalCompletions: number;
  uniqueUsers: number;
  users: PeakCommunityUser[];
  routes: PeakCommunityRoute[];
}

export interface ResolvedCommunityInfoScope {
  selectedScope: CommunityInfoScope;
  hasClubScope: boolean;
  clubNames: string[];
  all: CommunityInfoScopeData;
  club: CommunityInfoScopeData;
  active: CommunityInfoScopeData;
}

const sumCompletions = (users: PeakCommunityUser[]): number =>
  users.reduce((acc, user) => acc + (Number(user.completion_count) || 0), 0);

const isClubRelatedUser = (user: PeakCommunityUser): boolean =>
  user.is_club_related === true || (user.club_ids?.length ?? 0) > 0;

const isClubRelatedRoute = (
  route: PeakCommunityRoute,
  clubUserIds: Set<number>
): boolean => {
  if (route.is_club_related === true || (route.club_ids?.length ?? 0) > 0) {
    return true;
  }

  if (!route.user) return false;

  if (
    route.user.is_club_related === true ||
    (route.user.club_ids?.length ?? 0) > 0
  ) {
    return true;
  }

  return clubUserIds.has(route.user.id);
};

export const resolveCommunityInfoScope = (
  communityInfo: PeakCommunityInfo | null,
  requestedScope: CommunityInfoScope
): ResolvedCommunityInfoScope => {
  const emptyScope: CommunityInfoScopeData = {
    scope: "all",
    totalCompletions: 0,
    uniqueUsers: 0,
    users: [],
    routes: [],
  };

  if (!communityInfo) {
    return {
      selectedScope: "all",
      hasClubScope: false,
      clubNames: [],
      all: emptyScope,
      club: { ...emptyScope, scope: "club" },
      active: emptyScope,
    };
  }

  const allScope: CommunityInfoScopeData = {
    scope: "all",
    totalCompletions: communityInfo.total_completions ?? 0,
    uniqueUsers: communityInfo.unique_users ?? communityInfo.users.length,
    users: communityInfo.users ?? [],
    routes: communityInfo.routes ?? [],
  };

  const clubContext = communityInfo.club_context;
  const derivedClubUsers = allScope.users.filter(isClubRelatedUser);
  const derivedClubUserIds = new Set(derivedClubUsers.map((user) => user.id));
  const derivedClubRoutes = allScope.routes.filter((route) =>
    isClubRelatedRoute(route, derivedClubUserIds)
  );

  const clubUsers =
    clubContext?.users && clubContext.users.length > 0
      ? clubContext.users
      : derivedClubUsers;
  const clubUserIds = new Set(clubUsers.map((user) => user.id));
  const clubRoutes =
    clubContext?.routes && clubContext.routes.length > 0
      ? clubContext.routes
      : allScope.routes.filter((route) => isClubRelatedRoute(route, clubUserIds));

  const clubScope: CommunityInfoScopeData = {
    scope: "club",
    totalCompletions:
      typeof clubContext?.total_completions === "number"
        ? clubContext.total_completions
        : sumCompletions(clubUsers),
    uniqueUsers:
      typeof clubContext?.unique_users === "number"
        ? clubContext.unique_users
        : clubUsers.length,
    users: clubUsers,
    routes: clubRoutes.length > 0 ? clubRoutes : derivedClubRoutes,
  };

  const hasClubScope =
    Boolean(clubContext?.available) ||
    clubScope.users.length > 0 ||
    clubScope.routes.length > 0 ||
    (clubContext?.member_of_club_ids?.length ?? 0) > 0;

  const selectedScope =
    requestedScope === "club" && hasClubScope ? "club" : "all";
  const activeScope = selectedScope === "club" ? clubScope : allScope;

  return {
    selectedScope,
    hasClubScope,
    clubNames: clubContext?.member_of_club_names ?? [],
    all: allScope,
    club: clubScope,
    active: activeScope,
  };
};
