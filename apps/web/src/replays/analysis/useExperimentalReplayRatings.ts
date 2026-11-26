import { useState } from "react";

const STORAGE_KEY = "aegis:replayExperimentalRatings";

function readEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function useExperimentalReplayRatings(): [boolean, (enabled: boolean) => void] {
  const [enabled, setEnabled] = useState(readEnabled);
  function update(next: boolean) {
    setEnabled(next);
    try {
      localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
      return;
    }
  }
  return [enabled, update];
}
