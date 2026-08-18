import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT9-084.js";

describe("BT9-084 Tai Kamiya & Kari Kamiya", () => {
  it("independently gains memory for each player at 3 or fewer security", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT9-084", as: "tamer" }], security: ["BT1-001"] }, 1: { security: ["BT1-002"] } });
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("tamer"));
    expect(s.state.memory).toBe(2);
  });

  it("may suspend to give all opposing Security Digimon -2000 DP for the turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT9-084", as: "tamer" }, { card: "BT9-008", as: "attacker" }] } }, { autoAcceptOptional: true });
    await advance(s.engine).fireSubTrigger("whenAttacking", { attackerPermanentId: s.perm("attacker").permanentId });
    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(observe(s.engine).securityDp(1)).toBe(-2000);
  });
});
