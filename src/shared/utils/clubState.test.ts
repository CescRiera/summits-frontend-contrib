import {
  getClubActionState,
  getClubActionLabelKey,
  getClubMembershipBadgeKey,
} from "./clubState";

describe("clubState", () => {
  it("returns edit state for creators", () => {
    const state = getClubActionState(
      {
        visibility: "private",
        membership: {
          status: "accepted",
          role: "creator",
          requested_at: null,
          joined_at: null,
          responded_at: null,
        },
        is_creator: true,
        restricted: false,
      },
      true
    );

    expect(state.primaryAction).toBe("edit");
    expect(state.canModerate).toBe(true);
    expect(getClubMembershipBadgeKey({
      visibility: "private",
      membership: null,
      is_creator: true,
    })).toBe("clubs.badges.creator");
  });

  it("returns join state for authenticated users on public clubs", () => {
    const state = getClubActionState(
      {
        visibility: "public",
        membership: null,
        is_creator: false,
        restricted: false,
      },
      true
    );

    expect(state.primaryAction).toBe("join");
    expect(getClubActionLabelKey(state.primaryAction)).toBe("clubs.actions.joinClub");
  });

  it("returns request pending state for pending memberships", () => {
    const state = getClubActionState(
      {
        visibility: "private",
        membership: {
          status: "pending",
          role: "member",
          requested_at: null,
          joined_at: null,
          responded_at: null,
        },
        is_creator: false,
        restricted: true,
      },
      true
    );

    expect(state.primaryAction).toBe("pending");
    expect(state.secondaryAction).toBe("request");
    expect(state.canViewProtectedContent).toBe(false);
  });

  it("returns leave state for accepted members", () => {
    const state = getClubActionState(
      {
        visibility: "private",
        membership: {
          status: "accepted",
          role: "member",
          requested_at: null,
          joined_at: null,
          responded_at: null,
        },
        is_creator: false,
        restricted: false,
      },
      true
    );

    expect(state.primaryAction).toBe("leave");
    expect(state.canViewProtectedContent).toBe(true);
  });

  it("returns sign in state for anonymous users", () => {
    const state = getClubActionState(
      {
        visibility: "public",
        membership: null,
        is_creator: false,
        restricted: false,
      },
      false
    );

    expect(state.primaryAction).toBe("sign_in");
    expect(getClubActionLabelKey(state.primaryAction)).toBe(
      "clubs.actions.signInToJoin"
    );
  });
});
