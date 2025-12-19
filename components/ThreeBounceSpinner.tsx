"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type SpinnerStore = {
  activeToken: string | null;
  tokens: string[];
  listeners: Set<() => void>;
};

const STORE_KEY = "__appTracker_threeBounceSpinnerStore" as const;

function getStore(): SpinnerStore {
  const g = globalThis as unknown as Record<string, any>;
  if (!g[STORE_KEY]) {
    g[STORE_KEY] = {
      activeToken: null,
      tokens: [],
      listeners: new Set<() => void>(),
    } satisfies SpinnerStore;
  }
  return g[STORE_KEY] as SpinnerStore;
}

function emit(store: SpinnerStore) {
  store.listeners.forEach((fn) => fn());
}

type ThreeBounceSpinnerProps = {
  className?: string;
  dotClassName?: string;
  label?: string;
};

export default function ThreeBounceSpinner({
  className,
  dotClassName,
  label = "Loading",
}: ThreeBounceSpinnerProps) {
  const token = React.useId();
  const [, force] = React.useState(0);

  React.useEffect(() => {
    const store = getStore();
    const onChange = () => force((v) => v + 1);
    store.listeners.add(onChange);

    store.tokens.push(token);
    if (!store.activeToken) store.activeToken = token;
    emit(store);

    return () => {
      const nextStore = getStore();
      nextStore.listeners.delete(onChange);
      nextStore.tokens = nextStore.tokens.filter((t) => t !== token);
      if (nextStore.activeToken === token) {
        nextStore.activeToken = nextStore.tokens[0] ?? null;
      }
      emit(nextStore);
    };
  }, [token]);

  const store = getStore();
  if (store.activeToken !== token) return null;

  return (
    <div
      className={cn("sk-three-bounce inline-flex items-center gap-2", className)}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <span
        className={cn(
          "sk-three-bounce-dot h-3 w-3 rounded-full bg-foreground/60",
          dotClassName,
        )}
        style={{ animationDelay: "-0.32s" }}
      />
      <span
        className={cn(
          "sk-three-bounce-dot h-3 w-3 rounded-full bg-foreground/60",
          dotClassName,
        )}
        style={{ animationDelay: "-0.16s" }}
      />
      <span
        className={cn(
          "sk-three-bounce-dot h-3 w-3 rounded-full bg-foreground/60",
          dotClassName,
        )}
      />
    </div>
  );
}
