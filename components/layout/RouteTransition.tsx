"use client";

import type { ReactNode } from "react";

export default function RouteTransition({
  children,
}: {
  children: ReactNode;
  fadeOutMs?: number;
  fadeInMs?: number;
  revealOnLoad?: boolean;
  contentReadyTimeoutMs?: number;
  stabilityQuietMs?: number;
  triggerKey?: string | number;
}) {
  // Animations intentionally disabled (no fade, no delay).
  return <>{children}</>;
}
