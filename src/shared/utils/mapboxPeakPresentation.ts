import type {
  ExpressionSpecification,
  Map as MapboxMap,
  SymbolLayout,
  SymbolPaint,
} from "mapbox-gl";

export type PeakMarkerFamily = "tile" | "map";
export type PeakLabelTheme = "default" | "satellite";
type LayerVisibility = "visible" | "none";
type PeakSymbolLayout = NonNullable<SymbolLayout>;
type PeakSymbolPaint = NonNullable<SymbolPaint>;

type PeakSymbolLayoutOptions = {
  family: PeakMarkerFamily;
  iconImage: string | ExpressionSpecification;
  visibility?: LayerVisibility;
  symbolSortKey?: number | ExpressionSpecification;
  iconIgnorePlacement?: boolean;
};

type PeakLabelLayoutOptions = {
  family: PeakMarkerFamily;
  visibility?: LayerVisibility;
  symbolSortKey?: number | ExpressionSpecification;
  textField?: string | ExpressionSpecification;
  textAllowOverlap?: boolean;
  textIgnorePlacement?: boolean;
  textOptional?: boolean;
};

const PEAK_ICON_SIZE_CONFIG = {
  tile: {
    minZoom: 0,
    minSize: 0.12,
    maxZoom: 25,
    maxSize: 0.24,
  },
  map: {
    minZoom: 0,
    minSize: 0.16,
    maxZoom: 25,
    maxSize: 0.32,
  },
} as const;

export const PEAK_ICON_ANCHOR = {
  tile: "center",
  map: "bottom",
} as const;

export const PEAK_LABEL_OFFSET = {
  tile: [0, 1.25],
  map: [0, 0.25],
} as const;

export const PEAK_LABEL_FONT_STACK = [
  "DIN Pro Medium",
  "Arial Unicode MS Bold",
] as const;

export const PEAK_LABEL_TEXT_FIELD: ExpressionSpecification = [
  "coalesce",
  ["get", "name_en"],
  ["get", "name"],
  ["get", "name_local"],
  "",
];

export const PEAK_LABEL_TEXT_SIZE: ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["zoom"],
  2,
  10,
  6,
  12,
  10,
  14,
  25,
  14,
];

export const PEAK_ICONS: Record<string, string> = {
  peak_black: "/icons/altitude/ic_mountain_black.png",
  peak_red: "/icons/altitude/ic_mountain_red.png",
  peak_orange: "/icons/altitude/ic_mountain_orange.png",
  peak_yellow: "/icons/altitude/ic_mountain_yellow.png",
  peak_green: "/icons/altitude/ic_mountain_green.png",
  peak_burgundy: "/icons/altitude/ic_mountain_burgundy.png",
  peak_gray: "/icons/altitude/ic_mountain_gray.png",
  peak_blue: "/icons/altitude/ic_mountain_burgundy.png",
  list_peak_black: "/icons/altitude/map/ic_mountain_black_map.png",
  list_peak_red: "/icons/altitude/map/ic_mountain_red_map.png",
  list_peak_orange: "/icons/altitude/map/ic_mountain_orange_map.png",
  list_peak_yellow: "/icons/altitude/map/ic_mountain_yellow_map.png",
  list_peak_green: "/icons/altitude/map/ic_mountain_green_map.png",
  list_peak_burgundy: "/icons/altitude/map/ic_mountain_burgundy_map.png",
  list_peak_user: "/icons/altitude/map/ic_mountain_user.png",
};

export const SHELTER_ICONS: Record<string, string> = {
  shelter_alpine_hut: "/icons/shelters/ic_shelter_alpine_hut.png",
  shelter_wilderness_hut: "/icons/shelters/ic_shelter_wilderness_hut.png",
  shelter_shelter: "/icons/shelters/ic_shelter_shelter.png",
  shelter_default: "/icons/shelters/ic_shelter_default.png",
};

export const createPeakIconSizeExpression = (
  family: PeakMarkerFamily
): ExpressionSpecification => {
  const config = PEAK_ICON_SIZE_CONFIG[family];
  return [
    "interpolate",
    ["linear"],
    ["zoom"],
    config.minZoom,
    config.minSize,
    config.maxZoom,
    config.maxSize,
  ];
};

