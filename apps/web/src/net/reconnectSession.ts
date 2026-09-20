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

/** Stable logical match identity plus the latest owner-fencing epoch observed by this tab. */
export interface LogicalGameSessionIdentity {
  gameId: string;
  ownerEpoch: number;
}

export interface ReconnectSession {
  reconnectionToken: string;
  roomId: string;
  slot: RoomSlot;
  savedAt: number;
  /** Present only when a server advertises the live-room handoff protocol. */
  logicalSession?: LogicalGameSessionIdentity;
  /** Distinct from Colyseus' transport reconnection token; only used by the owner directory. */
  resumeCredential?: string;
  resumeCredentialExpiresAt?: number;
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
  if (parsed.logicalSession !== undefined && !isLogicalSessionIdentity(parsed.logicalSession)) {
    clearReconnectSession();
    return undefined;
  }
  const session = parsed as ReconnectSession;
  let credentialDiscarded = false;
  if (
    (session.resumeCredential !== undefined && typeof session.resumeCredential !== "string") ||
    (session.resumeCredentialExpiresAt !== undefined &&
      (!Number.isSafeInteger(session.resumeCredentialExpiresAt) || session.resumeCredentialExpiresAt <= 0)) ||
    (session.resumeCredential !== undefined && session.resumeCredentialExpiresAt === undefined)
  ) {
    delete session.resumeCredential;
    delete session.resumeCredentialExpiresAt;
    credentialDiscarded = true;
  } else if (session.resumeCredentialExpiresAt !== undefined && session.resumeCredentialExpiresAt <= now) {
    delete session.resumeCredential;
    delete session.resumeCredentialExpiresAt;
    credentialDiscarded = true;
  }
  if (!isReconnectSessionFresh(session, now)) {
    clearReconnectSession();
    return undefined;
  }
  if (credentialDiscarded) saveReconnectSession(session);
  return session;
}

function isLogicalSessionIdentity(value: unknown): value is LogicalGameSessionIdentity {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const identity = value as Partial<LogicalGameSessionIdentity>;
  return (
    typeof identity.gameId === "string" &&
    /^[A-Za-z0-9][A-Za-z0-9:._-]{0,127}$/.test(identity.gameId) &&
    Number.isSafeInteger(identity.ownerEpoch) &&
    (identity.ownerEpoch ?? -1) >= 0
  );
}

export function clearReconnectSession(): void {
  try {
    storage()?.removeItem(STORAGE_KEY);
  } catch {
    // ignore storage failures
  }
}
