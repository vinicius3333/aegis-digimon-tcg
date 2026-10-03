import { Decoder, Encoder } from "@colyseus/schema";
import { GameState, Phase, type Seat } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";

/** The room's client fan-out: one StateView and decoder per seat, patched together. */
function seatViews(engine: ReturnType<typeof setupEngine>["engine"], state: GameState) {
  const encoder = new Encoder(state);
  const seats = ([0, 1] as Seat[]).map((seat) => ({
    seat,
    view: engine.makeStateView(seat)!,
    decoder: new Decoder(new GameState()),
  }));
  engine.installVisibility((ownerSeat, zone, card) => {
    for (const target of seats) engine.exposeCardToView(target.view, target.seat, ownerSeat, zone, card);
  });
  const encodeInto = (full: boolean): void => {
    for (const target of seats) engine.refreshStateView(target.view, target.seat);
    const iterator = { offset: 0 };
    if (full) encoder.encodeAll(iterator);
    else encoder.encode(iterator);
    const shared = iterator.offset;
    for (const target of seats) {
      iterator.offset = shared;
      target.decoder.decode(
        full ? encoder.encodeAllView(target.view, shared, iterator) : encoder.encodeView(target.view, shared, iterator),
      );
    }
    encoder.discardChanges();
  };
  encodeInto(true);
  return {
    patch: () => encodeInto(false),
    stateFor: (seat: Seat) => seats[seat]!.decoder.state as GameState,
  };
}

describe("EX13 Richard Sampson face-down sources Discord arena scenario", () => {
  it("Discord 1555516815226970172: shows the owner every face-down card under their Tamer, and nobody else", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
    // The room installs the visibility port before any seat is filled, so the scenario's
    // permanents carry it like any permanent played mid-match.
    const clients = seatViews(s.engine, s.state);
    layDevScenario("arena-ex13-sampson-face-down-sources", s.state, [BLUE_DECK, RED_DECK]);

    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.state.players[0]!.battleArea[0]!.stack.length === 2 && s.state.pendingDecision === undefined);
    clients.patch();

    const ownSources = [...s.state.players[0]!.battleArea[0]!.stack];
    const placed = ownSources.find(({ instanceId }) => instanceId !== "dev-sampson-source-0")!;
    expect(placed.instanceId).toMatch(/^s0-/);
    expect(ownSources.map(({ instanceId, faceUp }) => ({ instanceId, faceUp }))).toEqual([
      { instanceId: placed.instanceId, faceUp: false },
      { instanceId: "dev-sampson-source-0", faceUp: false },
    ]);

    const ownerSeesOwn = clients.stateFor(0).players[0]!.battleArea[0]!.stack.map(({ cardId }) => cardId);
    expect(ownerSeesOwn).toEqual([placed.cardId, "EX13-026"]);
    const opponentSeesOwn = clients.stateFor(1).players[0]!.battleArea[0]!.stack.map(({ cardId }) => cardId);
    expect(opponentSeesOwn).toEqual([undefined, undefined]);

    expect(clients.stateFor(1).players[1]!.battleArea[0]!.stack[0]!.cardId).toBe("EX13-026");
    expect(clients.stateFor(0).players[1]!.battleArea[0]!.stack[0]!.cardId).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
