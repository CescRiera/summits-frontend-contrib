import { isClubSearchResult } from "./clubSearch";

describe("clubSearch", () => {
  it("identifies club search results without conflicting with other result types", () => {
    expect(
      isClubSearchResult({
        type: "club",
        id: 12,
        name: "Pyrenees Finishers",
      })
    ).toBe(true);

    expect(
      isClubSearchResult({
        type: "peak",
        id: 12,
        name: "Aneto",
      })
    ).toBe(false);
  });
});
