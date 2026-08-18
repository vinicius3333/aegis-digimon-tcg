import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX1-045.js";

describe("EX1-045 Hagurumon", () => {
  it("may trash a Machine or Cyborg Digimon from hand to draw 2 on play", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "EX1-045", as: "hagurumon" }, { card: "BT1-042", as: "machine" }], deck: ["BT1-009", "BT1-010"] } }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("hagurumon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 2);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("machine").instanceId)).toBe(true);
  });
});
