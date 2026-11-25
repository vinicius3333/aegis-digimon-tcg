import { useSyncExternalStore } from "react";
import { skipNothingToDoStore } from "@/game/skipNothingToDo/skipNothingToDoStore";

function getSkipNothingToDo(): boolean {
  return skipNothingToDoStore.enabled;
}

function subscribeSkipNothingToDo(listener: () => void): () => void {
  skipNothingToDoStore.listeners.add(listener);
  return () => skipNothingToDoStore.listeners.delete(listener);
}

export function useSkipNothingToDo(): boolean {
  return useSyncExternalStore(subscribeSkipNothingToDo, getSkipNothingToDo, () => true);
}
