import { useSyncExternalStore } from "react";
import { isMatchChatEnabled } from "@/game/chat/matchChatEnabled/isMatchChatEnabled";
import { matchChatEnabledStore } from "@/game/chat/matchChatEnabled/matchChatEnabledStore";

function subscribeMatchChatEnabled(listener: () => void): () => void {
  matchChatEnabledStore.listeners.add(listener);
  return () => matchChatEnabledStore.listeners.delete(listener);
}

export function useMatchChatEnabled(): boolean {
  return useSyncExternalStore(subscribeMatchChatEnabled, isMatchChatEnabled, () => true);
}
