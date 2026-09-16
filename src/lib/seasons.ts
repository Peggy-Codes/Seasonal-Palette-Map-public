export const SEASON_NAMES = ["spring", "summer", "autumn", "winter"] as const;

export type SeasonName = (typeof SEASON_NAMES)[number];

export const SEASON_LABELS: Record<SeasonName, string> = {
  spring: "春",
  summer: "夏",
  autumn: "秋",
  winter: "冬",
};

export const STORED_SEASONS = {
  spring: "SPRING",
  summer: "SUMMER",
  autumn: "AUTUMN",
  winter: "WINTER",
} as const satisfies Record<SeasonName, string>;

export type StoredSeason = (typeof STORED_SEASONS)[SeasonName];

const SEASON_BY_STORED_VALUE: Record<StoredSeason, SeasonName> = {
  SPRING: "spring",
  SUMMER: "summer",
  AUTUMN: "autumn",
  WINTER: "winter",
};

export function isSeasonName(value: unknown): value is SeasonName {
  return (
    typeof value === "string" && SEASON_NAMES.includes(value as SeasonName)
  );
}

export function toSeasonName(value: StoredSeason): SeasonName {
  return SEASON_BY_STORED_VALUE[value];
}
