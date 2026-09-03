import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT3-022.js";
describe("BT3-022 Penguinmon", () => {
  it("plays as a 5000 DP vanilla Digimon without effect activation", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT3-022", as: "penguinmon" }] } });
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("penguinmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    expect(s.state.players[0]!.battleArea[0]).toMatchObject({ baseDP: 5000, currentDP: 5000 });
    expect(s.state.memory).toBe(0);
    expect(s.events.some(({ kind }) => kind === "effectActivated")).toBe(false);
  });

  it("digivolves from a legal Blue level 2 source without effect activation", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT3-002", as: "base" },
        hand: [{ card: "BT3-022", as: "evolving" }],
        deck: [{ card: "BT1-012", as: "drawn" }],
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
    await settle(() => s.perm("base").topCard.cardId === "BT3-022");

    expect(s.perm("base").topCard.cardId).toBe("BT3-022");
    expect(s.perm("base").stack.some((card) => card.cardId === "BT3-002")).toBe(true);
    expect(s.events.some(({ kind }) => kind === "effectActivated")).toBe(false);
  });
});
