import {
  PEAK_LABEL_TEXT_FIELD,
  createPeakIconSizeExpression,
  getPeakLabelPaint,
  getPeakLabelTheme,
} from "./mapboxPeakPresentation";

describe("mapboxPeakPresentation", () => {
  it("uses the shared coalesced peak label text field", () => {
    expect(PEAK_LABEL_TEXT_FIELD).toEqual([
      "coalesce",
      ["get", "name_en"],
      ["get", "name"],
      ["get", "name_local"],
      "",
    ]);
  });

  it("uses the canonical tile icon size curve", () => {
    expect(createPeakIconSizeExpression("tile")).toEqual([
      "interpolate",
      ["linear"],
      ["zoom"],
      0,
      0.12,
      25,
      0.24,
    ]);
  });

  it("uses the canonical map icon size curve", () => {
    expect(createPeakIconSizeExpression("map")).toEqual([
      "interpolate",
      ["linear"],
      ["zoom"],
      0,
      0.16,
      25,
      0.32,
    ]);
  });

  it("uses the default label paint for non-satellite styles", () => {
    expect(getPeakLabelPaint(getPeakLabelTheme("mapbox://styles/mapbox/streets-v12"))).toEqual({
      "text-color": "#222222",
      "text-halo-color": "#ffffff",
      "text-halo-width": 1,
      "text-halo-blur": 0.5,
      "text-opacity": 1,
      "text-translate": [0, 0],
      "text-translate-anchor": "map",
    });
  });

  it("uses the satellite label paint for satellite styles", () => {
    expect(getPeakLabelPaint(getPeakLabelTheme("mapbox://styles/mapbox/satellite-v9"))).toEqual({
      "text-color": "#ffffff",
      "text-halo-color": "#000000",
      "text-halo-width": 1,
      "text-halo-blur": 0.5,
      "text-opacity": 1,
      "text-translate": [0, 0],
      "text-translate-anchor": "map",
    });
  });
});
