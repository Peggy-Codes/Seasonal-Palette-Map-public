import { readFileSync } from "node:fs";
import { formatHex, parse } from "culori";
import { describe, expect, it } from "vitest";
import { buildProtomapsStyle, TOKEN_HEX } from "@/components/map/mapStyle";

const CSS_TOKEN_NAMES: Record<keyof typeof TOKEN_HEX, string> = {
  canvas: "canvas",
  control: "control",
  ink: "ink",
  inkMuted: "ink-muted",
  muted: "muted",
  rule: "rule",
};

describe("buildProtomapsStyle", () => {
  it("uses exact sRGB conversions of the neutral design tokens", () => {
    const css = readFileSync("src/app/globals.css", "utf8");

    for (const [tokenName, cssName] of Object.entries(CSS_TOKEN_NAMES)) {
      const match = css.match(
        new RegExp(`--color-${cssName}:\\s*(oklch\\([^;]+\\));`),
      );
      expect(match?.[1]).toBeDefined();
      expect(formatHex(parse(match![1]))).toBe(
        TOKEN_HEX[tokenName as keyof typeof TOKEN_HEX],
      );
    }
  });

  it("builds a Japanese vector style without sprite-dependent layers", () => {
    const style = buildProtomapsStyle("https://maps.example.com/japan.pmtiles");
    const source = style.sources.protomaps;

    expect(source).toMatchObject({
      type: "vector",
      url: "pmtiles://https://maps.example.com/japan.pmtiles",
    });
    expect(source).toHaveProperty("attribution");
    expect(style.glyphs).toBe(
      "https://glyphs.geolonia.com/{fontstack}/{range}.pbf",
    );
    expect(style).not.toHaveProperty("sprite");
    expect(style.layers.map((layer) => layer.id)).not.toEqual(
      expect.arrayContaining(["pois", "roads_oneway", "roads_shields"]),
    );

    for (const layer of style.layers) {
      expect(layer.layout ?? {}).not.toHaveProperty("icon-image");
      if (layer.type === "symbol" && layer.layout?.["text-field"]) {
        expect(layer.layout["text-font"]).toEqual(["Noto Sans Regular"]);
      }
    }

    expect(style.layers.find((layer) => layer.id === "water")?.paint).toEqual(
      expect.objectContaining({ "fill-color": TOKEN_HEX.muted }),
    );
  });

  it("rejects a missing PMTiles URL", () => {
    expect(() => buildProtomapsStyle(" ")).toThrow(
      "NEXT_PUBLIC_MAP_PMTILES_URL is not configured.",
    );
  });
});
