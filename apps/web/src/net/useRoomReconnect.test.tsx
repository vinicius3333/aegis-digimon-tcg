// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GameState } from "@aegis/shared";
import type { AegisRoom } from "./client";

const joinOrCreate = vi.fn();
const reconnect = vi.fn();

vi.mock("./client", () => ({
  joinOrCreate: (...args: unknown[]) => joinOrCreate(...args),
  createBot: vi.fn(),
  createPrivate: vi.fn(),
  joinPrivateByCode: vi.fn(),
  reconnect: (...args: unknown[]) => reconnect(...args),
  connectionSlot: () => "legacy",
  flushIntents: vi.fn(),
  clearPendingIntents: vi.fn(),
  sendIntent: vi.fn(),
}));

const { useRoom } = await import("./useRoom");
const { saveReconnectSession, loadReconnectSession } = await import("./reconnectSession");

const STORAGE_KEY = "aegis:matchSession";
const OPTIONS = { displayName: "Tamer", deck: { mainDeck: [], eggDeck: [] } };

interface FakeRoom {
  room: AegisRoom;
  emitState: (state: Partial<GameState>) => void;
  emitLeave: (code: number) => void;
}

function fakeRoom(roomId: string): FakeRoom {
  let onState: ((state: GameState) => void) | undefined;
  let onLeave: ((code: number) => void) | undefined;
  const room = {
    roomId,
    sessionId: `${roomId}-session`,
    reconnectionToken: `${roomId}:token`,
    connection: { isOpen: true },
    send: vi.fn(),
    leave: vi.fn(async () => 1000),
    onStateChange: (handler: (state: GameState) => void) => {
      onState = handler;
    },
    onMessage: vi.fn(),
    onError: vi.fn(),
    onLeave: (handler: (code: number) => void) => {
      onLeave = handler;
    },
  } as unknown as AegisRoom;
  return {
    room,
    emitState: (state) => act(() => onState?.(state as GameState)),
    emitLeave: (code) => act(() => onLeave?.(code)),
  };
}

describe("useRoom reconnection token persistence", () => {
  beforeEach(() => {
    sessionStorage.clear();
    joinOrCreate.mockReset();
    reconnect.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("persists the reconnection token once a fresh join binds", async () => {
    const joined = fakeRoom("room-1");
    joinOrCreate.mockResolvedValue(joined.room);

    const { result } = renderHook(() => useRoom(OPTIONS));

    await waitFor(() => expect(result.current.status).toBe("connected"));
    expect(loadReconnectSession()).toMatchObject({
      reconnectionToken: "room-1:token",
      roomId: "room-1",
      slot: "legacy",
    });
  });

  it("resumes a persisted session instead of matchmaking on a fresh mount", async () => {
    saveReconnectSession({
      reconnectionToken: "room-1:token",
      roomId: "room-1",
      slot: "legacy",
      savedAt: Date.now(),
    });
    const resumed = fakeRoom("room-1");
    reconnect.mockResolvedValue(resumed.room);

    const { result } = renderHook(() => useRoom(OPTIONS));

    expect(result.current.status).toBe("reconnecting");
    await waitFor(() => expect(result.current.status).toBe("connected"));
    expect(reconnect).toHaveBeenCalledWith("room-1:token", "legacy");
    expect(joinOrCreate).not.toHaveBeenCalled();
  });

  it("falls back to a new match when the persisted token is no longer valid", async () => {
    saveReconnectSession({
      reconnectionToken: "gone:token",
      roomId: "gone",
      slot: "legacy",
      savedAt: Date.now(),
    });
    reconnect.mockRejectedValue(new Error("room not found"));
    const joined = fakeRoom("room-2");
    joinOrCreate.mockResolvedValue(joined.room);

    const { result } = renderHook(() => useRoom(OPTIONS));

    await waitFor(() => expect(result.current.status).toBe("connected"));
    expect(reconnect).toHaveBeenCalledTimes(1);
    expect(joinOrCreate).toHaveBeenCalledTimes(1);
    expect(loadReconnectSession()).toMatchObject({ roomId: "room-2" });
  });

  it("forgets the session once the match is over", async () => {
    const joined = fakeRoom("room-1");
    joinOrCreate.mockResolvedValue(joined.room);
    const { result } = renderHook(() => useRoom(OPTIONS));
    await waitFor(() => expect(result.current.status).toBe("connected"));

    joined.emitState({ gameOver: true, players: [] as unknown as GameState["players"] });

    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("forgets the session when the player leaves on purpose", async () => {
    const joined = fakeRoom("room-1");
    joinOrCreate.mockResolvedValue(joined.room);
    const { result, unmount } = renderHook(() => useRoom(OPTIONS));
    await waitFor(() => expect(result.current.status).toBe("connected"));

    unmount();

    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
