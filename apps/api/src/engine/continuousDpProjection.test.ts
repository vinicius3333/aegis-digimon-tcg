import { EffectDuration, type Action, type Target } from "@aegis/shared";
import { expect, it } from "vitest";
import { compiled as original } from "../cards/BT1/BT1-010.js";
import { registerIrCard } from "./effects/interpreter.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";
import "../cards/index.js";

const self: Target = { filter: { isSelfRef: true }, count: 1, isSelf: true };
const cases: { label: string; action: Action }[] = [
  { label: "base override", action: { kind: "SetBaseDP", target: self, value: 14000, duration: "permanent" } },
  { label: "minimum floor", action: { kind: "MinDpFloor", target: self, floor: 13000, duration: "permanent" } },
];

it.each(cases)(
  "continuous $label supplies a stable DP gate without accumulating its prior value",
  async ({ action }) => {
    const neutralId = "BT1-010";
    // Isolate a continuous DP-layer mechanism while retaining BlackWarGreymon's real gate.
    registerIrCard(neutralId, {
      effects: [{ trigger: "AllTurns", actions: [action] }],
      coverage: "full",
      residual: [],
    });
    try {
      const s = setupEngine({
        0: { battleArea: [{ card: "EX10-010", as: "blackWarGreymon" }] },
        1: { battleArea: [{ card: neutralId, as: "qualifier", dp: 3000 }] },
      });
      // A duration modifier is independent of the continuous tier. The override produces
      // 14000 - 1000; the floor clamps 3000 - 1000. Both must resolve to exactly 13000.
      await advance(s.engine).verb.modifyDP(s.perm("qualifier").permanentId, -1000, EffectDuration.Permanent);
      await s.ready();
      for (let pass = 0; pass < 3; pass += 1) {
        await s.engine.recomputeContinuousEffects();
        expect(s.perm("qualifier").currentDP).toBe(13000);
        expect(s.perm("blackWarGreymon").currentDP).toBe(15000);
      }

      expect(await advance(s.engine).verb.deletePermanent([s.perm("qualifier").permanentId], "byRule")).toBe(1);
      await s.engine.recomputeContinuousEffects();
      expect(s.perm("blackWarGreymon").currentDP).toBe(12000);
    } finally {
      registerIrCard(neutralId, original);
    }
  },
);

it("BT25-104 Q6947 removes the continuous Digimon treatment before the zero-DP rule check", async () => {
  const effectCardId = "BT1-010";
  registerIrCard(effectCardId, {
    effects: [
      {
        trigger: "OnPlay",
        actions: [
          {
            kind: "ModifyDP",
            target: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Marcus Damon"], match: "name" }],
              },
              count: 1,
            },
            amount: -12000,
            duration: "forTheTurn",
          },
          {
            kind: "DeDigivolve",
            target: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["ShineGreymon"], match: "name" }],
              },
              count: 1,
            },
            amount: 1,
          },
        ],
      },
    ],
    coverage: "full",
    residual: [],
  });
  try {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-104", as: "shine", under: [{ card: "AD1-016", as: "base" }] },
            { card: "BT13-095", as: "marcus" },
          ],
          hand: [{ card: effectCardId, as: "effect" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 2;
    await s.ready();
    expect(s.perm("marcus").currentDP).toBe(12000);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("effect").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("shine").topCard.cardId === "AD1-016");

    expect(s.perm("shine").topCard.cardId).toBe("AD1-016");
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === s.perm("marcus").permanentId),
    ).toBe(true);
    expect(s.perm("marcus").currentDP).toBe(0);
  } finally {
    registerIrCard(effectCardId, original);
  }
});
