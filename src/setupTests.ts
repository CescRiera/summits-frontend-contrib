import mapboxgl from "mapbox-gl";

// Mock LngLat object
const createMockLngLat = (lng: number, lat: number) => ({
  lng,
  lat,
  wrap: jest.fn(),
  toArray: jest.fn((): [number, number] => [lng, lat]),
  distanceTo: jest.fn(),
  toBounds: jest.fn(),
  toEcef: jest.fn(),
});

jest.mock("mapbox-gl", () => ({
  Map: jest.fn(() => ({
    getBearing: jest.fn(() => 0),
    getCenter: jest.fn(() => createMockLngLat(0, 0)),
    getPitch: jest.fn(() => 0),
    getZoom: jest.fn(() => 1),
    getContainer: jest.fn(() => document.createElement("div")),
    getSource: jest.fn(() => undefined),
    getLayer: jest.fn(() => undefined),
    loaded: jest.fn(() => true),
    on: jest.fn(),
    once: jest.fn(),
    off: jest.fn(),
    remove: jest.fn(),
    resize: jest.fn(),
    flyTo: jest.fn(),
    loadImage: jest.fn(
      (
        _url: string,
        callback: (err: Error | null, img?: HTMLImageElement) => void
      ) => {
        const img = new Image();
        callback(null, img);
      }
    ),
    addImage: jest.fn(),
    addSource: jest.fn(),
    addLayer: jest.fn(),
    removeLayer: jest.fn(),
    removeSource: jest.fn(),
    setStyle: jest.fn(),
    setProjection: jest.fn(),
    setFog: jest.fn(),
    setFilter: jest.fn(),
    setPaintProperty: jest.fn(),
    setLayoutProperty: jest.fn(),
    scrollZoom: {
      enable: jest.fn(),
      disable: jest.fn(),
      setWheelZoomRate: jest.fn(),
    } as any,
    doubleClickZoom: {
      enable: jest.fn(),
      disable: jest.fn(),
    } as any,
    touchZoomRotate: {
      enable: jest.fn(),
      disable: jest.fn(),
    } as any,
  })),
  accessToken: "",
}));

// eslint_disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
mapboxgl.Map.prototype = {
  getBearing: jest.fn(() => 0),
  getCenter: jest.fn(() => createMockLngLat(0, 0)),
  getPitch: jest.fn(() => 0),
  getZoom: jest.fn(() => 1),
  getContainer: jest.fn(() => document.createElement("div")),
  getSource: jest.fn(() => undefined),
  getLayer: jest.fn(() => undefined),
  loaded: jest.fn(() => true),
  on: jest.fn(),
  once: jest.fn(),
  off: jest.fn(),
  remove: jest.fn(),
  resize: jest.fn(),
  flyTo: jest.fn(),
  loadImage: jest.fn(
    (
      _url: string,
      callback: (err: Error | null, img?: HTMLImageElement) => void
    ) => {
      const img = new Image();
      callback(null, img);
    }
  ),
  addImage: jest.fn(),
  addSource: jest.fn(),
  addLayer: jest.fn(),
  removeLayer: jest.fn(),
  removeSource: jest.fn(),
  setStyle: jest.fn(),
  setProjection: jest.fn(),
  setFog: jest.fn(),
  setFilter: jest.fn(),
  setPaintProperty: jest.fn(),
  setLayoutProperty: jest.fn(),
  scrollZoom: {
    enable: jest.fn(),
    disable: jest.fn(),
    setWheelZoomRate: jest.fn(),
  } as any,
  doubleClickZoom: {
    enable: jest.fn(),
    disable: jest.fn(),
  } as any,
  touchZoomRotate: {
    enable: jest.fn(),
    disable: jest.fn(),
  } as any,
};
