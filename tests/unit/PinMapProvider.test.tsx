import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PinMapProvider, { usePinMap } from "@/components/shared/PinMapProvider";

function RefreshConsumer() {
  const { refreshPins, revision } = usePinMap();
  return (
    <button onClick={refreshPins} type="button">
      再読込 {revision}
    </button>
  );
}

describe("PinMapProvider", () => {
  it("shares a refresh revision with map descendants", () => {
    render(
      <PinMapProvider>
        <RefreshConsumer />
      </PinMapProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "再読込 0" }));

    expect(
      screen.getByRole("button", { name: "再読込 1" }),
    ).toBeInTheDocument();
  });
});
