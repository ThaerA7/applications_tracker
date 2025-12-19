"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useAnimation } from "framer-motion";

function getPrefersReducedMotion(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? true;
}

async function waitForImages(container: HTMLElement, timeoutMs: number) {
  const images = Array.from(container.querySelectorAll("img"));
  if (images.length === 0) return;

  const decodePromises = images.map((img) => {
    if (img.complete && img.naturalWidth > 0) return Promise.resolve();

    // Prefer decode() when available; otherwise, fall back to load/error events.
    if (typeof (img as HTMLImageElement).decode === "function") {
      return (img as HTMLImageElement).decode().catch(() => undefined);
    }

    return new Promise<void>((resolve) => {
      const done = () => resolve();
      img.addEventListener("load", done, { once: true });
      img.addEventListener("error", done, { once: true });
    });
  });

  await Promise.race([
    Promise.all(decodePromises).then(() => undefined),
    new Promise<void>((resolve) => window.setTimeout(resolve, timeoutMs)),
  ]);
}

async function waitForFonts(timeoutMs: number) {
  const anyDocument = document as unknown as { fonts?: { ready: Promise<unknown> } };
  const ready = anyDocument.fonts?.ready;
  if (!ready) return;
  await Promise.race([
    ready.then(() => undefined),
    new Promise<void>((resolve) => window.setTimeout(resolve, timeoutMs)),
  ]);
}

function waitForDomStability(
  container: HTMLElement,
  quietMs: number,
  timeoutMs: number
): Promise<void> {
  return new Promise((resolve) => {
    let done = false;
    let quietTimer: number | null = null;
    let hardTimer: number | null = null;

    const finish = () => {
      if (done) return;
      done = true;
      observer.disconnect();
      if (quietTimer) window.clearTimeout(quietTimer);
      if (hardTimer) window.clearTimeout(hardTimer);
      resolve();
    };

    const bump = () => {
      if (done) return;
      if (quietTimer) window.clearTimeout(quietTimer);
      quietTimer = window.setTimeout(finish, quietMs);
    };

    const observer = new MutationObserver(() => bump());
    observer.observe(container, {
      subtree: true,
      childList: true,
      attributes: true,
      characterData: true,
    });

    bump();
    hardTimer = window.setTimeout(finish, timeoutMs);
  });
}

export default function RouteTransition({
  children,
  fadeOutMs = 220,
  fadeInMs = 260,
  revealOnLoad = true,
  contentReadyTimeoutMs = 2000,
  stabilityQuietMs = 160,
  triggerKey,
}: {
  children: React.ReactNode;
  fadeOutMs?: number;
  fadeInMs?: number;
  revealOnLoad?: boolean;
  contentReadyTimeoutMs?: number;
  stabilityQuietMs?: number;
  triggerKey?: string | number;
}) {
  const [prefersReducedMotion] = useState(() => getPrefersReducedMotion());
  const key = useMemo(() => {
    // Prefer an explicit triggerKey (e.g. pathname); fall back to a stable string.
    // The key is what enables AnimatePresence to keep the old tree around for exit.
    if (typeof triggerKey !== "undefined") return String(triggerKey);
    return "route";
  }, [triggerKey]);

  if (prefersReducedMotion) {
    return <>{children}</>;
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <AnimatedFadeThrough
        key={key}
        fadeOutMs={fadeOutMs}
        fadeInMs={fadeInMs}
        revealOnLoad={revealOnLoad}
        contentReadyTimeoutMs={contentReadyTimeoutMs}
        stabilityQuietMs={stabilityQuietMs}
      >
        {children}
      </AnimatedFadeThrough>
    </AnimatePresence>
  );
}

function AnimatedFadeThrough({
  children,
  fadeOutMs,
  fadeInMs,
  revealOnLoad,
  contentReadyTimeoutMs,
  stabilityQuietMs,
}: {
  children: React.ReactNode;
  fadeOutMs: number;
  fadeInMs: number;
  revealOnLoad: boolean;
  contentReadyTimeoutMs: number;
  stabilityQuietMs: number;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const controls = useAnimation();
  const runIdRef = useRef(0);

  const easing = useMemo(() => [0.4, 0, 0.2, 1] as const, []);

  useEffect(() => {
    runIdRef.current += 1;
    const runId = runIdRef.current;

    let cancelled = false;

    const start = async () => {
      // Ensure we start hidden (especially important right after exit completes).
      await controls.set({ opacity: 0 });

      if (!revealOnLoad) {
        // If revealOnLoad is false, we still want route transitions to animate in.
        // This just avoids delaying the very first paint on initial mount.
      } else {
        // On first load, wait for 'load' to reduce flashes during hydration.
        if (document.readyState !== "complete") {
          await new Promise<void>((resolve) => {
            const done = () => resolve();
            window.addEventListener("load", done, { once: true });
          });
        }
      }

      // Give layout a frame.
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));

      if (cancelled || runIdRef.current !== runId) return;

      const container = containerRef.current;
      const stability =
        container
          ? waitForDomStability(container, stabilityQuietMs, contentReadyTimeoutMs)
          : Promise.resolve();

      if (container) {
        await Promise.all([
          waitForFonts(contentReadyTimeoutMs),
          waitForImages(container, contentReadyTimeoutMs),
          stability,
        ]);
      } else {
        await stability;
      }

      if (cancelled || runIdRef.current !== runId) return;

      await controls.start({
        opacity: 1,
        transition: { duration: fadeInMs / 1000, ease: easing },
      });
    };

    start();

    return () => {
      cancelled = true;
    };
  }, [controls, contentReadyTimeoutMs, easing, fadeInMs, revealOnLoad, stabilityQuietMs]);

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: revealOnLoad ? 0 : 1 }}
      animate={controls}
      exit={{ opacity: 0, transition: { duration: fadeOutMs / 1000, ease: easing } }}
      style={{ willChange: "opacity" }}
    >
      {children}
    </motion.div>
  );
}
