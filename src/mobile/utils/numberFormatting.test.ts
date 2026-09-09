import {
  formatDistance,
  formatDistanceValue,
  formatElevationGain,
  formatMeters,
  formatMetersValue,
  formatStatDistance,
  formatStatDuration,
  formatStatElevationGain,
  formatStatInteger,
} from "./numberFormatting";

describe("numberFormatting", () => {
  describe("formatDistanceValue", () => {
    it("keeps up to four visible digits without using k abbreviations", () => {
      expect(formatDistanceValue(1050.35)).toBe("1050");
      expect(formatDistanceValue(105.56)).toBe("105,6");
      expect(formatDistanceValue(11.52)).toBe("11,52");
      expect(formatDistanceValue(1.534)).toBe("1,53");
      expect(formatDistanceValue(10000)).toBe("10000");
    });

    it("rounds across digit boundaries cleanly", () => {
      expect(formatDistanceValue(999.96)).toBe("1000");
      expect(formatDistanceValue(9.999)).toBe("10");
    });

    it("handles missing values", () => {
      expect(formatDistanceValue(null)).toBe("--");
      expect(formatDistanceValue(undefined)).toBe("--");
    });
  });

  describe("formatDistance", () => {
    it("appends the km unit", () => {
      expect(formatDistance(1050.35)).toBe("1050 km");
      expect(formatDistance(105.56)).toBe("105,6 km");
      expect(formatDistance(10000)).toBe("10000 km");
      expect(formatDistance(null)).toBe("--km");
    });
  });

  describe("meter formatting", () => {
    it("keeps peak elevations ungrouped and adds spaced units only for elevation gain", () => {
      expect(formatMetersValue(41154)).toBe("41154");
      expect(formatMeters(41154)).toBe("41154m");
      expect(formatElevationGain(41154)).toBe("41154 m");
      expect(formatMeters(null)).toBe("--m");
      expect(formatElevationGain(null)).toBe("-- m");
    });
  });

  describe("profile stat formatting", () => {
    it("groups large integers with narrow spaces", () => {
      expect(formatStatInteger(1000)).toBe("1\u202F000");
      expect(formatStatInteger(1155155)).toBe("1\u202F155\u202F155");
      expect(formatStatInteger("1155155")).toBe("1\u202F155\u202F155");
    });

    it("groups large distance and elevation values without changing rounding rules", () => {
      expect(formatStatDistance(1050.35)).toBe("1\u202F050 km");
      expect(formatStatDistance(10000)).toBe("10\u202F000 km");
      expect(formatStatDistance("10000")).toBe("10\u202F000 km");
      expect(formatStatElevationGain(41154)).toBe("41\u202F154 m");
      expect(formatStatElevationGain("41154")).toBe("41\u202F154 m");
    });

    it("reduces long durations into days and years when possible", () => {
      expect(formatStatDuration(59)).toBe("59s");
      expect(formatStatDuration(65 * 60)).toBe("1h 5m");
      expect(formatStatDuration("3900")).toBe("1h 5m");
      expect(formatStatDuration(25 * 3600 + 30 * 60)).toBe("1d 1h");
      expect(formatStatDuration(400 * 24 * 3600)).toBe("1y 35d");
      expect(formatStatDuration(400 * 24 * 3600, 1)).toBe("1y");
    });
  });
});