export const createSelectablePeakIconSizeExpression = (
  selectedCondition: ExpressionSpecification,
  selectedFamily: PeakMarkerFamily = "map",
  defaultFamily: PeakMarkerFamily = "tile"
): ExpressionSpecification => {
  const selectedConfig = PEAK_ICON_SIZE_CONFIG[selectedFamily];
  const defaultConfig = PEAK_ICON_SIZE_CONFIG[defaultFamily];

  return [
    "interpolate",
    ["linear"],
    ["zoom"],
    selectedConfig.minZoom,
    ["case", selectedCondition, selectedConfig.minSize, defaultConfig.minSize],
    selectedConfig.maxZoom,
    ["case", selectedCondition, selectedConfig.maxSize, defaultConfig.maxSize],
  ];
};

export const createSelectablePeakIconAnchorExpression = (
  selectedCondition: ExpressionSpecification,
  selectedFamily: PeakMarkerFamily = "map",
  defaultFamily: PeakMarkerFamily = "tile"
): ExpressionSpecification => [
  "case",
  selectedCondition,
  PEAK_ICON_ANCHOR[selectedFamily],
  PEAK_ICON_ANCHOR[defaultFamily],
];

export const createPeakSymbolLayout = ({
  family,
  iconImage,
  visibility = "visible",
  symbolSortKey,
  iconIgnorePlacement,
}: PeakSymbolLayoutOptions): PeakSymbolLayout => {
  const layout: PeakSymbolLayout = {
    "icon-image": iconImage as any,
    "icon-size": createPeakIconSizeExpression(family),
    "icon-allow-overlap": true,
    "icon-ignore-placement": true,
    "icon-anchor": PEAK_ICON_ANCHOR[family],
    visibility,
  };

  if (symbolSortKey !== undefined) {
    layout["symbol-sort-key"] = symbolSortKey;
  }

  if (typeof iconIgnorePlacement === "boolean") {
    layout["icon-ignore-placement"] = iconIgnorePlacement;
  }

  return layout;
};

export const createPeakLabelLayout = ({
  family,
  visibility = "visible",
  symbolSortKey,
  textField = PEAK_LABEL_TEXT_FIELD,
  textAllowOverlap = false,
  textIgnorePlacement = false,
  textOptional = true,
}: PeakLabelLayoutOptions): PeakSymbolLayout => {
  const layout: PeakSymbolLayout = {
    "text-field": textField as any,
    "text-size": PEAK_LABEL_TEXT_SIZE,
    "text-offset": [...PEAK_LABEL_OFFSET[family]],
    "text-anchor": "top",
    "text-allow-overlap": textAllowOverlap,
    "text-font": [...PEAK_LABEL_FONT_STACK],
    visibility,
  };

  if (symbolSortKey !== undefined) {
    layout["symbol-sort-key"] = symbolSortKey;
  }

  if (typeof textIgnorePlacement === "boolean") {
    layout["text-ignore-placement"] = textIgnorePlacement;
  }

  if (typeof textOptional === "boolean") {
    layout["text-optional"] = textOptional;
  }

  return layout;
};

export const getPeakLabelTheme = (
  style: string | null | undefined
): PeakLabelTheme => (style?.includes("satellite") ? "satellite" : "default");

export const getPeakLabelPaint = (
  theme: PeakLabelTheme
): PeakSymbolPaint => ({
  "text-color": theme === "satellite" ? "#ffffff" : "#222222",
  "text-halo-color": theme === "satellite" ? "#000000" : "#ffffff",
  "text-halo-width": 1,
  "text-halo-blur": 0.5,
  "text-opacity": 1,
  "text-translate": [0, 0],
  "text-translate-anchor": "map",
});

export const applyPeakLabelPaint = (
  map: MapboxMap,
  layerId: string,
  themeOrStyle: PeakLabelTheme | string
): void => {
  if (!map.getLayer(layerId)) return;

  const theme =
    themeOrStyle === "default" || themeOrStyle === "satellite"
      ? themeOrStyle
      : getPeakLabelTheme(themeOrStyle);

  const paint = getPeakLabelPaint(theme);
  for (const [property, value] of Object.entries(paint) as [string, unknown][]) {
    map.setPaintProperty(layerId, property as any, value as any);
  }
};
