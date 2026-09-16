import { db } from "@/lib/db";
import {
  PIN_COMMENT_MAX_LENGTH,
  PIN_LIFETIME_DAYS,
  type PinApiErrorCode,
  type PinApiErrorResponse,
  type PinObservation,
  type PinsResponse,
} from "@/lib/pins";
import {
  isSeasonName,
  STORED_SEASONS,
  toSeasonName,
  type SeasonName,
  type StoredSeason,
} from "@/lib/seasons";

export const runtime = "nodejs";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
};

const DEMO_MODE_BOUNDS = {
  maxLat: 46,
  maxLng: 146,
  minLat: 24,
  minLng: 122.5,
};

type CreatePinInput = {
  season: SeasonName;
  comment: string;
  latitude: number;
  longitude: number;
};

type PinRecord = {
  id: string;
  lat: number;
  lng: number;
  season: StoredSeason;
  comment: string;
  createdAt: Date;
};

export async function GET() {
  try {
    const records = await db.pin.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        comment: true,
        createdAt: true,
        id: true,
        lat: true,
        lng: true,
        season: true,
      },
      where: {
        expiresAt: { gt: new Date() },
      },
    });

    const pins = records.map(toObservation);

    return Response.json({ pins } satisfies PinsResponse, {
      headers: NO_STORE_HEADERS,
    });
  } catch {
    return apiError(
      "SERVICE_UNAVAILABLE",
      "季節の投稿を読み込めませんでした。時間をおいてもう一度お試しください。",
      503,
    );
  }
}

export async function POST(request: Request) {
  const input = await parseCreatePinInput(request);
  if (!input.ok) {
    return apiError("INVALID_REQUEST", input.message, 400);
  }

  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + PIN_LIFETIME_DAYS * 24 * 60 * 60 * 1_000,
  );
  const { latitude, longitude } = isDemoMode()
    ? randomDemoCoordinate()
    : {
        latitude: input.value.latitude,
        longitude: input.value.longitude,
      };

  try {
    const record = await db.pin.create({
      data: {
        comment: input.value.comment,
        expiresAt,
        lat: roundCoordinate(latitude),
        lng: roundCoordinate(longitude),
        season: STORED_SEASONS[input.value.season],
      },
      select: {
        comment: true,
        createdAt: true,
        id: true,
        lat: true,
        lng: true,
        season: true,
      },
    });

    return Response.json(
      { pin: toObservation(record) },
      { headers: NO_STORE_HEADERS, status: 201 },
    );
  } catch {
    return apiError(
      "SERVICE_UNAVAILABLE",
      "投稿を保存できませんでした。時間をおいてもう一度お試しください。",
      503,
    );
  }
}

function isDemoMode() {
  // This gates whether real geolocation gets discarded, so a value like
  // "True" or "true " must not silently fall through to normal (real
  // coordinates) behavior — normalize before comparing.
  return process.env.NEXT_PUBLIC_DEMO_MODE?.trim().toLowerCase() === "true";
}

function randomDemoCoordinate() {
  return {
    latitude:
      DEMO_MODE_BOUNDS.minLat +
      Math.random() * (DEMO_MODE_BOUNDS.maxLat - DEMO_MODE_BOUNDS.minLat),
    longitude:
      DEMO_MODE_BOUNDS.minLng +
      Math.random() * (DEMO_MODE_BOUNDS.maxLng - DEMO_MODE_BOUNDS.minLng),
  };
}

async function parseCreatePinInput(
  request: Request,
): Promise<
  { ok: true; value: CreatePinInput } | { ok: false; message: string }
> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { ok: false, message: "投稿内容を読み取れませんでした。" };
  }

  if (!body || typeof body !== "object") {
    return { ok: false, message: "投稿内容の形式が正しくありません。" };
  }

  const { season, comment, latitude, longitude } = body as Record<
    string,
    unknown
  >;
  if (!isSeasonName(season)) {
    return { ok: false, message: "季節をひとつ選んでください。" };
  }

  if (typeof comment !== "string") {
    return { ok: false, message: "観測メモを入力してください。" };
  }

  const normalizedComment = comment.trim();
  const commentLength = Array.from(normalizedComment).length;
  if (commentLength < 1 || commentLength > PIN_COMMENT_MAX_LENGTH) {
    return {
      ok: false,
      message: `観測メモは1〜${PIN_COMMENT_MAX_LENGTH}文字で入力してください。`,
    };
  }

  if (
    typeof latitude !== "number" ||
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90 ||
    typeof longitude !== "number" ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180
  ) {
    return { ok: false, message: "現在地を確認できませんでした。" };
  }

  return {
    ok: true,
    value: {
      comment: normalizedComment,
      latitude,
      longitude,
      season,
    },
  };
}

function roundCoordinate(coordinate: number) {
  return Number(coordinate.toFixed(3));
}

function toObservation(record: PinRecord): PinObservation {
  return {
    comment: record.comment,
    coordinates: [record.lng, record.lat],
    createdAt: record.createdAt.toISOString(),
    id: record.id,
    season: toSeasonName(record.season),
  };
}

function apiError(code: PinApiErrorCode, message: string, status: number) {
  return Response.json(
    { error: { code, message } } satisfies PinApiErrorResponse,
    { headers: NO_STORE_HEADERS, status },
  );
}
