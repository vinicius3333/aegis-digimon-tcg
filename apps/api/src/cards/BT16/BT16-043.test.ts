import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-043.js";
import "../index.js";

describe("BT16-043", () => {
  it("suspends an opponent and gains memory under the independent security conditions", () => {
    for (const effect of compiled.effects?.slice(0, 2) ?? []) {
      expect(effect.actions?.[0]).toMatchObject({ kind: "Suspend", condition: { kind: "securityAtLeast", value: 3 } });
      expect(effect.actions?.[1]).toMatchObject({
        kind: "GainMemory",
        amount: 1,
        condition: { kind: "securityAtMost", value: 3 },
      });
    }
  });

  it("grants inherited DP when the top card has Pulsemon in its text", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      actions: [{ kind: "Aura", effect: { kind: "modifyDP", amount: 1000 }, while: { kind: "selfTopHasText" } }],
    });
  });

  it("activates both branches at exactly three security cards", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT16-043", as: "runner" }], security: ["BT1-009", "BT1-009", "BT1-009"] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("runner").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("opponent").isSuspended && s.state.memory === 1);

    expect(s.perm("opponent").isSuspended).toBe(true);
    expect(s.state.memory).toBe(1);
  });
});
