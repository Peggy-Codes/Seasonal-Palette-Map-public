import type { SeasonName } from "@/lib/seasons";

export const PIN_COMMENT_MAX_LENGTH = 50;
export const PIN_LIFETIME_DAYS = 21;

export type PinObservation = {
  id: string;
  season: SeasonName;
  comment: string;
  coordinates: [longitude: number, latitude: number];
  createdAt: string;
};

export type PinsResponse = {
  pins: PinObservation[];
};

export type CreatePinResponse = {
  pin: PinObservation;
};

export type PinApiErrorCode = "INVALID_REQUEST" | "SERVICE_UNAVAILABLE";

export type PinApiErrorResponse = {
  error: {
    code: PinApiErrorCode;
    message: string;
  };
};
