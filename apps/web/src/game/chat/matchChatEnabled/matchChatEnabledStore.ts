export const MATCH_CHAT_ENABLED_STORAGE_KEY = "aegis.chat.enabled";

function readMatchChatEnabled(): boolean {
  try {
    return localStorage.getItem(MATCH_CHAT_ENABLED_STORAGE_KEY) !== "false";
  } catch {
    return true;
  }
}

export const matchChatEnabledStore = {
  enabled: readMatchChatEnabled(),
  listeners: new Set<() => void>(),
};
