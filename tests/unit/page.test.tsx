import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Home from "@/app/page";

vi.mock("@/components/map/SeasonMap", () => ({
  default: () => <section aria-label="日本各地の季節の投稿を眺める地図" />,
}));

describe("Home", () => {
  it("renders the compact brand and map-first information hierarchy", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { level: 1, name: "四季彩MAP" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("あなたの「いま」が、季節の便りになる。"),
    ).toBeInTheDocument();
    expect(screen.queryByText("四")).not.toBeInTheDocument();
    expect(
      screen.queryByText("日本の季節を、みんなの気配から眺める。"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("region", {
        name: "日本各地の季節の投稿を眺める地図",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/競わない/)).not.toBeInTheDocument();
    expect(screen.queryByText("投稿")).not.toBeInTheDocument();
  });
});
