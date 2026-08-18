import { describe, it, expect } from "vitest";
import { GameState, PlayerState, CardInstance, type Seat, type ServerEvent } from "@aegis/shared";
import { WinCheck } from "./winCheck.js";

function makeState(deckSizes: [number, number]): GameState {
  const state = new GameState();
  for (const seat of [0, 1] as Seat[]) {
    const player = new PlayerState();
    player.seat = seat;
    for (let i = 0; i < deckSizes[seat]; i++) {
      const card = new CardInstance();
      card.instanceId = `s${seat}-deck-${i}`;
      card.cardId = "BT7-089";
      card.ownerSeat = seat;
      player.deck.push(card);
    }
    state.players[seat] = player;
  }
  return state;
}

function recorder(): { events: ServerEvent[]; emit: (e: ServerEvent) => void } {
  const events: ServerEvent[] = [];
  return { events, emit: (e) => events.push(e) };
}

describe("WinCheck", () => {
  it("declares the opponent the winner when a seat loses, and emits gameOver", () => {
    const state = makeState([10, 10]);
    const { events, emit } = recorder();
    const win = new WinCheck(state, emit);

    win.declareLoss(0, "deckOut");

    expect(state.gameOver).toBe(true);
    expect(state.winnerSeat).toBe(1);
    expect(state.players[0]?.lost).toBe(true);
    expect(events).toEqual([
      { kind: "gameOver", result: { outcome: "win", winnerSeat: 1 }, reason: "deckOut" },
    ]);
  });

  it("is idempotent: the first declaration wins, later ones are ignored", () => {
    const state = makeState([10, 10]);
    const { events, emit } = recorder();
    const win = new WinCheck(state, emit);

    win.declareWinner(0, "security");
    win.declareWinner(1, "surrender"); // should be a no-op

    expect(state.winnerSeat).toBe(0);
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({
      kind: "gameOver",
      result: { outcome: "win", winnerSeat: 0 },
      reason: "security",
    });
  });

  it("surrender makes the surrendering seat lose immediately", () => {
    const state = makeState([10, 10]);
    const { events, emit } = recorder();
    const win = new WinCheck(state, emit);

    win.surrender(1);

    expect(state.winnerSeat).toBe(0);
    expect(events[0]).toEqual({
      kind: "gameOver",
      result: { outcome: "win", winnerSeat: 0 },
      reason: "surrender",
    });
  });

  it("detects deck-out only when the deck is empty", () => {
    const state = makeState([0, 3]);
    const win = new WinCheck(state, recorder().emit);

    expect(win.wouldDeckOut(0)).toBe(true);
    expect(win.wouldDeckOut(1)).toBe(false);
  });

  // Control: an ordinary single-player loss must still report the right winner,
  // through the discriminated `result`, and must never be misread as a draw.
  it("resolveLossFlags: a lost seat hands the win to its opponent (control, not a draw)", () => {
    const state = makeState([10, 10]);
    const player1 = state.players[1];
    if (player1) player1.lost = true;
    const { events, emit } = recorder();
    const win = new WinCheck(state, emit);

    const resolved = win.resolveLossFlags();

    expect(resolved).toBe(true);
    expect(state.winnerSeat).toBe(0);
    expect(events).toHaveLength(1);
    const event = events[0];
    expect(event).toMatchObject({ kind: "gameOver" });
    if (event?.kind !== "gameOver") throw new Error("expected gameOver event");
    expect(event.result.outcome).toBe("win");
    if (event.result.outcome !== "win") throw new Error("expected win outcome");
    expect(event.result.winnerSeat).toBe(0);
  });

  // Behavioral: a real simultaneous double-loss must reach the client as a draw
  // event, not silently hang (this was the TODO'd hole).
  it("resolveLossFlags: both lost simultaneously reaches the client as a draw event", () => {
    const state = makeState([10, 10]);
    const [p0, p1] = [state.players[0], state.players[1]];
    if (p0) p0.lost = true;
    if (p1) p1.lost = true;
    const { events, emit } = recorder();
    const win = new WinCheck(state, emit);

    const resolved = win.resolveLossFlags();

    expect(resolved).toBe(true);
    expect(state.gameOver).toBe(true);
    expect(state.winnerSeat).toBe(-1); // sentinel: no winner
    expect(events).toHaveLength(1);
    const event = events[0];
    expect(event).toMatchObject({ kind: "gameOver" });
    if (event?.kind !== "gameOver") throw new Error("expected gameOver event");
    expect(event.result.outcome).toBe("draw");
    expect(event.reason).toBe("effect");
  });

  it("declareLoss: simultaneous loss (opponent already lost) reaches the client as a draw event", () => {
    // BUG (audit finding 13): declareLoss unconditionally crowned the opponent, even
    // when the opponent had ALREADY lost — resolveLossFlags treats both-lost as a
    // draw, so declareLoss must consult the same invariant instead of contradicting it.
    const state = makeState([10, 10]);
    const player1 = state.players[1];
    if (player1) player1.lost = true; // seat 1 already lost (e.g. deck-out earlier)
    const { events, emit } = recorder();
    const win = new WinCheck(state, emit);

    win.declareLoss(0, "security"); // seat 0 now ALSO loses

    expect(state.players[0]?.lost).toBe(true);
    expect(state.players[1]?.lost).toBe(true);
    expect(state.gameOver).toBe(true);
    expect(state.winnerSeat).toBe(-1); // draw sentinel, no sole winner
    expect(events).toHaveLength(1);
    const event = events[0];
    expect(event).toMatchObject({ kind: "gameOver" });
    if (event?.kind !== "gameOver") throw new Error("expected gameOver event");
    expect(event.result.outcome).toBe("draw");
    expect(event.reason).toBe("security");
  });

  it("resolveLossFlags returns false when nobody has lost", () => {
    const state = makeState([10, 10]);
    const win = new WinCheck(state, recorder().emit);
    expect(win.resolveLossFlags()).toBe(false);
    expect(state.gameOver).toBe(false);
  });
});
