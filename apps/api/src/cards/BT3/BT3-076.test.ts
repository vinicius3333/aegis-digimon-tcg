import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
describe("BT3-076 Candlemon", () => {
  it("has no card effects", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT3-076", as: "candlemon" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("candlemon").currentDP).toBe(s.perm("candlemon").baseDP);
  });

  it("digivolves from a legal Purple Digi-Egg without effect activation", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT3-006", as: "base" },
        hand: [{ card: "BT3-076", as: "evolving" }],
        deck: ["BT1-012"],
      },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT3-076");

    expect(s.perm("base").topCard.cardId).toBe("BT3-076");
    expect(s.perm("base").stack.some((card) => card.cardId === "BT3-006")).toBe(true);
    expect(s.events.some(({ kind }) => kind === "effectActivated")).toBe(false);
  });
});
