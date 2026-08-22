import { describe, expect, it } from "vitest";
import { compiled } from "./BT26-025.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
describe("BT26-025 Liollmon", () => {
  it("compiles On Play and On Move security placement followed by Recovery +1", () => {
    expect(compiled.coverage).toBe("full"); expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "OnPlay", actions: [{ kind: "PlaceUnder", from: ["security"], faceDown: true }, { kind: "SecurityManipulation", op: "addTop", source: "deck" }] });
    expect(compiled.effects[1]).toMatchObject({ trigger: "OnMove" });
  });
  it("compiles inherited once-per-turn security-to-hand and zero-security recovery", () => {
    expect(compiled.effects[2]).toMatchObject({ trigger: "WhenAttacking", isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "SecurityManipulation", op: "toHand" }, { kind: "SecurityManipulation", op: "addTop", condition: { kind: "securityAtMost", value: 0 } }] });
  });
  it("publicly places the top security card under a Glowing Dawn Tamer and recovers", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT26-089", as: "tamer" }], hand: [{ card: "BT26-025", as: "liollmon" }], security: [{ card: "BT1-009", as: "security" }], deck: [{ card: "BT1-001", as: "recovery" }] } });
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("liollmon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((c) => c.instanceId === s.inst("recovery").instanceId));
    expect(s.state.players[0]!.security.map((c) => c.instanceId)).toContain(s.inst("recovery").instanceId);
    expect(s.perm("tamer").stack.map((c) => c.instanceId)).toContain(s.inst("security").instanceId);
  });
});
