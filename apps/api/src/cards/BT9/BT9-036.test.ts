import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT9-036.js";

describe("BT9-036 Gatomon (X Antibody)", () => {
  it("gives an opponent -2000 DP when its host attacks with at least 3 security", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-037", as: "host", under: ["BT9-036"] }], security: ["BT1-001", "BT1-002", "BT1-003"] }, 1: { battleArea: [{ card: "BT1-028", as: "target" }] } }, { autoSelectCards: true });
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.perm("target").currentDP).toBe(1000);
  });
});
