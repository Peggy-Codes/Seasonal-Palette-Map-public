import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  create: vi.fn(),
  findMany: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    pin: {
      create: dbMocks.create,
      findMany: dbMocks.findMany,
    },
  },
}));

import { GET, POST } from "@/app/api/pins/route";

describe("/api/pins", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "");
    dbMocks.create.mockReset();
    dbMocks.findMany.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("GET returns unexpired records with their stored coordinates", async () => {
    dbMocks.findMany.mockResolvedValue([
      {
        comment: "葉の乾く音がした。",
        createdAt: new Date("2026-08-28T00:00:00.000Z"),
        id: "pin-1",
        lat: 35.012,
        lng: 135.765,
        season: "AUTUMN",
      },
    ]);

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(payload.pins).toEqual([
      expect.objectContaining({
        coordinates: [135.765, 35.012],
        id: "pin-1",
        season: "autumn",
      }),
    ]);
    expect(dbMocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({ lat: true, lng: true }),
        where: { expiresAt: { gt: expect.any(Date) } },
      }),
    );
  });

  it("POST rounds coordinates to three decimals and assigns a 21-day expiry", async () => {
    dbMocks.create.mockImplementation(async ({ data }) => ({
      comment: data.comment,
      createdAt: new Date("2026-08-28T00:00:00.000Z"),
      id: "pin-1",
      lat: data.lat,
      lng: data.lng,
      season: data.season,
    }));

    const beforeRequest = Date.now();
    const response = await POST(
      new Request("http://localhost/api/pins", {
        body: JSON.stringify({
          comment: "  葉の乾く音がした。  ",
          latitude: 35.01234,
          longitude: 135.76543,
          season: "autumn",
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      }),
    );
    const afterRequest = Date.now();
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.pin).toMatchObject({
      comment: "葉の乾く音がした。",
      coordinates: [135.765, 35.012],
      season: "autumn",
    });

    const createInput = dbMocks.create.mock.calls[0][0];
    expect(createInput.data).not.toHaveProperty("latitude");
    expect(createInput.data).not.toHaveProperty("longitude");
    expect(createInput.data).toMatchObject({
      comment: "葉の乾く音がした。",
      lat: 35.012,
      lng: 135.765,
      season: "AUTUMN",
    });
    const lifetime = 21 * 24 * 60 * 60 * 1_000;
    expect(createInput.data.expiresAt.getTime()).toBeGreaterThanOrEqual(
      beforeRequest + lifetime,
    );
    expect(createInput.data.expiresAt.getTime()).toBeLessThanOrEqual(
      afterRequest + lifetime,
    );
  });

  it("POST replaces coordinates with a rounded point inside the demo bounds", async () => {
    vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "true");
    vi.spyOn(Math, "random").mockReturnValueOnce(0.5).mockReturnValueOnce(0.25);
    dbMocks.create.mockImplementation(async ({ data }) => ({
      comment: data.comment,
      createdAt: new Date("2026-09-16T00:00:00.000Z"),
      id: "demo-pin-1",
      lat: data.lat,
      lng: data.lng,
      season: data.season,
    }));

    const response = await POST(
      new Request("http://localhost/api/pins", {
        body: JSON.stringify({
          comment: "風の向きが変わった。",
          latitude: 35.01234,
          longitude: 135.76543,
          season: "autumn",
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      }),
    );
    const payload = await response.json();
    const createInput = dbMocks.create.mock.calls[0][0];

    expect(response.status).toBe(201);
    expect(payload.pin.coordinates).toEqual([128.375, 35]);
    expect(payload.pin.coordinates).not.toEqual([135.765, 35.012]);
    expect(createInput.data.lat).toBeGreaterThanOrEqual(24);
    expect(createInput.data.lat).toBeLessThanOrEqual(46);
    expect(createInput.data.lng).toBeGreaterThanOrEqual(122.5);
    expect(createInput.data.lng).toBeLessThanOrEqual(146);
  });

  it("POST rejects an invalid comment without saving", async () => {
    const response = await POST(
      new Request("http://localhost/api/pins", {
        body: JSON.stringify({
          comment: "   ",
          latitude: 35,
          longitude: 135,
          season: "spring",
        }),
        method: "POST",
      }),
    );

    expect(response.status).toBe(400);
    expect(dbMocks.create).not.toHaveBeenCalled();
  });

  it("POST rejects coordinates outside the valid latitude range", async () => {
    const response = await POST(
      new Request("http://localhost/api/pins", {
        body: JSON.stringify({
          comment: "海の風を感じた。",
          latitude: 91,
          longitude: 135,
          season: "summer",
        }),
        method: "POST",
      }),
    );

    expect(response.status).toBe(400);
    expect(dbMocks.create).not.toHaveBeenCalled();
  });

  it("POST still validates the submitted coordinates in demo mode", async () => {
    vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "true");
    const randomSpy = vi.spyOn(Math, "random");

    const response = await POST(
      new Request("http://localhost/api/pins", {
        body: JSON.stringify({
          comment: "海の風を感じた。",
          latitude: 91,
          longitude: 135,
          season: "summer",
        }),
        method: "POST",
      }),
    );

    expect(response.status).toBe(400);
    expect(dbMocks.create).not.toHaveBeenCalled();
    expect(randomSpy).not.toHaveBeenCalled();
  });
});
