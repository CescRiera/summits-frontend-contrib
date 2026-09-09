import { getClubApiErrorMessage, validateClubForm } from "./clubForm";

const t = (key: string) => key;

describe("clubForm", () => {
  it("validates required fields for create mode", () => {
    const errors = validateClubForm(
      {
        name: "",
        description: "",
        visibility: "",
        hasImage: false,
        requireImage: true,
        hasRegion: false,
      },
      t
    );

    expect(errors.name).toBe("Club name is required");
    expect(errors.description).toBe("Club description is required");
    expect(errors.visibility).toBe("Club visibility is required");
    expect(errors.image).toBe("A club image is required");
    expect(errors.region).toBe("A club region is required");
  });

  it("does not require image in edit mode", () => {
    const errors = validateClubForm(
      {
        name: "Pyrenees Finishers",
        description: "Test",
        visibility: "public",
        hasImage: false,
        requireImage: false,
        hasRegion: true,
      },
      t
    );

    expect(errors.image).toBeUndefined();
  });

  it("extracts the best API error message", () => {
    expect(
      getClubApiErrorMessage(
        { response: { data: { error: "Creator cannot leave their own club" } } },
        "fallback"
      )
    ).toBe("Creator cannot leave their own club");
  });
});
