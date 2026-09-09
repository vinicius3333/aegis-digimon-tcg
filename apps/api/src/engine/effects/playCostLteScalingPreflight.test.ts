import type { CompiledCard } from "@aegis/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { registerIrCard } from "./interpreter.js";
import { advance } from "../testkit/advance.js";
import { settle, setupEngine } from "../testkit/harness.js";
import printedGravityCrush from "../../cards/BT1/BT1-090.js";

// An OPTIONAL `PlayWithoutCost` is gated by a preflight in `runAction.ts` that searches for at
// least one legal candidate before opening a decision. When the target carries a dynamic play-cost
// ceiling (`playCostLteScaling`) the preflight must fold that scaling into `playCostLte` exactly as
// the resolver does; otherwise the gate judges the clause at the printed ceiling (0 here), finds
// nothing and drops the whole action before any prompt. This test owns that seam on a synthetic IR
// card, independently of BT19-100 (the printed card that exposed it).
const DRIVER = "BT1-090"; // Gravity Crush, Red Option — synthetic IR, see below.
const COUNTED = "BT1-009"; // Monodramon, the red permanent counted by the scaling.
const COLOR_ANCHOR = "BT1-013"; // Muchomon, red [Avian] — colour source only, never counted.
const REPTILE_COST_3 = "BT1-010"; // Agumon, [Reptile], play cost 3.
const REPTILE_COST_4 = "BT11-037"; // Kotemon, [Reptile], play cost 4.

// "You may play 1 [Reptile] Digimon with a play cost of 1 for each of your Monodramon,
// without paying its cost."
const driver: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Reptile"], match: "trait" }],
              playCostLte: 0,
              playCostLteScaling: {
                per: 1,
                unit: "cards",
                filter: {
                  zone: "battleArea",
                  controller: "mine",
                  nameOrTrait: [{ tokens: ["Monodramon"], match: "nameExact" }],
                },
              },
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
  coverage: "full",
  residual: [],
};

// Vitest runs this package with `isolate: false`, so the card registry is shared across every test
// file in the worker. The stand-in is installed for this file only and the printed IR is restored.
beforeAll(() => {
  registerIrCard(DRIVER, driver);
});

afterAll(() => {
  registerIrCard(DRIVER, printedGravityCrush);
});

const battleAreaCardIds = (state: ReturnType<typeof setupEngine>["state"]): string[] =>
  Array.from(state.players[0]!.battleArea).flatMap((permanent) =>
    permanent.topCard === undefined ? [] : [permanent.topCard.cardId],
  );

const handCardIds = (state: ReturnType<typeof setupEngine>["state"]): string[] =>
  Array.from(state.players[0]!.hand).map((card) => card.cardId);

const boardWith = async (counted: number) => {
  const s = setupEngine(
    {
      0: {
        battleArea: [
          // Red source for the driver Option's color requirement, and not itself counted.
          { card: COLOR_ANCHOR, as: "anchor" },
          ...Array.from({ length: counted }, (_unused, index) => ({
            card: COUNTED,
            as: `counted${index}`,
          })),
        ],
        hand: [
          { card: DRIVER, as: "driver" },
          { card: REPTILE_COST_3, as: "cost3" },
          { card: REPTILE_COST_4, as: "cost4" },
        ],
        deck: Array(8).fill(COUNTED),
      },
      1: { deck: Array(8).fill(COUNTED) },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  await s.ready();
  const loop = s.engine.startTurnLoop();
  await advance(s.engine).waitForMainPhase(0);
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("driver").instanceId })).toEqual({ ok: true });
  return { s, loop };
};

describe("optional PlayWithoutCost preflight with playCostLteScaling", () => {
  it("offers the play once the scaled ceiling covers a candidate", async () => {
    const { s, loop } = await boardWith(3);
    await settle(() => battleAreaCardIds(s.state).includes(REPTILE_COST_3));

    // Ceiling = 0 + 3 Monodramon = 3, so only the play-cost-3 Reptile is legal.
    expect(battleAreaCardIds(s.state)).toContain(REPTILE_COST_3);
    expect(handCardIds(s.state)).toContain(REPTILE_COST_4);
    expect(handCardIds(s.state)).not.toContain(REPTILE_COST_3);

    expect(s.engine.applyIntent(s.state.turnSeat, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("still drops the play when the scaled ceiling covers nothing", async () => {
    const { s, loop } = await boardWith(0);
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === DRIVER));

    // Ceiling = 0, so no [Reptile] in hand qualifies and no decision is raised.
    expect(handCardIds(s.state)).toContain(REPTILE_COST_3);
    expect(handCardIds(s.state)).toContain(REPTILE_COST_4);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(s.state.turnSeat, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
