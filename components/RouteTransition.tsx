"use client";

import { useEffect, useRef, useState } from "react";

type Phase = "idle" | "out" | "in";

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
  const [renderedChildren, setRenderedChildren] = useState(children);
  const [phase, setPhase] = useState<Phase>(revealOnLoad ? "out" : "idle");
  const nextChildrenRef = useRef<React.ReactNode>(children);
  const timeoutRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const lastTriggerRef = useRef<string | number | undefined>(triggerKey);

  const [prefersReducedMotion] = useState(() => getPrefersReducedMotion());

  // Keep latest config in a ref so effects can depend on a single stable key.
  const configRef = useRef({
    fadeOutMs,
    fadeInMs,
    revealOnLoad,
    contentReadyTimeoutMs,
    stabilityQuietMs,
    triggerKey,
    prefersReducedMotion,
  });

  useEffect(() => {
    configRef.current = {
      fadeOutMs,
      fadeInMs,
      revealOnLoad,
      contentReadyTimeoutMs,
      stabilityQuietMs,
      triggerKey,
      prefersReducedMotion,
    };
  }, [
    fadeOutMs,
    fadeInMs,
    revealOnLoad,
    contentReadyTimeoutMs,
    stabilityQuietMs,
    triggerKey,
    prefersReducedMotion,
  ]);

  const revealKey = `${revealOnLoad ? 1 : 0}|${prefersReducedMotion ? 1 : 0}|${fadeInMs}`;
  const transitionKey = `${String(triggerKey ?? "")}|${fadeOutMs}|${fadeInMs}|${revealOnLoad ? 1 : 0}|${prefersReducedMotion ? 1 : 0}|${contentReadyTimeoutMs}|${stabilityQuietMs}`;

  // Always keep the latest children available for the moment we swap.
  useEffect(() => {
    nextChildrenRef.current = children;
  }, [children]);

  // Initial reveal (first page load).
  useEffect(() => {
    const { revealOnLoad, prefersReducedMotion, fadeInMs } = configRef.current;
    if (!revealOnLoad || prefersReducedMotion) return;

    let cancelled = false;

    const reveal = async () => {
      // Wait until the browser says the page is fully loaded.
      if (document.readyState !== "complete") {
        await new Promise<void>((resolve) => {
          const done = () => resolve();
          window.addEventListener("load", done, { once: true });
        });
      }

      if (cancelled) return;

      // Give the browser a frame to settle layout.
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
      if (cancelled) return;

      setPhase("in");

      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => {
        setPhase("idle");
      }, fadeInMs);
    };

    reveal();

    return () => {
      cancelled = true;
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, [revealKey]);

  useEffect(() => {
    const {
      fadeOutMs,
      fadeInMs,
      prefersReducedMotion,
      contentReadyTimeoutMs,
      stabilityQuietMs,
      triggerKey,
    } = configRef.current;

    if (prefersReducedMotion) {
      setRenderedChildren(nextChildrenRef.current);
      setPhase("idle");
      return;
    }

    // If a triggerKey is provided, only animate when it changes.
    if (typeof triggerKey !== "undefined") {
      const isInitial = lastTriggerRef.current === triggerKey;
      lastTriggerRef.current = triggerKey;
      if (isInitial) return;
    }

    // Two-step transition:
    // 1) fade out current content
    // 2) swap children
    // 3) fade in new content
    setPhase("out");

    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      setRenderedChildren(nextChildrenRef.current);

      // Keep opacity at 0 while we wait for the new content to be ready.
      (async () => {
        const container = containerRef.current;
        const stability =
          container
            ? waitForDomStability(container, stabilityQuietMs, contentReadyTimeoutMs)
            : Promise.resolve();

        await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));

        if (container) {
          await Promise.all([
            waitForFonts(contentReadyTimeoutMs),
            waitForImages(container, contentReadyTimeoutMs),
            stability,
          ]);
        } else {
          await stability;
        }

        setPhase("in");
        if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
        timeoutRef.current = window.setTimeout(() => {
          setPhase("idle");
        }, fadeInMs);
      })();
    }, fadeOutMs);

    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, [transitionKey]);

  const opacityClass = phase === "out" ? "opacity-0" : "opacity-100";
  const durationMs = phase === "out" ? fadeOutMs : fadeInMs;

  return (
    <div
      ref={containerRef}
      className={`transition-opacity ease-in-out ${opacityClass}`}
      style={{ transitionDuration: `${durationMs}ms`, willChange: "opacity" }}
    >
      {renderedChildren}
    </div>
  );
}
