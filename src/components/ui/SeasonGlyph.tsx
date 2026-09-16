import type { SeasonName } from "@/lib/seasons";

export { SEASON_LABELS, type SeasonName } from "@/lib/seasons";

type SeasonGlyphProps = {
  season: SeasonName;
  className?: string;
};

type SeasonGlyphDrawing = {
  circles?: { cx: string; cy: string; r: string }[];
  fillCircles?: boolean;
  paths: string[];
  rotations?: number[];
};

const SEASON_GLYPH_DRAWINGS: Record<SeasonName, SeasonGlyphDrawing> = {
  spring: {
    circles: [{ cx: "12", cy: "12", r: "1.3" }],
    fillCircles: true,
    paths: [
      "M12 12C10.4 10.3 9.8 7.7 10.6 5.9C10.9 5.2 11.3 4.7 11.6 4.5L12 5.3L12.4 4.5C12.7 4.7 13.1 5.2 13.4 5.9C14.2 7.7 13.6 10.3 12 12Z",
    ],
    rotations: [72, 144, 216, 288],
  },
  summer: {
    circles: [{ cx: "12", cy: "12", r: "3.4" }],
    paths: [
      "M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1",
    ],
  },
  autumn: {
    paths: [
      "M12 4C16.8 6.6 17.3 12.8 12 19C6.7 12.8 7.2 6.6 12 4Z",
      "M12 6.5v11",
      "M12 9.3L9.6 11.7M12 9.3L14.4 11.7",
      "M12 13L10 15M12 13L14 15",
      "M12 19C12 19.9 11.7 20.7 11.1 21.2",
    ],
  },
  winter: {
    paths: [
      "M12 2.5v19M3.8 7.3l16.4 9.4M3.8 16.7l16.4-9.4",
      "m9.6 4.5 2.4 2.1 2.4-2.1M9.6 19.5l2.4-2.1 2.4 2.1M4.8 10.1l3-.7.6-3M19.2 13.9l-3 .7-.6 3M4.8 13.9l3 .7.6 3M19.2 10.1l-3-.7-.6-3",
    ],
  },
};

export function createSeasonGlyphElement(
  season: SeasonName,
  className?: string,
) {
  const namespace = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(namespace, "svg");
  const drawing = SEASON_GLYPH_DRAWINGS[season];

  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("fill", "none");
  svg.setAttribute("focusable", "false");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("stroke-width", "1.6");
  svg.setAttribute("viewBox", "0 0 24 24");
  if (className) {
    svg.setAttribute("class", className);
  }

  for (const pathData of drawing.paths) {
    const path = document.createElementNS(namespace, "path");
    path.setAttribute("d", pathData);
    svg.append(path);

    for (const angle of drawing.rotations ?? []) {
      const rotatedPath = document.createElementNS(namespace, "path");
      rotatedPath.setAttribute("d", pathData);
      rotatedPath.setAttribute("transform", `rotate(${angle} 12 12)`);
      svg.append(rotatedPath);
    }
  }

  for (const circleData of drawing.circles ?? []) {
    const circle = document.createElementNS(namespace, "circle");
    circle.setAttribute("cx", circleData.cx);
    circle.setAttribute("cy", circleData.cy);
    circle.setAttribute("r", circleData.r);
    if (drawing.fillCircles) {
      circle.setAttribute("fill", "currentColor");
      circle.setAttribute("stroke", "none");
    }
    svg.append(circle);
  }

  return svg;
}

export default function SeasonGlyph({ season, className }: SeasonGlyphProps) {
  const drawing = SEASON_GLYPH_DRAWINGS[season];
  const commonProps = {
    "aria-hidden": true,
    className,
    fill: "none",
    focusable: false,
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.6,
    viewBox: "0 0 24 24",
  };

  return (
    <svg {...commonProps}>
      {drawing.paths.flatMap((pathData) => [
        <path d={pathData} key={pathData} />,
        ...(drawing.rotations ?? []).map((angle) => (
          <path
            d={pathData}
            key={`${pathData}-${angle}`}
            transform={`rotate(${angle} 12 12)`}
          />
        )),
      ])}
      {drawing.circles?.map((circle) => (
        <circle
          {...circle}
          fill={drawing.fillCircles ? "currentColor" : undefined}
          key={`${circle.cx}-${circle.cy}-${circle.r}`}
          stroke={drawing.fillCircles ? "none" : undefined}
        />
      ))}
    </svg>
  );
}
