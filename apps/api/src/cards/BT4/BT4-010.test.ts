import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT4-010.js";

describe("BT4-010 Fugamon", () => {
  it("has no card effects", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT4-010", as: "fugamon" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("fugamon").currentDP).toBe(s.perm("fugamon").baseDP);
  });

  it("digivolves from a legal red level 3 Digimon without effect activation", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT4-008", as: "base", under: ["BT4-001"] }],
        hand: [{ card: "BT4-010", as: "evolving" }],
        deck: [{ card: "BT1-010", as: "drawn" }],
      },
    });
    s.state.memory = 1;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT4-010");

    expect(s.perm("base").topCard.cardId).toBe("BT4-010");
    expect(s.perm("base").stack.some((card) => card.cardId === "BT4-008")).toBe(true);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-010")).toBe(true);
    expect(s.events.some(({ kind }) => kind === "effectActivated")).toBe(false);
  });
});
