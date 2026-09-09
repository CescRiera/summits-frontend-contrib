import type { FilterSpecification } from "mapbox-gl";
import { LEGACY_COLOR_MAP } from "../../../shared/constants/elevationColors";
import { PEAK_ICONS, SHELTER_ICONS } from "../../../shared/utils/mapboxPeakPresentation";

export { PEAK_ICONS, SHELTER_ICONS };

// Mapbox access token
export const MAPBOX_ACCESS_TOKEN =
  import.meta.env["VITE_MAPBOX_ACCESS_TOKEN"] || "";

export const ALTITUDE_FILTERS = [
  {
    label: "2000",
    value: 2000,
    icon: "/icons/altitude/ic_mountain_yellow.png",
  },
  {
    label: "3000",
    value: 3000,
    icon: "/icons/altitude/ic_mountain_orange.png",
  },
  {
    label: "4000",
    value: 4000,
    icon: "/icons/altitude/ic_mountain_red.png",
  },
  {
    label: "6000",
    value: 6000,
    icon: "/icons/altitude/ic_mountain_burgundy.png",
  },
  {
    label: "8000",
    value: 8000,
    icon: "/icons/altitude/ic_mountain_black.png",
  },
];

// Function to get the appropriate list peak icon based on elevation and completion
export const getListPeakIcon = (
  elevation: number,
  completed: boolean
): string => {
  if (completed) {
    return PEAK_ICONS["list_peak_user"] || "";
  }

  if (elevation >= 8000) return PEAK_ICONS["list_peak_black"] || "";
  if (elevation >= 6000) return PEAK_ICONS["list_peak_burgundy"] || "";
  if (elevation >= 4000) return PEAK_ICONS["list_peak_red"] || "";
  if (elevation >= 3000) return PEAK_ICONS["list_peak_orange"] || "";
  if (elevation >= 2000) return PEAK_ICONS["list_peak_yellow"] || "";
  if (elevation >= 0) return PEAK_ICONS["list_peak_green"] || "";

  return PEAK_ICONS["list_peak_green"] || ""; // default fallback
};

export const getElevationFilter = (
  selectedFilters: number[]
): FilterSpecification | null => {
  if (!selectedFilters || selectedFilters.length === 0) return null;

  const ranges = selectedFilters.map((filter) => {
    const min = filter;
    let max = null;
    if (filter === 2000) max = 3000;
    else if (filter === 3000) max = 4000;
    else if (filter === 4000) max = 6000;
    else if (filter === 6000) max = 8000;
    else if (filter === 8000) max = 10000;
    return { min, max };
  });

  if (ranges.length === 1) {
    const range = ranges[0];
    if (!range) return null;
    const { min, max } = range;
    return max
      ? [
          "all",
          [">=", ["get", "elevation"], min],
          ["<", ["get", "elevation"], max],
        ]
      : [">=", ["get", "elevation"], min];
  }

  return [
    "any",
    ...ranges.map(({ min, max }) =>
      max
        ? [
            "all",
            [">=", ["get", "elevation"], min],
            ["<", ["get", "elevation"], max],
          ]
        : [">=", ["get", "elevation"], min]
    ),
  ] as FilterSpecification;
};

export const getPeakTypeColor = (type?: string): string => {
  const colorMap: Record<string, string> = {
    ...LEGACY_COLOR_MAP,
    // List peak colors
    list_peak: "#22223b",
    list_peak_completed: "#0E7AFE",
  };
  return colorMap[type || "peak_gray"] || "#6b7280";
};

export const getElevationRangeFilter = (
  min: number,
  max: number
): FilterSpecification => {
  const safeMin = Math.max(0, Math.floor(min));
  const safeMax = Math.max(safeMin, Math.ceil(max));
  return [
    "all",
    [">=", ["get", "elevation"], safeMin],
    ["<=", ["get", "elevation"], safeMax],
  ];
};
