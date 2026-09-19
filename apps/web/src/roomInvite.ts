/* A private room is shared as a link that lands in the lobby with the code already
   filled in, so the guest never types it. The code is still shown next to the link for
   anyone who prefers to type. */

import { SCREEN_PATHS } from "./routes";

export const ROOM_INVITE_PARAM = "room";

export function roomInviteUrl(roomCode: string, origin = window.location.origin): string {
  return `${origin}${SCREEN_PATHS.lobby}?${ROOM_INVITE_PARAM}=${encodeURIComponent(roomCode.toUpperCase())}`;
}

export function roomCodeFromSearch(search: string): string | undefined {
  const code = new URLSearchParams(search).get(ROOM_INVITE_PARAM)?.trim().toUpperCase();
  return code && /^[A-Z0-9]{4,8}$/.test(code) ? code : undefined;
}
