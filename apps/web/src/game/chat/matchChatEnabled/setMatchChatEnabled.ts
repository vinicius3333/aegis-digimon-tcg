import {
  MATCH_CHAT_ENABLED_STORAGE_KEY,
  matchChatEnabledStore,
} from "@/game/chat/matchChatEnabled/matchChatEnabledStore";

export function setMatchChatEnabled(enabled: boolean): void {
  if (matchChatEnabledStore.enabled === enabled) {
    return;
  }
  matchChatEnabledStore.enabled = enabled;
  try {
    localStorage.setItem(MATCH_CHAT_ENABLED_STORAGE_KEY, String(enabled));
  } catch {}
  for (const listener of matchChatEnabledStore.listeners) {
    listener();
  }
}
