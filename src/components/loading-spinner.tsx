import type { HTMLAttributes } from "react";

export type LoadingSpinnerSize = "sm" | "md" | "lg";

type SpinnerProps = HTMLAttributes<HTMLSpanElement> & {
  size?: LoadingSpinnerSize;
  /** When true, hides the span from assistive tech (use when a parent announces state). */
  decorative?: boolean;
  label?: string;
};

export function LoadingSpinner({
  size = "sm",
  className = "",
  decorative = false,
  label = "Loading",
  ...rest
}: SpinnerProps) {
  const cls = ["loading-spinner", `loading-spinner--${size}`, className].filter(Boolean).join(" ");
  return (
    <span
      className={cls}
      role={decorative ? undefined : "status"}
      aria-label={decorative ? undefined : label}
      aria-hidden={decorative ? true : undefined}
      {...rest}
    />
  );
}

type BlockProps = {
  label?: string;
  size?: LoadingSpinnerSize;
  className?: string;
};

/** Centered spinner + caption for cards, empty states, or route segments. */
export function LoadingBlock({ label = "Loading…", size = "md", className = "" }: BlockProps) {
  const wrap = ["loading-block", className].filter(Boolean).join(" ");
  return (
    <div className={wrap} role="status" aria-live="polite" aria-busy="true">
      <LoadingSpinner size={size} decorative />
      <span className="small muted">{label}</span>
    </div>
  );
}

type ScreenProps = {
  message?: string;
  className?: string;
};

/** Full-viewport-style placeholder for route `loading.tsx` or modals. */
export function LoadingScreen({ message = "Loading…", className = "" }: ScreenProps) {
  const wrap = ["loading-screen", className].filter(Boolean).join(" ");
  return (
    <div className={wrap}>
      <LoadingBlock label={message} size="lg" />
    </div>
  );
}
