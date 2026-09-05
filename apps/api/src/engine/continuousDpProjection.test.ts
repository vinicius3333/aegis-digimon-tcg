import { EffectDuration, type Action, type Target } from "@aegis/shared";
import { expect, it } from "vitest";
import { compiled as original } from "../cards/BT1/BT1-010.js";
import { registerIrCard } from "./effects/interpreter.js";
import { advance } from "./testkit/advance.js";
import { setupEngine } from "./testkit/harness.js";
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
