// @vitest-environment jsdom
import { CloseCode } from "@colyseus/sdk";
import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AegisRoom } from "@/net/client";

const joinOrCreate = vi.fn<(...args: unknown[]) => Promise<AegisRoom>>();

vi.mock("@/net/client", () => ({
  spectate: vi.fn(),
  joinOrCreate: (...args: unknown[]) => joinOrCreate(...args),
  createBot: vi.fn(),
  createPrivate: vi.fn(),
  joinPrivateByCode: vi.fn(),
  joinSeriesGame: vi.fn(),
  resumeReconnectSession: vi.fn(),
  connectionSlot: () => "legacy",
  flushIntents: vi.fn(),
  clearPendingIntents: vi.fn(),
  sendIntent: vi.fn(),
}));

vi.mock("@/clientErrors/clientErrorReporter", () => ({
  clientErrorReporter: { capture: vi.fn(), setMatchContext: vi.fn() },
}));

const { useRoom } = await import("@/net/useRoom");
const { loadReconnectSession } = await import("@/net/reconnectSession");
const { ClientErrorBoundary } = await import("@/clientErrors/ClientErrorBoundary");

const OPTIONS = { displayName: "Tamer", deck: { mainDeck: [], eggDeck: [] } };

function liveRoom(roomId: string): AegisRoom {
  return {
    roomId,
    sessionId: `${roomId}-session`,
    reconnectionToken: `${roomId}:token`,
    connection: { isOpen: true, events: {}, close: vi.fn<(code: number) => void>() },
    reconnection: { enabled: true },
    ping: (answer: (ms: number) => void) => answer(20),
    send: vi.fn(),
    leave: vi.fn(async () => 1000),
    onStateChange: vi.fn(),
    onMessage: vi.fn(),
    onError: vi.fn(),
    onLeave: vi.fn(),
  } as unknown as AegisRoom;
}

function Match({ crash, onStatus }: { crash: boolean; onStatus: (status: string) => void }) {
  const { status } = useRoom(OPTIONS);
  onStatus(status);
  if (crash) throw new Error("render crash");
  return <span>{status}</span>;
}

describe("useRoom after a render crash", () => {
  beforeEach(() => {
    sessionStorage.clear();
    joinOrCreate.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("holds the seat for a reload instead of conceding when the match screen crashes", async () => {
    const room = liveRoom("crashed-match");
    joinOrCreate.mockResolvedValue(room);
    const statuses: string[] = [];
    const onStatus = (status: string) => statuses.push(status);
    const { rerender } = render(
      <ClientErrorBoundary fallback={null}>
        <Match crash={false} onStatus={onStatus} />
      </ClientErrorBoundary>,
    );
    await waitFor(() => expect(statuses.at(-1)).toBe("connected"));

    act(() =>
      rerender(
        <ClientErrorBoundary fallback={null}>
          <Match crash onStatus={onStatus} />
        </ClientErrorBoundary>,
      ),
    );

    expect(room.leave).not.toHaveBeenCalled();
    expect(room.connection.close).toHaveBeenCalledExactlyOnceWith(CloseCode.MAY_TRY_RECONNECT);
    expect(loadReconnectSession()).toMatchObject({ roomId: "crashed-match", reconnectionToken: "crashed-match:token" });
  });

  it("still concedes when the player leaves a healthy match screen", async () => {
    const room = liveRoom("left-match");
    joinOrCreate.mockResolvedValue(room);
    const statuses: string[] = [];
    const { unmount } = render(
      <ClientErrorBoundary fallback={null}>
        <Match crash={false} onStatus={(status) => statuses.push(status)} />
      </ClientErrorBoundary>,
    );
    await waitFor(() => expect(statuses.at(-1)).toBe("connected"));

    unmount();

    expect(room.leave).toHaveBeenCalledOnce();
    expect(room.connection.close).not.toHaveBeenCalled();
    expect(loadReconnectSession()).toBeUndefined();
  });
});
