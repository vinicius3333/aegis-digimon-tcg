import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT3-044.js";
describe("BT3-044 Aruraumon", () => {
  it("plays as a 5000 DP vanilla Digimon without effect activation", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT3-044", as: "aruraumon" }] } });
    s.state.memory = 2;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("aruraumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    expect(s.state.players[0]!.battleArea[0]).toMatchObject({ baseDP: 5000, currentDP: 5000 });
    expect(s.state.memory).toBe(0);
    expect(s.events.some(({ kind }) => kind === "effectActivated")).toBe(false);
  });

  it("digivolves from a legal Green level 2 source without effect activation", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT3-004", as: "base" },
        hand: [{ card: "BT3-044", as: "evolving" }],
        deck: [{ card: "BT1-012", as: "drawn" }],
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
    await settle(() => s.perm("base").topCard.cardId === "BT3-044");

    expect(s.perm("base").topCard.cardId).toBe("BT3-044");
    expect(s.perm("base").stack.some((card) => card.cardId === "BT3-004")).toBe(true);
    expect(s.events.some(({ kind }) => kind === "effectActivated")).toBe(false);
  });
});
