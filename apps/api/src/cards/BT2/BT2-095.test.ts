import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT2-095.js";

describe("BT2-095 Cocytus Breath", () => {
  it("returns up to three opposing level 3 Digimon to hand", async () => {
    const s = setupEngine({ 0: { battleArea: ["BT2-021"], hand: [{ card: "BT2-095", as: "option" }] }, 1: { battleArea: [{ card: "BT2-033", as: "target", under: [{ card: "BT2-001", as: "source" }] }] } }, { autoSelectCards: true });
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.some((c) => c.cardId === "BT2-033"));
    expect(s.state.players[1]!.hand.some((c) => c.cardId === "BT2-033")).toBe(true);
    expect(s.state.players[1]!.trash.some((c) => c.instanceId === s.inst("source").instanceId)).toBe(true);
  });
});
