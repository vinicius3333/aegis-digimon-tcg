import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT9-088.js";

describe("BT9-088 Mimi Tachikawa & Joe Kido", () => {
  it("independently gains memory for each player controlling a suspended Digimon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT9-088", as: "tamer" }, { card: "BT1-028", suspended: true }] }, 1: { battleArea: [{ card: "BT1-028", suspended: true }] } });
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("tamer"));
    expect(s.state.memory).toBe(2);
  });

  it("may suspend and draw after a green or blue Digimon deletes in battle and survives", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT9-088", as: "tamer" }, { card: "BT9-052", as: "attacker" }], deck: [{ card: "BT1-001", as: "drawn" }] } }, { autoAcceptOptional: true });
    await advance(s.engine).fireSubTrigger("whenDeletesInBattle", { attackerPermanentId: s.perm("attacker").permanentId });
    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
  });
});
