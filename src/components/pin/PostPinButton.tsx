"use client";

import { useRef } from "react";
import PostPinForm from "@/components/pin/PostPinForm";

export default function PostPinButton() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const openForm = () => {
    dialogRef.current?.showModal();
  };

  const restoreTriggerFocus = () => {
    triggerRef.current?.focus();
  };

  return (
    <>
      <button
        aria-haspopup="dialog"
        aria-label="季節を残す"
        className="pointer-events-auto inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-2 border border-accent-deep bg-accent px-3 text-sm font-bold text-accent-ink shadow-[0_0.5rem_1.5rem_oklch(28%_0.03_245/0.14)] transition hover:bg-accent-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:translate-y-px sm:px-4"
        onClick={openForm}
        ref={triggerRef}
        type="button"
      >
        <svg
          aria-hidden="true"
          className="size-5 fill-none stroke-current stroke-[1.6]"
          viewBox="0 0 24 24"
        >
          <path
            d="M12 21s6-5.4 6-12a6 6 0 1 0-12 0c0 6.6 6 12 6 12Z"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M9.3 9.2h5.4M12 6.5v5.4" strokeLinecap="round" />
        </svg>
        <span className="hidden xs:inline">季節を残す</span>
        <span aria-hidden="true" className="xs:hidden">
          残す
        </span>
      </button>
      <PostPinForm dialogRef={dialogRef} onClose={restoreTriggerFocus} />
    </>
  );
}
