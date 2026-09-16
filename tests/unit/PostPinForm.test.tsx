import { createRef } from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PostPinForm from "@/components/pin/PostPinForm";
import PinMapProvider from "@/components/shared/PinMapProvider";

const originalFetch = global.fetch;
const DEMO_MODE_DESCRIPTION =
  "これはポートフォリオ公開用のデモです。位置情報保護のため、投稿はランダムな地点に記録されます。";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "");
});

afterEach(() => {
  cleanup();
  global.fetch = originalFetch;
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("PostPinForm", () => {
  it("gets the current position and posts a seasonal observation", async () => {
    mockGeolocationSuccess(35.0116, 135.7677);
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          pin: {
            comment: "葉の乾く音がした。",
            coordinates: [135.768, 35.012],
            createdAt: "2026-08-28T00:00:00.000Z",
            id: "pin-1",
            season: "autumn",
          },
        }),
        { status: 201 },
      ),
    );
    global.fetch = fetchMock;

    const dialogRef = createRef<HTMLDialogElement>();
    render(
      <PinMapProvider>
        <PostPinForm dialogRef={dialogRef} onClose={vi.fn()} />
      </PinMapProvider>,
    );
    dialogRef.current?.setAttribute("open", "");

    fireEvent.click(screen.getByRole("button", { name: "秋" }));
    fireEvent.change(screen.getByLabelText("観測メモ"), {
      target: { value: "葉の乾く音がした。" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "現在地から地図に置く" }),
    );

    await screen.findByRole("button", { name: "地図に置きました" });
    expect(
      screen.getByText("秋の気配を地図に置きました。"),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/pins",
      expect.objectContaining({ method: "POST" }),
    );
    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string)).toMatchObject(
      {
        comment: "葉の乾く音がした。",
        latitude: 35.0116,
        longitude: 135.7677,
        season: "autumn",
      },
    );
  });

  it("announces permission denial without sending a post", async () => {
    mockGeolocationError(1);
    const fetchMock = vi.fn();
    global.fetch = fetchMock;

    const dialogRef = createRef<HTMLDialogElement>();
    render(
      <PinMapProvider>
        <PostPinForm dialogRef={dialogRef} onClose={vi.fn()} />
      </PinMapProvider>,
    );
    dialogRef.current?.setAttribute("open", "");

    fireEvent.change(screen.getByLabelText("観測メモ"), {
      target: { value: "風の温度が変わった。" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "現在地から地図に置く" }),
    );

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "位置情報の利用が許可されなかったため、投稿できません。",
      );
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows the privacy notice in demo mode", () => {
    vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "true");
    const dialogRef = createRef<HTMLDialogElement>();

    render(
      <PinMapProvider>
        <PostPinForm dialogRef={dialogRef} onClose={vi.fn()} />
      </PinMapProvider>,
    );

    expect(screen.getByText(DEMO_MODE_DESCRIPTION)).toBeInTheDocument();
    expect(dialogRef.current).toHaveAttribute(
      "aria-describedby",
      "post-pin-description demo-mode-description",
    );
  });

  it("hides the demo privacy notice during normal operation", () => {
    const dialogRef = createRef<HTMLDialogElement>();

    render(
      <PinMapProvider>
        <PostPinForm dialogRef={dialogRef} onClose={vi.fn()} />
      </PinMapProvider>,
    );

    expect(screen.queryByText(DEMO_MODE_DESCRIPTION)).not.toBeInTheDocument();
    expect(dialogRef.current).toHaveAttribute(
      "aria-describedby",
      "post-pin-description",
    );
  });
});

function mockGeolocationSuccess(latitude: number, longitude: number) {
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: {
      getCurrentPosition: vi.fn((success: PositionCallback) =>
        success({ coords: { latitude, longitude } } as GeolocationPosition),
      ),
    },
  });
}

function mockGeolocationError(code: number) {
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: {
      getCurrentPosition: vi.fn(
        (_success: PositionCallback, error: PositionErrorCallback) =>
          error({
            code,
            PERMISSION_DENIED: 1,
            POSITION_UNAVAILABLE: 2,
            TIMEOUT: 3,
          } as GeolocationPositionError),
      ),
    },
  });
}
