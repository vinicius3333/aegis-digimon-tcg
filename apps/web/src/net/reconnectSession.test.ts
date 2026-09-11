// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  clearReconnectSession,
  isReconnectSessionFresh,
  loadReconnectSession,
  RECONNECT_GRACE_MS,
  saveReconnectSession,
  type ReconnectSession,
} from "./reconnectSession";

const session: ReconnectSession = {
  reconnectionToken: "room-1:token",
  roomId: "room-1",
  slot: "legacy",
  savedAt: 1_000,
};

describe("reconnect session storage", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("round-trips a saved session within the server grace window", () => {
    saveReconnectSession(session);
    expect(loadReconnectSession(session.savedAt + 1_000)).toEqual(session);
  });

  it("keeps the match out of localStorage so other tabs never resume it", () => {
    saveReconnectSession(session);
    expect(localStorage.getItem("aegis:matchSession")).toBeNull();
  });

  it("drops a session older than the grace window", () => {
    saveReconnectSession(session);
    expect(loadReconnectSession(session.savedAt + RECONNECT_GRACE_MS)).toBeUndefined();
    expect(sessionStorage.getItem("aegis:matchSession")).toBeNull();
  });

  it("drops malformed storage instead of resuming from it", () => {
    sessionStorage.setItem("aegis:matchSession", "{not json");
    expect(loadReconnectSession()).toBeUndefined();

    sessionStorage.setItem("aegis:matchSession", JSON.stringify({ roomId: "room-1" }));
    expect(loadReconnectSession()).toBeUndefined();
  });

  it("clears on request", () => {
    saveReconnectSession(session);
    clearReconnectSession();
    expect(loadReconnectSession(session.savedAt)).toBeUndefined();
  });

  it("treats a clock that moved backwards as stale", () => {
    expect(isReconnectSessionFresh(session, session.savedAt - 1)).toBe(false);
  });
});
