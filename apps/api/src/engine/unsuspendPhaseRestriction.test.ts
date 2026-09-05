import type { Action } from "@aegis/shared";
import { expect, it } from "vitest";
import { registerIrCard } from "./effects/interpreter.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";
import { compiled as original } from "../cards/BT1/BT1-010.js";
import "../cards/index.js";

it("Quartzmon blocks an actual start-turn Unsuspend effect but allows the same action during Main", async () => {
  const neutralId = "BT1-010";
  const unsuspend: Action = {
    kind: "Unsuspend",
    target: { filter: { controller: "mine", kind: ["Digimon", "Tamer"] }, count: "all" },
  };
  // A neutral compiled source isolates the phase consumer; Quartzmon uses its real module.
  registerIrCard(neutralId, {
    effects: [
      { trigger: "StartOfYourTurn", actions: [unsuspend, { kind: "GainMemory", amount: 1 }] },
      { trigger: "OnPlay", actions: [unsuspend] },
    ],
    coverage: "full",
    residual: [],
  });
  try {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX10-023", as: "quartz" }] },
      1: {
        battleArea: [
          { card: neutralId, as: "startSource", suspended: true },
          { card: "BT1-085", as: "tamer", suspended: true },
        ],
        hand: [{ card: neutralId, as: "playSource" }],
        deck: ["BT1-009", "BT1-009", "BT1-009"],
      },
    });
    s.state.turnSeat = 1;
    s.state.memory = 5;
    await s.ready();
    const turn = s.engine.runOneTurn();
    try {
      await advance(s.engine).waitForMainPhase(1);
      // The +1 proves the actual start-turn effect ran. Its preceding Unsuspend and the
      // ordinary active-phase unsuspend must both respect Q5075's phase-wide restriction.
      expect(s.state.memory).toBe(6);
      expect(s.perm("startSource").isSuspended).toBe(true);
      expect(s.perm("tamer").isSuspended).toBe(true);

      expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("playSource").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => !s.perm("startSource").isSuspended);
      expect(s.perm("startSource").isSuspended).toBe(false);
      expect(s.perm("tamer").isSuspended).toBe(false);
    } finally {
      advance(s.engine).endMainPhaseIfOpen(1);
      await turn;
    }
  } finally {
    registerIrCard(neutralId, original);
  }
});
