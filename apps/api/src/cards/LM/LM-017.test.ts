import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./LM-017.js";

describe("LM-017 Regulusmon", () => {
  it("plays through the engine, trashes a hand card, and places Gammamon text under itself", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "LM-017", as: "regulusmon" }, { card: "BT1-001", as: "cost" }], trash: ["LM-016"] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("regulusmon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.stack.some((card) => card.cardId === "LM-016")));
    expect(s.state.players[0]!.battleArea.some((perm) => perm.stack.some((card) => card.cardId === "LM-016"))).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-001")).toBe(true);
  });
});
