import mapboxgl from "mapbox-gl";
import type { WorldPeaksGeoJSONResponse, CommunityPeak, RegionBoundary } from "../api/types";
import {
  createPeakLabelLayout,
  createPeakSymbolLayout,
  getPeakLabelPaint,
} from "./mapboxPeakPresentation";
import { enableMapboxTerrain } from "./mapboxTerrain";

// =================================================================
// MAP IMAGE LOADER
// =================================================================

export const loadMapImage = (
  map: mapboxgl.Map,
  imageId: string,
  imageUrl: string
): Promise<void> => {
  if (map.hasImage(imageId)) return Promise.resolve();
  return new Promise((resolve) => {
    map.loadImage(imageUrl, (err, img) => {
      if (!err && img && !map.hasImage(imageId)) {
        try {
          map.addImage(imageId, img);
        } catch {
          // Ignore duplicate add errors
        }
      }
      resolve();
    });
  });
};

// =================================================================
// FILTER BUILDERS
// =================================================================

/**
 * Extracts peak IDs from GeoJSON features for exclusion filtering
 */
export const extractPeakIds = (
  geojson: WorldPeaksGeoJSONResponse | null
): (number | string)[] =>
  (geojson?.features || [])
    .map((f) => f.properties?.id as number | string)
    .filter((id): id is number | string => id !== undefined && id !== null);

/**
 * Builds a Mapbox exclusion filter to hide GeoJSON peaks from the vector tile layer.
 * Returns `undefined` if there are no IDs to exclude.
 */
export const buildExclusionFilter = (
  idsToExclude: (number | string)[]
): any | undefined => {
  if (idsToExclude.length === 0) return undefined;
  return [
    "!",
    [
      "any",
      ["in", ["id"], ["literal", idsToExclude]],
      ["in", ["get", "id"], ["literal", idsToExclude]],
      ["in", ["get", "peak_id"], ["literal", idsToExclude]],
      ["in", ["to-number", ["get", "id"]], ["literal", idsToExclude]],
      ["in", ["to-number", ["get", "peak_id"]], ["literal", idsToExclude]],
    ],
  ];
};

/**
 * Builds the combined tile filter (exclusion + optional admin area inclusion).
 * Returns `undefined` when no filtering is needed.
 */
export const buildTileFilter = (
  idsToExclude: (number | string)[],
  appliedAdminOsmIds: number[] | undefined,
  appliedAdminName: string | null
): any[] | undefined => {
  const finalFilter: any[] = ["all"];

  const exclusionFilter = buildExclusionFilter(idsToExclude);
  if (exclusionFilter) {
    finalFilter.push(exclusionFilter);
  }

  if (appliedAdminOsmIds?.length && appliedAdminName) {
    finalFilter.push([
      "in",
      appliedAdminName,
      ["coalesce", ["get", "admin_hierarchy"], ""],
    ]);
  }

  return finalFilter.length > 1 ? finalFilter : undefined;
};

/**
 * Applies a filter to the vector tile layers (peak-symbols and peak-labels)
 */
export const applyTileLayerFilter = (
  map: mapboxgl.Map,
  filter: any[] | undefined
): void => {
  if (map.getLayer("peak-symbols")) {
    map.setFilter("peak-symbols", filter);
  }
  if (map.getLayer("peak-labels")) {
    map.setFilter("peak-labels", filter);
  }
};

/**
 * Fits the map to bounds of the given GeoJSON features OR region boundaries
 */
