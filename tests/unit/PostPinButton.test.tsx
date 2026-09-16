import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PostPinButton from "@/components/pin/PostPinButton";
import PinMapProvider from "@/components/shared/PinMapProvider";

const showModal = vi.fn(function showModal(this: HTMLDialogElement) {
  this.setAttribute("open", "");
});

const close = vi.fn(function close(this: HTMLDialogElement) {
  this.removeAttribute("open");
  this.dispatchEvent(new Event("close"));
});

describe("PostPinButton", () => {
  beforeEach(() => {
    showModal.mockClear();
    close.mockClear();
    Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
      configurable: true,
      value: showModal,
    });
    Object.defineProperty(HTMLDialogElement.prototype, "close", {
      configurable: true,
      value: close,
    });
  });

  it("opens and closes the post form dialog", () => {
    render(
      <PinMapProvider>
        <PostPinButton />
      </PinMapProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "季節を残す" }));
    expect(showModal).toHaveBeenCalledOnce();
    expect(screen.getByRole("dialog")).toHaveAttribute("open");

    fireEvent.click(
      screen.getByRole("button", { name: "投稿フォームを閉じる" }),
    );
    expect(close).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "季節を残す" })).toHaveFocus();
  });
});
