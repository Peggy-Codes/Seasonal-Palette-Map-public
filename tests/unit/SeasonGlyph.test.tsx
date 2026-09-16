import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import SeasonGlyph, {
  createSeasonGlyphElement,
} from "@/components/ui/SeasonGlyph";

describe("SeasonGlyph", () => {
  it("renders a decorative glyph for a season", () => {
    const { container } = render(<SeasonGlyph season="spring" />);
    const glyph = container.querySelector("svg");

    expect(glyph).toBeInTheDocument();
    expect(glyph).toHaveAttribute("aria-hidden", "true");
    expect(glyph).toHaveAttribute("focusable", "false");
  });

  it("renders the spring petal rotations and filled center consistently", () => {
    const { container } = render(<SeasonGlyph season="spring" />);
    const reactGlyph = container.querySelector("svg");
    const domGlyph = createSeasonGlyphElement("spring");

    expect(reactGlyph).not.toBeNull();
    expect(reactGlyph?.querySelectorAll("path")).toHaveLength(5);
    expect(
      Array.from(reactGlyph?.querySelectorAll("path[transform]") ?? []).map(
        (path) => path.getAttribute("transform"),
      ),
    ).toEqual([
      "rotate(72 12 12)",
      "rotate(144 12 12)",
      "rotate(216 12 12)",
      "rotate(288 12 12)",
    ]);
    expect(reactGlyph?.querySelector("circle")).toHaveAttribute(
      "fill",
      "currentColor",
    );
    expect(reactGlyph?.querySelector("circle")).toHaveAttribute(
      "stroke",
      "none",
    );
    expect(domGlyph.innerHTML).toBe(reactGlyph?.innerHTML);
  });

  it("renders the autumn leaf outline, veins, and stem", () => {
    const { container } = render(<SeasonGlyph season="autumn" />);
    const reactGlyph = container.querySelector("svg");
    const paths = reactGlyph?.querySelectorAll("path");
    const domGlyph = createSeasonGlyphElement("autumn");

    expect(paths).toHaveLength(5);
    expect(paths?.[0]).toHaveAttribute(
      "d",
      "M12 4C16.8 6.6 17.3 12.8 12 19C6.7 12.8 7.2 6.6 12 4Z",
    );
    expect(
      reactGlyph?.querySelector("path[transform]"),
    ).not.toBeInTheDocument();
    expect(domGlyph.innerHTML).toBe(reactGlyph?.innerHTML);
  });

  it("keeps the summer sun center outlined", () => {
    const { container } = render(<SeasonGlyph season="summer" />);
    const reactCircle = container.querySelector("circle");
    const domCircle =
      createSeasonGlyphElement("summer").querySelector("circle");

    expect(reactCircle).not.toHaveAttribute("fill");
    expect(reactCircle).not.toHaveAttribute("stroke");
    expect(domCircle).not.toHaveAttribute("fill");
    expect(domCircle).not.toHaveAttribute("stroke");
  });
});
