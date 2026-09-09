import type { CompiledCard } from "@aegis/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { registerIrCard } from "./interpreter.js";
import { advance } from "../testkit/advance.js";
import { settle, setupEngine } from "../testkit/harness.js";
import printedMuchomon from "../../cards/BT1/BT1-013.js";
import printedGravityCrush from "../../cards/BT1/BT1-090.js";

// `PlayFromZone` with `playCost: { op: "eq", relativeToLeavingDigimon: N }` reads the play cost of
// the Digimon that triggered `whenDigimonWouldLeave`. Leave and deletion events resolve AFTER the
// permanent has left the battle area (see `subTrigger.ts` `deletionSourceFilterGate`), so the live
// board no longer holds it and the cost must come from the removal snapshot. This test owns that
// seam directly: the watcher below is a synthetic IR registered on a vanilla catalog card, so it
// does not depend on BT19-099 (the only printed user of the filter).
const WATCHER = "BT1-013"; // Muchomon, vanilla — no card module is imported for it.
const LEAVING_COST_2 = "BT1-009"; // Monodramon, play cost 2.
const LEAVING_COST_3 = "BT1-014"; // Kokatorimon, play cost 3.
const REPTILE_COST_3 = "BT1-010"; // Agumon, [Reptile], play cost 3.
const REPTILE_COST_4 = "BT11-037"; // Kotemon, [Reptile], play cost 4.
const DRIVER = "BT1-090"; // Gravity Crush, Red Option, play cost 0 — synthetic IR, see below.

const watcher: CompiledCard = {
  effects: [
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenDigimonWouldLeave",
          sourceFilter: { controller: "mine", kind: ["Digimon"], excludeSelf: true },
          pickOne: true,
          actions: [
            {
              kind: "PlayFromZone",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [{ tokens: ["Reptile"], match: "trait" }],
                  playCost: { op: "eq", relativeToLeavingDigimon: 1 },
                },
                count: 1,
              },
              from: ["hand"],
              payCost: false,
              optional: true,
            },
          ],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

// The deletion driver: "by deleting 1 of your Digimon, place this card in the battle area".
// A `deleteOwn` cost is the production route that removes the permanent BEFORE the leave
// subscribers resolve, which is exactly the seam this test pins.
const driver: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "CostGatedBlock",
          cost: {
            kind: "deleteOwn",
            target: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Monodramon", "Kokatorimon"], match: "name" }],
              },
              count: 1,
            },
          },
          optional: false,
          abortOnDecline: true,
          actions: [{ kind: "PlaceInBattleAreaSelf" }],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

// Vitest runs this package with `isolate: false`, so the card registry is shared across every
// test file in the worker. Both stand-ins are installed for this file only and the printed IR is
// put back afterwards.
beforeAll(() => {
  registerIrCard(WATCHER, watcher);
  registerIrCard(DRIVER, driver);
});

afterAll(() => {
  registerIrCard(WATCHER, printedMuchomon);
  registerIrCard(DRIVER, printedGravityCrush);
});

const battleAreaCardIds = (state: ReturnType<typeof setupEngine>["state"]): string[] =>
  Array.from(state.players[0]!.battleArea).flatMap((permanent) =>
    permanent.topCard === undefined ? [] : [permanent.topCard.cardId],
  );

describe("PlayFromZone relativeToLeavingDigimon", () => {
  it.each([
    [LEAVING_COST_2, REPTILE_COST_3, REPTILE_COST_4],
    [LEAVING_COST_3, REPTILE_COST_4, REPTILE_COST_3],
  ])("plays the play-cost+1 Digimon after %s leaves the battle area", async (leaving, played, notPlayed) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: WATCHER, as: "watcher" },
            { card: leaving, as: "leaving" },
          ],
          hand: [
            { card: DRIVER, as: "driver" },
            { card: REPTILE_COST_3, as: "cost3" },
            { card: REPTILE_COST_4, as: "cost4" },
          ],
          deck: Array(8).fill(LEAVING_COST_2),
        },
        1: { deck: Array(8).fill(LEAVING_COST_2) },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("driver").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => battleAreaCardIds(s.state).includes(played));

    // The removal snapshot supplied the leaving Digimon's play cost, so exactly the
    // (leaving play cost + 1) candidate was playable and the other was filtered out.
    expect(battleAreaCardIds(s.state)).toContain(played);
    expect(battleAreaCardIds(s.state)).not.toContain(notPlayed);
    expect(Array.from(s.state.players[0]!.hand).some((card) => card.cardId === notPlayed)).toBe(true);

    expect(s.engine.applyIntent(s.state.turnSeat, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