export const fitMapToBounds = (
  map: mapboxgl.Map,
  geojson: WorldPeaksGeoJSONResponse,
  boundaries: RegionBoundary[] = []
): void => {
  const bounds = new mapboxgl.LngLatBounds();
  let hasBounds = false;

  // Prioritize region boundaries if they exist
  if (boundaries.length > 0) {
    boundaries.forEach((boundary) => {
      const feature = { type: "Feature", geometry: boundary.geojson, properties: {} } as any;
      const boundaryBounds = getFeatureBounds(feature);
      if (boundaryBounds) {
        bounds.extend(boundaryBounds);
        hasBounds = true;
      }
    });
  } else if (geojson.features && geojson.features.length > 0) {
    geojson.features.forEach((feature: any) => {
      if (feature.geometry?.type === "Point") {
        bounds.extend(feature.geometry.coordinates as [number, number]);
        hasBounds = true;
      }
    });
  }

  if (hasBounds && !bounds.isEmpty()) {
    map.fitBounds(bounds, {
      padding: 50,
      maxZoom: 12,
      duration: 1500,
      essential: true,
    });
  }
};

/**
 * Helper to get bounds from a Polygon/MultiPolygon feature
 */
const getFeatureBounds = (feature: any): mapboxgl.LngLatBounds | null => {
  const bounds = new mapboxgl.LngLatBounds();
  let hasCoordinates = false;

  const processCoords = (coords: any) => {
    if (!Array.isArray(coords)) return;
    if (typeof coords[0] === "number") {
      bounds.extend(coords as [number, number]);
      hasCoordinates = true;
    } else {
      coords.forEach(processCoords);
    }
  };

  if (feature.geometry?.coordinates) {
    processCoords(feature.geometry.coordinates);
  }

  return hasCoordinates ? bounds : null;
};

/**
 * Updates the boundary source and layers on the map
 */
export const updateMapBoundaries = (
  map: mapboxgl.Map,
  boundaries: RegionBoundary[] = []
): void => {
  if (!map) return;

  const boundaryFeatures = boundaries.map((b) => ({
    type: "Feature",
    geometry: b.geojson,
    properties: {
      osm_id: b.osm_id,
      name: b.name,
      level: b.level,
    },
  }));

  const featureCollection: any = {
    type: "FeatureCollection",
    features: boundaryFeatures,
  };

  const source = map.getSource("boundary-source") as mapboxgl.GeoJSONSource;
  if (source) {
    source.setData(featureCollection);
  } else if (boundaryFeatures.length > 0) {
    map.addSource("boundary-source", {
      type: "geojson",
      data: featureCollection,
    });

    // Add fill layer (subtle red)
    if (!map.getLayer("boundary-fill")) {
      const beforeId = map.getLayer("clusters") ? "clusters" : undefined;
      map.addLayer({
        id: "boundary-fill",
        type: "fill",
        source: "boundary-source",
        paint: {
          "fill-color": "#FF0000",
          "fill-opacity": 0.1,
        },
      } as any, beforeId);
    }

    // Add line layer (strong red)
    if (!map.getLayer("boundary-line")) {
      const beforeId = map.getLayer("clusters") ? "clusters" : undefined;
      map.addLayer({
        id: "boundary-line",
        type: "line",
        source: "boundary-source",
        paint: {
          "line-color": "#FF0000",
          "line-width": 2,
        },
      } as any, beforeId);
    }
  }
};

// =================================================================
// FEATURE → PEAK CONVERTERS
// =================================================================

/**
 * Converts a GeoJSON map feature (from unclustered-point layer) to a CommunityPeak
 */
export const featureToCommunityPeak = (
  feature: mapboxgl.MapboxGeoJSONFeature
): { peak: CommunityPeak; coordinates: [number, number] } | null => {
  const props = feature.properties;
  if (!props) return null;

  const geometry = feature.geometry as any;
  if (!geometry || geometry.type !== "Point") return null;

  const coordinates = geometry.coordinates as [number, number];

  return {
    peak: {
      id: Number(props["id"] || props["peak_id"]),
      name: props["name"],
      name_en: null,
      elevation: Number(props["elevation"]),
      users: [],
      lat: coordinates[1],
      lng: coordinates[0],
      count: 1,
      unique_users: 0,
    },
    coordinates,
  };
};

// =================================================================
// MAP LAYER DEFINITIONS
// =================================================================

