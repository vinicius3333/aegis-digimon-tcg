import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT16-034.js";
import "../index.js";

describe("BT16-034", () => {
  it("reduces an opposing Digimon by 4000 when security is at least 3", () => {
    for (const effect of compiled.effects?.slice(0, 2) ?? []) {
      expect(effect.actions?.[0]).toMatchObject({
        kind: "ModifyDP",
        amount: -4000,
        duration: "untilOpponentTurnEnd",
        condition: { kind: "securityAtLeast", value: 3 },
      });
      expect(effect.actions?.[1]).toMatchObject({
        kind: "GainKeyword",
        keyword: { keyword: "SecurityAttack", amount: -2 },
        condition: { kind: "securityAtMost", value: 3 },
      });
    }
  });

  it("has the inherited Pulsemon security-cost unsuspend", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "EndOfAttack",
      isInherited: true,
      frequency: "OncePerTurn",
    });
    expect(compiled.effects?.[2]?.actions?.[0]).toMatchObject({
      kind: "Unsuspend",
      optional: true,
      abortOnDecline: true,
      cost: { kind: "trash" },
    });
  });

  it("uses the security-count boundary at exactly 3", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT16-034", as: "tempo" }], security: ["BT1-009", "BT1-009", "BT1-009"] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent", dp: 5000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 6;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tempo").instanceId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).keywordAmount(s.perm("opponent"), "SecurityAttack") === -2);

    expect(observe(s.engine).keywordAmount(s.perm("opponent"), "SecurityAttack")).toBe(-2);
    expect(s.perm("opponent").currentDP).toBe(1000);
  });
});
