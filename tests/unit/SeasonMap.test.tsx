import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import SeasonMapView from "@/components/map/SeasonMapView";
import PinMapProvider from "@/components/shared/PinMapProvider";

const mapSpies = vi.hoisted(() => ({
  addProtocol: vi.fn(),
  easeTo: vi.fn(),
  flyTo: vi.fn(),
  mapClick: vi.fn(),
  markerSetLngLat: vi.fn(),
  popupOptions: vi.fn(),
  popupSetLngLat: vi.fn(),
  setWorkerUrl: vi.fn(),
}));

vi.mock("maplibre-gl", () => {
  type MapEvent =
    "click" | "error" | "load" | "moveend" | "style.load" | "zoomend";
  type MapListener = () => void;

  class FakeMap {
    container: HTMLElement;
    listeners = new Map<MapEvent, MapListener[]>();
    zoom = 4;
    flyTo = mapSpies.flyTo;
    easeTo = mapSpies.easeTo;

    constructor(options: { container: HTMLElement }) {
      this.container = options.container;
      mapSpies.mapClick.mockImplementation(() => this.emit("click"));
    }

    addControl() {
      return this;
    }

    getBounds() {
      return { contains: () => true };
    }

    getZoom() {
      return this.zoom;
    }

    on(event: MapEvent, listener: MapListener) {
      const listeners = this.listeners.get(event) ?? [];
      listeners.push(listener);
      this.listeners.set(event, listeners);
      if (event === "style.load" || event === "load") {
        queueMicrotask(listener);
      }
      return this;
    }

    off(event: MapEvent, listener: MapListener) {
      const listeners = this.listeners.get(event) ?? [];
      this.listeners.set(
        event,
        listeners.filter((item) => item !== listener),
      );
      return this;
    }

    emit(event: MapEvent) {
      for (const listener of this.listeners.get(event) ?? []) {
        listener();
      }
    }

    remove() {
      this.container.replaceChildren();
    }
  }

  class FakeMarker {
    element: HTMLElement;

    constructor(options: { element: HTMLElement }) {
      this.element = options.element;
    }

    setLngLat(coordinates: [number, number]) {
      mapSpies.markerSetLngLat(coordinates);
      return this;
    }

    addTo(map: FakeMap) {
      map.container.append(this.element);
      return this;
    }

    remove() {
      this.element.remove();
      return this;
    }
  }

  class FakePopup {
    content: HTMLElement | null = null;
    container = document.createElement("div");
    listeners: MapListener[] = [];
    map: FakeMap | null = null;
    options: { closeButton?: boolean; closeOnClick?: boolean };

    constructor(options: { closeButton?: boolean; closeOnClick?: boolean }) {
      this.options = options;
      mapSpies.popupOptions(options);
    }

    setLngLat(coordinates: [number, number]) {
      mapSpies.popupSetLngLat(coordinates);
      return this;
    }

    setDOMContent(content: HTMLElement) {
      this.content = content;
      this.container.replaceChildren(content);
      if (this.options.closeButton) {
        const closeButton = document.createElement("button");
        closeButton.type = "button";
        closeButton.setAttribute("aria-label", "Close popup");
        closeButton.textContent = "×";
        closeButton.addEventListener("click", () => this.remove());
        this.container.append(closeButton);
      }
      return this;
    }

    addTo(map: FakeMap) {
      this.map = map;
      if (this.options.closeOnClick) {
        map.on("click", this.closeOnMapClick);
      }
      if (!this.container.isConnected) {
        map.container.append(this.container);
      }
      return this;
    }

    isOpen() {
      return this.container.isConnected;
    }

    getElement() {
      return this.container;
    }

    on(event: "close", listener: MapListener) {
      if (event === "close") {
        this.listeners.push(listener);
      }
      return this;
    }

    remove() {
      if (!this.map) {
        return this;
      }

      this.map.off("click", this.closeOnMapClick);
      this.container.remove();
      this.map = null;
      for (const listener of this.listeners) {
        listener();
      }
      return this;
    }

    closeOnMapClick = () => {
      this.remove();
    };
  }

  return {
    addProtocol: mapSpies.addProtocol,
    AttributionControl: class {},
    Map: FakeMap,
    Marker: FakeMarker,
    NavigationControl: class {},
    Popup: FakePopup,
    setWorkerUrl: mapSpies.setWorkerUrl,
  };
});

