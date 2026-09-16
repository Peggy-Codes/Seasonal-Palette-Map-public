"use client";

import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import type { Map as MapLibreMap, Marker, Popup } from "maplibre-gl";
import { Protocol } from "pmtiles";
import { buildProtomapsStyle } from "@/components/map/mapStyle";
import { usePinMap } from "@/components/shared/PinMapProvider";
import SeasonGlyph, {
  createSeasonGlyphElement,
} from "@/components/ui/SeasonGlyph";
import type { PinObservation, PinsResponse } from "@/lib/pins";
import { SEASON_LABELS, type SeasonName } from "@/lib/seasons";

type MapFilter = "all" | SeasonName;
type LoadState = "loading" | "ready" | "error";

type RuntimeMarker = {
  observation: PinObservation;
  displayCoordinates: [longitude: number, latitude: number];
  element: HTMLButtonElement;
  marker: Marker;
  popup: Popup;
};

const JITTER_RING_SIZE = 6;
const JITTER_RING_GAP_METERS = 40;
const MAX_JITTER_DEGREES = 0.00049;
const METERS_PER_DEGREE_LAT = 111_320;

if (typeof window !== "undefined") {
  maplibregl.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
  const protocol = new Protocol();
  maplibregl.addProtocol("pmtiles", protocol.tile);
}

const FILTERS: { id: MapFilter; label: string }[] = [
  { id: "all", label: "すべて" },
  { id: "spring", label: "春" },
  { id: "summer", label: "夏" },
  { id: "autumn", label: "秋" },
  { id: "winter", label: "冬" },
];

const SEASON_MARKER_CLASSES: Record<SeasonName, string> = {
  spring: "border-spring-deep bg-spring text-spring-ink",
  summer: "border-summer-deep bg-summer text-summer-ink",
  autumn: "border-autumn-deep bg-autumn text-autumn-ink",
  winter: "border-winter-deep bg-winter text-winter-ink",
};

const SEASON_FILTER_CLASSES: Record<SeasonName, string> = {
  spring:
    "data-[selected=true]:shadow-[inset_0_-3px_0_var(--color-spring-deep)]",
  summer:
    "data-[selected=true]:shadow-[inset_0_-3px_0_var(--color-summer-deep)]",
  autumn:
    "data-[selected=true]:shadow-[inset_0_-3px_0_var(--color-autumn-deep)]",
  winter:
    "data-[selected=true]:shadow-[inset_0_-3px_0_var(--color-winter-deep)]",
};

