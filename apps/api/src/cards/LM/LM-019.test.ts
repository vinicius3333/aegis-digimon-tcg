import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./LM-019.js";

describe("LM-019 Bokomon", () => {
  it("reveals four cards and adds a Digimon with Gammamon in its text", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "LM-019", as: "bokomon" }], deck: ["AD1-007", "BT1-001", "BT1-002", "BT1-003"] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 2;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("bokomon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "AD1-007"));
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "AD1-007")).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(3);
  });
});
