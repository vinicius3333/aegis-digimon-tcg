import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT13-025.js";

describe("BT13-025 GaoGamon", () => {
  it("conditionally plays Thomas and preserves the inherited hand-size aura", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "WhenDigivolving", actions: [expect.objectContaining({ kind: "PlayWithoutCost", optional: true, condition: expect.objectContaining({ kind: "youHaveNone" }) })] });
    expect(compiled.effects[1]).toMatchObject({ trigger: "AllTurns", isInherited: true, actions: [expect.objectContaining({ kind: "Aura" })] });
  });

  it("plays Thomas on digivolution only when none is already present", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT13-021", as: "gaomon" }], hand: [{ card: "BT13-025", as: "gaogamon" }, { card: "BT13-097", as: "thomas" }] } }, { autoAcceptOptional: true, autoSelectCards: true });
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("gaomon").permanentId, instanceId: s.inst("gaogamon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT13-097"), 3000);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT13-097")).toBe(true);
  });

  it("gains the inherited 1000 DP while the opponent has eight cards in hand", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-010", as: "gaogamon", dp: 5000, under: ["BT13-025"] }] }, 1: { hand: Array.from({ length: 8 }, (_, index) => ({ card: "BT13-021", as: `opponent-${index}` })) } });
    await s.ready();
    expect(s.state.players[1]!.hand).toHaveLength(8);
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("gaogamon").currentDP).toBe(6000);
  });
});
