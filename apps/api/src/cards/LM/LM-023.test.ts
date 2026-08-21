import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./LM-023.js";

describe("LM-023 Sakuyamon: Maid Mode", () => {
  it("places an eligible yellow Tamer from hand on top of security when played", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "LM-023", as: "maid" }, { card: "AD1-019", as: "tamer" }] } }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 6;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("maid").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((card) => card.cardId === "AD1-019"));
    expect(s.state.players[0]!.security.at(-1)?.cardId).toBe("AD1-019");
  });

  it("does not place an ineligible multicolor Option from hand", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "LM-023", as: "maid" }, { card: "BT10-104", as: "invalid" }] } }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 6;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("maid").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT10-104"));
    expect(s.state.players[0]!.security.some((card) => card.cardId === "BT10-104")).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT10-104")).toBe(true);
  });
});