export const PEAK_SYMBOL_LAYOUT: mapboxgl.SymbolLayout = {
  ...createPeakSymbolLayout({
    family: "tile",
    iconImage: [
      "match",
      ["get", "peak_type"],
      "peak_black", "peak_black",
      "peak_red", "peak_red",
      "peak_orange", "peak_orange",
      "peak_yellow", "peak_yellow",
      "peak_green", "peak_green",
      "peak_burgundy", "peak_burgundy",
      "peak_gray", "peak_gray",
      "peak_gray",
    ],
  }),
};

export const PEAK_LABEL_LAYOUT: mapboxgl.SymbolLayout =
  createPeakLabelLayout({
    family: "tile",
  });

export const PEAK_LABEL_PAINT: mapboxgl.SymbolPaint =
  getPeakLabelPaint("satellite");

export const CLUSTER_PAINT = {
  "circle-color": "#7D8A5B",
  "circle-radius": ["step", ["get", "point_count"], 15, 10, 20, 50, 25, 100, 30],
  "circle-stroke-width": 2,
  "circle-stroke-color": "#B5A48B",
} as mapboxgl.CirclePaint;

export const UNCLUSTERED_POINT_LAYOUT: mapboxgl.SymbolLayout = {
  ...createPeakSymbolLayout({
    family: "map",
    iconImage: "list_peak_user",
  }),
  ...createPeakLabelLayout({
    family: "map",
    textOptional: true,
  }),
};

export const UNCLUSTERED_POINT_PAINT: mapboxgl.SymbolPaint =
  getPeakLabelPaint("satellite");

// =================================================================
// MAP INITIALIZATION HELPERS
// =================================================================

/**
 * Adds all standard sources (terrain, vector tiles, GeoJSON) and layers
 * to the world challenge map. Call inside the map `load` event.
 */
export const initializeWorldChallengeLayers = (
  map: mapboxgl.Map,
  geojson: WorldPeaksGeoJSONResponse | null,
  peakIcons: Record<string, string>,
  loadImage: (map: mapboxgl.Map, id: string, url: string) => Promise<void>,
  isMountedFn: () => boolean,
  exclusionFilter: any | undefined
): Promise<void> =>
  (async () => {
    // Terrain
    enableMapboxTerrain(map);

    // Sky
    if (!map.getLayer("sky")) {
      map.addLayer({
        id: "sky",
        type: "sky",
        paint: {
          "sky-type": "atmosphere",
          "sky-atmosphere-sun": [0.0, 0.0],
          "sky-atmosphere-sun-intensity": 15,
        },
      });
    }

    // Load icons
    try {
      await Promise.all(
        Object.entries(peakIcons).map(([key, url]) => loadImage(map, key, url))
      );
    } catch (e) {
      console.warn("Failed to load some map icons", e);
    }

    if (!isMountedFn()) return;

    // Vector tile source
    const tileserverUrl = import.meta.env["VITE_TILESERVER_URL"];
    if (!map.getSource("peaks-source")) {
      map.addSource("peaks-source", {
        type: "vector",
        tiles: [`${tileserverUrl}/peaks_tiles/{z}/{x}/{y}.pbf`],
        maxzoom: 15,
      });
    }

    // Peak symbols (vector tiles)
    if (!map.getLayer("peak-symbols")) {
      const layer: mapboxgl.SymbolLayer = {
        id: "peak-symbols",
        type: "symbol",
        source: "peaks-source",
        "source-layer": "peaks",
        layout: PEAK_SYMBOL_LAYOUT,
      };
      if (exclusionFilter) layer.filter = exclusionFilter;
      map.addLayer(layer);
    }

    // Peak labels (vector tiles)
    if (!map.getLayer("peak-labels")) {
      const layer: mapboxgl.SymbolLayer = {
        id: "peak-labels",
        type: "symbol",
        source: "peaks-source",
        "source-layer": "peaks",
        layout: PEAK_LABEL_LAYOUT,
        paint: PEAK_LABEL_PAINT,
      };
      if (exclusionFilter) layer.filter = exclusionFilter;
      map.addLayer(layer);
    }

    // GeoJSON source with clustering
    if (!map.getSource("world-peaks")) {
      map.addSource("world-peaks", {
        type: "geojson",
        data: geojson || { type: "FeatureCollection", features: [] },
        cluster: true,
        clusterMaxZoom: 11,
        clusterMinPoints: 5,
        clusterRadius: 35,
      });
    }

    // Clusters
    if (!map.getLayer("clusters")) {
      map.addLayer({
        id: "clusters",
        type: "circle",
        source: "world-peaks",
        filter: ["has", "point_count"],
        paint: CLUSTER_PAINT as any,
      });
    }

    // Cluster count
    if (!map.getLayer("cluster-count")) {
      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "world-peaks",
        filter: ["has", "point_count"],
        layout: {
          "text-field": "{point_count_abbreviated}",
          "text-font": ["DIN Pro Medium", "Arial Unicode MS Bold"],
          "text-size": 12,
        },
        paint: { "text-color": "#FFFFFF" },
      });
    }

    // Unclustered points
    if (!map.getLayer("unclustered-point")) {
      map.addLayer({
        id: "unclustered-point",
        type: "symbol",
        source: "world-peaks",
        filter: ["!", ["has", "point_count"]],
        layout: UNCLUSTERED_POINT_LAYOUT,
        paint: UNCLUSTERED_POINT_PAINT,
      });
    }
  })();

