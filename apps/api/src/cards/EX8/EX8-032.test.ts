import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./EX8-032.js";

describe("EX8-032", () => {
  it("inherits a once-per-turn -2000 DP effect against an opposing Digimon when attacking", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ trigger: "WhenAttacking", frequency: "OncePerTurn", actions: [{ kind: "ModifyDP", amount: -2000, duration: "forTheTurn", target: { count: 1 } }] }));

  it("applies the inherited -2000 DP effect when the host attacks", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "AD1-001", as: "attacker", under: ["EX8-032"] }] }, 1: { battleArea: [{ card: "AD1-001", as: "target" }] } }, { autoSelectCards: true });
    const attacker = s.perm("attacker");
    const target = s.perm("target");
    const before = target.currentDP;
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attacker.permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => target.currentDP === before - 2000);
    expect(target.currentDP).toBe(before - 2000);
  });
});
