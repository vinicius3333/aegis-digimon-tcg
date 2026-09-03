import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT3-045.js";
describe("BT3-045 Kunemon", () => {
  it("plays as a 4000 DP vanilla Digimon without effect activation", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT3-045", as: "kunemon" }] } });
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("kunemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    expect(s.state.players[0]!.battleArea[0]).toMatchObject({ baseDP: 4000, currentDP: 4000 });
    expect(s.state.memory).toBe(0);
    expect(s.events.some(({ kind }) => kind === "effectActivated")).toBe(false);
  });

  it("digivolves from a legal Green level 2 source without effect activation", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT3-004", as: "base" },
        hand: [{ card: "BT3-045", as: "evolving" }],
        deck: [{ card: "BT1-012", as: "drawn" }],
      },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT3-045");

    expect(s.perm("base").topCard.cardId).toBe("BT3-045");
    expect(s.perm("base").stack.some((card) => card.cardId === "BT3-004")).toBe(true);
    expect(s.events.some(({ kind }) => kind === "effectActivated")).toBe(false);
  });
});
