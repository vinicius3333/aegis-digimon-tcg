import { useSyncExternalStore } from "react";

const STORAGE_KEY = "aegis.effects.skip-nothing-to-do";

const listeners = new Set<() => void>();

function readSkipNothingToDo(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== "false";
  } catch {
    return true;
  }
}

let current = readSkipNothingToDo();

export function isSkipNothingToDoEnabled(): boolean {
  return current;
}

function persistSkipNothingToDo(next: boolean): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, String(next));
    return true;
  } catch {
    return false;
  }
}

export function setSkipNothingToDoEnabled(next: boolean): void {
  current = next;
  persistSkipNothingToDo(next);
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useSkipNothingToDo(): boolean {
  return useSyncExternalStore(subscribe, isSkipNothingToDoEnabled, () => true);
}
