"use client";

import { useState, type FormEvent, type RefObject } from "react";
import { usePinMap } from "@/components/shared/PinMapProvider";
import SeasonGlyph from "@/components/ui/SeasonGlyph";
import {
  PIN_COMMENT_MAX_LENGTH,
  type CreatePinResponse,
  type PinApiErrorResponse,
} from "@/lib/pins";
import { SEASON_LABELS, SEASON_NAMES, type SeasonName } from "@/lib/seasons";

type PostPinFormProps = {
  dialogRef: RefObject<HTMLDialogElement | null>;
  onClose: () => void;
};

type FormStatus = "idle" | "locating" | "submitting" | "success" | "error";

const SEASON_CHOICE_CLASSES: Record<SeasonName, string> = {
  spring:
    "data-[selected=true]:border-spring-deep data-[selected=true]:bg-spring/20 text-spring-deep",
  summer:
    "data-[selected=true]:border-summer-deep data-[selected=true]:bg-summer/20 text-summer-deep",
  autumn:
    "data-[selected=true]:border-autumn-deep data-[selected=true]:bg-autumn/20 text-autumn-deep",
  winter:
    "data-[selected=true]:border-winter-deep data-[selected=true]:bg-winter/20 text-winter-deep",
};

export default function PostPinForm({ dialogRef, onClose }: PostPinFormProps) {
  const { refreshPins } = usePinMap();
  const demoModeEnabled = isDemoMode();
  const [season, setSeason] = useState<SeasonName>("spring");
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<FormStatus>("idle");
  const [statusMessage, setStatusMessage] = useState("");

  const helperId = "pin-comment-helper";
  const statusId = "pin-form-status";
  const isBusy = status === "locating" || status === "submitting";
  const canSubmit = comment.trim().length > 0 && !isBusy;

  const resetStatus = () => {
    setStatus("idle");
    setStatusMessage("");
  };

  const handleDismiss = () => {
    setSeason("spring");
    setComment("");
    resetStatus();
    dialogRef.current?.close();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }

    setStatus("locating");
    setStatusMessage("現在地を確認しています。");

    try {
      const position = await getCurrentPosition();
      setStatus("submitting");
      setStatusMessage("季節の気配を地図へ置いています。");

      const response = await fetch("/api/pins", {
        body: JSON.stringify({
          comment,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          season,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json()) as
        CreatePinResponse | PinApiErrorResponse;

      if (!response.ok || !("pin" in payload)) {
        throw new Error(
          "error" in payload
            ? payload.error.message
            : "投稿できませんでした。もう一度お試しください。",
        );
      }

      setStatus("success");
      setStatusMessage(
        `${SEASON_LABELS[payload.pin.season]}の気配を地図に置きました。`,
      );
      refreshPins();
    } catch (error) {
      setStatus("error");
      setStatusMessage(
        error instanceof Error
          ? error.message
          : "投稿できませんでした。もう一度お試しください。",
      );
    }
  };

  return (
    <dialog
      aria-describedby={
        demoModeEnabled
          ? "post-pin-description demo-mode-description"
          : "post-pin-description"
      }
      aria-labelledby="post-pin-title"
      className="pointer-events-auto m-auto max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] max-w-xl overflow-y-auto bg-transparent p-0 text-ink backdrop:bg-ink/60"
      onCancel={(event) => {
        event.preventDefault();
        handleDismiss();
      }}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          handleDismiss();
        }
      }}
      ref={dialogRef}
    >
      <div className="relative border border-rule bg-control p-5 shadow-2xl sm:p-8">
        <div className="pr-10">
          <p className="mb-2 text-xs font-bold tracking-[0.16em] text-accent-deep">
            季節をひとつ、採集する
          </p>
          <h2 className="font-display text-2xl font-bold" id="post-pin-title">
            いま、何を感じましたか。
          </h2>
          <p
            className="mt-2 max-w-lg text-sm leading-7 text-ink-muted"
            id="post-pin-description"
          >
            季節と短い観測メモを選び、現在地を約100m単位に丸めて匿名で残します。
          </p>
          {demoModeEnabled ? (
            <p
              className="mt-2 max-w-lg text-sm leading-7 text-accent-deep"
              id="demo-mode-description"
            >
              これはポートフォリオ公開用のデモです。位置情報保護のため、投稿はランダムな地点に記録されます。
            </p>
          ) : null}
        </div>

        <form
          aria-busy={isBusy}
          className="mt-7 space-y-6"
          onSubmit={handleSubmit}
        >
          <fieldset>
            <legend className="mb-3 text-sm font-bold">季節</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {SEASON_NAMES.map((item) => {
                const isSelected = season === item;
                return (
                  <button
                    aria-pressed={isSelected}
                    className={`flex min-h-16 cursor-pointer items-center justify-center gap-2 border border-rule bg-canvas px-3 text-sm font-bold transition hover:border-ink-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${SEASON_CHOICE_CLASSES[item]}`}
                    data-selected={isSelected}
                    key={item}
                    onClick={() => {
                      setSeason(item);
                      resetStatus();
                    }}
                    type="button"
                  >
                    <SeasonGlyph className="size-5" season={item} />
                    <span>{SEASON_LABELS[item]}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div>
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <label className="text-sm font-bold" htmlFor="pin-comment">
                観測メモ
              </label>
              <span aria-live="polite" className="text-xs text-ink-muted">
                {comment.length} / {PIN_COMMENT_MAX_LENGTH}
              </span>
            </div>
            <textarea
              aria-describedby={`${helperId} ${statusId}`}
              className="min-h-28 w-full resize-y border border-rule bg-white p-3 leading-7 placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              id="pin-comment"
              maxLength={PIN_COMMENT_MAX_LENGTH}
              onChange={(event) => {
                setComment(event.target.value);
                resetStatus();
              }}
              placeholder="例：夕立のあと、土の匂いが濃くなった。"
              required
              value={comment}
            />
            <p className="mt-2 text-xs leading-6 text-ink-muted" id={helperId}>
              投稿時に位置情報の許可を求めます。緯度経度を小数点3桁（約100m）に丸めて保存します。
            </p>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-rule pt-5 sm:flex-row sm:items-center sm:justify-end">
            <button
              className="min-h-11 cursor-pointer px-4 text-sm font-bold text-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              onClick={handleDismiss}
              type="button"
            >
              閉じる
            </button>
            <button
              className="min-h-11 bg-ink px-5 text-sm font-bold text-white transition hover:bg-ink-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-45"
              disabled={!canSubmit || status === "success"}
              type="submit"
            >
              {status === "locating"
                ? "現在地を確認中…"
                : status === "submitting"
                  ? "地図へ置いています…"
                  : status === "success"
                    ? "地図に置きました"
                    : "現在地から地図に置く"}
            </button>
          </div>

          <p
            aria-live={status === "error" ? "assertive" : "polite"}
            className={`min-h-6 text-sm ${status === "error" ? "text-error" : status === "success" ? "text-success" : "text-ink-muted"}`}
            id={statusId}
            role={status === "error" ? "alert" : "status"}
          >
            {statusMessage}
          </p>
        </form>

        <button
          aria-label="投稿フォームを閉じる"
          className="absolute right-3 top-3 flex size-11 cursor-pointer items-center justify-center text-2xl text-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent"
          onClick={handleDismiss}
          type="button"
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>
    </dialog>
  );
}

function isDemoMode() {
  return process.env.NEXT_PUBLIC_DEMO_MODE?.trim().toLowerCase() === "true";
}

function getCurrentPosition() {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(
        new Error(
          "このブラウザでは位置情報を利用できないため、投稿できません。",
        ),
      );
      return;
    }

    navigator.geolocation.getCurrentPosition(
      resolve,
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          reject(
            new Error(
              "位置情報の利用が許可されなかったため、投稿できません。ブラウザの設定から許可してもう一度お試しください。",
            ),
          );
          return;
        }

        if (error.code === error.TIMEOUT) {
          reject(
            new Error(
              "現在地の確認に時間がかかっています。電波状況を確認してもう一度お試しください。",
            ),
          );
          return;
        }

        reject(
          new Error(
            "現在地を確認できなかったため、投稿できません。もう一度お試しください。",
          ),
        );
      },
      {
        enableHighAccuracy: false,
        maximumAge: 60_000,
        timeout: 10_000,
      },
    );
  });
}
