import {
  LIGHT,
  layers as buildBasemapLayers,
  type Flavor,
} from "@protomaps/basemaps";
import type { LayerSpecification, StyleSpecification } from "maplibre-gl";

const MAP_SOURCE_ID = "protomaps";
const GLYPHS_URL = "https://glyphs.geolonia.com/{fontstack}/{range}.pbf";
const ATTRIBUTION =
  '<a href="https://protomaps.com" target="_blank" rel="noreferrer">Protomaps</a> · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>';

export const TOKEN_HEX = {
  canvas: "#f7f3eb",
  control: "#fdfaf3",
  ink: "#1b1826",
  inkMuted: "#3e3b4a",
  muted: "#56626c",
  rule: "#aca79e",
} as const;

const ROAD_FILL = TOKEN_HEX.control;
const ROAD_CASING = TOKEN_HEX.rule;
const LAND_ALT = TOKEN_HEX.control;

const CUSTOM_FLAVOR: Flavor = {
  ...LIGHT,
  background: TOKEN_HEX.canvas,
  earth: TOKEN_HEX.canvas,
  park_a: LAND_ALT,
  park_b: LAND_ALT,
  hospital: LAND_ALT,
  industrial: LAND_ALT,
  school: LAND_ALT,
  wood_a: LAND_ALT,
  wood_b: LAND_ALT,
  pedestrian: LAND_ALT,
  scrub_a: LAND_ALT,
  scrub_b: LAND_ALT,
  glacier: LAND_ALT,
  sand: LAND_ALT,
  beach: LAND_ALT,
  aerodrome: LAND_ALT,
  runway: ROAD_CASING,
  water: TOKEN_HEX.muted,
  zoo: LAND_ALT,
  military: LAND_ALT,
  tunnel_other_casing: ROAD_CASING,
  tunnel_minor_casing: ROAD_CASING,
  tunnel_link_casing: ROAD_CASING,
  tunnel_major_casing: ROAD_CASING,
  tunnel_highway_casing: ROAD_CASING,
  tunnel_other: ROAD_FILL,
  tunnel_minor: ROAD_FILL,
  tunnel_link: ROAD_FILL,
  tunnel_major: ROAD_FILL,
  tunnel_highway: ROAD_FILL,
  pier: LAND_ALT,
  buildings: TOKEN_HEX.rule,
  minor_service_casing: ROAD_CASING,
  minor_casing: ROAD_CASING,
  link_casing: ROAD_CASING,
  major_casing_late: ROAD_CASING,
  highway_casing_late: ROAD_CASING,
  other: ROAD_FILL,
  minor_service: ROAD_FILL,
  minor_a: ROAD_FILL,
  minor_b: ROAD_FILL,
  link: ROAD_FILL,
  major_casing_early: ROAD_CASING,
  major: ROAD_FILL,
  highway_casing_early: ROAD_CASING,
  highway: ROAD_FILL,
  railway: TOKEN_HEX.muted,
  boundaries: TOKEN_HEX.muted,
  bridges_other_casing: ROAD_CASING,
  bridges_minor_casing: ROAD_CASING,
  bridges_link_casing: ROAD_CASING,
  bridges_major_casing: ROAD_CASING,
  bridges_highway_casing: ROAD_CASING,
  bridges_other: ROAD_FILL,
  bridges_minor: ROAD_FILL,
  bridges_link: ROAD_FILL,
  bridges_major: ROAD_FILL,
  bridges_highway: ROAD_FILL,
  roads_label_minor: TOKEN_HEX.inkMuted,
  roads_label_minor_halo: TOKEN_HEX.control,
  roads_label_major: TOKEN_HEX.inkMuted,
  roads_label_major_halo: TOKEN_HEX.control,
  ocean_label: TOKEN_HEX.muted,
  subplace_label: TOKEN_HEX.inkMuted,
  subplace_label_halo: TOKEN_HEX.control,
  city_label: TOKEN_HEX.ink,
  city_label_halo: TOKEN_HEX.control,
  state_label: TOKEN_HEX.inkMuted,
  state_label_halo: TOKEN_HEX.control,
  country_label: TOKEN_HEX.ink,
  address_label: TOKEN_HEX.inkMuted,
  address_label_halo: TOKEN_HEX.control,
  pois: undefined,
  landcover: {
    barren: LAND_ALT,
    farmland: LAND_ALT,
    forest: LAND_ALT,
    glacier: LAND_ALT,
    grassland: LAND_ALT,
    scrub: LAND_ALT,
    urban_area: TOKEN_HEX.canvas,
  },
};

const SPRITE_ONLY_LAYER_IDS = new Set([
  "pois",
  "roads_oneway",
  "roads_shields",
]);

function prepareLayer(layer: LayerSpecification): LayerSpecification | null {
  if (SPRITE_ONLY_LAYER_IDS.has(layer.id)) {
    return null;
  }

  if (!layer.layout) {
    return layer;
  }

  const layout = { ...layer.layout } as Record<string, unknown>;
  if (layer.id === "places_locality") {
    delete layout["icon-image"];
    delete layout["icon-size"];
  }
  if (layer.type === "symbol" && layout["text-field"] !== undefined) {
    layout["text-font"] = ["Noto Sans Regular"];
  }

  return { ...layer, layout } as LayerSpecification;
}

export function buildProtomapsStyle(
  pmtilesUrl = process.env.NEXT_PUBLIC_MAP_PMTILES_URL,
): StyleSpecification {
  const publicUrl = pmtilesUrl?.trim();
  if (!publicUrl) {
    throw new Error("NEXT_PUBLIC_MAP_PMTILES_URL is not configured.");
  }

  const mapLayers = buildBasemapLayers(MAP_SOURCE_ID, CUSTOM_FLAVOR, {
    lang: "ja",
  })
    .map((layer) => prepareLayer(layer as LayerSpecification))
    .filter((layer): layer is LayerSpecification => layer !== null);

  return {
    version: 8,
    glyphs: GLYPHS_URL,
    sources: {
      [MAP_SOURCE_ID]: {
        attribution: ATTRIBUTION,
        type: "vector",
        url: `pmtiles://${publicUrl}`,
      },
    },
    layers: mapLayers,
  };
}
