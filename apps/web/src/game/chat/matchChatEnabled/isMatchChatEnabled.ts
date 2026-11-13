import { matchChatEnabledStore } from "@/game/chat/matchChatEnabled/matchChatEnabledStore";

export function isMatchChatEnabled(): boolean {
  return matchChatEnabledStore.enabled;
}
