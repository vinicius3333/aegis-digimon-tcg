import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST23-03.js";

describe("ST23-03 Cougarmon", () => {
  it("recovers one security after digivolving", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST23-02", as: "base" }], hand: [{ card: "ST23-03", as: "cougarmon" }], security: [{ card: "BT1-001", as: "oldSecurity", faceUp: true }], deck: ["BT1-002", "BT1-003"] },
    });
    const securityId = s.inst("oldSecurity").instanceId;
    const recoveryId = s.state.players[0]!.deck[1]!.instanceId;
    s.state.memory = 2;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("cougarmon").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "ST23-03" && s.state.players[0]!.hand.some((card) => card.instanceId === securityId) && s.state.players[0]!.security.some((card) => card.instanceId === recoveryId));
    expect(s.perm("base").topCard?.cardId).toBe("ST23-03");
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === securityId && card.cardId === "BT1-001")).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.security[0]!.instanceId).toBe(recoveryId);
    expect(s.state.players[0]!.security[0]!.faceUp).toBe(false);
  });

  it("uses the shared printed under-Tamer cost for its turn reduction", () => {
    const effect = runtimeCompiledCard("ST23-03")?.effects.find((entry) => entry.trigger === "YourTurn");
    expect(effect).toMatchObject({
      actions: [{
        kind: "Replacement",
        event: "wouldDigivolve",
        amount: 2,
        cost: { kind: "trashBottomFaceDownUnderTamer", controller: "mine" },
      }],
    });
  });
});
