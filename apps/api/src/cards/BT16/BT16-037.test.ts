import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-037.js";
import "../index.js";

describe("BT16-037", () => {
  it("reveals four and adds an Insectoid", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [{ kind: "RevealAdd", revealCount: 4, rest: "deckBottom", add: [{ count: 1, to: "hand" }] }],
    });
  });

  it("grants inherited DP while suspended", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      actions: [{ kind: "Aura", effect: { kind: "modifyDP", amount: 1000 }, while: { kind: "selfIsSuspended" } }],
    });
  });

  it("adds one Insectoid from the top four and bottoms the rest", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT16-037", as: "kokabuterimon" }],
          deck: ["BT1-009", "BT16-037", "BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("kokabuterimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT16-037"));

    expect(s.state.players[0]!.hand.filter((card) => card.cardId === "BT16-037")).toHaveLength(1);
    // One unrevealed card plus the three misses returned to the bottom.
    expect(s.state.players[0]!.deck).toHaveLength(4);
  });

  it("applies the inherited bonus only while suspended", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT16-019", as: "host", dp: 6000, under: ["BT16-037"], suspended: true }] },
    });
    await s.engine.recomputeContinuousEffects();

    expect(s.perm("host").currentDP).toBe(7000);
  });
});
