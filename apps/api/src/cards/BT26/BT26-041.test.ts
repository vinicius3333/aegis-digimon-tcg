import { describe, expect, it } from "vitest";
import { compiled } from "./BT26-041.js";
import "../index.js";
describe("BT26-041 Hudiemon", () => {
  it("compiles both play windows with security handoff, recovery, and optional suspend", () => {
    expect(compiled.coverage).toBe("full"); expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]?.actions).toMatchObject([{ kind: "SecurityManipulation", op: "toHand" }, { kind: "SecurityManipulation", op: "addTop" }, { kind: "Suspend", optional: true }]);
    expect(compiled.effects[1]?.actions).toEqual(compiled.effects[0]?.actions);
  });
  it("preserves the inherited once-per-turn battle-won memory trigger", () => {
    expect(compiled.effects[2]).toMatchObject({ trigger: "AllTurns", isInherited: true, actions: [{ kind: "SubTrigger", event: "whenBattleWon", frequency: "OncePerTurn", actions: [{ kind: "GainMemory", amount: 1 }] }] });
  });
});
