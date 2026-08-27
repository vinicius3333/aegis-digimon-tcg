import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT4-007.js";

describe("BT4-007 Otamamon", () => {
  it("has no card effects", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT4-007", as: "otamamon" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("otamamon").currentDP).toBe(s.perm("otamamon").baseDP);
  });

  it("digivolves from a legal red Digi-Egg without effect activation", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT4-001", as: "base" },
        hand: [{ card: "BT4-007", as: "evolving" }],
        deck: [{ card: "BT1-010", as: "drawn" }],
      },
    });
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT4-007");

    expect(s.perm("base").topCard.cardId).toBe("BT4-007");
    expect(s.perm("base").stack.some((card) => card.cardId === "BT4-001")).toBe(true);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-010")).toBe(true);
    expect(s.events.some(({ kind }) => kind === "effectActivated")).toBe(false);
  });
});
