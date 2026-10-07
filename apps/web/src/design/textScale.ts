/* The player's text size as a shared store. It sets one custom property on the
   root, `--ds-text-scale`, which the type tokens (tokens.css) and the card effect
   text multiply by, so text grows while spacing and the board layout stay put.
   Kept per device: the right size depends on the screen. */

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "aegis:textScale";

export const TEXT_SCALES = ["default", "large", "larger"] as const;

export type TextScale = (typeof TEXT_SCALES)[number];

export const TEXT_SCALE_FACTORS: Record<TextScale, number> = {
  default: 1,
  large: 1.15,
  larger: 1.3,
};

const listeners = new Set<() => void>();

export function isTextScale(value: unknown): value is TextScale {
  return TEXT_SCALES.includes(value as TextScale);
}

function readTextScale(): TextScale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isTextScale(stored) ? stored : "default";
  } catch {
    return "default";
  }
}

let current = readTextScale();

export function getTextScale(): TextScale {
  return current;
}

export function applyTextScale(): void {
  document.documentElement.style.setProperty("--ds-text-scale", String(TEXT_SCALE_FACTORS[current]));
}

export function setTextScale(scale: TextScale): void {
  if (!isTextScale(scale) || scale === current) return;
  current = scale;
  try {
    localStorage.setItem(STORAGE_KEY, scale);
  } catch {
    // A blocked storage still applies the size for this session.
  }
  applyTextScale();
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useTextScale(): TextScale {
  return useSyncExternalStore(subscribe, getTextScale, () => "default");
}
