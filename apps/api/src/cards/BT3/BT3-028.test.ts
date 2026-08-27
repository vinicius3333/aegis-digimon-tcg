import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT3-028.js";

describe("BT3-028 Bastemon", () => {
  it("plays as an 8000 DP vanilla Digimon without effect activation", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT3-028", as: "bastemon" }] } });
    s.state.memory = 7;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("bastemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    expect(s.state.players[0]!.battleArea[0]).toMatchObject({ baseDP: 8000, currentDP: 8000 });
    expect(s.state.memory).toBe(0);
    expect(s.events.some(({ kind }) => kind === "effectActivated")).toBe(false);
  });

  it("digivolves from a legal Blue level 4 source without effect activation", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT2-024", as: "base" }],
        hand: [{ card: "BT3-028", as: "evolving" }],
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
    await settle(() => s.perm("base").topCard.cardId === "BT3-028");

    expect(s.perm("base").topCard.cardId).toBe("BT3-028");
    expect(s.perm("base").stack.some((card) => card.cardId === "BT2-024")).toBe(true);
    expect(s.events.some(({ kind }) => kind === "effectActivated")).toBe(false);
  });
});
