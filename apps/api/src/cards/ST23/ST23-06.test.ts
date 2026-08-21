import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST23-06.js";

describe("ST23-06 Gekkomon", () => {
  it("reveals three, adds one Glowing Dawn card, and places another face down under its Tamer", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST23-13", as: "tamer" }], hand: [{ card: "ST23-06", as: "gekkomon" }], deck: ["ST23-02", "ST23-03", "BT1-009"] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gekkomon").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("tamer").stack.length === 1 && s.state.players[0]!.hand.some((card) => card.cardId === "ST23-02" || card.cardId === "ST23-03"));
    expect(s.perm("tamer").stack).toHaveLength(1);
    expect(s.perm("tamer").stack[0]!.faceUp).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "ST23-02" || card.cardId === "ST23-03")).toBe(true);
  });
});
