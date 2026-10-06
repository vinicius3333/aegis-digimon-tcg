import { afterEach, describe, expect, it, vi } from "vitest";
import { CombatWindow, EVENT_CHANNEL, PendingDecision, Phase, type Seat } from "@aegis/shared";
import type { GameEngine } from "../engine/GameEngine.js";
import { AegisRoom } from "./AegisRoom.js";

const rooms: AegisRoom[] = [];
afterEach(() => {
  for (const room of rooms.splice(0)) room.onDispose();
  vi.restoreAllMocks();
});

function room(
  options: Parameters<AegisRoom["onCreate"]>[0] = {
    private: true,
    matchTimer: true,
    timerStartSeconds: 60,
    timerRefillSeconds: 0,
  },
) {
  const result = new AegisRoom();
  result.lock = vi.fn(async () => {});
  result.unlock = vi.fn(async () => {});
  result.setMatchmaking = vi.fn(async (updates) => {
    if (updates.maxClients !== undefined) result.maxClients = updates.maxClients;
  });
  result.lock = vi.fn(async () => undefined) as AegisRoom["lock"];
  result.broadcast = vi.fn() as AegisRoom["broadcast"];
  result.onCreate({ seed: 1, ...options });
  rooms.push(result);
  return result;
}
function engine(room: AegisRoom): GameEngine {
  return (room as unknown as { engine: GameEngine }).engine;
}
function sync(room: AegisRoom) {
  (room as unknown as { syncMatchClock(): void }).syncMatchClock();
}
function begin(room: AegisRoom, seat: Seat) {
  (room as unknown as { matchStartRequested: boolean }).matchStartRequested = true;
  room.state.turnCount = 1;
  room.state.phase = Phase.Main;
  room.state.turnSeat = seat;
  void engine(room).mainPhase.run(seat);
}