export default function SeasonMapView() {
  const { revision } = usePinMap();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const runtimeMarkersRef = useRef<RuntimeMarker[]>([]);
  const [pins, setPins] = useState<PinObservation[]>([]);
  const [filter, setFilter] = useState<MapFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(4.65);
  const [mapState, setMapState] = useState<LoadState>("loading");
  const [dataState, setDataState] = useState<LoadState>("loading");
  const [mapAttempt, setMapAttempt] = useState(0);
  const [dataAttempt, setDataAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadPins() {
      try {
        const response = await fetch("/api/pins", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error("Pin request failed");
        }

        const payload = (await response.json()) as PinsResponse;
        if (!Array.isArray(payload.pins)) {
          throw new Error("Invalid pin response");
        }

        setPins(payload.pins);
        setDataState("ready");
      } catch {
        if (controller.signal.aborted) {
          return;
        }

        setDataState("error");
      }
    }

    void loadPins();
    return () => controller.abort();
  }, [dataAttempt, revision]);

  useEffect(() => {
    if (!mapContainerRef.current) {
      return;
    }

    let didFinishInitialLoad = false;
    let map: MapLibreMap;
    try {
      map = new maplibregl.Map({
        attributionControl: false,
        bounds: [
          [122.5, 24],
          [146, 46],
        ],
        container: mapContainerRef.current,
        fitBoundsOptions: {
          maxZoom: 5.2,
          padding: 46,
        },
        maxBounds: [
          [116, 18],
          [158, 49],
        ],
        maxZoom: 16,
        minZoom: 4,
        style: buildProtomapsStyle(),
      });
    } catch {
      const errorTimer = window.setTimeout(() => setMapState("error"), 0);
      return () => window.clearTimeout(errorTimer);
    }

    mapRef.current = map;
    map.addControl(
      new maplibregl.NavigationControl({
        showCompass: false,
        showZoom: true,
      }),
      "top-right",
    );
    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      "bottom-right",
    );

    const updateView = () => {
      setZoom(map.getZoom());
    };
    // "style.load"はスタイル・スプライト・グリフの解析が終わった時点で発火し、
    // "load"(外部タイルソースから初期表示範囲の全タイルが届くまで待つ)より早い。
    // 操作可能状態への切り替えを"style.load"にすることで、ベース地図の詳細タイルが
    // 届くのを待たずにピンを即座にタップ可能にする。
    //
    // 一方エラー検知は引き続き"load"を基準にする: スタイル自体の解析が成功しても
    // タイルソース(PMTiles CDN等)が無応答で完全に失敗するケースがあり、
    // "load"が発火するまでは実際の地図コンテンツが1つも画面に届いた保証がないため。
    map.on("style.load", () => {
      setMapState("ready");
      updateView();
    });
    map.on("load", () => {
      didFinishInitialLoad = true;
    });
    map.on("moveend", updateView);
    map.on("zoomend", updateView);
    map.on("error", () => {
      if (!didFinishInitialLoad) {
        setMapState("error");
      }
    });

    return () => {
      runtimeMarkersRef.current = [];
      mapRef.current = null;
      map.remove();
    };
  }, [mapAttempt]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || mapState !== "ready") {
      return;
    }

    for (const runtimeMarker of runtimeMarkersRef.current) {
      runtimeMarker.popup.remove();
      runtimeMarker.marker.remove();
    }

    const groupSizes = new Map<string, number>();
    for (const observation of pins) {
      const key = coordinateKey(observation);
      groupSizes.set(key, (groupSizes.get(key) ?? 0) + 1);
    }
    const groupCursor = new Map<string, number>();

    const runtimeMarkers = pins.map((observation, index) => {
      const key = coordinateKey(observation);
      const indexInGroup = groupCursor.get(key) ?? 0;
      groupCursor.set(key, indexInGroup + 1);
      const groupSize = groupSizes.get(key) ?? 1;
      const [dLng, dLat] = coordinateJitter(
        indexInGroup,
        groupSize,
        observation.coordinates[1],
      );
      const displayCoordinates: [number, number] = [
        observation.coordinates[0] + dLng,
        observation.coordinates[1] + dLat,
      ];

      // MapLibre positions whichever element is passed to `Marker({ element })`
      // by writing a `translate(...)` directly into its inline `style.transform`.
      // The pin button below also animates via CSS `transform` (hover/selected
      // scale). Putting both on the same element makes the two transforms
      // fight: the scaled-up marker rendered visibly off its true coordinate.
      // A plain wrapper takes MapLibre's positioning transform, and the button
      // (with its own independent transform for the scale effect) lives inside
      // it, so the two no longer collide.
      const markerRoot = document.createElement("div");
      markerRoot.style.display = "inline-block";
      markerRoot.style.zIndex = String(pins.length - index);

      const element = document.createElement("button");
      element.type = "button";
      element.className =
        "flex size-10 cursor-pointer items-center justify-center rounded-[46%_54%_50%_50%] border-2 shadow-[0_0.35rem_0.8rem_oklch(20%_0.03_265/0.22)] transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent data-[selected=true]:scale-110 data-[selected=true]:ring-2 data-[selected=true]:ring-ink/70 " +
        SEASON_MARKER_CLASSES[observation.season];
      element.dataset.selected = "false";
      element.setAttribute("aria-controls", `season-comment-${observation.id}`);
      element.setAttribute("aria-expanded", "false");
      element.setAttribute(
        "aria-label",
        `${SEASON_LABELS[observation.season]}の気配「${observation.comment}」を読む`,
      );
      element.append(createSeasonGlyphElement(observation.season, "size-5"));
      const keepMarkerGestureFromMap = (event: Event) => {
        event.stopPropagation();
      };
      const selectObservation = () => {
        setSelectedId((current) =>
          current === observation.id ? null : observation.id,
        );
      };
      const selectObservationWithKeyboard = (event: KeyboardEvent) => {
        if (event.repeat || (event.key !== "Enter" && event.key !== " ")) {
          return;
        }

        event.preventDefault();
        selectObservation();
      };
      element.addEventListener("mousedown", keepMarkerGestureFromMap);
      element.addEventListener("mouseup", selectObservation);
      element.addEventListener("keydown", selectObservationWithKeyboard);
      element.addEventListener("touchstart", keepMarkerGestureFromMap, {
        passive: true,
      });
      element.addEventListener("touchend", selectObservation, {
        passive: true,
      });
      markerRoot.append(element);

      const popupContent = buildPopupContent(observation);
      popupContent.addEventListener("click", () => {
        setSelectedId((current) =>
          current === observation.id ? null : current,
        );
      });
      const popup = new maplibregl.Popup({
        anchor: "bottom-left",
        closeButton: false,
        closeOnClick: true,
        focusAfterOpen: false,
        maxWidth: "220px",
        offset: [-4, -34],
      })
        .setLngLat(displayCoordinates)
        .setDOMContent(popupContent);
      popup.on("close", () => {
        setSelectedId((current) =>
          current === observation.id ? null : current,
        );
      });
      const marker = new maplibregl.Marker({
        anchor: "center",
        element: markerRoot,
      })
        .setLngLat(displayCoordinates)
        .addTo(map);

      return { displayCoordinates, element, marker, observation, popup };
    });

    runtimeMarkersRef.current = runtimeMarkers;
    return () => {
      for (const runtimeMarker of runtimeMarkers) {
        runtimeMarker.popup.remove();
        runtimeMarker.marker.remove();
      }
      if (runtimeMarkersRef.current === runtimeMarkers) {
        runtimeMarkersRef.current = [];
      }
    };
  }, [mapState, pins]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || mapState !== "ready") {
      return;
    }

    syncMarkerPresentation({
      filter,
      map,
      runtimeMarkers: runtimeMarkersRef.current,
      selectedId,
    });
  }, [filter, mapState, pins, selectedId]);

  const visiblePins =
    filter === "all" ? pins : pins.filter((pin) => pin.season === filter);

  const changeFilter = (nextFilter: MapFilter) => {
    setFilter(nextFilter);
    if (
      selectedId &&
      nextFilter !== "all" &&
      pins.find((pin) => pin.id === selectedId)?.season !== nextFilter
    ) {
      setSelectedId(null);
    }
  };

  const retryMap = () => {
    setMapState("loading");
    setMapAttempt((currentAttempt) => currentAttempt + 1);
  };

  const retryData = () => {
    setDataState("loading");
    setDataAttempt((currentAttempt) => currentAttempt + 1);
  };

  return (
    <section
      aria-busy={mapState === "loading" || dataState === "loading"}
      aria-label="日本各地の季節の投稿を眺める地図"
      className="relative h-dvh min-h-[32rem] w-full overflow-hidden bg-canvas"
      role="region"
    >
      <div className="h-full w-full" ref={mapContainerRef} />

      <div
        aria-label="表示する季節"
        className="absolute left-2 top-16 z-10 flex max-w-[calc(100%-1rem)] overflow-x-auto border border-rule bg-control/95 p-1 shadow-[0_0.5rem_1.5rem_oklch(28%_0.03_245/0.14)] sm:left-4 sm:top-20"
        role="group"
      >
        {FILTERS.map((item) => {
          const isSelected = filter === item.id;
          const season = item.id === "all" ? null : item.id;
          return (
            <button
              aria-pressed={isSelected}
              className={`flex min-h-11 min-w-11 shrink-0 cursor-pointer items-center justify-center gap-1.5 px-3 text-sm font-bold text-ink-muted transition hover:bg-canvas hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent data-[selected=true]:bg-canvas data-[selected=true]:text-ink ${season ? SEASON_FILTER_CLASSES[season] : "data-[selected=true]:shadow-[inset_0_-3px_0_var(--color-accent)]"}`}
              data-selected={isSelected}
              key={item.id}
              onClick={() => changeFilter(item.id)}
              type="button"
            >
              {season ? (
                <SeasonGlyph className="size-5" season={season} />
              ) : (
                <span
                  aria-hidden="true"
                  className="grid size-3 rotate-45 grid-cols-2 gap-px"
                >
                  <i className="bg-spring" />
                  <i className="bg-summer" />
                  <i className="bg-autumn" />
                  <i className="bg-winter" />
                </span>
              )}
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {mapState === "loading" ? (
        <MapStatePanel message="地図を読み込んでいます…" />
      ) : null}
      {mapState === "error" ? (
        <MapStatePanel
          actionLabel="地図を再読込"
          message="地図を読み込めませんでした。通信状況を確認してください。"
          onAction={retryMap}
        />
      ) : null}
      {dataState === "error" && mapState === "ready" ? (
        <div className="absolute left-1/2 top-1/2 z-10 w-[min(26rem,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 border border-rule bg-control p-5 text-center shadow-xl">
          <p className="text-sm leading-7 text-ink-muted">
            季節の投稿を読み込めませんでした。
          </p>
          <button
            className="mt-3 min-h-11 bg-ink px-4 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            onClick={retryData}
            type="button"
          >
            投稿を再読込
          </button>
        </div>
      ) : null}
      {dataState === "ready" && visiblePins.length === 0 ? (
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 w-[min(24rem,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 border border-rule bg-control/95 p-5 text-center shadow-xl">
          <p className="font-display text-lg font-bold">
            まだ、この季節の気配はありません。
          </p>
          <p className="mt-2 text-sm leading-7 text-ink-muted">
            空の地図も、いまの景色です。
          </p>
        </div>
      ) : null}

      <div className="pointer-events-none absolute bottom-14 left-1/2 z-10 -translate-x-1/2 border border-rule bg-control/95 px-3 py-2 text-center text-xs text-ink-muted shadow-lg">
        <span>印を選ぶと、ことばが現れます</span>
        <span className="hidden sm:inline"> · {zoom.toFixed(1)}倍</span>
      </div>

      <p aria-live="polite" className="sr-only" role="status">
        {dataState === "ready"
          ? filter === "all"
            ? "すべての季節を表示しています。"
            : `${SEASON_LABELS[filter]}の投稿だけを表示しています。`
          : ""}
      </p>
    </section>
  );
}

type MapStatePanelProps = {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

function MapStatePanel({ message, actionLabel, onAction }: MapStatePanelProps) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-canvas/95 p-6 text-center">
      <p className="text-sm tracking-wider text-ink-muted">{message}</p>
      {actionLabel && onAction ? (
        <button
          className="min-h-11 bg-ink px-4 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          onClick={onAction}
          type="button"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

function buildPopupContent(observation: PinObservation) {
  const wrapper = document.createElement("article");
  wrapper.className =
    "relative inline-block drop-shadow-[0_0.35rem_0.6rem_oklch(20%_0.03_265/0.22)]";
  wrapper.id = `season-comment-${observation.id}`;
  wrapper.setAttribute(
    "aria-label",
    `${SEASON_LABELS[observation.season]}の季節の投稿`,
  );

  const tailNamespace = "http://www.w3.org/2000/svg";
  const tail = document.createElementNS(tailNamespace, "svg");
  tail.setAttribute("aria-hidden", "true");
  tail.setAttribute("class", "absolute -bottom-3 left-4");
  tail.setAttribute("focusable", "false");
  tail.setAttribute("height", "16");
  tail.setAttribute("viewBox", "0 0 22 16");
  tail.setAttribute("width", "22");

  const tailFillPath = document.createElementNS(tailNamespace, "path");
  tailFillPath.setAttribute("d", "M0,0 H20 V4 L4,16 L0,4 Z");
  tailFillPath.setAttribute("fill", "var(--color-control)");

  const tailOutlinePath = document.createElementNS(tailNamespace, "path");
  tailOutlinePath.setAttribute("d", "M0,4 L4,16 L20,4");
  tailOutlinePath.setAttribute("fill", "none");
  tailOutlinePath.setAttribute("stroke", "var(--color-ink)");
  tailOutlinePath.setAttribute("stroke-linecap", "round");
  tailOutlinePath.setAttribute("stroke-linejoin", "round");
  tailOutlinePath.setAttribute("stroke-width", "2");
  tail.append(tailFillPath, tailOutlinePath);

  const body = document.createElement("div");
  body.className =
    "relative max-w-[11rem] rounded-2xl border-2 border-ink bg-control px-3 py-2 text-sm leading-relaxed text-ink";
  body.textContent = observation.comment;

  wrapper.append(body, tail);
  return wrapper;
}

function coordinateKey(observation: PinObservation) {
  const [lng, lat] = observation.coordinates;
  return `${lng.toFixed(3)},${lat.toFixed(3)}`;
}

function coordinateJitter(
  indexInGroup: number,
  groupSize: number,
  latitudeDeg: number,
): [dLng: number, dLat: number] {
  if (groupSize <= 1) {
    return [0, 0];
  }

  const ring = Math.floor(indexInGroup / JITTER_RING_SIZE);
  const indexInRing = indexInGroup % JITTER_RING_SIZE;
  const countInRing = Math.min(
    JITTER_RING_SIZE,
    groupSize - ring * JITTER_RING_SIZE,
  );
  const radiusMeters =
    JITTER_RING_GAP_METERS / 2 / Math.sin(Math.PI / Math.max(countInRing, 2)) +
    ring * JITTER_RING_GAP_METERS;
  const angle = (2 * Math.PI * indexInRing) / countInRing - Math.PI / 2;
  const dLat = clampJitter(
    (radiusMeters * Math.sin(angle)) / METERS_PER_DEGREE_LAT,
  );
  const metersPerDegreeLng =
    METERS_PER_DEGREE_LAT * Math.cos((latitudeDeg * Math.PI) / 180);
  const dLng = clampJitter(
    (radiusMeters * Math.cos(angle)) / metersPerDegreeLng,
  );

  return [dLng, dLat];
}

function clampJitter(value: number) {
  return Math.max(-MAX_JITTER_DEGREES, Math.min(MAX_JITTER_DEGREES, value));
}

type SyncMarkerPresentationOptions = {
  filter: MapFilter;
  map: MapLibreMap;
  runtimeMarkers: RuntimeMarker[];
  selectedId: string | null;
};

function syncMarkerPresentation({
  filter,
  map,
  runtimeMarkers,
  selectedId,
}: SyncMarkerPresentationOptions) {
  for (const runtimeMarker of runtimeMarkers) {
    const { element, observation, popup } = runtimeMarker;
    const matchesFilter = filter === "all" || observation.season === filter;
    const isSelected = observation.id === selectedId;
    const shouldShowComment = matchesFilter && isSelected;

    element.hidden = !matchesFilter;
    element.dataset.selected = String(isSelected);
    element.setAttribute("aria-expanded", String(shouldShowComment));

    if (shouldShowComment && !popup.isOpen()) {
      popup.addTo(map);
      // ピン側z-indexの最大値(pins.length、= runtimeMarkers.length)を必ず上回らせ、
      // 投稿日時に関わらず開いている吹き出しを常に全ピンより手前に表示する。
      popup.getElement().style.zIndex = String(runtimeMarkers.length + 1);
    } else if (!shouldShowComment && popup.isOpen()) {
      popup.remove();
    }
  }
}
