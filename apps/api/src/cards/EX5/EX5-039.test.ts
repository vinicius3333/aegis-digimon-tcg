import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-039.js";

describe("EX5-039 Garudamon", () => {
  it("has Fortitude and suspends an opposing Digimon at or below its current DP on play/digivolving", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.keywords).toMatchObject([
      { keyword: "Fortitude" },
    ]);
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[0]).toMatchObject({
      kind: "Suspend",
      target: {
        filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", relativeToSource: true } },
        count: 1,
      },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions?.[0]).toMatchObject({
      kind: "Suspend",
      target: {
        filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", relativeToSource: true } },
        count: 1,
      },
    });
  });
  it("inherits 1000 DP while suspended", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")).toMatchObject({
      isInherited: true,
      actions: [
        {
          kind: "Aura",
          target: { filter: { isSelfRef: true }, isSelf: true },
          effect: { kind: "modifyDP", amount: 1000 },
          while: { kind: "selfIsSuspended" },
        },
      ],
    });
  });

  it("suspends only an opposing Digimon at or below its DP on play", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "EX5-039", as: "source" }] },
      1: {
        battleArea: [
          { card: "BT1-021", as: "eligible", dp: 7000 },
          { card: "BT1-021", as: "tooLarge", dp: 8000 },
        ],
      },
    });
    s.state.memory = 7;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("eligible").isSuspended);
    expect(s.perm("eligible").isSuspended).toBe(true);
    expect(s.perm("tooLarge").isSuspended).toBe(false);
  });
});
