"use client";

import type { ProcessingState } from "@/lib/types";

type ProcessButtonProps = {
  state: ProcessingState;
  disabled: boolean;
  onClick: () => void;
};

export function ProcessButton({ state, disabled, onClick }: ProcessButtonProps) {
  const isProcessing = state.status === "processing";
  const isDone = state.status === "done";
  const isError = state.status === "error";

  const label = isProcessing
    ? `Processing... ${Math.round(state.progress)}%`
    : isDone
      ? "Done! Export MP4"
      : isError
        ? "Failed — Try Again"
        : "Apply Zoom Effects";

  const base =
    "w-full rounded-input px-4 py-3 text-sm font-semibold flex items-center justify-center gap-2";

  const cls = isProcessing
    ? `${base} bg-accent text-bg shadow-[0_0_18px_rgba(255,77,77,0.5)] opacity-90 cursor-wait`
    : isDone
      ? `${base} bg-green text-bg shadow-[0_0_10px_rgba(56,216,111,0.7)]`
      : isError
        ? `${base} bg-accent text-bg shadow-[0_0_18px_rgba(255,77,77,0.5)]`
        : `${base} bg-accent text-bg shadow-[0_0_18px_rgba(255,77,77,0.5)] hover:brightness-110 active:brightness-95`;

  return (
    <div>
      <button
        type="button"
        className={cls}
        disabled={disabled || isProcessing}
        onClick={onClick}
      >
        {isProcessing ? (
          <span
            className="inline-block h-4 w-4 animate-spin rounded-pill border-2 border-bg border-t-transparent"
            aria-hidden
          />
        ) : null}
        {label}
      </button>

      {isProcessing ? (
        <div className="mt-2 h-2 w-full overflow-hidden rounded-pill border border-inputBorder bg-panel2">
          <div
            className="h-full bg-green"
            style={{ width: `${Math.max(0, Math.min(100, state.progress))}%` }}
            aria-hidden
          />
        </div>
      ) : null}

      {state.message ? (
        <div
          className={
            "mt-2 text-xs font-semibold " +
            (state.status === "error" ? "text-error" : "text-muted")
          }
        >
          {state.message}
        </div>
      ) : null}
    </div>
  );
}