/**
 * Registers standard click handlers for the world challenge map layers
 */
export const registerMapClickHandlers = (
  map: mapboxgl.Map,
  mapRef: React.MutableRefObject<mapboxgl.Map | null>,
  isMounted: React.MutableRefObject<boolean>,
  onPeakClick: (peak: CommunityPeak, coordinates: [number, number]) => void
): void => {
  // Unclustered point click
  map.on("click", "unclustered-point", (e) => {
    if (!e.features?.length) return;
    const result = featureToCommunityPeak(e.features[0]!);
    if (result) onPeakClick(result.peak, result.coordinates);
  });

  // Vector tile peak click
  map.on("click", "peak-symbols", (e) => {
    const clusterFeatures = map.queryRenderedFeatures(e.point, {
      layers: ["clusters", "cluster-count"],
    });
    if (clusterFeatures.length > 0) return;
    if (!e.features?.length) return;
    
    console.log("Tiles Peak Clicked - Raw Info:", e.features[0]);
    
    const result = featureToCommunityPeak(e.features[0]!);
    if (result) onPeakClick(result.peak, result.coordinates);
  });

  // Cursor handlers
  const setPointer = () => {
    if (mapRef.current) mapRef.current.getCanvas().style.cursor = "pointer";
  };
  const resetPointer = () => {
    if (mapRef.current) mapRef.current.getCanvas().style.cursor = "";
  };
  map.on("mouseenter", "unclustered-point", setPointer);
  map.on("mouseleave", "unclustered-point", resetPointer);
  map.on("mouseenter", "peak-symbols", setPointer);
  map.on("mouseleave", "peak-symbols", resetPointer);

  // Cluster click
  map.on("click", "clusters", (e) => {
    if (!mapRef.current) return;
    const features = mapRef.current.queryRenderedFeatures(e.point, {
      layers: ["clusters"],
    });
    if (!features.length || !features[0]) return;

    const clusterId = features[0].properties?.["cluster_id"];
    const source = mapRef.current.getSource("world-peaks") as mapboxgl.GeoJSONSource;

    if (source && clusterId !== undefined) {
      source.getClusterExpansionZoom(clusterId, (err, zoom) => {
        if (err || !zoom || !mapRef.current || !isMounted.current || !features[0]?.geometry) return;
        mapRef.current.flyTo({
          center: (features[0].geometry as any).coordinates,
          zoom,
          duration: 300,
          essential: true,
        });
      });
    }
  });
};