const pins = [
  {
    comment: "石畳に落ちた葉が、雨で濃くなっていた。",
    coordinates: [135.768, 35.012],
    createdAt: "2026-08-28T00:00:00.000Z",
    id: "kyoto-autumn",
    season: "autumn",
  },
  {
    comment: "夕立のあと、風が青く匂った。",
    coordinates: [139.692, 35.69],
    createdAt: "2026-08-28T00:00:00.000Z",
    id: "tokyo-summer",
    season: "summer",
  },
];

afterEach(() => {
  cleanup();
});

describe("SeasonMapView", () => {
  beforeAll(() => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockReturnValue({ matches: true }),
    });
  });

  beforeEach(() => {
    vi.stubEnv(
      "NEXT_PUBLIC_MAP_PMTILES_URL",
      "https://maps.example.com/japan.pmtiles",
    );
    mapSpies.flyTo.mockClear();
    mapSpies.easeTo.mockClear();
    mapSpies.mapClick.mockReset();
    mapSpies.markerSetLngLat.mockClear();
    mapSpies.popupOptions.mockClear();
    mapSpies.popupSetLngLat.mockClear();
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ pins }), {
        headers: { "Content-Type": "application/json" },
      }),
    );
  });

  it("registers the MapLibre worker and PMTiles protocol once", () => {
    expect(mapSpies.setWorkerUrl).toHaveBeenCalledWith(
      "/maplibre/maplibre-gl-worker.mjs",
    );
    expect(mapSpies.addProtocol).toHaveBeenCalledWith(
      "pmtiles",
      expect.any(Function),
    );
  });

  it("filters API pins and reveals a selected comment without moving the map", async () => {
    render(
      <PinMapProvider>
        <SeasonMapView />
      </PinMapProvider>,
    );

    const kyotoMarker = await screen.findByRole("button", {
      name: "秋の気配「石畳に落ちた葉が、雨で濃くなっていた。」を読む",
    });
    expect(kyotoMarker).toHaveAttribute("aria-expanded", "false");
    expect(kyotoMarker.querySelector("svg")).toHaveClass("size-5");

    const autumnFilter = screen.getByRole("button", { name: "秋" });
    expect(autumnFilter.querySelector("svg")).toHaveClass("size-5");
    fireEvent.click(autumnFilter);
    expect(
      screen.queryByRole("button", {
        name: "夏の気配「夕立のあと、風が青く匂った。」を読む",
      }),
    ).not.toBeInTheDocument();

    fireEvent.mouseUp(kyotoMarker);

    await waitFor(() => {
      expect(screen.getByText(pins[0].comment)).toBeInTheDocument();
    });
    expect(screen.queryByText("秋 · 観測地点")).not.toBeInTheDocument();
    expect(kyotoMarker).toHaveAttribute("aria-expanded", "true");
    expect(mapSpies.flyTo).not.toHaveBeenCalled();
    expect(mapSpies.easeTo).not.toHaveBeenCalled();
  });

  it("jitters overlapping pins within their rounded cell and aligns each popup", async () => {
    const overlappingPins = [
      ...pins,
      {
        ...pins[0],
        comment: "同じ街角で、金木犀が香っていた。",
        id: "kyoto-autumn-2",
      },
      {
        ...pins[0],
        comment: "同じ街角で、風が少し冷たくなった。",
        id: "kyoto-autumn-3",
      },
    ];
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ pins: overlappingPins }), {
        headers: { "Content-Type": "application/json" },
      }),
    );

    render(
      <PinMapProvider>
        <SeasonMapView />
      </PinMapProvider>,
    );

    const firstMarker = await screen.findByRole("button", {
      name: "秋の気配「石畳に落ちた葉が、雨で濃くなっていた。」を読む",
    });
    await waitFor(() => {
      expect(mapSpies.markerSetLngLat).toHaveBeenCalledTimes(4);
    });

    const markerCoordinates = mapSpies.markerSetLngLat.mock.calls.map(
      ([coordinates]) => coordinates as [number, number],
    );
    const popupCoordinates = mapSpies.popupSetLngLat.mock.calls.map(
      ([coordinates]) => coordinates as [number, number],
    );
    const kyotoCoordinates = markerCoordinates.filter(
      ([lng, lat]) =>
        Math.abs(lng - pins[0].coordinates[0]) < 0.0005 &&
        Math.abs(lat - pins[0].coordinates[1]) < 0.0005,
    );

    expect(new Set(kyotoCoordinates.map((value) => value.join(","))).size).toBe(
      3,
    );
    expect(markerCoordinates).toEqual(popupCoordinates);
    expect(markerCoordinates[1]).toEqual(pins[1].coordinates);
    expect(firstMarker).toHaveClass("size-10");
    expect(firstMarker).not.toHaveClass("size-11");
  });

  it("stacks newer overlapping pins above older pins", async () => {
    const overlappingPins = [
      {
        ...pins[0],
        comment: "今朝、石畳の色が深くなっていた。",
        createdAt: "2026-09-15T00:00:00.000Z",
        id: "kyoto-autumn-newest",
      },
      {
        ...pins[0],
        comment: "昨日、石畳に落ち葉が集まっていた。",
        createdAt: "2026-09-14T00:00:00.000Z",
        id: "kyoto-autumn-older",
      },
    ];
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ pins: overlappingPins }), {
        headers: { "Content-Type": "application/json" },
      }),
    );

    render(
      <PinMapProvider>
        <SeasonMapView />
      </PinMapProvider>,
    );

    const newestMarker = await screen.findByRole("button", {
      name: "秋の気配「今朝、石畳の色が深くなっていた。」を読む",
    });
    const olderMarker = screen.getByRole("button", {
      name: "秋の気配「昨日、石畳に落ち葉が集まっていた。」を読む",
    });
    const newestZIndex = Number(newestMarker.parentElement?.style.zIndex);
    const olderZIndex = Number(olderMarker.parentElement?.style.zIndex);

    expect(newestZIndex).toBeGreaterThan(olderZIndex);
    expect(newestZIndex).toBe(2);
    expect(olderZIndex).toBe(1);
  });

  it("opens only the selected popup and closes it through marker or popup toggles", async () => {
    render(
      <PinMapProvider>
        <SeasonMapView />
      </PinMapProvider>,
    );

    const kyotoMarker = await screen.findByRole("button", {
      name: "秋の気配「石畳に落ちた葉が、雨で濃くなっていた。」を読む",
    });
    const tokyoMarker = screen.getByRole("button", {
      name: "夏の気配「夕立のあと、風が青く匂った。」を読む",
    });

    expect(screen.queryByText(pins[0].comment)).not.toBeInTheDocument();
    expect(screen.queryByText(pins[1].comment)).not.toBeInTheDocument();
    expect(mapSpies.popupOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        anchor: "bottom-left",
        closeButton: false,
        closeOnClick: true,
        maxWidth: "220px",
        offset: [-4, -34],
      }),
    );

    fireEvent.mouseUp(kyotoMarker);
    await screen.findByText(pins[0].comment);

    const popup = screen.getByLabelText("秋の季節の投稿");
    const popupBody = screen.getByText(pins[0].comment);
    const popupTail = popup.querySelector("svg");
    const markerZIndexes = screen
      .getAllByRole("button", { name: /の気配「.+」を読む/ })
      .map((marker) => Number(marker.parentElement?.style.zIndex));
    expect(Number(popup.parentElement?.style.zIndex)).toBeGreaterThan(
      Math.max(...markerZIndexes),
    );
    expect(popup).toHaveClass(
      "relative",
      "inline-block",
      "drop-shadow-[0_0.35rem_0.6rem_oklch(20%_0.03_265/0.22)]",
    );
    expect(popupBody).toHaveClass(
      "relative",
      "max-w-[11rem]",
      "rounded-2xl",
      "border-2",
      "border-ink",
      "bg-control",
    );
    expect(popupBody).not.toHaveClass("border-t-4");
    expect(popupBody).not.toHaveClass("shadow-xl");
    expect(popupTail).toHaveAttribute("aria-hidden", "true");
    expect(popupTail).toHaveAttribute("height", "16");
    expect(popupTail).toHaveAttribute("viewBox", "0 0 22 16");
    expect(popupTail).toHaveAttribute("width", "22");
    expect(popupTail).toHaveClass("absolute", "-bottom-3", "left-4");
    const [tailFillPath, tailOutlinePath] =
      popupTail?.querySelectorAll("path") ?? [];
    expect(tailFillPath).toHaveAttribute("d", "M0,0 H20 V4 L4,16 L0,4 Z");
    expect(tailFillPath).toHaveAttribute("fill", "var(--color-control)");
    expect(tailOutlinePath).toHaveAttribute("d", "M0,4 L4,16 L20,4");
    expect(tailOutlinePath).toHaveAttribute("fill", "none");
    expect(tailOutlinePath).toHaveAttribute("stroke", "var(--color-ink)");
    expect(popup.firstElementChild).toBe(popupBody);
    expect(popup.lastElementChild).toBe(popupTail);

    expect(
      screen.queryByRole("button", { name: "Close popup" }),
    ).not.toBeInTheDocument();

    fireEvent.mouseUp(kyotoMarker);
    await waitFor(() => {
      expect(screen.queryByText(pins[0].comment)).not.toBeInTheDocument();
      expect(kyotoMarker).toHaveAttribute("data-selected", "false");
    });

    fireEvent.mouseUp(kyotoMarker);
    const reopenedPopupBody = await screen.findByText(pins[0].comment);
    fireEvent.click(reopenedPopupBody);
    await waitFor(() => {
      expect(screen.queryByText(pins[0].comment)).not.toBeInTheDocument();
      expect(kyotoMarker).toHaveAttribute("data-selected", "false");
    });

    fireEvent.mouseUp(kyotoMarker);
    await screen.findByText(pins[0].comment);
    fireEvent.mouseUp(tokyoMarker);
    await waitFor(() => {
      expect(screen.queryByText(pins[0].comment)).not.toBeInTheDocument();
      expect(screen.getByText(pins[1].comment)).toBeInTheDocument();
    });
    expect(kyotoMarker).toHaveAttribute("data-selected", "false");
    expect(tokyoMarker).toHaveAttribute("data-selected", "true");
  });

  it("toggles the selected popup from the keyboard", async () => {
    render(
      <PinMapProvider>
        <SeasonMapView />
      </PinMapProvider>,
    );

    const tokyoMarker = await screen.findByRole("button", {
      name: "夏の気配「夕立のあと、風が青く匂った。」を読む",
    });

    fireEvent.keyDown(tokyoMarker, { key: "Enter" });
    await screen.findByText(pins[1].comment);
    expect(tokyoMarker).toHaveAttribute("aria-expanded", "true");

    fireEvent.keyDown(tokyoMarker, { key: " " });
    await waitFor(() => {
      expect(screen.queryByText(pins[1].comment)).not.toBeInTheDocument();
      expect(tokyoMarker).toHaveAttribute("aria-expanded", "false");
    });
  });

  it("closes the popup and clears its marker selection on map click", async () => {
    render(
      <PinMapProvider>
        <SeasonMapView />
      </PinMapProvider>,
    );

    const tokyoMarker = await screen.findByRole("button", {
      name: "夏の気配「夕立のあと、風が青く匂った。」を読む",
    });
    fireEvent.mouseUp(tokyoMarker);
    await screen.findByText(pins[1].comment);
    mapSpies.mapClick();

    await waitFor(() => {
      expect(screen.queryByText(pins[1].comment)).not.toBeInTheDocument();
      expect(tokyoMarker).toHaveAttribute("data-selected", "false");
    });
  });

  it("keeps a fixed tail while the popup body grows for a 50-character comment", async () => {
    const shortComment = "春";
    const longComment =
      "季節の移ろいを感じる風が川辺をゆっくり渡り木々の葉を揺らして夕暮れの街に淡い匂いを運んでいる日です。";
    expect(Array.from(longComment)).toHaveLength(50);

    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          pins: [
            {
              ...pins[0],
              comment: shortComment,
              id: "short-comment",
              season: "spring",
            },
            {
              ...pins[1],
              comment: longComment,
              id: "long-comment",
              season: "winter",
            },
          ],
        }),
        { headers: { "Content-Type": "application/json" } },
      ),
    );

    render(
      <PinMapProvider>
        <SeasonMapView />
      </PinMapProvider>,
    );

    const shortMarker = await screen.findByRole("button", {
      name: `春の気配「${shortComment}」を読む`,
    });
    const longMarker = screen.getByRole("button", {
      name: `冬の気配「${longComment}」を読む`,
    });

    fireEvent.mouseUp(shortMarker);
    const shortPopup = await screen.findByLabelText("春の季節の投稿");
    const shortBody = shortPopup.querySelector("div");
    const shortTailPath = shortPopup.querySelector("svg path");
    expect(shortBody).toHaveClass("max-w-[11rem]");

    fireEvent.mouseUp(longMarker);
    const longPopup = await screen.findByLabelText("冬の季節の投稿");
    const longBody = longPopup.querySelector("div");
    const longTailPath = longPopup.querySelector("svg path");
    expect(longBody).toHaveTextContent(longComment);
    expect(longBody).toHaveClass("max-w-[11rem]");
    expect(longTailPath?.getAttribute("d")).toBe(
      shortTailPath?.getAttribute("d"),
    );
  });
});