describe("room clock enforcement", () => {
  it("expires through the authoritative outcome pipeline and unwinds the Main wait", () => {
    const now = vi.spyOn(performance, "now").mockReturnValue(0);
    const game = room();
    begin(game, 0);
    sync(game);
    now.mockReturnValue(60_000);
    sync(game);
    expect(game.state.gameOver).toBe(true);
    expect(game.state.winnerSeat).toBe(1);
    expect(engine(game).mainPhase.isOpen).toBe(false);
    expect(game.broadcast).toHaveBeenCalledWith(
      EVENT_CHANNEL,
      expect.objectContaining({ kind: "gameOver", reason: "timeout", result: { outcome: "win", winnerSeat: 1 } }),
    );
  });

  it("closes the actual opening mulligan and refuses late answers after expiry", async () => {
    const now = vi.spyOn(performance, "now").mockReturnValue(0);
    const game = room();
    (game as unknown as { matchStartRequested: boolean }).matchStartRequested = true;
    const waiting = engine(game).mulligan.request(0);
    sync(game);
    now.mockReturnValue(60_000);
    sync(game);
    await waiting;
    expect(engine(game).mulligan.isOpen).toBe(false);
    expect(game.state.pendingDecision).toBeUndefined();
    expect(engine(game).applyIntent(0, { type: "mulligan", keep: false }).ok).toBe(false);
  });

  it("disables the timer when a legacy casual room successfully seats a bot", () => {
    const game = room({ matchTimer: true });
    const client = { sessionId: "human", send: vi.fn() } as never;
    game.clients.push(client);
    game.onJoin(client, { displayName: "Human", deck: { mainDeck: [], eggDeck: [] } });
    expect(game.addBot()).toBe(true);
    expect(game.state.matchTimer).toBe(false);
    expect(game.state.timerActiveSeat).toBe(-1);
  });

  it("charges a defending decision and not the turn player", () => {
    const now = vi.spyOn(performance, "now").mockReturnValue(0);
    const game = room();
    begin(game, 0);
    const decision = new PendingDecision();
    decision.seat = 1;
    game.state.pendingDecision = decision;
    sync(game);
    now.mockReturnValue(10_000);
    sync(game);
    expect(game.state.timerRemaining0).toBe(60);
    expect(game.state.timerRemaining1).toBe(50);
    game.state.pendingDecision = undefined;
    const window = new CombatWindow();
    window.seat = 1;
    game.state.combatWindow = window;
    now.mockReturnValue(15_000);
    sync(game);
    expect(game.state.timerActiveSeat).toBe(1);
    expect(game.state.timerRemaining1).toBe(45);
  });

  it("pauses while the engine resolves and resumes the existing bank", () => {
    const now = vi.spyOn(performance, "now").mockReturnValue(0);
    const game = room();
    begin(game, 0);
    sync(game);
    now.mockReturnValue(5000);
    sync(game);
    engine(game).mainVerbContinuationsInFlight = 1;
    sync(game);
    now.mockReturnValue(20_000);
    sync(game);
    expect(game.state.timerRemaining0).toBe(55);
    engine(game).mainVerbContinuationsInFlight = 0;
    sync(game);
    now.mockReturnValue(25_000);
    sync(game);
    expect(game.state.timerRemaining0).toBe(50);
  });

  it("publishes the 60s/30s turn bonuses once while retaining each player's reserve", () => {
    const now = vi.spyOn(performance, "now").mockReturnValue(0);
    const game = room({ private: true, matchTimer: true, timerStartSeconds: 300, timerRefillSeconds: 0 });
    begin(game, 0);
    sync(game);
    now.mockReturnValue(100_000);
    sync(game);
    expect(game.state.timerRemaining0).toBe(200);
    const decision = new PendingDecision();
    decision.seat = 1;
    game.state.pendingDecision = decision;
    sync(game);
    now.mockReturnValue(150_000);
    sync(game);
    expect(game.state.timerRemaining1).toBe(250);

    game.state.turnCount = 2;
    game.state.turnSeat = 1;
    sync(game);
    expect(game.state.timerRemaining1).toBe(300);
    expect(game.state.timerRemaining0).toBe(230);
    now.mockReturnValue(170_000);
    sync(game);
    expect(game.state.timerRemaining1).toBe(280);

    game.state.pendingDecision = undefined;
    sync(game);
    now.mockReturnValue(220_000);
    sync(game);
    expect(game.state.timerRemaining0).toBe(180);
    game.state.turnCount = 3;
    game.state.turnSeat = 0;
    sync(game);
    expect(game.state.timerRemaining0).toBe(240);
    expect(game.state.timerRemaining1).toBe(300);
    now.mockReturnValue(230_000);
    sync(game);
    expect(game.state.timerRemaining0).toBe(230);
  });

  it("never runs before both seats are ready", () => {
    const now = vi.spyOn(performance, "now").mockReturnValue(0);
    const game = room();
    sync(game);
    now.mockReturnValue(300_000);
    sync(game);
    expect(game.state.timerRemaining0).toBe(60);
    expect(game.state.gameOver).toBe(false);
  });

  it("enables the named development bot scenario with the standard timer policy", () => {
    const game = room({ botRoom: true, devScenario: "arena-match-timer" });
    expect(game.state.matchTimer).toBe(true);
    expect(game.state.timerStartSeconds).toBe(300);
    expect(game.state.timerRefillSeconds).toBe(60);
    expect(room({ botRoom: true, devScenario: "arena", matchTimer: true }).state.matchTimer).toBe(false);
  });

  it("disables crafted ranked, tournament and bot clock options", () => {
    for (const mode of [{ rankedRoom: true }, { tournamentRoom: true }, { botRoom: true }]) {
      expect(room({ ...mode, matchTimer: true }).state.matchTimer).toBe(false);
    }
  });

  it("ignores non-host overrides and legacy refill settings", () => {
    const game = room();
    expect(game.state.timerStartSeconds).toBe(60);
    expect(game.state.timerRefillSeconds).toBe(60);
    expect(room({ matchTimer: true, timerStartSeconds: 60, timerRefillSeconds: 0 }).state.timerStartSeconds).toBe(300);
  });
});
