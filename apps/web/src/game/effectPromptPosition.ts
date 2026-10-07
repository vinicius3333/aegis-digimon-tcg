import { useSyncExternalStore } from "react";

export const EFFECT_PROMPT_POSITIONS = ["center", "left"] as const;
export type EffectPromptPosition = (typeof EFFECT_PROMPT_POSITIONS)[number];
const STORAGE_KEY = "aegis.effect-prompt-position";
const listeners = new Set<() => void>();

function readEffectPromptPosition(): EffectPromptPosition {
  try {
    return localStorage.getItem(STORAGE_KEY) === "center" ? "center" : "left";
  } catch {
    return "left";
  }
}

let current = readEffectPromptPosition();

export function getEffectPromptPosition(): EffectPromptPosition {
  return current;
}

export function setEffectPromptPosition(next: EffectPromptPosition): void {
  current = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Keep the current-session choice when storage is unavailable.
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useEffectPromptPosition(): EffectPromptPosition {
  return useSyncExternalStore(subscribe, getEffectPromptPosition, () => "left");
}
