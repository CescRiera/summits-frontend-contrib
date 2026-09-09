import {
  buildClubActivityRequest,
  buildClubLeaderboardRequest,
  buildClubMembersRequest,
  buildClubPendingRequestsRequest,
  buildClubsBrowseRequest,
  buildClubsLeaderboardRequest,
} from "./clubQueryParams";

describe("clubQueryParams", () => {
  it("builds browse requests with sane defaults and trimmed search", () => {
    expect(
      buildClubsBrowseRequest({
        search: "  pyrenees  ",
        visibility: "public",
      })
    ).toEqual({
      search: "pyrenees",
      visibility: "public",
      limit: 20,
      offset: 0,
    });
  });

  it("builds member requests with pagination", () => {
    expect(
      buildClubMembersRequest({
        club_id: 12,
        sort_by: "most_peaks",
      })
    ).toEqual({
      club_id: 12,
      sort_by: "most_peaks",
      limit: 20,
      offset: 0,
    });
  });

  it("preserves optional leaderboard date range fields", () => {
    expect(
      buildClubLeaderboardRequest({
        club_id: 12,
        metric: "distinct_peaks",
        date_from: "2026-01-01",
        date_to: "2026-12-31",
      })
    ).toEqual({
      club_id: 12,
      metric: "distinct_peaks",
      date_from: "2026-01-01",
      date_to: "2026-12-31",
      limit: 20,
      offset: 0,
    });
  });

  it("builds leaderboard, activity, and request pagination defaults", () => {
    expect(buildClubsLeaderboardRequest({ visibility: "public" })).toEqual({
      visibility: "public",
      limit: 20,
      offset: 0,
    });
    expect(buildClubActivityRequest({ club_id: 12 })).toEqual({
      club_id: 12,
      limit: 20,
      offset: 0,
    });
    expect(buildClubPendingRequestsRequest({ club_id: 12 })).toEqual({
      club_id: 12,
      limit: 20,
      offset: 0,
    });
  });
});
