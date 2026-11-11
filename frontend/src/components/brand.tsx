import { ShieldAlert } from "lucide-react";
import { cx } from "./ui";

export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-2 font-display text-xl font-semibold tracking-tight",
        className,
      )}
    >
      <svg viewBox="0 0 64 64" className="size-8" aria-hidden>
        <rect width="64" height="64" rx="16" fill="currentColor" className="text-brand" />
        <path
          d="M10 34h11l5-12 8 22 6-14 3 4h11"
          fill="none"
          stroke="#fff"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      Symptra
    </span>
  );
}

/** Thin ECG trace used as the visual signature across the app. */
export function PulseLine({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 600 60" preserveAspectRatio="none" className={cx("h-12 w-full", className)} aria-hidden>
      <path
        d="M0 32h170l14-22 18 44 16-30 10 8h80l10-18 14 36 12-18h256"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export function Disclaimer({ compact = false }: { compact?: boolean }) {
  return (
    <aside
      className={cx(
        "flex gap-3 rounded-md border border-warn/25 bg-warn-soft text-sm text-ink",
        compact ? "p-3" : "p-4",
      )}
    >
      <ShieldAlert className="mt-0.5 size-5 shrink-0 text-warn" aria-hidden />
      <p className="text-pretty">
        <strong className="font-semibold">Not a diagnosis.</strong> Symptra gives preliminary, educational
        suggestions from a statistical model. Always consult a qualified doctor. In an emergency, call your
        local emergency number (112 in India) immediately.
      </p>
    </aside>
  );
}
