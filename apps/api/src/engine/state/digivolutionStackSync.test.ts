import { Decoder, Encoder } from "@colyseus/schema";
import { GameState, type CardInstance, type DecisionRequest, type Seat } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../testkit/advance.js";
import { setupEngine } from "../testkit/harness.js";
import "../../cards/BT11/BT11-111.js";

/**
 * End-to-end board sync for the card that broke it: BT11-111 Galacticmon.
 *
 * Its [When Digivolving] places 4 [Vemmon] as BOTTOM digivolution cards, and its leave
 * replacement pays by returning 4 of them to the deck. Front-insertion used to corrupt the
 * client's copy of the stack (blank identity-less entries, wrong order, wrong survivors), so
 * the leave-prevention prompt asked the player to pick 4 cards it could not draw. This walks
 * the whole sequence through the encoder the room actually uses — a StateView per seat, fed by
 * the mutation seam's visibility port — and holds the decoded stacks to the server's.
 */

/** The room's client fan-out: one StateView + decoder per seat, patched together. */
function seatViews(engine: ReturnType<typeof setupEngine>["engine"], state: GameState) {
  const encoder = new Encoder(state);
  const seats = ([0, 1] as Seat[]).map((seat) => {
    const decoder = new Decoder(new GameState());
    return { seat, view: engine.makeStateView(seat)!, decoder };
  });
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

const identify = (cards: readonly (CardInstance | undefined)[]): string[] =>
  [...cards].map((card) => `${card?.instanceId ?? "<no instanceId>"}:${card?.cardId ?? "<no cardId>"}`);

describe("BT11-111 Galacticmon board sync", () => {
  it("shows both seats the same digivolution stack the server holds", async () => {
    const setup = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-065", as: "base", under: ["BT11-061"] }],
          hand: [{ card: "BT11-111", as: "galacticmon" }],
          trash: ["BT11-061", "BT11-061", "BT11-061", "BT11-061"],
          deck: ["BT1-001", "BT1-002", "BT1-003"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponentDigimon" }], security: 3 },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    setup.state.memory = 10;
    await setup.ready();
    const clients = seatViews(setup.engine, setup.state);
    const settleWithPatches = async (): Promise<void> => {
      for (let tick = 0; tick < 40; tick += 1) {
        clients.patch();
        await new Promise((resolve) => setTimeout(resolve, 1));
      }
    };
    const stackSeenBy = (seat: Seat): readonly CardInstance[] =>
      clients.stateFor(seat).players[0]!.battleArea[0]!.stack;

    expect(
      setup.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: setup.perm("base").permanentId,
        instanceId: setup.inst("galacticmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settleWithPatches();

    // 4 [Vemmon] from the trash, at the bottom, under the Snatchmon it evolved from.
    expect(setup.perm("base").stack).toHaveLength(6);
    expect(identify(stackSeenBy(0))).toEqual(identify(setup.perm("base").stack));
    // Face-up digivolution cards are public, so the opponent's board reads the same stack.
    expect(identify(stackSeenBy(1))).toEqual(identify(setup.perm("base").stack));

    const galacticmonId = setup.perm("base").permanentId;
    const driver = advance(setup.engine);
    driver.verb.enterEffectResolution(1, ["Digimon"]);
    void driver.verb.deletePermanent([galacticmonId], "byEffect");
    await settleWithPatches();
    driver.verb.leaveEffectResolution();
    await settleWithPatches();

    // The prevention was paid: 4 [Vemmon] left the stack and Galacticmon stayed.
    expect(setup.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).toContain(galacticmonId);
    expect(setup.perm("base").stack).toHaveLength(2);
    expect(identify(stackSeenBy(0))).toEqual(identify(setup.perm("base").stack));
    expect(identify(stackSeenBy(1))).toEqual(identify(setup.perm("base").stack));
  });

  it("names every card it offers, so no prompt renders a blank card", async () => {
    const setup = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-065", as: "base", under: ["BT11-061"] }],
          hand: [{ card: "BT11-111", as: "galacticmon" }],
          trash: ["BT11-061", "BT11-061", "BT11-061", "BT11-061"],
          deck: ["BT1-001", "BT1-002", "BT1-003"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponentDigimon" }], security: 3 },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    setup.state.memory = 10;
    await setup.ready();
    setup.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: setup.perm("base").permanentId,
      instanceId: setup.inst("galacticmon").instanceId,
    });
    await new Promise((resolve) => setTimeout(resolve, 40));
    const driver = advance(setup.engine);
    driver.verb.enterEffectResolution(1, ["Digimon"]);
    void driver.verb.deletePermanent([setup.perm("base").permanentId], "byEffect");
    await new Promise((resolve) => setTimeout(resolve, 40));
    driver.verb.leaveEffectResolution();

    const selections = setup.decisions.filter(({ req }) => req.kind === "selectCards");
    expect(selections.length).toBeGreaterThanOrEqual(2);
    for (const { req } of selections) {
      const offered = req.options?.candidateInstanceIds ?? [];
      const named = new Set((req.options?.visibleCards ?? []).map((visible) => visible.instanceId));
      expect(new Set(offered).size, `duplicate candidates in "${req.promptText}"`).toBe(offered.length);
      expect(offered.filter((instanceId) => !named.has(instanceId))).toEqual([]);
    }

    const optionals = setup.decisions.filter(({ req }) => req.kind === "optional");
    expect(optionals.length).toBeGreaterThan(0);
    for (const { req } of optionals) expect(promptOf(req)).not.toContain("undefined");
  });
});

const promptOf = (request: DecisionRequest): string => request.promptText;
