import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT11-063.js";

describe("BT11-063 Geremon", () => {
  it("is also treated as Numemon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT11-063", as: "geremon" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).grantedNames(s.perm("geremon"))).toContain("numemon");
  });
  it("trashes an eligible named card to draw 2 on play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT11-063", as: "geremon" },
            { card: "BT11-063", as: "discard" },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("geremon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.length === 2);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("discard").instanceId);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-009", "BT1-010"]);
  });

  it("does not draw when no eligible card can be trashed", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT11-063", as: "geremon" }],
        deck: ["BT1-009", "BT1-010"],
      },
    });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("geremon").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });
});
