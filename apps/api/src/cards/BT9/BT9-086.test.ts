import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT9-086.js";

describe("BT9-086 Kiyoshiro Higashimitarai", () => {
  it("sets memory to 3 from 2 or less", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT9-086", as: "tamer" }] } });
    s.state.memory = 1;
    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("tamer"));
    expect(s.state.memory).toBe(3);
  });

  it("draws by suspending on a qualifying attack only at 7 or fewer cards", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT9-086", as: "tamer" }, { card: "BT9-021", as: "attacker" }], deck: [{ card: "BT1-001", as: "drawn" }] } }, { autoAcceptOptional: true });
    await advance(s.engine).fireSubTrigger("whenAttacking", { attackerPermanentId: s.perm("attacker").permanentId });
    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
  });
});
