import type { RoomSlot } from "./client";

/**
 * The Colyseus reconnection token only lives in memory, so a tab reload used to
 * drop the match even though the server holds the seat open for its grace
 * window. Persisting it per tab lets a fresh page load resume the same seat.
 *
 * sessionStorage, not localStorage: a live match belongs to the tab that is
 * playing it. Durable player preferences (identity, decks) stay in localStorage
 * under the same `aegis:` key prefix.
 */
const STORAGE_KEY = "aegis:matchSession";

/** Matches AegisRoom.RECONNECT_GRACE_SECONDS; past it the server has already resolved the drop. */
export const RECONNECT_GRACE_MS = 180_000;

export interface ReconnectSession {
  reconnectionToken: string;
  roomId: string;
  slot: RoomSlot;
  savedAt: number;
}

export function isReconnectSessionFresh(session: ReconnectSession, now: number): boolean {
  const age = now - session.savedAt;
  return age >= 0 && age < RECONNECT_GRACE_MS;
}

function storage(): Storage | undefined {
  try {
    return typeof sessionStorage === "undefined" ? undefined : sessionStorage;
  } catch {
    return undefined;
  }
}

export function saveReconnectSession(session: ReconnectSession): void {
  try {
    storage()?.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // A tab that refuses storage simply loses the reload safety net.
  }
}

export function loadReconnectSession(now: number = Date.now()): ReconnectSession | undefined {
  let raw: string | null | undefined;
  try {
    raw = storage()?.getItem(STORAGE_KEY);
  } catch {
    return undefined;
  }
  if (!raw) return undefined;
  let parsed: Partial<ReconnectSession>;
  try {
    parsed = JSON.parse(raw) as Partial<ReconnectSession>;
  } catch {
    clearReconnectSession();
    return undefined;
  }
  if (
    typeof parsed.reconnectionToken !== "string" ||
    typeof parsed.roomId !== "string" ||
    typeof parsed.slot !== "string" ||
    typeof parsed.savedAt !== "number"
  ) {
    clearReconnectSession();
    return undefined;
  }
  const session = parsed as ReconnectSession;
  if (!isReconnectSessionFresh(session, now)) {
    clearReconnectSession();
    return undefined;
  }
  return session;
}

export function clearReconnectSession(): void {
  try {
    storage()?.removeItem(STORAGE_KEY);
  } catch {
    // ignore storage failures
  }
}
