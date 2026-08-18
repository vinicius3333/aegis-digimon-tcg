import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX1-035.js";

describe("EX1-035 Kabuterimon", () => {
  it("can digivolve into an Insectoid from hand while attacking", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX1-035", as: "kabuterimon" }], hand: [{ card: "BT1-076", as: "evo" }] }, 1: { security: ["BT1-001", "BT1-001"] } }, { autoSelectCards: true });
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("kabuterimon").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.perm("kabuterimon").topCard.cardId === "BT1-076");
    expect(s.perm("kabuterimon").topCard.instanceId).toBe(s.inst("evo").instanceId);
    expect(s.state.memory).toBe(3);
  });
});
