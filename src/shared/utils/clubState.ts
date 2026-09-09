import type { ClubMembershipStatus, ClubSummary, ClubVisibility } from "../api/types/clubs";

export type ClubActionKind =
  | "sign_in"
  | "join"
  | "request"
  | "pending"
  | "leave"
  | "edit";

export interface ClubActionState {
  primaryAction: ClubActionKind;
  secondaryAction: ClubActionKind | null;
  canViewProtectedContent: boolean;
  canModerate: boolean;
  canEdit: boolean;
  isCreator: boolean;
  isRestricted: boolean;
  visibility: ClubVisibility;
  membershipStatus: ClubMembershipStatus | null;
}

export const canViewClubProtectedContent = (club: Pick<ClubSummary, "restricted">) => {
  return !club.restricted;
};

export const getClubActionState = (
  club: Pick<ClubSummary, "visibility" | "membership" | "is_creator" | "restricted">,
  isAuthenticated: boolean
): ClubActionState => {
  const membershipStatus = club.membership?.status ?? null;
  const isCreator = club.is_creator === true || club.membership?.role === "creator";
  const canViewProtectedContent = canViewClubProtectedContent(club);

  if (isCreator) {
    return {
      primaryAction: "edit",
      secondaryAction: null,
      canViewProtectedContent: true,
      canModerate: true,
      canEdit: true,
      isCreator: true,
      isRestricted: false,
      visibility: club.visibility,
      membershipStatus,
    };
  }

  if (membershipStatus === "accepted") {
    return {
      primaryAction: "leave",
      secondaryAction: null,
      canViewProtectedContent,
      canModerate: false,
      canEdit: false,
      isCreator: false,
      isRestricted: club.restricted,
      visibility: club.visibility,
      membershipStatus,
    };
  }

  if (membershipStatus === "pending") {
    return {
      primaryAction: "pending",
      secondaryAction: "request",
      canViewProtectedContent: false,
      canModerate: false,
      canEdit: false,
      isCreator: false,
      isRestricted: club.restricted,
      visibility: club.visibility,
      membershipStatus,
    };
  }

  if (!isAuthenticated) {
    return {
      primaryAction: "sign_in",
      secondaryAction: null,
      canViewProtectedContent: canViewProtectedContent && club.visibility === "public",
      canModerate: false,
      canEdit: false,
      isCreator: false,
      isRestricted: club.restricted,
      visibility: club.visibility,
      membershipStatus,
    };
  }

  return {
    primaryAction: club.visibility === "private" ? "request" : "join",
    secondaryAction: null,
    canViewProtectedContent: canViewProtectedContent && club.visibility === "public",
    canModerate: false,
    canEdit: false,
    isCreator: false,
    isRestricted: club.restricted,
    visibility: club.visibility,
    membershipStatus,
  };
};

export const getClubActionLabelKey = (action: ClubActionKind): string => {
  switch (action) {
    case "sign_in":
      return "clubs.actions.signInToJoin";
    case "join":
      return "clubs.actions.joinClub";
    case "request":
      return "clubs.actions.requestToJoin";
    case "pending":
      return "clubs.actions.requestPending";
    case "leave":
      return "clubs.actions.leaveClub";
    case "edit":
      return "clubs.actions.editClub";
    default:
      return "clubs.actions.viewClub";
  }
};

export const getClubSecondaryActionLabelKey = (
  state: ClubActionState
): string | null => {
  if (state.primaryAction === "pending") {
    return "clubs.actions.cancelRequest";
  }
  return null;
};

export const getClubMembershipBadgeKey = (
  club: Pick<ClubSummary, "visibility" | "membership" | "is_creator">
): string | null => {
  if (club.is_creator === true || club.membership?.role === "creator") return "clubs.badges.creator";
  if (club.membership?.status === "accepted") return "clubs.badges.member";
  if (club.membership?.status === "pending") return "clubs.badges.requestPending";
  if (club.visibility === "private") return "clubs.badges.privateClub";
  return null;
};
