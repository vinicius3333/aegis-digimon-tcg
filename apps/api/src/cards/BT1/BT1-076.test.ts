import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT1-076.js";

describe("BT1-076 Palmon", () => {
  it("gains 1 memory when attacking while the opponent has 2 suspended Digimon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-074", as: "attacker", under: ["BT1-076"] }] }, 1: { battleArea: [{ card: "BT1-016", suspended: true }, { card: "BT1-017", suspended: true }] } });
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("attacker"));
    expect(s.state.memory).toBe(1);
  });
});
